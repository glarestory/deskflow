---
id: SPEC-SEARCH-RAG-002
version: 0.1.0
status: draft
created: 2026-04-20
updated: 2026-04-20
author: ZeroJuneK
priority: medium
issue_number: 0
---

# SPEC-SEARCH-RAG-002: RAG 검색 확장 — Todo · Notes 시맨틱 검색

## HISTORY

| 버전 | 날짜 | 작성자 | 변경 내용 |
|------|------|--------|-----------|
| 0.1.0 | 2026-04-20 | ZeroJuneK | 최초 작성 (SPEC-SEARCH-RAG-001 후속 — Todo/Notes 확장) |

## 개요

SPEC-SEARCH-RAG-001에서 구축한 로컬 우선 RAG 인프라(Ollama 클라이언트 · embeddingStore · ragStore · Command Palette RAG 섹션)를 **Todo 아이템 및 Notes 단락(paragraph)**까지 확장한다.

"3주 전에 적어둔 마이그레이션 계획 메모 어디 있지?" → `Cmd+K` → "마이그레이션 계획" → Notes RAG 섹션에 해당 단락 노출.
"이번 스프린트에 하려던 리팩터 Todo 뭐였지?" → "레거시 리팩터" 검색 → Todo RAG 섹션에 매칭.

**Context Capsule(SPEC-CAPSULE-001)이 "맥락을 묶고", SPEC-SEARCH-RAG-001이 "북마크 맥락을 찾는다"면, SPEC-SEARCH-RAG-002는 "할 일과 메모 맥락까지 찾게" 하여 Deskflow를 개발자의 "Context Brain"으로 한 걸음 더 전진시킨다.**

**분류**: SPEC (기능 확장)
**성격**: Brownfield — 기존 embeddingStore 일반화 + notesStore 신규 + NotesWidget 리팩터
**선행 SPEC**: SPEC-SEARCH-RAG-001 (RAG 인프라), SPEC-TODO-002 (Todo 데이터 모델), SPEC-UI-001 (NotesWidget 존재), SPEC-UX-002 (Command Palette)
**후속 SPEC 예정**: SPEC-SEARCH-RAG-003 (Capsule 임베딩), SPEC-SEARCH-RAG-004 (Feed RSS 임베딩 — 동적/대량), SPEC-SEARCH-RAG-005 (Generator LLM 답변 합성)

## 사용자 스토리

**주 페르소나**: "북마크 외에도 Todo와 빠른 메모에 축적된 맥락을 자연어로 되찾고 싶은 개발자"

1. `Cmd+K`로 Command Palette 열기
2. "마이그레이션 계획" 자연어 입력 (4자 이상)
3. RAG가 쿼리를 임베딩 → 북마크 · Todo · Notes 청크 임베딩과 코사인 유사도 비교
4. `RAG:Bookmarks`, `RAG:Todos`, `RAG:Notes` 세 섹션으로 Top K 결과 표시 (유사도 점수 동반)
5. Todo 결과에 엔터 → Todo 위젯 포커스 이동. Notes 청크 결과에 엔터 → Notes 위젯 열기 (best-effort 하이라이트).

## 설계 결정 사항 (확정됨 2026-04-20)

### DEC-001: notesStore 신규 생성 (Zustand 기반 리팩터)

**현황**: `NotesWidget`이 `useState('')` + `storage.get('hub-notes')` / `storage.set('hub-notes', val)` 로 직접 자기 상태를 관리한다. 외부(RAG 파이프라인)에서 notes 변경을 관찰할 수 없음.

**결정**: Zustand 기반 `notesStore` 신설.
- 상태: `notes: string`, `loaded: boolean`
- 액션: `loadNotes()`, `setNotes(v: string)`
- 스토리지 키 `hub-notes` 그대로 유지 (데이터 호환, 마이그레이션 불필요)
- `NotesWidget`은 `useNotesStore` 구독으로 전환. textarea UI는 동일 유지. 디바운스(600ms)는 widget 레벨에서 유지하되 `setNotes`가 스토어에 즉시 반영 후 디바운스된 `storage.set` 만 수행.

**근거**:
- `bookmarkStore`, `todoStore`, `capsuleStore` 등 기존 위젯이 모두 Zustand 스토어를 통해 상태를 노출한다. Notes만 예외인 것은 RAG 훅 부착 불가 원인.
- 동일 패턴으로 `notesStore.subscribe` 또는 `setNotes` 내부에서 `embeddingStore.enqueueIndex` 호출이 가능.

**대안 (기각)**:
- 위젯 내부 `useEffect`에서 직접 embeddingStore 훅 호출: 위젯 언마운트 시 동작 불가 + 테스트 작성 난해.

### DEC-002: Notes 단락(Paragraph) 청킹 전략

**결정**: `\n\n+` (빈 줄 이상) 기준으로 Notes 텍스트를 단락으로 분할하여 각 단락을 개별 임베딩으로 인덱싱한다.

**근거**:
- Notes blob이 10,000자 이상으로 커지면 단일 임베딩은 의미 밀도 희석 → 상위 결과 품질 저하.
- 단락 단위 매칭이 사용자 경험과 일치 (메모에서 "어떤 부분"이 일치했는지 보여줄 수 있음).
- BM25 스타일 sparse 매칭 없이도 단락 수준 recall 확보.

**청크 크기 규칙**:
- 분할 후 40자 미만 단락은 **이전 단락에 병합** (노이즈 청크 방지).
- 분할 후 2000자 초과 단락은 2000자 경계에서 **추가 분할** (임베딩 토큰 상한 여유 확보).
- 빈 청크는 제외.

**청크 ID 규약**:
- `notes-chunk-{sha256(chunkText).slice(0,12)}` — 내용 해시 기반 안정 ID. 단락 순서가 바뀌거나 중간 삽입돼도 동일 텍스트는 동일 ID.
- parentId = `'global'` (현재 Notes는 단일 blob이므로 파티션 없음).

**대안 (기각)**:
- **Option A (whole-note embedding)**: 단순하지만 대용량 Notes에서 품질 저하. 기각.
- **Option C (sentence splitting)**: 너무 granular → 노이즈 증가, 상위 결과 다양성 저하. 기각.

### DEC-003: Todo 임베딩 Source — text 단일 필드 + 완료 Todo 기본 제외

**결정**:
- Todo 임베딩 source는 `todo.text` 단일 필드 (현재 스키마의 유일한 자유 텍스트).
- `done === true` 인 Todo는 **기본적으로 인덱싱 제외**. 설정 토글 `rag.indexCompletedTodos` (기본 `false`) 로 활성화 가능.

**근거**:
- Todo는 현재 `id / text / done / recurrence? / seriesId?` 구조. 의미 있는 자유 텍스트는 `text` 뿐.
- 완료 Todo를 포함하면 과거 이미 해결된 항목이 검색 상위를 점유 → 현재 할 일 탐색을 방해 (노이즈).
- 사용자가 완료 Todo까지 회상하고 싶을 경우 토글로 ON.

**삭제·완료 상태 전이 처리**:
- `removeTodo` → `embeddingStore.removeEmbedding(todoId)`.
- `toggleTodo` 로 `done: false → true` (완료) 전이 + `indexCompletedTodos === false` → `removeEmbedding`.
- `toggleTodo` 로 `done: true → false` (재개) 전이 → `enqueueIndex`.

### DEC-004: Unified embeddingStore — `kind` 필드로 일반화 (방안 A)

**결정**: 기존 `BookmarkEmbedding` 타입을 `GenericEmbedding`로 일반화하고 `kind: 'bookmark' | 'todo' | 'note-chunk'` discriminator를 도입한다. 단일 embeddingStore · ragStore.search 경로를 유지.

**근거**:
- ragStore.search 가 단일 Map을 순회하여 코사인 유사도 계산 → 단일 스토어가 성능과 구현 복잡도 모두 최적.
- 타입별 UI 섹션 분리는 순회 후 결과 단계에서 `kind` 로 그룹핑하면 충분.
- `todoEmbeddingStore`, `notesEmbeddingStore` 를 별도로 만들면 (방안 B) App.tsx 부트스트랩, 마이그레이션, Firestore I/O, UI 집계 로직이 3배로 늘어난다.

**마이그레이션**:
- 기존 `rag-embeddings` 키의 북마크 임베딩은 `kind` 필드가 없음. 앱 첫 기동 시 1회 `kind: 'bookmark'` 주입.
- 플래그 키: `rag-embeddings-kind-migrated` (boolean, 1회 설정 후 재실행 안 함).
- Firestore 쪽 기존 문서도 동일 로직으로 로드 시 필드 주입 (쓰기는 다음 upsert 때 반영).

### DEC-005: 타입별 결과 섹션 — `RAG:Bookmarks` / `RAG:Todos` / `RAG:Notes`

**결정**: Command Palette 에서 RAG 결과를 kind 기준으로 3개의 서브섹션으로 분리해 각 최대 Top 5 표시.

**근거**:
- 사용자는 "북마크에서 찾고 싶은지 / 메모에서 찾고 싶은지" 의도가 명확할 때가 많음. 섞여서 노출되면 인지 부하 증가.
- Socratic 인터뷰 결정: "UI grouping: Type-specific sections".

**동작**:
- 결과 정렬 순서: `RAG:Bookmarks` → `RAG:Todos` → `RAG:Notes` (사용자 기억 기반 고정 순서).
- 각 섹션은 독립적으로 Top 5까지 (전체 Top 15 가능).
- 섹션별 개별 on/off 설정 제공. 기본 모두 on.
- 한 섹션에 결과 0개면 해당 헤더는 렌더하지 않음 (빈 섹션 노이즈 방지).

### DEC-006: Feed · Capsule 명시적 제외

**결정**: Feed(RSS) 및 Capsule은 본 SPEC 범위에서 제외.

**근거**:
- Feed: 항목 수가 수백~수천 개로 급증 가능 + 외부 소스에서 동적으로 갱신됨 → 전용 인덱싱 전략 필요 (증분 갱신, TTL, 용량 상한). 별도 SPEC-SEARCH-RAG-004 권장.
- Capsule: Capsule 자체는 Todo·Bookmark 참조 집합이므로 Capsule 내용 검색은 자식 엔티티 검색으로 상당 부분 커버됨. Capsule name·description 임베딩은 ROI가 낮아 SPEC-SEARCH-RAG-003으로 연기.

## 요구사항

### 데이터 레이어 — 임베딩 일반화

#### REQ-001: GenericEmbedding 타입

**[Ubiquitous]** 시스템은 **항상** 임베딩 레코드가 `kind: 'bookmark' | 'todo' | 'note-chunk'` 필드를 포함하도록 저장·로드해야 한다.

#### REQ-002: 타입별 필드 허용

**[Ubiquitous]** `GenericEmbedding`은 공통 필드(`id`, `kind`, `contentHash`, `embedding`, `dimension`, `model`, `embeddedAt`) 외에 **항상** kind에 따른 선택 필드를 허용해야 한다:
- bookmark: `parentId` (categoryId)
- todo: (추가 필드 없음)
- note-chunk: `parentId` (`'global'`), `chunkOffset: number`, `chunkLength: number`, `textPreview: string` (원문 앞 100자)

### 데이터 레이어 — Todo 인덱싱

#### REQ-003: Todo 생성 시 임베딩 큐 예약

**[Event-Driven]** **When** `todoStore.addTodo(text)` 또는 `addRecurringTodo(...)` 가 호출되어 새 Todo가 생성되면, 시스템은 `text` 를 source로 `contentHash`를 계산하고 `embeddingStore.enqueueIndex([todoId])` 를 호출**해야 한다** (단, `done === true` 로 생성되는 경로는 없음).

#### REQ-004: Todo 수정 시 재인덱싱

**[Event-Driven]** **When** Todo의 `text` 가 변경되어 `contentHash` 가 달라지면, 시스템은 `enqueueIndex([todoId])` 를 호출해야 한다. `contentHash`가 동일하면 큐에 **넣지 않는다**.

> 참고: 현재 `todoStore` 에는 `text` 편집 액션이 없음. 본 SPEC에서 `updateTodoText(id, text)` 액션 추가 예정 (Phase 2 plan.md).

#### REQ-005: Todo 완료 전이 처리

**[Event-Driven]** **When** `toggleTodo(id)` 에 의해 `done: false → true` 로 전이되면:
- `rag.indexCompletedTodos === false` 인 경우, 시스템은 해당 Todo의 임베딩을 `removeEmbedding(todoId)` 로 제거**해야 한다**.
- `rag.indexCompletedTodos === true` 인 경우, 임베딩을 유지**해야 한다**.

**When** `done: true → false` 로 재개되면:
- 시스템은 `enqueueIndex([todoId])` 를 호출해야 한다 (임베딩이 이미 있으면 contentHash 동일로 스킵).

#### REQ-006: Todo 삭제 동기화

**[Event-Driven]** **When** `removeTodo(id)` 또는 `deleteTodoSeries(seriesId)` 가 호출되어 Todo가 제거되면, 시스템은 해당 `todoId` 또는 시리즈에 속한 모든 todoId의 임베딩을 `removeEmbedding` 으로 제거**해야 한다**.

#### REQ-007: 초기 배치 인덱싱 (Todo)

**[Event-Driven]** **When** 앱 초기화 체인에서 `todoStore.loadTodos()` 가 완료되면, 시스템은 임베딩이 없거나 `contentHash` 가 달라진 Todo 들을 모아 `enqueueIndex(missingTodoIds)` 를 호출하고 `runIndexBatch` 를 예약**해야 한다**. `done === true` 이고 `indexCompletedTodos === false` 인 Todo 는 제외.

### 데이터 레이어 — Notes 청킹 & 인덱싱

#### REQ-008: notesStore 신규

**[Ubiquitous]** 시스템은 **항상** `useNotesStore` (Zustand) 를 제공해야 하며 다음 형상을 만족해야 한다:
- 상태: `notes: string`, `loaded: boolean`
- 액션: `loadNotes(): Promise<void>`, `setNotes(v: string): void`
- 저장소 키: `'hub-notes'` (기존 유지)

#### REQ-009: NotesWidget 리팩터

**[Ubiquitous]** `NotesWidget` 은 **항상** `useNotesStore` 로부터 `notes` · `setNotes` 를 구독해야 하며, 내부 `useState('')` 를 제거해야 한다. 사용자 관점 동작(자동 저장 디바운스 600ms, 마운트 시 로드)은 변경되지 않는다.

#### REQ-010: Notes 단락 청킹 규칙

**[Ubiquitous]** 시스템은 **항상** Notes 원문을 다음 규칙으로 청크 배열로 변환할 수 있어야 한다 (`chunkNotes(text): NoteChunk[]`):
1. 정규식 `/\n{2,}/` 로 단락 분할.
2. 각 단락 `trim()` 후 길이 0이면 제외.
3. 길이 < 40 이면 직전 채택된 청크에 `'\n\n' + paragraph` 형태로 병합 (직전 청크가 없으면 일단 보관하고 다음 청크와 병합 시도).
4. 병합 후에도 최초 단락이 < 40 이면 단독 청크로 유지 (Notes 전체가 짧은 경우).
5. 길이 > 2000 이면 2000자 경계에서 추가 분할 (가능하면 공백 · 문장 경계에서 자르기; 안 되면 하드 컷).
6. 각 청크에 대해 `offset` (원문 내 시작 인덱스) 과 `length` 를 보존.
7. `id = 'notes-chunk-' + sha256(chunkText).slice(0, 12)` 로 부여. 동일 텍스트 청크는 동일 id.

#### REQ-011: Notes 변경 시 델타 재인덱싱

**[Event-Driven]** **When** `notesStore.setNotes(v)` 가 호출되어 Notes 본문이 변경되면 (300ms 디바운스 후), 시스템은:
1. 새 청크 집합 `newChunks = chunkNotes(v)` 를 계산한다.
2. 기존 note-chunk 임베딩 집합 `existing = embeddings.filter(kind === 'note-chunk')` 와 비교한다.
3. `existing` 에만 있는 청크는 `removeEmbedding(chunkId)` 호출. (REQ-012)
4. `newChunks` 에만 있는 청크는 `enqueueIndex([chunkId])` 호출.
5. 양쪽 모두 존재하는 동일 id 청크는 스킵 (contentHash 동일).

#### REQ-012: 사라진 청크 삭제

**[Event-Driven]** **When** Notes 편집 결과 기존 청크 id가 새 청크 집합에 존재하지 않게 되면, 시스템은 해당 청크의 임베딩을 `removeEmbedding` 으로 **제거해야 한다**.

#### REQ-013: 초기 배치 인덱싱 (Notes)

**[Event-Driven]** **When** 앱 초기화 체인에서 `notesStore.loadNotes()` 가 완료되면, 시스템은 `chunkNotes(notes)` 결과 중 임베딩이 없는 청크를 모아 `enqueueIndex` 해야 한다.

### 마이그레이션

#### REQ-014: 기존 북마크 임베딩에 kind 필드 주입

**[Event-Driven]** **When** 앱이 SPEC-002 버전으로 처음 기동되고 `localStorage`/`electron-store` 에 `rag-embeddings-kind-migrated` 플래그가 `true` 가 아니면, 시스템은 기존 모든 임베딩 레코드(로컬 및 Firestore 모두)의 `kind` 필드가 없을 때 `'bookmark'` 를 1회 주입**해야 한다**. 완료 후 플래그를 설정한다.

#### REQ-015: 마이그레이션 멱등성

**[Ubiquitous]** 마이그레이션은 **항상** 멱등해야 한다. 플래그가 설정된 이후 재실행되지 않으며, `kind` 가 이미 있는 레코드는 덮어쓰지 않는다.

### 검색 · 결과 통합 UI

#### REQ-016: RAG 결과 분류

**[Event-Driven]** **When** `ragStore.search(query)` 가 결과 배열을 반환하면, 시스템은 결과 각 항목을 `kind` 에 따라 `bookmarks` / `todos` / `noteChunks` 세 그룹으로 분류**해야 한다**.

#### REQ-017: 섹션별 렌더

**[Event-Driven]** **When** RAG 결과가 통합 검색에 포함되면, `CommandPalette` 는 활성화된 각 섹션에 대해 헤더(`RAG:Bookmarks` / `RAG:Todos` / `RAG:Notes`)와 해당 그룹의 Top 5 결과를 렌더**해야 한다**. 결과 0개인 섹션은 헤더를 숨긴다.

#### REQ-018: 섹션 순서 고정

**[Ubiquitous]** 섹션 표시 순서는 **항상** `RAG:Bookmarks` → `RAG:Todos` → `RAG:Notes` 로 고정한다.

#### REQ-019: 섹션별 Top K

**[Ubiquitous]** 각 섹션은 **항상** 유사도 threshold(기본 0.70) 이상 결과 중 Top 5까지만 표시한다. 전체 코사인 정렬은 ragStore 가 수행하며, UI에서 kind별로 다시 상위 5개를 슬라이싱.

#### REQ-020: Todo 결과 엔터 동작

**[Event-Driven]** **When** Todo RAG 결과에서 엔터가 눌리면, 시스템은 Command Palette를 닫고 Todo 위젯 영역으로 스크롤한 뒤 해당 Todo 항목을 강조(2초간 하이라이트)**해야 한다**. 하이라이트 구현이 어려우면 Palette 닫기 + 위젯 스크롤까지는 필수, 하이라이트는 best-effort.

#### REQ-021: Notes 청크 결과 엔터 동작

**[Event-Driven]** **When** Notes 청크 결과에서 엔터가 눌리면, 시스템은 Command Palette를 닫고 Notes 위젯 textarea를 포커스**해야 한다**. `chunkOffset` 을 이용한 스크롤/selection 설정은 best-effort (실패해도 에러 없이 무시).

#### REQ-022: Notes 청크 결과 프리뷰

**[Ubiquitous]** Notes 청크 결과 항목은 **항상** `textPreview` (원문 앞 100자) + "..." 말줄임표 + 유사도 점수를 렌더해야 한다. 북마크 아이콘 대신 Notes 아이콘 사용.

#### REQ-023: Todo 결과 프리뷰

**[Ubiquitous]** Todo 결과 항목은 **항상** `todo.text` 전체 (최대 80자 truncate) + `done === true` 이면 취소선 배지 + 유사도 점수를 렌더해야 한다.

### 설정

#### REQ-024: 섹션별 on/off 설정

**[Ubiquitous]** 시스템은 **항상** 다음 3개의 boolean 설정을 제공해야 한다:
- `rag.sections.bookmarks` (기본 true)
- `rag.sections.todos` (기본 true)
- `rag.sections.notes` (기본 true)

모두 `rag-settings` 키에 영속화.

#### REQ-025: 완료 Todo 인덱싱 토글

**[Ubiquitous]** 시스템은 **항상** `rag.indexCompletedTodos` (boolean, 기본 false) 설정을 제공해야 한다. 변경 시 즉시 반영되며:
- `false → true` 전이: 이전에 제외됐던 완료 Todo 들에 대해 `enqueueIndex` 를 호출.
- `true → false` 전이: 완료 상태인 Todo 임베딩들을 일괄 `removeEmbedding`.

#### REQ-026: 설정 UI 표시

**[Ubiquitous]** 설정 화면의 RAG 섹션은 **항상** 본 SPEC에서 추가되는 4개 토글(3개 섹션 + 완료 Todo 인덱싱)을 렌더해야 한다. SPEC-001의 기존 `rag.enabled` / `rag.similarityThreshold` 는 유지.

### 품질 & 회귀 방지

#### REQ-027: SPEC-001 회귀 금지

**[Ubiquitous]** SPEC-SEARCH-RAG-001 의 모든 AC(AC-001 ~ AC-039)는 **항상** 통과 상태를 유지해야 한다. 특히:
- 북마크 생성/수정/삭제 훅(AC-006~009)
- 배치 인덱싱(AC-010~014)
- 벡터 저장 경로(AC-015~018)
- 폴백 & 에러(AC-026~029)

#### REQ-028: 성능 NFR 준수

**[Ubiquitous]** 본 SPEC 추가 후에도 SPEC-001 NFR-002 의 검색 응답 < 800ms 기준을 **항상** 준수해야 한다. 인덱스 총량 기준은 NFR-001 로 갱신.

## 비기능 요구사항

### NFR-001: 성능

- Notes 10,000자(약 20~40 단락) 최초 인덱싱 < 30초
- Todo 100개 최초 인덱싱 < 30초
- 통합 검색 응답 < 1000ms (기준: 북마크 500 + Todo 100 + Notes 청크 40 = 약 640 벡터 비교)
- Notes 편집 델타 재인덱싱: 단락 1개 변경 시 < 3초 (디바운스 300ms + 임베딩 1회)

### NFR-002: 저장소 풋프린트

- Todo 100개: 384-dim float32 × 100 ≈ 150KB
- Notes 40 청크: 384-dim float32 × 40 ≈ 60KB
- 합계 (북마크 500 + Todo 100 + Notes 40) ≈ 1MB 미만 — Firestore 서브컬렉션 우회 유지 (NFR-003, SPEC-001)

### NFR-003: 테스트 커버리지

- 신규 코드 커버리지 85% 이상
- 기존 테스트 100% 통과
- 신규 테스트 추가 목표:
  - `chunkNotes` 단위 (병합/분할 엣지 10개 이상)
  - `notesStore` CRUD + 디바운스
  - `todoStore` embedding 훅 (addTodo/toggleTodo/removeTodo 각각)
  - `embeddingStore` kind-aware upsert/remove
  - 마이그레이션 idempotency
  - Command Palette 3-섹션 렌더 & 빈 섹션 숨김

### NFR-004: TypeScript strict 0 오류, ESLint 0 오류 유지

## 제약사항

- React 19, TypeScript strict, Zustand 5
- Electron + Web 빌드 동일 경로
- Ollama API `nomic-embed-text` (384 dim) 고정 — SPEC-001 유지
- Notes 청킹은 순수 JS (regex + loop), WASM 가속 없음
- CORS · 원격 Ollama 제약은 SPEC-001 와 동일

## 데이터 스키마

```typescript
// src/renderer/types/embedding.ts (확장)

export type EmbeddingKind = 'bookmark' | 'todo' | 'note-chunk'

export interface GenericEmbedding {
  id: string                 // linkId (bookmark) / todoId / noteChunkId
  kind: EmbeddingKind
  parentId?: string          // categoryId (bookmark) / 'global' (note-chunk) / undefined (todo)

  contentHash: string
  embedding: number[]        // float[384]
  dimension: number          // 384
  model: string              // 'nomic-embed-text'
  embeddedAt: string         // ISO-8601

  // note-chunk 전용
  chunkOffset?: number       // 원문 내 시작 오프셋
  chunkLength?: number       // 청크 길이
  textPreview?: string       // 프리뷰용 앞 100자
}

// BookmarkEmbedding은 타입 별칭으로 후방 호환 유지
export type BookmarkEmbedding = GenericEmbedding & { kind: 'bookmark'; parentId: string }

// src/renderer/lib/notesChunker.ts (신규)
export interface NoteChunk {
  id: string                 // 'notes-chunk-' + sha256(text).slice(0,12)
  text: string
  offset: number
  length: number
}

export function chunkNotes(notes: string): Promise<NoteChunk[]>  // sha256가 async이므로 Promise

// src/renderer/stores/notesStore.ts (신규)
export interface NotesState {
  notes: string
  loaded: boolean
  loadNotes: () => Promise<void>
  setNotes: (v: string) => void
}
```

### RagResult (확장)

```typescript
// SPEC-001 의 RagResult 를 kind-aware 로 확장
export interface RagResult {
  id: string                 // linkId / todoId / noteChunkId
  kind: EmbeddingKind
  parentId?: string
  score: number

  // note-chunk 전용 — UI 렌더에 사용
  textPreview?: string
  chunkOffset?: number
}
```

## 아키텍처 다이어그램

```
┌──────────────────────┐
│ CommandPalette       │
└──────┬───────────────┘
       │ ragStore.search(q)
       ▼
┌──────────────────────┐     ┌────────────────────────┐
│ ragStore             │────▶│ ollamaClient.embed(q)  │
└──────┬───────────────┘     └────────────────────────┘
       │ cosine vs all embeddings
       ▼
┌──────────────────────┐
│ embeddingStore       │  (bookmark + todo + note-chunk 혼합)
└──────┬───────────────┘
       │ sort DESC, threshold filter
       ▼
   RagResult[] (kind 혼합)
       │
       │ groupBy(kind)
       ▼
 ┌──────────────┬───────────┬────────────┐
 │ bookmarks    │ todos     │ note-chunks│
 └──────────────┴───────────┴────────────┘
       │ Top 5 per section
       ▼
 CommandPalette 3섹션 렌더

인덱싱 파이프라인:
  addTodo ──┐
  updateTodoText ──┼──▶ enqueueIndex ──▶ runIndexBatch ──▶ embeddings
  toggleTodo(완료 전이 규칙) ──┘            │                  │
                                           ▼                  ▼
  setNotes(debounced) ──▶ chunkNotes ──▶ diff ──▶ enqueue/remove
```

## UI 구조

```
CommandPalette
 ├── RAG 상태 배지 (SPEC-001 유지)
 ├── 검색 입력
 └── 결과 그룹 (쿼리 ≥ 4자)
      ├── 액션
      ├── 카테고리
      ├── 태그
      ├── RAG:Bookmarks   (Top 5, rag.sections.bookmarks && 결과 > 0)   ← 신규 그룹명
      ├── RAG:Todos       (Top 5, rag.sections.todos && 결과 > 0)       ← 신규
      ├── RAG:Notes       (Top 5, rag.sections.notes && 결과 > 0)       ← 신규
      └── 북마크 (fuzzy)
```

### 신규 파일

- `src/renderer/stores/notesStore.ts` + `.test.ts`
- `src/renderer/lib/notesChunker.ts` + `.test.ts`
- `src/renderer/lib/embeddingKindMigration.ts` + `.test.ts`
- `src/renderer/components/CommandPalette/RagTodoResultItem.tsx` + `.test.tsx` (또는 기존 ResultItem 확장)
- `src/renderer/components/CommandPalette/RagNoteResultItem.tsx` + `.test.tsx`

### 수정 파일

- `src/renderer/types/embedding.ts` — `GenericEmbedding` + `EmbeddingKind` + `BookmarkEmbedding` 별칭
- `src/renderer/stores/embeddingStore.ts` — kind-aware upsert/remove, 타입 교체
- `src/renderer/stores/ragStore.ts` — RagResult 에 kind/textPreview/chunkOffset 추가, search 가 kind 전파
- `src/renderer/stores/todoStore.ts` — addTodo/toggleTodo/removeTodo/deleteTodoSeries 에 embedding 훅, `updateTodoText` 신규 액션
- `src/renderer/components/NotesWidget/NotesWidget.tsx` — notesStore 구독으로 리팩터
- `src/renderer/lib/searchAll.ts` — RagResult kind 전파 → buildRenderItems 에 그룹 헤더 추가
- `src/renderer/components/CommandPalette/CommandPalette.tsx` — 3-섹션 렌더 + 빈 섹션 숨김
- `src/renderer/components/CommandPalette/ResultItem.tsx` — rag variant 가 kind 별 아이콘 분기 (또는 서브컴포넌트 분리)
- `src/renderer/App.tsx` — initRag 체인에 `notesStore.loadNotes` + 초기 Todo/Notes 인덱싱 enqueue 추가
- `src/renderer/lib/migration.ts` — embeddingKindMigration 파이프라인 연결
- `src/renderer/components/Settings/SidebarSettings.tsx` (또는 RAG 설정 위치) — 4개 신규 토글 렌더

## Exclusions (What NOT to Build)

- **Capsule 임베딩**: Capsule name/description 인덱싱은 SPEC-SEARCH-RAG-003 으로 연기
- **Feed(RSS) 임베딩**: 동적/대량 갱신 특성상 별도 SPEC-SEARCH-RAG-004 필요
- **Generator LLM 답변 합성 ("요약해줘" 류)**: SPEC-SEARCH-RAG-005
- **Notes 다중 문서 지원**: 현재 Notes 는 단일 blob. multi-note 구조는 범위 외
- **Notes 청크 원문 위치 실시간 하이라이트**: best-effort 만 (REQ-021)
- **완료 Todo 기본 검색**: 옵션 토글로만 활성화 (REQ-025)
- **다른 임베딩 모델 선택**: `nomic-embed-text` 고정 유지
- **sentence-level 청킹**: paragraph 청킹만 지원
- **BM25/하이브리드 재랭킹**: 순수 벡터만 유지
- **인덱싱 Web Worker 분리**: 메인 스레드 처리 유지 (SPEC-001 과 동일)
- **Firestore 서버 사이드 벡터 검색**: 클라이언트 사이드 코사인만
- **Todo 리스트 변경으로 인한 재정렬·서버 동기화**: 본 SPEC 범위 외 (SPEC-SYNC-002 등)
