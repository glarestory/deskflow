# Acceptance Criteria — SPEC-SEARCH-RAG-001

## 수락 기준 (AC) 체크리스트

### A. Ollama 연결 & Health Check

- **AC-001**: 앱 시작 시 `GET /api/tags` 요청이 자동 발행되고, 2초 타임아웃 이내 200 응답이면 `ragStore.ollamaAvailable === true`로 설정된다.
- **AC-002**: Ollama가 실행 중이지 않으면 `ollamaAvailable === false`, `lastHealthCheck`가 ISO 시각으로 기록된다.
- **AC-003**: `/api/tags` 응답의 `models` 배열에 `nomic-embed-text`가 포함되지 않으면 `modelMissing === true`가 된다.
- **AC-004**: Command Palette 상단에 상태 배지가 세 가지 중 하나로 표시된다 (녹색/노랑/빨강).
- **AC-005**: 설정 화면 "RAG 재시도" 버튼 클릭 시 health check가 재실행되고 결과가 UI에 반영된다.

### B. 임베딩 파이프라인

- **AC-006**: 새 Link 추가 시 `embeddingStore.indexingQueue`에 해당 linkId가 push된다.
- **AC-007**: Link 수정(name/url/tags/description 중 하나 변경) 시 contentHash가 달라지면 큐에 재추가된다.
- **AC-008**: Link 수정 후 contentHash가 동일하면 큐에 들어가지 않는다 (불필요한 임베딩 방지).
- **AC-009**: Link 삭제 시 `embeddings` Map에서 해당 linkId가 제거된다.
- **AC-010**: `runIndexBatch()`가 큐에서 최대 10개를 꺼내 Ollama `/api/embeddings` 호출, 결과를 `upsertEmbedding`으로 저장한다.
- **AC-011**: 배치 중 1개 실패해도 나머지 9개는 정상 저장된다 (실패 항목은 큐에 남음).
- **AC-012**: 초기 로드 시 embeddings에 없는 북마크 전체가 큐에 enqueue된다.
- **AC-013**: 진행률 Toast `N/M 인덱싱 중…`이 화면 우하단에 표시된다.
- **AC-014**: 배치 완료 후 Toast가 "N개 인덱스 완료" → 3초 뒤 자동 숨김.

### C. 벡터 저장

- **AC-015**: 미인증 상태에서 임베딩은 `localStorage`/`electron-store` 키 `rag-embeddings`에 배열로 저장된다.
- **AC-016**: 인증 상태에서 임베딩은 Firestore `/users/{uid}/embeddings/{linkId}` 경로에 저장된다 (서브컬렉션).
- **AC-017**: 앱 재시작 후 `loadEmbeddings`가 모든 임베딩을 Map으로 복원한다.
- **AC-018**: 미인증 → 인증 전환 시 로컬 임베딩이 Firestore로 마이그레이션된다 (SPEC-CAPSULE-001 migration 파이프라인 확장).

### D. 검색

- **AC-019**: Command Palette 쿼리 4자 미만 → RAG 섹션 숨김, 기존 fuzzy만 표시.
- **AC-020**: 쿼리 4자 이상 → 300ms 디바운스 후 Ollama 임베딩 요청.
- **AC-021**: 쿼리 임베딩 수신 후 저장된 모든 벡터와 코사인 유사도 계산, threshold(기본 0.70) 이상만 필터.
- **AC-022**: Top 10 결과가 점수 DESC로 정렬되어 "RAG" 그룹에 표시된다.
- **AC-023**: 각 결과 행에 유사도 점수(0.00-1.00)가 소수 둘째자리까지 배지로 표시된다.
- **AC-024**: 엔터 키로 기존 북마크 선택과 동일하게 해당 Link의 URL을 연다.
- **AC-025**: Alt+엔터는 EditModal 열기로 동작 (기존 동작 유지).

### E. 폴백 & 에러

- **AC-026**: `ollamaAvailable === false`이면 RAG 섹션 전체가 숨겨지고, 기존 fuzzy 검색만 동작한다.
- **AC-027**: Ollama API 5초 이내 응답 없으면 요청 취소 + 에러 Toast "Ollama 응답 없음" 표시.
- **AC-028**: 4xx/5xx 응답 시 에러 Toast + 개발자 콘솔에 상세 로그.
- **AC-029**: 설정에서 `rag.enabled = false`로 끄면 RAG 관련 모든 호출이 중단되고 섹션이 숨겨진다.

### F. 설정

- **AC-030**: 설정 화면에 `RAG 활성화` 토글 (기본 on), `유사도 임계값` 슬라이더 [0.50, 0.90] (기본 0.70) 표시.
- **AC-031**: 임계값 조정 시 다음 검색부터 즉시 반영된다.
- **AC-032**: 설정 값이 storage abstraction으로 영속화된다 (`rag-settings` 키).

### G. 프라이버시

- **AC-033**: 네트워크 탭에서 `localhost:11434` 이외의 외부 도메인으로 임베딩 텍스트가 전송되지 않는다.
- **AC-034**: 미인증 상태에서 임베딩 벡터는 Firestore에 업로드되지 않는다.

### H. 성능 & 품질 게이트

- **AC-035**: 북마크 500개 규모에서 검색 응답 < 800ms (E2E 측정).
- **AC-036**: 초기 100개 배치 인덱싱 < 60초.
- **AC-037**: TypeScript strict 0 오류 / ESLint 0 오류 유지.
- **AC-038**: 신규 코드 커버리지 85% 이상.
- **AC-039**: 기존 전체 테스트 회귀 0 (npm test 732/733 유지, RAG 추가로 증가).

## 테스트 시나리오

### T-001: 엔드투엔드 첫 검색 (Happy path)

1. Ollama 설치 + `ollama pull nomic-embed-text` 완료
2. 앱 시작 → Palette에 녹색 "RAG 준비됨" 배지
3. 북마크 10개 자동 인덱싱 Toast 표시 → 완료
4. `Cmd+K`로 Palette 열기
5. "디자인 도구" 입력 → 300ms 뒤 RAG 결과에 Figma, Canva 순서로 표시 (점수 동반)
6. 엔터 → Figma URL 열림

### T-002: Ollama 미설치 경로

1. Ollama 없이 앱 시작
2. Palette 열기 → 빨강 배지 "Ollama 미탐지 — 설치 가이드"
3. 배지 클릭 → 외부 링크 (`https://ollama.com`) 열기 확인
4. 일반 쿼리 입력 → 기존 fuzzy 결과만 정상 동작 (회귀 없음)

### T-003: 모델 누락 경로

1. Ollama 실행 중 but `nomic-embed-text` 없음
2. Palette 열기 → 노랑 배지 "모델 누락 — `ollama pull nomic-embed-text`"
3. 커맨드 복사 버튼 동작 확인 (클립보드)
4. 쿼리 입력 → RAG 호출 시도 → "모델 없음" 에러로 Toast 표시

### T-004: 북마크 업데이트 재인덱싱

1. 캡슐/북마크 정상 동작 상태
2. 기존 북마크 "React Docs" 이름을 "React 19 Docs"로 수정
3. `embeddingStore.indexingQueue`에 해당 linkId 추가 확인
4. 다음 배치 실행에서 임베딩 재계산, contentHash 갱신
5. "React 19" 검색 시 해당 북마크가 RAG 결과 상위 노출

### T-005: 부분 실패 복구

1. 북마크 10개 배치 인덱싱 중 5번째에서 Ollama 일시 장애 (mock)
2. 4개는 저장, 5번째는 큐에 남음
3. 6~10번째도 정상 진행 → 9개 저장
4. 앱 재시작 → 5번째 linkId가 큐에 있어 재시도 → 10개 완료

### T-006: Firestore 마이그레이션

1. 미인증 상태로 북마크 3개 추가 + 로컬 임베딩 생성
2. Google 로그인 수행
3. `migrateLocalToFirestore` 파이프라인에 embedding 포함 확인
4. Firestore `/users/{uid}/embeddings/` 컬렉션에 3개 문서 확인
5. 로그아웃 → 재로그인 → 동일 3개 벡터 복원

## 엣지 케이스

- **EC-001**: Ollama가 시작 중(202 응답 등 비표준) → `ollamaAvailable === false`로 간주, 5초 뒤 재시도
- **EC-002**: 북마크 name이 빈 문자열 → URL만으로 임베딩 (fallback)
- **EC-003**: 북마크 수가 0개 → 큐 비어있음, 배치 NO-OP
- **EC-004**: 쿼리가 이모지 또는 특수문자만 → Ollama가 빈 벡터 반환 가능 → threshold 필터로 자연히 0개 결과
- **EC-005**: 저장된 임베딩 dimension이 384 아닌 레거시 값 → 스키마 불일치 경고 + 해당 항목 재인덱싱
- **EC-006**: Ollama 재시작으로 포트 변경 → URL 하드코딩이므로 감지 실패 → 설정에서 URL override 가능(후속)
- **EC-007**: 동일 contentHash의 여러 호출이 동시 발생 → 큐에서 dedupe

## 완료 정의 (Definition of Done)

- [ ] AC-001~AC-039 모두 통과
- [ ] T-001~T-006 자동화 (Vitest + RTL + mock Ollama server)
- [ ] 수동 테스트: 실제 Ollama 설치 환경에서 북마크 20개 임베딩 + 검색 10쿼리 확인
- [ ] TypeScript strict 0 오류, ESLint 0 오류
- [ ] 커버리지 85% 이상
- [ ] 기존 테스트 100% 통과
- [ ] README에 "RAG 검색 사용법" 섹션 추가 (Ollama 설치 가이드 포함)
- [ ] `SPEC-SEARCH-RAG-001` 코드에 `@MX:SPEC: SPEC-SEARCH-RAG-001` 태그 삽입
