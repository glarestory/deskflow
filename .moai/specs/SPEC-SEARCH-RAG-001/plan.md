# Implementation Plan — SPEC-SEARCH-RAG-001

## 개발 방법론

**TDD (RED-GREEN-REFACTOR)** — Greenfield, 외부 서비스(Ollama) 통합이므로 mock 기반 테스트 우선.

## 구현 단계 (Phase)

총 6개 Phase.

### Phase 1: 기초 유틸 (Ollama client + Cosine + Hash)

**목표**: 순수 유틸 함수 먼저 테스트로 잠그기 (외부 의존 최소)

**RED**
- `ollamaClient.test.ts`:
  - `checkHealth()` 200 → returns true
  - `checkHealth()` 타임아웃 → returns false
  - `listModels()` → parses models array
  - `embed(text)` → returns number[384]
  - 4xx/5xx 에러 → throws 명확한 에러 타입
- `cosineSimilarity.test.ts`:
  - 정확히 같은 벡터 → 1.0
  - 직교 벡터 → 0.0
  - 반대 벡터 → -1.0
  - 길이 불일치 → throw
- `contentHash.test.ts`:
  - 동일 문자열 → 동일 해시
  - 1문자 차이 → 다른 해시
  - 빈 문자열 → 고정 해시

**GREEN**
- `src/renderer/lib/ollamaClient.ts`:
  - `OLLAMA_BASE_URL = 'http://localhost:11434'`
  - `checkHealth()` with AbortController 2s timeout
  - `listModels()` GET /api/tags
  - `embed(text: string): Promise<number[]>` POST /api/embeddings
- `src/renderer/lib/cosineSimilarity.ts`:
  - `cosine(a: number[], b: number[]): number`
  - 순수 함수, 에러는 throw
- `src/renderer/lib/contentHash.ts`:
  - `sha256(text: string): Promise<string>` (Web Crypto API)

**REFACTOR**
- `OLLAMA_BASE_URL`을 환경변수 override 가능하게 (`VITE_OLLAMA_URL`)
- Error 클래스 `OllamaError` 추출

**검증**: AC-001~AC-003 (일부)

---

### Phase 2: embeddingStore + 저장

**목표**: 벡터 저장/조회 영속화

**RED**
- `embeddingStore.test.ts`:
  - `upsertEmbedding(e)` → Map 업데이트 + storage.set 호출
  - `removeEmbedding(linkId)` → Map에서 제거 + storage 갱신
  - `loadEmbeddings()` → storage로부터 복원
  - `enqueueIndex` dedupe (동일 id 중복 방지)
  - 인증 상태 Firestore 서브컬렉션 경로 (mock)

**GREEN**
- `src/renderer/types/embedding.ts`: BookmarkEmbedding 타입
- `src/renderer/stores/embeddingStore.ts`: Zustand 스토어
- 저장 키: `rag-embeddings` (미인증 배열) / Firestore 서브컬렉션 (인증)
- migration.ts에 embedding 추가

**REFACTOR**
- 저장 debounce 200ms (배치 중 다중 write 방지)
- Firestore 업로드 batch writes (10 docs per write)

**검증**: AC-006~AC-009, AC-015~AC-018

---

### Phase 3: 인덱싱 파이프라인

**목표**: 북마크 → 임베딩 생성 자동화

**RED**
- `embeddingStore.indexing.test.ts`:
  - `enqueueIndex` 호출 후 `runIndexBatch` 실행 → 10개 처리
  - 부분 실패 시 나머지 성공 + 실패 항목 큐 잔존 (AC-011)
  - contentHash 동일 → 스킵 (AC-008)
  - 진행률 상태 업데이트 (AC-013)
- `bookmarkStore.embedding-hook.test.ts` (확장):
  - addBookmark → embeddingStore.enqueueIndex 호출 검증
  - updateBookmark 텍스트 변경 → enqueue
  - updateBookmark 텍스트 동일 → enqueue 안 함
  - removeBookmark → embeddingStore.removeEmbedding

**GREEN**
- `bookmarkStore` 훅 추가 (capsuleStore.purgeOrphan 패턴 재사용)
- `runIndexBatch`: Promise.allSettled로 병렬 + 실패 격리
- 진행률 Toast를 위한 상태 노출
- App.tsx에 초기 로드 시 `enqueueIndex(missingLinkIds)` + `runIndexBatch` 호출

**REFACTOR**
- 배치 사이 sleep(50ms)로 메인 스레드 양보
- 큐 sort by recency (최신 생성이 먼저 인덱싱)

**검증**: AC-006~AC-014

---

### Phase 4: ragStore + 검색 로직

**목표**: 쿼리 → 벡터 → Top K 반환

**RED**
- `ragStore.test.ts`:
  - `checkHealth` ollamaAvailable / modelMissing 상태 전이
  - `search(q)` 결과가 threshold 이상만 포함
  - Top 10 정렬 검증
  - 4자 미만 → 빈 배열 (AC-019)
  - disabled 상태 → 빈 배열 (AC-029)
  - debounce 중복 호출 cancel
- `searchAll.test.ts` 확장:
  - RAG 결과 그룹이 "action < category < tag < RAG < bookmark" 순서

**GREEN**
- `src/renderer/stores/ragStore.ts`: Zustand 스토어
- `search` 내부에서 ollamaClient.embed + embeddingStore.embeddings 순회 + cosine
- searchAll.ts에 RAG 결과 SearchResult 타입 추가 (`kind: 'rag'`)

**REFACTOR**
- Top K 계산을 힙 기반으로 (O(N log K))
- 검색 결과 캐싱 (동일 쿼리 5초 내 재호출 시 캐시)

**검증**: AC-010~AC-014, AC-019~AC-029

---

### Phase 5: Command Palette UI 통합

**목표**: RAG 결과 그룹 + 상태 배지 + 점수 표시

**RED**
- `RagResults.test.tsx`:
  - RAG 결과 배열 → 각 항목이 아이콘 · 이름 · 점수 · URL 순서로 렌더
  - threshold 이하는 표시 안 됨
- `CommandPalette.rag.test.tsx` (확장):
  - 쿼리 4자 이상 + ollamaAvailable → RAG 섹션 렌더
  - 폴백: ollamaAvailable=false → RAG 섹션 숨김
  - 배지 렌더 3가지 상태

**GREEN**
- `src/renderer/components/CommandPalette/RagResults.tsx` 신규
- CommandPalette.tsx에 상태 배지 + RAG 섹션 삽입
- searchAll에서 RAG 결과를 포함해 통합 반환

**REFACTOR**
- 배지 UI를 독립 컴포넌트 `RagStatusBadge`로 추출
- 유사도 점수 포맷 유틸 `formatScore(n): string`

**검증**: AC-004, AC-012~AC-013, AC-019~AC-029, T-001

---

### Phase 6: 설정 + 마이그레이션 + 문서

**목표**: 사용자 설정 · Firestore 마이그레이션 · README

**RED**
- `ragStore.settings.test.ts`:
  - `setEnabled(false)` → storage 저장
  - `setThreshold(0.85)` → 다음 search에 반영
  - 설정 로드 복원
- `migration.embedding.test.ts`:
  - 로컬 배열 → Firestore 서브컬렉션 upload 확인

**GREEN**
- 설정 UI 추가 (기존 Settings 섹션에 RAG 토글 + 슬라이더)
- `capsuleMigration.ts` 패턴 따라 `embeddingMigration.ts` 생성
- migration.ts 파이프라인에 추가
- README.md에 "RAG 검색 설정" 섹션 추가 (Ollama 설치 + `ollama pull nomic-embed-text` + CORS 설정)

**REFACTOR**
- 설정 UI를 Settings 별도 컴포넌트로 분리 (기존 분산 설정도 통합 검토)

**검증**: AC-030~AC-034, T-006

## MX 태그 계획

### 신규 파일
- `lib/ollamaClient.ts`:
  - `@MX:NOTE: [AUTO] Ollama HTTP 클라이언트 — localhost:11434 health/embed 호출 단일 진입점`
  - `@MX:SPEC: SPEC-SEARCH-RAG-001`
- `stores/ragStore.ts`:
  - `@MX:ANCHOR: [AUTO] ragStore — RAG 검색 상태 및 health check 진입점`
  - `@MX:REASON: [AUTO] App.tsx, CommandPalette, Settings, searchAll 다수 의존 (fan_in >= 3)`
- `stores/embeddingStore.ts`:
  - `@MX:ANCHOR: [AUTO] embeddingStore — 북마크 벡터 저장/큐 관리 중심`
  - `@MX:REASON: [AUTO] bookmarkStore, ragStore, App.tsx, migration 의존 (fan_in >= 3)`
- `lib/cosineSimilarity.ts`:
  - `@MX:NOTE: [AUTO] 벡터 유사도 계산 — 수치 안정성 주의 (norm 0 체크)`

### 수정 파일
- `bookmarkStore.ts`: create/update/delete 호출부에 `@MX:NOTE: [AUTO] embeddingStore 훅 — SPEC-SEARCH-RAG-001 REQ-004,007`
- `CommandPalette.tsx`: RAG 섹션 주변에 `@MX:NOTE: [AUTO] SPEC-SEARCH-RAG-001 REQ-012`

## 파일 변경 범위 추정

### 신규 (14개)
1. `src/renderer/types/embedding.ts`
2. `src/renderer/lib/ollamaClient.ts` + `.test.ts`
3. `src/renderer/lib/cosineSimilarity.ts` + `.test.ts`
4. `src/renderer/lib/contentHash.ts` + `.test.ts`
5. `src/renderer/stores/embeddingStore.ts` + `.test.ts` + `.indexing.test.ts`
6. `src/renderer/stores/ragStore.ts` + `.test.ts` + `.settings.test.ts`
7. `src/renderer/components/CommandPalette/RagResults.tsx` + `.test.tsx`
8. `src/renderer/components/CommandPalette/RagStatusBadge.tsx`
9. `src/renderer/lib/embeddingMigration.ts`

### 수정 (6개)
1. `src/renderer/components/CommandPalette/CommandPalette.tsx`
2. `src/renderer/stores/bookmarkStore.ts`
3. `src/renderer/App.tsx` (health check + 초기 인덱싱)
4. `src/renderer/lib/searchAll.ts` (RAG 결과 통합)
5. `src/renderer/lib/migration.ts`
6. `README.md` (RAG 설치 가이드)

## 리스크 & 완화 방안

| 리스크 | 심각도 | 완화 |
|--------|--------|------|
| 사용자의 Ollama 설치 장벽 | High | 배지 + 가이드 + 원클릭 커맨드 복사, README 상세 |
| CORS 차단 | High | 설치 가이드에 `OLLAMA_ORIGINS=*` 명시, 에러 Toast에 해결책 링크 |
| 벡터 저장소 풋프린트 증가 | Medium | Firestore 서브컬렉션, 500개 기준 성능 NFR 명시, 10,000+ 시 후속 최적화 SPEC |
| 임베딩 API 타임아웃 | Medium | 5초 타임아웃 + 실패 큐 재시도 |
| 스키마 불일치 (모델 변경) | Low | dimension 필드로 감지, 레거시 제거 + 재인덱싱 |
| 테스트용 Ollama mock 복잡 | Medium | vitest `vi.fn()` 기반 fetch mock + Response polyfill |

## 구현 순서 근거

1. **유틸 먼저**: ollamaClient + cosine + hash는 외부 의존 없이 테스트 가능
2. **Store 다음**: 저장 계약을 먼저 잠그면 인덱싱/검색 로직이 안정
3. **인덱싱 후 검색**: 데이터 있는 상태에서만 검색 테스트 의미 있음
4. **UI 마지막**: 모든 로직 안정 후 Command Palette에 안전하게 통합
5. **설정/마이그레이션 Phase 6**: MVP 동작 확인 후 사용자 제어 추가

## Run Phase 착수 전 확인 사항

- [x] 설계 결정 DEC-001~DEC-004 확정 (2026-04-19)
- [x] spec.md · acceptance.md · plan.md 작성 완료
- [ ] 실제 Ollama 설치 테스트 환경 준비
- [ ] `/moai run SPEC-SEARCH-RAG-001` 실행 준비

## 작업 로그

### 2026-04-19 (Plan 작성)
- Socratic 인터뷰 4문 완료 (Ollama 필수/플랫폼/범위/UI)
- spec.md 완성 (18 REQ + 4 NFR + 18 exclusions)
- acceptance.md 완성 (39 AC + 6 E2E 시나리오 + 7 엣지 케이스)
- plan.md 완성 (6 Phase + MX 계획)
