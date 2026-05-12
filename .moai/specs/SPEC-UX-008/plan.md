# SPEC-UX-008: 구현 계획

## 기술 접근 방식

본 SPEC 은 SPEC-UX-006(링크 정렬) + SPEC-UX-007(카테고리 카드 정렬, 전역 편집 모드) 위에 **카테고리 간 링크 이동**을 얹는다. 핵심 구조 변경은 다음 한 줄로 요약된다.

> 현재 두 개로 격리된 `DndContext` (WidgetLayout 의 카테고리 DndContext + 각 BookmarkCard 내부의 링크 DndContext) 를 **WidgetLayout 의 단일 DndContext** 로 통합한다.

이 통합 없이는 dnd-kit 이 카테고리 간 이동을 인지할 수 없다. 5개의 외과적(Surgical) 변경 영역으로 구성된다.

1. **WidgetLayout BookmarkCard grid DndContext 확장** — 카테고리 정렬 핸들러(`handleCategoryDragEnd`) 를 항목 종류(category/link) 분기로 확장. `onDragOver` / `onDragEnd` / `DragOverlay` 추가. collisionDetection 을 `closestCorners` 로 명시.
2. **BookmarkCard 내부 DndContext 제거** — `<DndContext>` 래퍼 제거, `useSensors` 도 제거(상위 DndContext 의 sensor 가 활성). `SortableContext` 는 유지하되 `id={category.id}` 명시. `useDroppable` 추가로 빈 카테고리도 drop target 화. 로컬 `handleDragEnd` 제거(상위로 이전).
3. **SortableLink data prop 강화** — `useSortable({ id, data: { type: 'link', categoryId } })` 로 변경. `WidgetLayout` 의 onDragOver/onDragEnd 가 active 의 카테고리를 즉시 식별 가능하게 함.
4. **bookmarkStore.moveLinkBetweenGroups 신규 액션** — 단일 트랜잭션 내에서 소스 제거 + 타겟 삽입 + 영속화. 부가 메타데이터(favorite/tags/usage) 보존.
5. **테스트 묶음** — store 단위 테스트, BookmarkCard 단위 테스트, WidgetLayout 통합 테스트, 즐겨찾기 invariant 테스트.

### 핵심 결정 사항

**결정 D1 — DndContext 위치 (REQ-UX-008-001, REQ-UX-008-002)**

`WidgetLayout.tsx:553` 의 기존 카테고리 전용 DndContext 를 **단일 DndContext** 로 확장한다. BookmarkCard 내부 DndContext 는 제거한다.

**대안 비교**:
- 대안 A: WidgetLayout 단일 DndContext 로 통합 (선택)
- 대안 B: BookmarkCard 들 위에 카테고리 grid DndContext 와 별개로, "링크 이동 전용" DndContext 를 추가 → dnd-kit 의 단일 DndContext multi-container 패턴과 충돌, 두 컨텍스트 동시 활성 시 sensor 점유 경쟁

**이유**:
1. dnd-kit 공식 multi-container sortable 예시(Storybook) 는 모두 단일 DndContext 패턴
2. SPEC-UX-007 의 D2 격리 결정은 "카테고리 자체 정렬과 링크 정렬을 분리" 가 목적이었으나, 본 SPEC 의 cross-category 이동 요구사항은 그 격리를 해제하는 것을 요구
3. 단일 DndContext 안에서 `active.data.current.type` 으로 항목 종류를 분기하면 카테고리 정렬과 링크 이동을 깨끗하게 공존 가능

**결정 D2 — collisionDetection 알고리즘 (REQ-UX-008-011)**

`closestCorners` 를 사용한다.

**대안 비교**:
- `closestCenter` (dnd-kit 기본): 카드 중심점 기준. 빈 카테고리의 좁은 placeholder 영역(48px) 을 포착하기 어려움. ❌
- `closestCorners`: 항목의 4개 모서리 중 가장 가까운 것 기준. droppable 컨테이너 경계 인식 우수. 다중 컨테이너 sortable 에 권장. ✅ (선택)
- `pointerWithin`: 포인터가 영역 내부에 있을 때만 detection. 빈 카테고리 인식에 최적이지만 카드 가장자리 정확도가 낮음. △
- `rectIntersection`: 사각형 교차 기반. 카드 크기에 영향. △

**이유**:
1. `closestCorners` 는 dnd-kit 공식 docs 가 multi-container Sortable 에 권장하는 알고리즘
2. 빈 카테고리(min-height 48px) 도 droppable 로 정확히 인식
3. 카테고리 카드 자체의 정렬(SPEC-UX-007) 과도 호환 (카테고리 카드 크기 240px 이상)
4. PointerWithin 의 가장자리 정확도 문제 회피

**결정 D3 — useDroppable id 명명 (REQ-UX-008-003)**

카테고리 droppable id 는 `category.id` (예: `'cat-1'`) 를 그대로 사용한다. 링크 id (예: `'l1'`) 와 충돌하지 않는다는 것을 grep 으로 검증.

```
검증: bookmarkStore.ts:25-69 DEFAULT_BOOKMARKS
  카테고리 id: 'cat-1', 'cat-2', 'cat-3', 'cat-4'
  링크 id: 'l1' ~ 'l16'
충돌 없음 ✅
```

또한 신규 카테고리 생성 시 id 는 `crypto.randomUUID()` 패턴(추정, addBookmark 호출자 책임) 이므로 향후 충돌 가능성 매우 낮음. 추가 prefix 처리 불필요.

**결정 D4 — 빈 카테고리 droppable 영역 확보 (REQ-UX-008-003)**

`BookmarkCard.tsx` 의 링크 grid `<div>` 에 `useDroppable({ id: category.id })` 적용. 링크가 없을 때도 drop 가능하도록 다음 스타일 적용:

- `min-height: 48px` (모바일 hit-area 보장, NFR-003)
- 편집 모드 ON 시 dashed border 시각 신호 (선택, optional)
- 호버 시 배경색 강조(`isOver` 상태 활용)

**결정 D5 — onDragOver 처리 vs onDragEnd 처리 (REQ-UX-008-010, REQ-UX-008-013)**

dnd-kit 공식 multi-container 패턴을 따른다.

- `onDragOver`: 카테고리 간 이동을 in-memory 상태(`bookmarks`) 에 미리 반영 — 사용자 시각적 일관성 보장
- `onDragEnd`: 최종 인덱스 확정 + `moveLinkBetweenGroups` 호출 → 영속화 1회
- `onDragOver` 의 setState 과다 호출 위험: dnd-kit 은 dragOver 이벤트를 컨테이너 변경 시에만 발생시키므로(같은 컨테이너 내부 호버는 발생 안 함) 자연스럽게 debounce 됨. 추가 debounce 불필요.
- 안전장치: `onDragOver` 내부에서 `sourceCategoryId === targetCategoryId` 인 경우 early return (no-op)

**onDragEnd 정합성**:
- onDragOver 가 이미 active 의 카테고리를 이동시켰을 수 있음 → onDragEnd 의 `active.data.current.categoryId` 는 **원본 카테고리** 가 아닌 **현재 카테고리** 일 수 있음
- 따라서 `onDragStart` 에서 `originalCategoryId` 를 ref 에 저장, `onDragEnd` 에서 `originalCategoryId` 와 `targetCategoryId` 를 비교해 단일 그룹 vs 그룹 간 판정

**결정 D6 — 영속화 호출 위치 (REQ-UX-008-013)**

- onDragOver: in-memory 상태(`useState` 또는 zustand `set`) 만 변경, `storage.set` 호출 **금지**
- onDragEnd:
  - 같은 그룹 reorder → `updateBookmark({ ...cat, links: arrayMove(...) })` 1회 호출 (기존 SPEC-UX-006 패턴 유지)
  - 그룹 간 이동 → `moveLinkBetweenGroups(linkId, fromId, toId, toIndex)` 1회 호출

이 분리는 REQ-UX-008-013 (단일 트랜잭션) 을 만족한다.

**결정 D7 — onDragOver 의 in-memory 상태 모델**

선택지:
- 옵션 A: zustand `bookmarkStore` 에 별도의 `_tempReorder` 액션 추가 → 영속화 분기 복잡, store 오염
- 옵션 B: WidgetLayout 의 로컬 `useState<Bookmark[]>` 로 dragging 중에만 사용, dragEnd 시 store dispatch → store 단순, dragging 중 store/local 동기화 필요 (선택)
- 옵션 C: store 의 기존 `bookmarks` 를 직접 `set` 하되 영속화 분기 → store 의 `set` 호출 시 항상 영속화하는 기존 패턴 변경 필요, 위험

**선택**: 옵션 B — WidgetLayout 의 `useState` 로 dragging 중 임시 bookmarks 를 관리하고, render 는 `dragging ? localBookmarks : storeBookmarks` 로 분기. dragEnd 시 store 액션 호출.

실제 단순화: 본 SPEC 1차 구현은 **옵션 C 의 단순 변형** 사용 — `moveLinkBetweenGroups` 가 영속화 포함 단일 액션이므로 onDragOver 에서도 직접 호출하되 `bookmarkStore` 에 `moveLinkBetweenGroupsLocal` 같은 영속화 없는 액션을 분리하지 않고, `storage.set` 을 onDragEnd 에서만 명시적으로 호출하도록 store 액션을 분기 (옵션 B 의 정신을 store 내부에서 구현). 단, store API 단순성 유지를 위해 1차 구현은 **옵션 B (로컬 useState)** 를 채택.

## 파일 변경 맵

grep 으로 검증된 실제 라인 번호 기반.

### 신규 파일

없음 (모든 변경은 기존 파일 수정).

### 수정 파일

#### M1: bookmarkStore.ts 액션 추가

| 파일 | 위치 | 변경 |
|---|---|---|
| `src/renderer/stores/bookmarkStore.ts` | line 72-97 (`BookmarkState` interface) | `moveLinkBetweenGroups` 시그니처 추가 |
| `src/renderer/stores/bookmarkStore.ts` | line 99-286 (액션 구현) | `moveLinkBetweenGroups` 구현 추가 (idempotent 안전망, 영속화 포함) |
| `src/renderer/stores/bookmarkStore.test.ts` | 신규 테스트 케이스 | M1 테스트 7개 추가 (T-005 ~ T-011) |

#### M2: SortableLink.tsx data prop 강화

| 파일 | 위치 | 변경 |
|---|---|---|
| `src/renderer/components/BookmarkCard/SortableLink.tsx` | line 6-13 (`SortableLinkProps`) | `categoryId: string` prop 추가 |
| `src/renderer/components/BookmarkCard/SortableLink.tsx` | line 19-27 (`useSortable` 호출) | `useSortable({ id: link.id, disabled: !isEditing, data: { type: 'link', categoryId } })` 로 변경 |

#### M3: BookmarkCard.tsx 내부 DndContext 제거 + useDroppable 추가

| 파일 | 위치 | 변경 |
|---|---|---|
| `src/renderer/components/BookmarkCard/BookmarkCard.tsx` | line 5-11 (`@dnd-kit/core` import) | `DndContext, PointerSensor, useSensor, useSensors, type DragEndEvent` 제거. `useDroppable` 추가 |
| `src/renderer/components/BookmarkCard/BookmarkCard.tsx` | line 60-64 (`sensors`) | 제거 (상위 DndContext sensor 사용) |
| `src/renderer/components/BookmarkCard/BookmarkCard.tsx` | line 66-77 (`handleDragEnd`) | 제거 (상위 WidgetLayout 의 onDragEnd 에서 처리) |
| `src/renderer/components/BookmarkCard/BookmarkCard.tsx` | line 159-182 (`<DndContext>` 래퍼) | `<DndContext>` / `</DndContext>` 제거. `<SortableContext>` 는 유지하되 `id={category.id}` 명시. 링크 grid `<div>` 에 `useDroppable({ id: category.id })` 의 `setNodeRef` 적용 |
| `src/renderer/components/BookmarkCard/BookmarkCard.tsx` | 링크 grid `<div>` style | `min-height: 48px` 추가 (D4 빈 카테고리 droppable hit-area) |
| `src/renderer/components/BookmarkCard/BookmarkCard.tsx` | line 173-179 (`<SortableLink>`) | `categoryId={category.id}` prop 전달 |
| `src/renderer/components/BookmarkCard/BookmarkCard.test.tsx` | 기존 케이스 | DndContext provider mock 또는 wrapper 변경 (BookmarkCard 단독 렌더 시 외부 DndContext 필요) |

#### M4: WidgetLayout.tsx 단일 DndContext 확장

| 파일 | 위치 | 변경 |
|---|---|---|
| `src/renderer/components/WidgetLayout/WidgetLayout.tsx` | line 10-16 (`@dnd-kit/core` import) | `DragOverlay, closestCorners, type DragOverEvent, type DragStartEvent` 추가 |
| `src/renderer/components/WidgetLayout/WidgetLayout.tsx` | line 105-126 (카테고리 sensor + dragEnd 핸들러) | `handleCategoryDragEnd` 를 `handleDragEnd` 로 확장 (active type 분기). `handleDragOver` 신규 추가. `handleDragStart` 신규 추가 (originalCategoryId ref 저장 + activeLink state 저장) |
| `src/renderer/components/WidgetLayout/WidgetLayout.tsx` | line 94 (`useBookmarkStore`) 부근 | `moveLinkBetweenGroups` 추가 destructure |
| `src/renderer/components/WidgetLayout/WidgetLayout.tsx` | dragging 중 임시 상태 (D7 옵션 B) | `useState<Bookmark[] \| null>` 추가. dragOver 시 임시 갱신, dragEnd 시 store 액션 호출 + 임시 상태 null 로 reset |
| `src/renderer/components/WidgetLayout/WidgetLayout.tsx` | line 553-574 (BookmarkCard grid DndContext) | `<DndContext sensors={...} collisionDetection={closestCorners} onDragStart={...} onDragOver={...} onDragEnd={...}>` 로 확장. `<SortableContext items={...}>` 유지(카테고리 정렬용). `<DragOverlay>` 추가 — drag 중인 link or category 의 미러 렌더 |
| `src/renderer/components/WidgetLayout/WidgetLayout.tsx` | BookmarkCard 렌더 | 변경 없음 (BookmarkCard 내부에서 useDroppable 처리). 단, dragging 중 임시 bookmarks 표시 분기는 prop 으로 내릴 필요 X (BookmarkCard 가 store 를 직접 읽지 않고 props 로 category 받음) |

#### M5: WidgetLayout / 통합 테스트

| 파일 | 변경 |
|---|---|
| `src/renderer/components/WidgetLayout/WidgetLayout.test.tsx` | M5-1 단일 그룹 회귀 (arrayMove) 1개, M5-2 그룹 간 이동 시나리오 3개 (앞/중간/뒤), M5-3 빈 그룹 이동 1개, M5-4 같은 위치 no-op 1개, M5-5 즐겨찾기 invariant 1개 (PivotLayout 측은 모킹) |

## 마일스톤

### M1: bookmarkStore.moveLinkBetweenGroups (Priority High)

- **T-001**: `moveLinkBetweenGroups` 시그니처 정의
  - 파일: `src/renderer/stores/bookmarkStore.ts` (수정, `BookmarkState` interface)
  - 시그니처: `(linkId: string, fromCategoryId: string, toCategoryId: string, toIndex: number) => void`

- **T-002**: `moveLinkBetweenGroups` 구현
  - 파일: `src/renderer/stores/bookmarkStore.ts` (수정)
  - 의사 코드 (spec.md "데이터 스키마" 섹션):
    - fromCategoryId === toCategoryId 인 경우 no-op
    - 소스/타겟 부재 / 링크 부재 시 no-op
    - 단일 `set` 호출로 두 카테고리 동시 갱신
    - clamp(toIndex, 0, toCat.links.length)
    - `loaded === true` 일 때만 `storage.set` 호출 (기존 패턴)
  - `@MX:NOTE` 한 줄 주석: `// @MX:NOTE: [AUTO] SPEC-UX-008 카테고리 간 링크 이동 — 부가 메타데이터 보존, 영속화 1회`

- **T-003**: `moveLinkBetweenGroups` 단위 테스트
  - 파일: `src/renderer/stores/bookmarkStore.test.ts` (수정)
  - 케이스:
    - T-003-a: 카테고리 A 의 링크 → 카테고리 B 의 인덱스 0
    - T-003-b: 카테고리 A 의 링크 → 카테고리 B 의 중간 인덱스
    - T-003-c: 카테고리 A 의 링크 → 카테고리 B 의 끝(`B.links.length`)
    - T-003-d: 빈 카테고리(`B.links.length === 0`) 로 이동
    - T-003-e: `fromCategoryId === toCategoryId` → no-op (bookmarks 변경 없음)
    - T-003-f: 부가 메타데이터(`favorite: true`, `tags: ['x']`) 보존 확인
    - T-003-g: `toIndex` 가 음수 / 초과 시 clamp 동작
    - T-003-h: 존재하지 않는 linkId / categoryId → no-op (idempotent)

### M2: SortableLink data prop 강화 (Priority High)

- **T-004**: `SortableLink.tsx` props 확장
  - 파일: `src/renderer/components/BookmarkCard/SortableLink.tsx` (수정)
  - `SortableLinkProps` 에 `categoryId: string` 추가
  - `useSortable` 호출에 `data: { type: 'link' as const, categoryId }` 추가

- **T-005**: `SortableLink` 단위 테스트(기존 케이스 보강 또는 신규)
  - data prop 이 useSortable 의 active.data.current 에 전파되는지 확인
  - (선택) 기존 테스트가 useSortable mock 으로 동작한다면 mock 갱신만으로 충분

### M3: BookmarkCard 내부 DndContext 제거 + useDroppable (Priority High)

- **T-006**: BookmarkCard 의 `<DndContext>` / sensors / handleDragEnd 제거
  - 파일: `src/renderer/components/BookmarkCard/BookmarkCard.tsx` (수정)
  - 제거: `useSensor`, `useSensors`, `PointerSensor`, `arrayMove`, `DndContext` import 및 사용
  - 제거: `sensors` 변수, `handleDragEnd` 함수
  - `@MX:NOTE` 갱신: line 1-3 의 SPEC 주석에 `SPEC-UX-008` 추가

- **T-007**: 링크 grid 에 `useDroppable` 적용
  - `import { useDroppable } from '@dnd-kit/core'` 추가
  - `const { setNodeRef: setDropRef } = useDroppable({ id: category.id })`
  - 링크 grid `<div>` 에 `ref={setDropRef}` + `style.minHeight = 48` 추가
  - `<SortableContext>` 에 `id={category.id}` 명시

- **T-008**: BookmarkCard 의 `<SortableLink>` 에 categoryId 전달
  - `categoryId={category.id}` prop 추가

- **T-009**: `BookmarkCard.test.tsx` wrapper 갱신
  - 기존 테스트가 BookmarkCard 를 단독 렌더한 경우 `<DndContext>` wrapper 추가 (테스트 helper 또는 inline)
  - 기존 SPEC-UX-006/007 케이스 회귀 없는지 확인

### M4: WidgetLayout 단일 DndContext 확장 (Priority High)

- **T-010**: import 추가
  - 파일: `src/renderer/components/WidgetLayout/WidgetLayout.tsx`
  - `import { DndContext, DragOverlay, closestCorners, PointerSensor, useSensor, useSensors, type DragEndEvent, type DragOverEvent, type DragStartEvent } from '@dnd-kit/core'`

- **T-011**: `handleDragStart` 신규
  - active 의 `data.current.type` 검사. `'link'` 면 `activeLinkRef.current = { linkId, categoryId }`, `activeLinkState` setState (DragOverlay 렌더용)
  - `'category'` 면 activeCategoryState setState

- **T-012**: `handleDragOver` 신규
  - active type === 'link' 인 경우만 처리
  - `sourceCategoryId = active.data.current.categoryId`
  - `targetCategoryId = over.data.current?.sortable?.containerId ?? over.id`
  - `sourceCategoryId === targetCategoryId` → return (single-group 은 dragEnd 에서 처리)
  - **D7 옵션 B** 임시 상태 모델: `setLocalBookmarks(next)` 로 in-memory 미리 반영. 영속화 호출 금지.

- **T-013**: `handleDragEnd` 확장 (기존 `handleCategoryDragEnd` 흡수)
  - active type === 'category' → 기존 카테고리 reorder 분기 (SPEC-UX-007 그대로)
  - active type === 'link':
    - `originalCategoryId = activeLinkRef.current.categoryId` (drag 시작 시점 기억)
    - `currentCategoryId = active.data.current.categoryId` (dragOver 가 이미 이동시킨 경우)
    - over.id 또는 over.data.current.sortable.containerId 로 final targetCategoryId 결정
    - originalCategoryId === finalTargetCategoryId AND active.id !== over.id → `updateBookmark({ ...cat, links: arrayMove(...) })` 1회 호출 (단일 그룹 reorder, SPEC-UX-006 패턴)
    - originalCategoryId === finalTargetCategoryId AND active.id === over.id → no-op (REQ-UX-008-016)
    - originalCategoryId !== finalTargetCategoryId → `moveLinkBetweenGroups(linkId, originalCategoryId, finalTargetCategoryId, toIndex)` 1회 호출
  - `setLocalBookmarks(null)` 로 dragging 임시 상태 reset

- **T-014**: `<DragOverlay>` 추가
  - DndContext 내부 끝에 `<DragOverlay>{activeLinkState && <LinkOverlay link={activeLinkState.link} />}</DragOverlay>`
  - `LinkOverlay` 는 `SortableLink` 와 동일 시각 표현의 정적 카피 (클릭 핸들러 제거)
  - 카테고리 드래그 시: DragOverlay 내부 카테고리 미러는 본 SPEC 범위 아님 — 단순 `null` 또는 기존 placeholder 동작 유지

- **T-015**: collisionDetection 명시
  - `<DndContext collisionDetection={closestCorners} ...>` (REQ-UX-008-011, D2)

- **T-016**: render 분기 — dragging 중에는 localBookmarks, 아닐 때는 store bookmarks
  - `const displayBookmarks = localBookmarks ?? bookmarks`
  - 카테고리 grid 의 map 은 `displayBookmarks.map((cat) => ...)`

### M5: 통합 테스트 (Priority High)

- **T-017**: WidgetLayout 통합 테스트 — 단일 그룹 회귀
  - 같은 카테고리 내 링크 reorder → `updateBookmark` 1회 호출, `moveLinkBetweenGroups` 0회 호출 (회귀 검증)

- **T-018**: WidgetLayout 통합 테스트 — 그룹 간 이동(앞/중간/뒤)
  - cat-1 의 첫 링크를 cat-2 의 인덱스 0 으로 이동 → moveLinkBetweenGroups 1회 호출
  - cat-1 의 링크를 cat-2 의 중간 인덱스로 이동
  - cat-1 의 링크를 cat-2 의 끝으로 이동

- **T-019**: WidgetLayout 통합 테스트 — 빈 그룹으로 이동
  - cat-A 에 링크 1개, cat-B 에 0개 인 상태에서 cat-A 의 링크를 cat-B 의 droppable 컨테이너 위로 drop → cat-B.links.length === 1, cat-A.links.length === 0

- **T-020**: WidgetLayout 통합 테스트 — 같은 위치 no-op
  - 링크를 자기 자신 위로 drop (active.id === over.id) → store 액션 0회 호출, storage.set 0회 호출

- **T-021**: 즐겨찾기 invariant 회귀 테스트
  - cat-1 에 favorite: true 인 링크 포함
  - 그 링크를 cat-2 로 이동 → cat-2 에 favorite: true 유지 (REQ-UX-008-014)
  - PivotLayout 의 즐겨찾기 뷰 정렬 변경이 발생하더라도 `bookmarks[].links` 순서 비변경 (REQ-UX-008-015 — 본 SPEC 은 PivotLayout 변경 0 이므로 자연 만족, 회귀 검증만 수행)

### M6: 빌드/린트/타입 통과 (Priority High)

- **T-022**: `npm run typecheck` 통과
- **T-023**: `npm run lint` 통과 (ESLint 오류 0)
- **T-024**: `npm run build` 통과
- **T-025**: 기존 SPEC-UX-006/007 테스트 회귀 0

## 위험 요소 및 완화

| 위험 | 영향 | 완화 |
|---|---|---|
| **dragOver 의 잦은 setState** | 성능 저하 (드래그 끊김) | dnd-kit 은 dragOver 를 컨테이너 변경 시에만 발생시킴(설계). 추가 debounce 불필요. 모니터링 필요 시 React Profiler. |
| **DragOverlay 의 SortableLink 미러 복제 비용** | 메모리 / 렌더 비용 | overlay 는 1개 항목만 렌더. 정적 카피라 비용 미미. |
| **D7 옵션 B 의 store/local 동기화 누수** | dragEnd 누락 시 localBookmarks 가 영구 표시 | dragEnd / dragCancel 둘 다 `setLocalBookmarks(null)` 호출. `onDragCancel` 핸들러도 등록. |
| **카테고리 id 와 링크 id 충돌** | over.id 가 어느 쪽인지 모호 | grep 검증으로 현재 충돌 없음(D3). 추가 `data.current.type` 분기로 강건. |
| **`onDragOver` 가 store 를 직접 변경할 위험** | 영속화 트랜잭션 위반 (REQ-UX-008-013) | D7 옵션 B 의 로컬 useState 사용. `moveLinkBetweenGroups` 는 onDragEnd 에서만 호출. |
| **SortableContext id 명시 누락** | dnd-kit 이 sortable.containerId 식별 실패 | `<SortableContext id={category.id}>` 명시 (T-007). |
| **BookmarkCard.test.tsx 의 단독 렌더 문제** | 외부 DndContext 부재로 useSortable 실패 | 테스트 wrapper 에 `<DndContext>` 추가 (T-009). |
| **PivotLayout 회귀** | 본 SPEC 범위 외이나 bookmarkStore 변경이 영향 가능 | `moveLinkBetweenGroups` 는 신규 액션이라 PivotLayout 의 기존 호출에 영향 없음. PivotLayout 통합 테스트 회귀 검증 (M6). |

## 회귀 검증 체크리스트

- [ ] SPEC-UX-006 AC-008/010/011 (같은 카테고리 링크 정렬, long-press 250ms) 통과
- [ ] SPEC-UX-007 AC-005/006/011/012 (편집 모드 토글, 카테고리 카드 정렬) 통과
- [ ] SPEC-LAYOUT-001 (위젯 그리드 드래그) 통과
- [ ] SPEC-UI-001 (시각 토큰) 통과
- [ ] PivotLayout 의 즐겨찾기 뷰 (BookmarkRow, Sidebar) 단위 테스트 통과
- [ ] `npm run build` / `lint` / `typecheck` 통과
