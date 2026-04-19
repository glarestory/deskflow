# Implementation Plan — SPEC-SEARCH-RAG-002

## 개발 방법론

**TDD (RED-GREEN-REFACTOR)** — SPEC-001 의 인프라 확장 + 리팩터 (NotesWidget) 성격이므로 기존 테스트 회귀 0 유지를 RED 단계에서부터 안전망으로 삼는다.

## 구현 단계 (Phase)

총 5개 Phase. 각 Phase 는 독립 커밋 가능한 단위.

---

### Phase 1: 타입 일반화 + embeddingStore kind-aware + 마이그레이션

**목표**: 데이터 레이어 확장을 먼저 잠궈 이후 Phase 가 안전하게 올라탈 수 있게 한다.

**RED**
- `embedding.type.test.ts` (타입 레벨 컴파일 assertion 또는 런타임 shape 검사):
  - `GenericEmbedding` 에 `kind: 'bookmark' | 'todo' | 'note-chunk'` 가 필수 필드.
  - `BookmarkEmbedding` 이 `GenericEmbedding & { kind: 'bookmark'; parentId: string }` 별칭으로 호환.
- `embeddingStore.kind-aware.test.ts`:
  - `upsertEmbedding({ kind: 'todo', id: 't1', ... })` → Map에 저장 + 직렬화 시 kind 보존.
  - `upsertEmbedding({ kind: 'note-chunk', id: 'notes-chunk-abc', chunkOffset: 0, textPreview: '...' })` → 선택 필드 직렬화/역직렬화.
  - `removeEmbedding('t1')` → 그 id 만 삭제 (다른 kind 영향 없음).
  - `loadEmbeddings` 가 기존 스키마(`kind` 없음) 레코드를 로드 시 `kind: 'bookmark'` 자동 주입.
- `embeddingKindMigration.test.ts`:
  - 레거시 배열 입력 + 플래그 false → 모든 레코드에 `kind: 'bookmark'` 주입 후 저장 + 플래그 true.
  - 플래그 true → NO-OP (멱등성, REQ-015).
  - 일부 레코드에 이미 `kind` 있음 → 덮어쓰지 않음.

**GREEN**
- `src/renderer/types/embedding.ts` 확장:
  - `EmbeddingKind` 유니온, `GenericEmbedding` 인터페이스.
  - `BookmarkEmbedding` 을 별칭으로 (기존 import 호환).
- `src/renderer/stores/embeddingStore.ts` 수정:
  - state map 타입을 `Map<string, GenericEmbedding>` 으로 변경.
  - upsert/remove 시그니처 일반화.
  - `loadEmbeddings` 로드 로직에서 `kind` 결측 시 `'bookmark'` 주입.
- `src/renderer/lib/embeddingKindMigration.ts` 신규 — `capsuleMigration.ts` 패턴 따름.
- `src/renderer/lib/migration.ts` 에 파이프라인 연결 (App.tsx 부트스트랩 전 호출).

**REFACTOR**
- `firestoreEmbeddingStorage.ts` 의 로드 함수에도 동일 `kind` 주입 로직 공유 (util 분리).
- 기존 북마크 관련 코드에서 `BookmarkEmbedding` 참조가 `GenericEmbedding & kind:'bookmark'` narrowing 으로 자연스럽게 동작하도록 타입 가드 유틸 `isBookmarkEmbedding(e)` 추가.

**검증**: REQ-001, REQ-002, REQ-014, REQ-015

**MX 태그**:
- `embedding.ts`: `@MX:NOTE: [AUTO] kind discriminator 도입 — SPEC-SEARCH-RAG-002 REQ-001`
- `embeddingStore.ts` 기존 `@MX:ANCHOR` fan_in 갱신 (todoStore, notesStore 추가 의존으로 fan_in 증가)
- `embeddingKindMigration.ts`: `@MX:NOTE: [AUTO] SPEC-SEARCH-RAG-002 REQ-014 1회 마이그레이션`, `@MX:SPEC: SPEC-SEARCH-RAG-002`

---

### Phase 2: todoStore 임베딩 훅 + updateTodoText 신규 액션

**목표**: Todo 도메인에 임베딩 파이프라인 훅을 부착한다. Completion-aware 제외 규칙도 이 단계에서 확정.

**RED**
- `todoStore.embedding-hook.test.ts` (신규):
  - `addTodo('새 할 일')` → `enqueueIndex(['<newId>'])` 1회 호출.
  - `addRecurringTodo(...)` → `enqueueIndex` 1회 호출.
  - `toggleTodo(id)` `false→true` + `indexCompletedTodos=false` → `removeEmbedding(id)` 호출, `enqueueIndex` 호출 안 함.
  - `toggleTodo(id)` `false→true` + `indexCompletedTodos=true` → 둘 다 호출 안 함 (임베딩 유지).
  - `toggleTodo(id)` `true→false` → `enqueueIndex([id])` 호출 (재개).
  - `removeTodo(id)` → `removeEmbedding(id)` 호출.
  - `deleteTodoSeries(seriesId)` → 해당 시리즈의 모든 todoId 에 대해 `removeEmbedding` 호출.
  - `updateTodoText(id, newText)` → text 변경 시 `enqueueIndex([id])`, 동일 text 면 호출 안 함.
- Mocks: `embeddingStore.getState` spy 로 enqueueIndex/removeEmbedding 호출 횟수 검증.

**GREEN**
- `src/renderer/stores/todoStore.ts` 수정:
  - `addTodo` 말미에 `useEmbeddingStore.getState().enqueueIndex([newId])` 호출 (capsuleStore 훅 이후).
  - `addRecurringTodo` 말미에 동일.
  - `toggleTodo`: 기존 로직 이후 전이 방향에 따라 enqueue/remove 분기. `useRagStore.getState().indexCompletedTodos` 읽어 분기.
  - `removeTodo`: 기존 로직 이후 `removeEmbedding(id)` 호출.
  - `deleteTodoSeries`: 삭제된 시리즈 todoIds 수집 후 `removeEmbedding` 각각 호출.
  - `updateTodoText(id, text)` 신규 액션: contentHash 계산 선행은 embeddingStore 레벨에서 하므로 스토어는 단순 enqueue.
  - 타입에 `updateTodoText: (id: string, text: string) => void` 추가.
- 북마크 훅과 동일하게 순환 참조 회피를 위해 `useEmbeddingStore` 를 동적 import 로 호출 (SPEC-001 Phase 3 패턴 재사용).

**REFACTOR**
- addTodo / addRecurringTodo / updateTodoText 에서 enqueueIndex 호출을 `enqueueTodoIndex(id)` helper 로 추출 (중복 제거).
- completion 분기 로직을 `handleTodoCompletionChange(prev, next, id)` 로 분리.

**검증**: REQ-003 ~ REQ-006, REQ-025(부분 — 토글 시 동작)

**MX 태그**:
- `todoStore.ts` 파일 상단 `@MX:SPEC` 에 `SPEC-SEARCH-RAG-002` 추가 (기존 `SPEC-TODO-002, SPEC-CAPSULE-001` 와 병기).
- addTodo/toggleTodo 근처에 `@MX:NOTE: [AUTO] embeddingStore 훅 — SPEC-SEARCH-RAG-002 REQ-003/005`.

---

### Phase 3: notesStore 신규 + NotesWidget 리팩터

**목표**: Notes 상태를 Zustand로 이전하고 위젯을 구독 기반으로 전환. 아직 청킹/인덱싱은 붙이지 않음 (이 Phase 에서 리팩터 안정성을 먼저 검증).

**RED**
- `notesStore.test.ts` (신규):
  - 초기 상태 `notes === ''`, `loaded === false`.
  - `loadNotes()` 가 `storage.get('hub-notes')` 결과로 `notes` · `loaded=true` 설정.
  - `storage` 가 null 리턴 시 `notes === ''`, `loaded === true`.
  - `setNotes(v)` 가 즉시 state 갱신 + 디바운스 storage.set (fake timers 로 600ms 통과 검증).
  - 연속 `setNotes` 3회 → storage.set 은 마지막 값 1회만.
- `NotesWidget.test.tsx` 확장:
  - 마운트 시 `loadNotes` 호출되고 textarea 값이 store.notes 를 반영.
  - textarea 입력 → `setNotes` 호출.
  - 내부 `useState('')` 가 남아있지 않음을 검증하는 스냅샷/렌더 동작 테스트.

**GREEN**
- `src/renderer/stores/notesStore.ts` 신규 — `todoStore` 파일 구조 그대로 참고.
- 디바운스는 스토어 내부에서 `let timer: ReturnType<typeof setTimeout> | null` 모듈 스코프 + 600ms (기존 위젯 동작 보존).
- `NotesWidget.tsx` 리팩터:
  - `useState('')` + `timerRef` 제거.
  - `const { notes, setNotes, loadNotes, loaded } = useNotesStore()` 구독.
  - mount effect → `void loadNotes()`.
  - textarea onChange → `setNotes(e.target.value)`.
- `App.tsx` 초기화 체인에 `notesStore.loadNotes` 추가.

**REFACTOR**
- 디바운스 타이머 관리를 `useNotesStore` 내부 getter + setter 패턴으로 캡슐화.
- 기존 `@MX:NOTE: [AUTO] NotesWidget — 600ms 디바운스 자동 저장` 주석을 notesStore 로 이동하여 위치 정확성 유지.

**검증**: REQ-008, REQ-009, (초기 로드 부분의 REQ-013 예비)

**MX 태그**:
- `notesStore.ts`: `@MX:ANCHOR: [AUTO] notesStore — Notes 본문 상태 진입점`, `@MX:REASON: [AUTO] NotesWidget, RAG 파이프라인, App.tsx 의존 (fan_in >= 3)`, `@MX:SPEC: SPEC-SEARCH-RAG-002`.
- `NotesWidget.tsx` 상단의 기존 `@MX:SPEC: SPEC-UI-001` 에 `SPEC-SEARCH-RAG-002` 병기.

---

### Phase 4: notesChunker + notesStore 인덱싱 훅

**목표**: 단락 청킹 + 델타 재인덱싱 파이프라인 부착.

**RED**
- `notesChunker.test.ts` (신규):
  - 빈 문자열 → `[]`.
  - 단일 짧은 단락 (< 40자) → 단독 청크 1개 유지.
  - 3개 단락 (각 100자) → 3개 청크, offset 연속성 검증.
  - 40자 미만 단락 2개 + 200자 단락 1개 → 병합 규칙에 따라 2개 청크 (첫 두 개 병합).
  - 3000자 단일 단락 → 2000자 경계에서 분할 → 2개 청크 (공백 우선, 없으면 하드 컷).
  - 동일 텍스트 청크는 동일 id (해시 기반 안정성).
  - 이모지/한글/영어 혼합 유니코드 안전성.
- `notesStore.indexing.test.ts`:
  - 초기 `loadNotes` + 청크 2개 있는 텍스트 → `enqueueIndex(['notes-chunk-xxx', 'notes-chunk-yyy'])` 1회.
  - 로드 후 이미 embeddings 에 해당 id 가 있으면 해당 청크는 enqueue 제외.
  - `setNotes(new)` 가 300ms 디바운스 후 델타 계산:
    - 사라진 청크 → `removeEmbedding` 호출
    - 새 청크 → `enqueueIndex` 호출
    - 동일 청크 → 호출 안 함.

**GREEN**
- `src/renderer/lib/notesChunker.ts` 신규:
  - `chunkNotes(text: string): Promise<NoteChunk[]>` — 비동기 (sha256 Web Crypto 사용).
  - 단계: split → trim → merge-if-short → split-if-long → assign-id.
- `notesStore.setNotes` 확장:
  - 기존 즉시 state 업데이트 + 600ms storage.set 디바운스 유지.
  - 추가로 300ms 디바운스된 인덱싱 트리거 (별도 타이머).
  - 인덱싱 트리거: `chunkNotes(v)` → `embeddingStore` 의 현재 note-chunk 집합과 diff → enqueue/remove.
- `App.tsx` initRag 체인 확장:
  - `notesStore.loadNotes` 이후 `chunkNotes(notesStore.notes)` → 누락 청크 `enqueueIndex`.

**REFACTOR**
- 델타 계산 로직을 `diffNoteChunks(existing: Set<string>, next: NoteChunk[]): { added: string[]; removed: string[] }` 로 추출.
- 2000자 경계 분할 시 공백 탐색 backoff 를 재귀 helper 로 단순화.

**검증**: REQ-010 ~ REQ-013, REQ-007 (Todo 초기 배치와 대칭)

**MX 태그**:
- `notesChunker.ts`: `@MX:NOTE: [AUTO] 단락 청킹 — 40~2000자 규칙, SPEC-SEARCH-RAG-002 REQ-010`, `@MX:SPEC: SPEC-SEARCH-RAG-002`.
- `notesStore.ts`: setNotes 에 `@MX:NOTE: [AUTO] 델타 재인덱싱 — SPEC-SEARCH-RAG-002 REQ-011/012`.

---

### Phase 5: RagResult kind 확장 + Command Palette 3-섹션 UI + 설정

**목표**: 사용자 체감 기능 완성 — 타입별 섹션 렌더, 엔터 동작, 설정 UI.

**RED**
- `ragStore.search.kind.test.ts`:
  - embeddings 에 bookmark 2개 + todo 3개 + note-chunk 2개 + 쿼리 → 결과에 각 kind 전파.
  - threshold 이하는 제외 (SPEC-001 회귀).
  - 결과에 `textPreview`, `chunkOffset` (note-chunk만) 채워짐.
- `searchAll.rag-sections.test.ts`:
  - buildRenderItems 가 RagResult 를 kind 별로 3개 헤더 그룹으로 분리.
  - 섹션 순서 고정: bookmarks → todos → notes.
  - 빈 섹션(결과 0) 은 헤더 미렌더.
  - `rag.sections.todos === false` → todos 섹션 완전 숨김.
- `CommandPalette.rag-sections.test.tsx`:
  - 3개 kind 결과가 3개 헤더로 분리 렌더.
  - Todo 결과 엔터 → 팔레트 닫힘 + Todo 위젯 focus spy 호출.
  - Notes 청크 결과 엔터 → 팔레트 닫힘 + Notes textarea focus spy 호출.
  - RagNoteResultItem 렌더 시 textPreview + "..." + 점수 배지.
  - RagTodoResultItem 에 `done=true` Todo → 취소선 배지 렌더.
- `SidebarSettings.rag.test.tsx` 확장:
  - 3개 섹션 토글 + `indexCompletedTodos` 토글 렌더.
  - `indexCompletedTodos` false→true 전이 → 완료 Todo enqueue spy.
  - true→false 전이 → 완료 Todo removeEmbedding spy.

**GREEN**
- `src/renderer/types/rag.ts` (또는 기존 위치) RagResult 확장: `kind`, `textPreview?`, `chunkOffset?`.
- `ragStore.search` 내부에서 임베딩 레코드의 `kind` · 선택 필드를 결과에 전파.
- `searchAll.ts` / `buildRenderItems`:
  - RagResult 를 kind 별로 `bookmarks`/`todos`/`noteChunks` 로 그룹.
  - 각 그룹 Top 5 슬라이스.
  - 설정 `rag.sections.*` false 인 그룹은 빈 배열.
  - 헤더 항목 3개 삽입 순서 고정.
- `CommandPalette.tsx` 렌더 — 기존 RAG 헤더를 3개 헤더로 분기 + 빈 섹션 헤더 숨김.
- `ResultItem.tsx` rag variant 를 kind 별 서브 컴포넌트(`RagBookmarkResultItem` / `RagTodoResultItem` / `RagNoteResultItem`)로 분리. 공통 점수 배지 + 포맷 유틸 재사용.
- Todo 결과 엔터 액션: `useTodoStore` 의 활성 위젯 이벤트 또는 DOM selector `document.querySelector('[data-todo-id="..."]')?.scrollIntoView + focus` best-effort.
- Notes 결과 엔터: `document.querySelector('textarea[data-widget="notes"]') ?? ...` focus + `setSelectionRange(offset, offset+length)`.
- Settings UI 에 4개 토글 추가 (`rag.sections.bookmarks`, `.todos`, `.notes`, `rag.indexCompletedTodos`). 영속화 키 `rag-settings` (기존) 에 확장 필드.
- `ragStore.indexCompletedTodos` 상태 + setter. setter 가 전이 감지 시 todoStore 를 읽어 대량 enqueue / removeEmbedding.

**REFACTOR**
- 3-섹션 그룹핑 로직 `groupRagResults(results, settings): { bookmarks; todos; notes }` 순수 함수로 추출.
- 헤더 삽입 로직을 `buildRagSections(grouped): RenderItem[]` 로 추출.
- Notes 청크 결과 렌더 시 프리뷰 truncate 유틸 `truncatePreview(s, 100)` 재사용.

**검증**: REQ-016 ~ REQ-026, REQ-027(회귀 확인), REQ-028(성능 측정)

**MX 태그**:
- `ragStore.ts`: search 함수 근처 `@MX:NOTE: [AUTO] kind 전파 + 3-섹션 입력 — SPEC-SEARCH-RAG-002 REQ-016`.
- `CommandPalette.tsx`: RAG 섹션 블록 주변 `@MX:NOTE: [AUTO] 3-섹션 렌더 — SPEC-SEARCH-RAG-002 REQ-017/018`.
- `RagTodoResultItem.tsx` / `RagNoteResultItem.tsx`: 파일 상단 `@MX:NOTE: [AUTO] SPEC-SEARCH-RAG-002 REQ-022/023`, `@MX:SPEC: SPEC-SEARCH-RAG-002`.

---

## 파일 변경 범위 추정

### 신규 (8개)

1. `src/renderer/stores/notesStore.ts` + `.test.ts`
2. `src/renderer/lib/notesChunker.ts` + `.test.ts`
3. `src/renderer/lib/embeddingKindMigration.ts` + `.test.ts`
4. `src/renderer/components/CommandPalette/RagTodoResultItem.tsx` + `.test.tsx`
5. `src/renderer/components/CommandPalette/RagNoteResultItem.tsx` + `.test.tsx`
6. `src/renderer/stores/todoStore.embedding-hook.test.ts`
7. `src/renderer/stores/notesStore.indexing.test.ts`
8. `src/renderer/stores/ragStore.search.kind.test.ts`

### 수정 (10개)

1. `src/renderer/types/embedding.ts`
2. `src/renderer/stores/embeddingStore.ts` (kind-aware upsert/load)
3. `src/renderer/stores/ragStore.ts` (RagResult kind, indexCompletedTodos, 섹션 설정)
4. `src/renderer/stores/todoStore.ts` (embedding 훅 + updateTodoText)
5. `src/renderer/components/NotesWidget/NotesWidget.tsx` (notesStore 구독)
6. `src/renderer/lib/searchAll.ts` (3-섹션 그룹핑)
7. `src/renderer/components/CommandPalette/CommandPalette.tsx` (3-섹션 렌더 + 엔터 핸들러)
8. `src/renderer/components/CommandPalette/ResultItem.tsx` (rag variant 분기)
9. `src/renderer/App.tsx` (initRag 체인 확장)
10. `src/renderer/lib/migration.ts` (embeddingKindMigration 추가)
11. `src/renderer/components/Settings/SidebarSettings.tsx` — 4개 토글 추가 (실제 위치는 현행 설정 UI 파일에 맞춤)

## MX 태그 계획 (요약)

| 파일 | 태그 | 용도 |
|------|------|------|
| `embedding.ts` | @MX:NOTE | kind discriminator 도입 |
| `embeddingKindMigration.ts` | @MX:NOTE + @MX:SPEC | 1회 멱등 마이그레이션 |
| `todoStore.ts` | @MX:SPEC 병기 + @MX:NOTE | 임베딩 훅 3곳 |
| `notesStore.ts` | @MX:ANCHOR + @MX:REASON + @MX:SPEC | fan_in >= 3 진입점 |
| `notesChunker.ts` | @MX:NOTE + @MX:SPEC | 청킹 규칙 |
| `ragStore.ts` | 기존 @MX:ANCHOR 갱신 + @MX:NOTE | kind 전파 |
| `CommandPalette.tsx` | @MX:NOTE | 3-섹션 렌더 |
| `RagTodoResultItem.tsx` / `RagNoteResultItem.tsx` | @MX:NOTE + @MX:SPEC | 신규 서브컴포넌트 |

## 리스크 & 완화 방안

| 리스크 | 심각도 | 완화 |
|--------|--------|------|
| NotesWidget 리팩터로 인한 기존 UX 회귀 (디바운스·자동저장 깨짐) | High | Phase 3 에서 RED 테스트로 디바운스 600ms 저장 동작 잠금. 수동 회귀: 장문 입력 → 창 닫기 → 재오픈 값 보존 확인. |
| embeddingStore 일반화로 인한 기존 북마크 테스트 대량 회귀 | High | Phase 1 RED 부터 `BookmarkEmbedding` 별칭 검증 + 기존 `bookmarkStore.embedding-hook.test.ts` 를 먼저 녹색 유지. |
| 단락 청킹 규칙의 엣지 케이스 (모든 단락 < 40자) | Medium | notesChunker.test.ts 에 최소 10개 엣지 케이스 포함. 단일 짧은 청크 허용 규칙 명문화(REQ-010 step 4). |
| `indexCompletedTodos` 토글 전이 시 대량 enqueue/remove 폭주 | Medium | 설정 변경 핸들러에서 일괄 `runIndexBatch` 큐잉만 하고 UI는 ProgressToast 재사용. 배치 크기 SPEC-001 값(10) 유지. |
| note-chunk 임베딩이 Firestore subcollection 문서 수를 급증 | Medium | NFR-002 에서 풋프린트 재계산. Notes 40 청크 규모까지 안전. 10,000청크 이상은 별도 최적화 SPEC 권장. |
| Todo `updateTodoText` 신규 액션 호출부 부재 (기존 UI 에 text 편집 UI 없음) | Low | 본 SPEC 에서는 스토어 액션과 훅만 제공. UI 편집 기능은 별도 SPEC (TodoWidget 편집 기능)로 분리. 테스트는 스토어 직접 호출로 검증. |
| 기존 `rag-embeddings` 로컬 스토리지 스키마 변경으로 이전 버전에서 문제 | Low | Phase 1 마이그레이션이 멱등 + 레거시 `kind` 결측만 주입하므로 이전 버전은 kind 무시하고도 계속 로드 가능. |
| Notes textarea focus/selectionRange 브라우저 호환성 | Low | best-effort 규정(REQ-021). 실패 시 silent fallback. 단위 테스트는 spy 호출 여부만 검증. |

## 구현 순서 근거

1. **타입·스토어 레이어 먼저 (Phase 1)**: 이후 Phase 의 모든 훅이 `GenericEmbedding`에 의존하므로 kind-aware 경로를 먼저 잠그지 않으면 리팩터 범위가 곳곳으로 번진다.
2. **Todo (Phase 2) 를 Notes (Phase 3-4) 보다 먼저**: todoStore 는 구조적으로 더 단순 (text 단일 필드). Notes 는 청킹 + 위젯 리팩터 2개 축이 동시에 움직이므로 위험. 쉬운 것부터.
3. **NotesWidget 리팩터(Phase 3) 와 청킹(Phase 4) 분리**: 한 번에 하면 회귀 원인 추적 어려움. Phase 3 에서 순수 리팩터만 검증 → Phase 4 에서 인덱싱 올림.
4. **UI 섹션 (Phase 5) 마지막**: 데이터 파이프라인이 안정된 뒤에야 3-섹션 렌더의 빈/비빈 분기를 의미 있게 테스트 가능.

## Run Phase 착수 전 확인 사항

- [x] 설계 결정 DEC-001 ~ DEC-006 확정 (2026-04-20)
- [x] spec.md · plan.md · acceptance.md 작성 완료
- [ ] `/moai run SPEC-SEARCH-RAG-002` 실행 준비
- [ ] SPEC-001 테스트 스위트 현재 상태 재확인 (회귀 기준선)

## 작업 로그

### 2026-04-20 (Plan 작성)

- Socratic 인터뷰 4문 완료 (대상 · 범위 · UI 그룹핑 · Feed 제외).
- spec.md 완성 (28 REQ + 4 NFR + 12 exclusions + 6 design decisions).
- acceptance.md 완성 (32 AC + 5 E2E 시나리오 + 5 엣지 케이스).
- plan.md 완성 (5 Phase + MX 계획 + 8 리스크).
