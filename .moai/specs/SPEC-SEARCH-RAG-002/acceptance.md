# Acceptance Criteria — SPEC-SEARCH-RAG-002

## 수락 기준 (AC) 체크리스트

### A. 마이그레이션 & 데이터 일반화

- **AC-001**: 앱이 SPEC-002 버전으로 처음 기동되고 플래그 `rag-embeddings-kind-migrated` 가 없거나 `false` 인 경우, 시스템은 기존 `rag-embeddings` 의 모든 레코드에 `kind: 'bookmark'` 를 주입하고 플래그를 `true` 로 설정한다.
- **AC-002**: 플래그가 이미 `true` 이면 마이그레이션은 NO-OP (멱등성). `loadEmbeddings` 호출 횟수에 관계없이 기존 `kind` 필드가 덮어써지지 않는다.
- **AC-003**: 마이그레이션 이후 `embeddingStore` 의 모든 Bookmark 레코드는 `kind === 'bookmark'` 조건으로 필터링 가능해야 한다. 기존 북마크 검색 동작은 변경 없음.

### B. Todo 인덱싱

- **AC-004**: `todoStore.addTodo('새 할 일')` 호출 시 새로 생성된 todoId 가 `embeddingStore.indexingQueue` 에 push 된다.
- **AC-005**: `addRecurringTodo(...)` 호출 시에도 동일하게 enqueue 된다.
- **AC-006**: `updateTodoText(id, newText)` 호출 시 `contentHash` 가 달라지면 해당 todoId 가 enqueue 된다. 동일 text 면 enqueue 되지 않는다.
- **AC-007**: `toggleTodo(id)` 로 `done: false → true` 전이 발생 + `rag.indexCompletedTodos === false` 일 때, 해당 todoId 임베딩이 `embeddings` Map 에서 제거된다.
- **AC-008**: `toggleTodo(id)` 로 `done: true → false` 재개 전이 발생 시, 해당 todoId 가 enqueue 된다. 임베딩이 이미 존재하고 contentHash 동일하면 스킵.
- **AC-009**: `removeTodo(id)` 호출 시 해당 todoId 의 임베딩이 Map 에서 제거된다 (북마크 삭제 동기화와 동일 패턴).
- **AC-010**: `deleteTodoSeries(seriesId)` 호출 시 시리즈에 속한 모든 todoId 의 임베딩이 일괄 제거된다.
- **AC-011**: 앱 초기화 체인에서 `todoStore.loadTodos()` 완료 후, embeddings 에 없는 (그리고 제외 규칙에 해당하지 않는) 모든 todoId 가 enqueue 되어 background 배치 인덱싱이 시작된다.

### C. Notes 청킹 & 인덱싱

- **AC-012**: `chunkNotes(text)` 가 빈 문자열 입력에 대해 빈 배열 `[]` 를 반환한다.
- **AC-013**: 단일 단락 (예: 120자) 입력 → 청크 1개, `offset === 0`, `length === 120`, id 는 `notes-chunk-` + 12자 hex prefix.
- **AC-014**: 세 단락(각 100자)이 빈 줄로 구분된 입력 → 청크 3개. 인접 청크의 offset 은 단조증가하며 (offset_n + length_n) ≤ offset_{n+1}.
- **AC-015**: 20자 단락 2개 + 200자 단락 1개 구성의 입력 → 짧은 두 단락이 병합되어 총 2개 청크로 반환된다. 병합된 청크의 `length` 는 원본 합과 구분자 길이를 포함한다.
- **AC-016**: 3000자 단일 단락 입력 → 2000자 경계에서 분할되어 2개 청크가 된다. 가능한 경우 공백·문장 경계에서 잘리며, 불가능하면 하드 컷으로도 동작한다.
- **AC-017**: 동일한 텍스트 청크는 동일한 `id` 를 갖는다 (sha256 기반 안정성). 서로 다른 위치에 동일 청크가 있어도 id 충돌로 처리되지 않도록 offset 이 구분.
- **AC-018**: `notesStore.loadNotes` 완료 후, 기존 note-chunk 임베딩이 없는 청크들이 enqueue 된다.
- **AC-019**: `notesStore.setNotes(v)` 호출 후 300ms 디바운스 경과 시, `chunkNotes(v)` 결과를 기존 note-chunk 집합과 비교:
  - 사라진 청크 → `removeEmbedding` 호출
  - 새 청크 → `enqueueIndex` 호출
  - 동일 청크 → 어떤 호출도 발생하지 않음
- **AC-020**: 기존 Notes 위젯 UX 변경 없음 — 텍스트 입력 시 600ms 디바운스 후 `storage.set('hub-notes', v)` 호출, 재시작 후 본문 복원.

### D. 검색 결과 UI 섹션

- **AC-021**: `ragStore.search(query)` 결과가 `kind` 필드를 정확히 전파한다 (`bookmark` / `todo` / `note-chunk`).
- **AC-022**: Command Palette 쿼리 4자 이상 입력 시, 결과가 `RAG:Bookmarks`, `RAG:Todos`, `RAG:Notes` 3개 헤더로 분리되어 표시된다. 헤더 순서는 고정.
- **AC-023**: 각 RAG 섹션은 유사도 threshold 이상 결과 중 최대 Top 5 만 표시한다.
- **AC-024**: 결과가 0개인 섹션의 헤더는 렌더하지 않는다 (빈 섹션 노이즈 제거).
- **AC-025**: Todo RAG 결과 항목은 `todo.text` (80자 truncate) + 유사도 점수 배지를 렌더한다. `done === true` Todo 는 텍스트에 취소선 스타일이 적용된다.
- **AC-026**: Notes 청크 RAG 결과 항목은 `textPreview` (앞 100자) + "..." + 유사도 점수 배지를 렌더한다. Notes 아이콘 사용.
- **AC-027**: Todo RAG 결과에서 엔터 키 → Command Palette 가 닫히고 Todo 위젯 영역으로 스크롤 (하이라이트는 best-effort).
- **AC-028**: Notes 청크 RAG 결과에서 엔터 키 → Command Palette 가 닫히고 Notes textarea 가 포커스된다 (chunkOffset 기반 selection 은 best-effort, 실패해도 에러 없음).

### E. 설정

- **AC-029**: 설정 화면에 4개의 RAG 토글이 신규로 렌더된다:
  - `RAG 섹션: 북마크` (기본 on)
  - `RAG 섹션: 할 일` (기본 on)
  - `RAG 섹션: 빠른 메모` (기본 on)
  - `완료된 할 일도 검색에 포함` (기본 off)
- **AC-030**: `rag.sections.todos` 를 off 로 변경 → 즉시 Command Palette 의 Todo 섹션이 숨겨진다. embeddings 는 유지 (검색만 가려짐).
- **AC-031**: `rag.indexCompletedTodos` 를 off → on 으로 전환 시, 현재 `done === true` 인 Todo 들이 일괄 enqueue 되어 background 배치 인덱싱이 시작된다.
- **AC-032**: `rag.indexCompletedTodos` 를 on → off 로 전환 시, 현재 `done === true` 인 Todo 들의 임베딩이 일괄 `removeEmbedding` 된다.

### F. 성능 & 품질 게이트

- **AC-033**: Notes 10,000자 (약 20~40 단락) 최초 인덱싱 < 30초 (mock 환경 기준은 청킹+enqueue 만 측정, 실제 Ollama 는 수동 검증).
- **AC-034**: Todo 100개 최초 인덱싱 < 30초 (동일 기준).
- **AC-035**: 통합 검색 응답 < 1000ms (북마크 500 + Todo 100 + Notes 청크 40 기준, 디바운스 제외).
- **AC-036**: TypeScript strict 0 오류 / ESLint 0 오류 유지.
- **AC-037**: 신규 테스트 추가 후 전체 테스트 100% 통과 (SPEC-001 의 기존 AC 전 범위 회귀 없음).
- **AC-038**: 신규 코드 커버리지 85% 이상.

## 테스트 시나리오

### T-001: Todo 추가 → 검색 → 이동 (Happy path)

1. 앱 기동, Ollama 준비됨 (녹색 배지).
2. TodoWidget 에서 "레거시 Auth 리팩터" 추가.
3. 자동 인덱싱 Toast 진행 → 완료 (1~3초).
4. `Cmd+K` → "레거시 리팩터" 입력 (4자 이상).
5. 300ms 후 `RAG:Todos` 섹션에 해당 Todo 가 유사도 점수와 함께 상위 노출.
6. 엔터 → Palette 닫힘, TodoWidget 으로 스크롤.

### T-002: Notes 편집 → 델타 재인덱싱

1. NotesWidget 에 단락 3개 작성 (각 100자): 마운트 후 자동 저장 + 인덱싱.
2. 중간 단락을 완전히 다른 100자 내용으로 교체.
3. 300ms 디바운스 후 델타 계산:
   - 사라진 청크 1개 → `removeEmbedding`
   - 새 청크 1개 → `enqueueIndex`
   - 변경 없는 청크 2개 → 호출 없음
4. `Cmd+K` → 새 내용 관련 키워드 검색 → `RAG:Notes` 섹션 상위에 해당 청크 프리뷰.
5. 엔터 → Notes textarea 포커스.

### T-003: 완료 Todo 기본 제외 → 설정 켜면 포함

1. 완료 상태 Todo "2025 Q4 회고" 존재. 초기 설정 `indexCompletedTodos = false`.
2. `Cmd+K` → "회고" 검색 → Todo 섹션에 결과 없음 (완료 제외).
3. 설정에서 `완료된 할 일도 검색에 포함` on.
4. 일괄 enqueue + 배치 인덱싱 Toast.
5. 동일 "회고" 검색 → 이제 `RAG:Todos` 섹션에 결과 상위 노출 (취소선 배지).
6. 설정 off 로 복귀 → 완료 Todo 임베딩 일괄 제거 → 다시 검색 결과 0.

### T-004: 마이그레이션 1회 실행

1. 기존 SPEC-001 상태에서 북마크 10개 임베딩 저장됨. 플래그 없음.
2. SPEC-002 버전 앱 첫 기동 → 마이그레이션 실행, 10개 레코드에 `kind: 'bookmark'` 주입, 플래그 `true` 설정.
3. 북마크 검색 동작 회귀 없음 확인 (SPEC-001 AC-019~025 통과).
4. 앱 재기동 → 플래그 true 이므로 마이그레이션 NO-OP, 로그에도 재실행 없음.

### T-005: 3-섹션 렌더 + 빈 섹션 숨김

1. 북마크 500 + Todo 0 + Notes 0 상태.
2. 쿼리 "디자인 도구" 입력 → 유효 매칭.
3. 결과: `RAG:Bookmarks` 만 렌더, `RAG:Todos` / `RAG:Notes` 헤더는 숨김.
4. Todo 3개 추가 + 인덱싱 완료 → 동일 쿼리 → 이제 Todo 섹션도 렌더 (관련성 있는 경우).
5. `rag.sections.bookmarks` off → Bookmarks 섹션만 숨기고 Todo 섹션은 유지.

## 엣지 케이스

- **EC-001**: `notesStore` 가 load 되기 전(loaded=false) 에 RAG 쿼리 발생 → 청크 인덱스가 아직 없으므로 Notes 섹션 결과 0. 에러 없이 기존 fuzzy 동작.
- **EC-002**: 모든 Notes 단락이 < 40자 (예: 한 줄짜리 bullet 목록 20개) → 병합 규칙 적용 후 최소 1개 청크 (전체 병합) 또는 여러 개 병합. 청크 0개로 떨어지지 않음. `chunkNotes` 가 빈 결과를 반환하는 경우는 입력 전체가 빈 문자열 뿐.
- **EC-003**: Todo `text` 가 이모지만으로 구성 (예: "🚀🔥") → nomic-embed-text 가 의미 있는 벡터를 반환하지 못할 수 있으나, threshold 필터로 자연히 낮은 유사도 결과 제외.
- **EC-004**: Notes 텍스트가 정확히 2000자 경계에 한 단락 → 분할 기준 "2000자 초과" 엄격 비교로 단일 청크 유지. 2001자 부터 분할.
- **EC-005**: 동일 내용 단락을 복사-붙여넣기로 문서 내 2개 위치에 존재 → 동일 청크 id 에 대해 `upsertEmbedding` 이 2회 호출되지만 Map 덮어쓰기로 최종 1개 저장. offset 은 마지막 호출 기준으로 반영됨 (둘 중 어느 것이든 유사도 결과에는 영향 없음 — 청크 내용은 동일).
- **EC-006**: `indexCompletedTodos` 전환 직후 배치 인덱싱 중에 앱 종료 → 다음 기동 시 REQ-007 (AC-011) 초기 배치가 누락 todoId 를 재enqueue 하여 완주. 부분 실패 복구 패턴 (SPEC-001 AC-011 재사용).

## 완료 정의 (Definition of Done)

- [ ] AC-001 ~ AC-038 모두 통과
- [ ] T-001 ~ T-005 자동화 (Vitest + RTL + mock Ollama + fake timers)
- [ ] 수동 테스트:
  - 실제 Ollama 환경에서 Todo 20개 + Notes 5,000자 (약 10 단락) 인덱싱 + 각 도메인 검색 5쿼리 이상 확인
  - 설정 토글 전환으로 인한 대량 enqueue/remove 동작 + ProgressToast 표시 확인
- [ ] TypeScript strict 0 오류, ESLint 0 오류
- [ ] 신규 코드 커버리지 85% 이상
- [ ] 기존 전체 테스트 회귀 0 (SPEC-001 의 모든 AC 통과 유지)
- [ ] README 에 "Notes · 할 일 RAG 검색" 추가 섹션 작성 (Ollama 요구사항은 SPEC-001 참조)
- [ ] `@MX:SPEC: SPEC-SEARCH-RAG-002` 태그 부착 (신규 파일 및 주요 수정 파일)
