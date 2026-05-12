# SPEC-UX-008: 인수 조건

## 시나리오

### AC-001: bookmarkStore.moveLinkBetweenGroups — 다른 카테고리 인덱스 0 으로 이동

**Given** `bookmarks` 가 다음 상태인 store 에서

```typescript
[
  { id: 'cat-1', name: 'Work', icon: '💼', links: [
      { id: 'l1', name: 'Gmail', url: '...', tags: ['email'], favorite: true },
      { id: 'l2', name: 'Drive', url: '...', tags: ['docs'] },
  ]},
  { id: 'cat-2', name: 'Dev', icon: '⚡', links: [
      { id: 'l5', name: 'GitHub', url: '...', tags: ['dev'] },
  ]},
]
```

**When** `useBookmarkStore.getState().moveLinkBetweenGroups('l1', 'cat-1', 'cat-2', 0)` 를 호출하면

**Then** 다음이 만족되어야 한다.

- `bookmarks[0].id === 'cat-1'`, `bookmarks[0].links === [{ id: 'l2', ... }]` (l1 제거됨)
- `bookmarks[1].id === 'cat-2'`, `bookmarks[1].links === [{ id: 'l1', favorite: true, tags: ['email'], ... }, { id: 'l5', ... }]` (l1 이 0 번째 인덱스, favorite/tags 보존)
- `storage.set('hub-bookmarks', JSON.stringify(...))` 가 **정확히 1회** 호출되었어야 함 (REQ-UX-008-013)
- `loaded === true` 일 때만 `storage.set` 호출 (기존 패턴 유지)

→ REQ-UX-008-007, REQ-UX-008-008, REQ-UX-008-013, REQ-UX-008-014

### AC-002: bookmarkStore.moveLinkBetweenGroups — 중간 인덱스 / 끝 인덱스

**Given** `cat-2.links === [l5, l6, l7, l8]` 인 상태에서

**When** `moveLinkBetweenGroups('l1', 'cat-1', 'cat-2', 2)` 호출

**Then** `cat-2.links === [l5, l6, l1, l7, l8]` 이어야 한다 (l1 이 인덱스 2 에 삽입).

**And When** 다른 시드에서 `moveLinkBetweenGroups('l1', 'cat-1', 'cat-2', 4)` 호출 (`toIndex === links.length`)

**Then** `cat-2.links === [l5, l6, l7, l8, l1]` 이어야 한다 (끝에 삽입).

**And When** 다른 시드에서 `toIndex === 999` (out-of-range)

**Then** `cat-2.links` 의 마지막에 삽입되어야 한다 (clamp 동작).

**And When** `toIndex === -5` (음수)

**Then** `cat-2.links` 의 맨 앞에 삽입되어야 한다 (clamp 동작).

→ REQ-UX-008-008

### AC-003: bookmarkStore.moveLinkBetweenGroups — 빈 카테고리로 이동

**Given** `cat-2.links === []` (빈 카테고리) 인 상태에서

**When** `moveLinkBetweenGroups('l1', 'cat-1', 'cat-2', 0)` 호출

**Then** `cat-2.links === [{ id: 'l1', ... }]` 이어야 하고, `cat-1.links` 에서 l1 이 제거되어야 한다.

→ REQ-UX-008-008, REQ-UX-008-014

### AC-004: bookmarkStore.moveLinkBetweenGroups — no-op 케이스

**Given** 초기 `bookmarks` 상태에서

**When** 다음 호출 중 하나라도 발생하면:

- `moveLinkBetweenGroups('l1', 'cat-1', 'cat-1', 0)` (`from === to`)
- `moveLinkBetweenGroups('non-existent-link', 'cat-1', 'cat-2', 0)`
- `moveLinkBetweenGroups('l1', 'cat-1', 'non-existent-cat', 0)`
- `moveLinkBetweenGroups('l1', 'non-existent-cat', 'cat-2', 0)`

**Then** `bookmarks` 가 **변경되어서는 안 되며**, `storage.set` 도 호출되어서는 안 된다 (idempotent).

→ REQ-UX-008-008

### AC-005: WidgetLayout 단일 DndContext — 같은 카테고리 내 정렬 회귀 0

**Given** `viewMode === 'widgets'`, 데스크탑(isMobile === false), `isEditing === true` 상태에서, `cat-1.links === [l1, l2, l3, l4]` 인 상태에서

**When** 사용자가 cat-1 내부의 l1 을 drag 해서 l3 위로 drop (active.id === 'l1', over.id === 'l3', 같은 SortableContext) 하면

**Then** 다음이 만족되어야 한다.

- `cat-1.links === [l2, l3, l1, l4]` (arrayMove 동작, SPEC-UX-006 패턴 유지)
- `updateBookmark` 가 정확히 1회 호출되었고, `moveLinkBetweenGroups` 는 **0회** 호출되었어야 함
- `storage.set` 정확히 1회 호출

→ REQ-UX-008-006, REQ-UX-008-017, SPEC-UX-006 회귀 검증

### AC-006: WidgetLayout 단일 DndContext — 그룹 간 이동 (앞)

**Given** `isEditing === true` 상태에서, cat-1.links === [l1, l2], cat-2.links === [l5, l6] 인 상태에서

**When** 사용자가 cat-1 의 l1 을 drag 해서 cat-2 의 l5 위(인덱스 0) 로 drop 하면 (active.data.current.type === 'link', sourceCategoryId === 'cat-1', over.id === 'l5', over.data.current.sortable.containerId === 'cat-2')

**Then** 다음이 만족되어야 한다.

- `bookmarkStore.moveLinkBetweenGroups('l1', 'cat-1', 'cat-2', 0)` 가 정확히 1회 호출
- 최종 상태: cat-1.links === [l2], cat-2.links === [l1, l5, l6]
- `updateBookmark` 는 호출되지 않았어야 함
- `storage.set` 정확히 1회 호출 (REQ-UX-008-013)

→ REQ-UX-008-001, REQ-UX-008-007, REQ-UX-008-013

### AC-007: WidgetLayout 단일 DndContext — 그룹 간 이동 (중간)

**Given** `isEditing === true` 상태에서, cat-2.links === [l5, l6, l7, l8] 인 상태에서

**When** 사용자가 cat-1 의 l1 을 drag 해서 cat-2 의 l7 위(인덱스 2)로 drop

**Then** `moveLinkBetweenGroups('l1', 'cat-1', 'cat-2', 2)` 호출, cat-2.links === [l5, l6, l1, l7, l8]

→ REQ-UX-008-007

### AC-008: WidgetLayout 단일 DndContext — 빈 그룹으로 이동

**Given** `isEditing === true` 상태에서, cat-1.links === [l1], cat-2.links === [] 상태에서

**When** 사용자가 l1 을 drag 해서 cat-2 의 빈 droppable 컨테이너 영역(over.id === 'cat-2', over.data.current.sortable 없음) 위로 drop

**Then** 다음이 만족되어야 한다.

- `moveLinkBetweenGroups('l1', 'cat-1', 'cat-2', 0)` 호출 (over 가 droppable container 면 toIndex = links.length = 0)
- cat-1.links === [], cat-2.links === [l1]
- cat-2 의 빈 droppable 영역은 `min-height: 48px` 를 가져야 하며(D4), 사용자가 카드가 없는 영역에도 drop 가능해야 함

→ REQ-UX-008-003, REQ-UX-008-007

### AC-009: WidgetLayout — 같은 위치 no-op

**Given** `isEditing === true` 상태에서

**When** 사용자가 l1 을 drag 해서 자기 자신(l1) 위로 drop (active.id === over.id, 같은 카테고리)

**Then** 다음이 만족되어야 한다.

- `updateBookmark` 호출 0회
- `moveLinkBetweenGroups` 호출 0회
- `storage.set` 호출 0회
- `bookmarks` 상태 변경 없음

→ REQ-UX-008-016

### AC-010: 편집 모드 OFF 시 그룹 간 이동 비활성

**Given** `isEditing === false` 상태에서

**When** 사용자가 l1 을 마우스 다운 후 cat-2 영역으로 드래그 시도

**Then** 다음이 만족되어야 한다.

- 드래그 자체가 시작되지 않음(`useSortable({ disabled: true })`)
- l1 클릭 시 기존 SPEC-UX-006 동작 — 새 탭으로 url 열림, usage 기록
- `moveLinkBetweenGroups` 호출 0회

→ REQ-UX-008-009

### AC-011: onDragOver — 그룹 간 시각적 이동 사전 반영

**Given** `isEditing === true` 상태에서, cat-1.links === [l1, l2], cat-2.links === [l5] 상태에서

**When** 사용자가 l1 의 드래그를 시작하고(`onDragStart`) cat-2 의 l5 위로 호버 진입(`onDragOver` 발생, over.data.current.sortable.containerId === 'cat-2')

**Then** 다음이 만족되어야 한다.

- DOM 렌더 결과에서 l1 이 cat-2 의 영역(인덱스 0) 에 시각적으로 표시 — 즉 `displayBookmarks` 의 cat-2.links 에 l1 이 포함
- 이 시점에 `storage.set` 은 **호출되지 않았어야 함** (REQ-UX-008-013, 영속화는 dragEnd 에서만)
- 사용자가 마우스를 release 하지 않고 다시 cat-1 영역으로 호버 복귀하면 l1 이 cat-1 으로 복귀

→ REQ-UX-008-010, REQ-UX-008-013

### AC-012: DragOverlay — 드래그 중 링크 미러 표시

**Given** `isEditing === true` 상태에서

**When** 사용자가 l1 의 드래그를 시작하면(`onDragStart` 발생)

**Then** 다음이 만족되어야 한다.

- `<DragOverlay>` 내부에 l1 의 시각 표현(이름, 스타일) 미러가 렌더링됨
- DragOverlay 의 미러 카드는 클릭 핸들러를 가지지 않으며 opacity 1 로 표시
- 원본 SortableLink 는 `isDragging === true` 가 되어 `opacity: 0.5` 로 표시

**And When** `onDragEnd` 또는 `onDragCancel` 이 발생하면

**Then** DragOverlay 의 미러가 unmount 되어야 함

→ REQ-UX-008-012

### AC-013: collisionDetection === closestCorners

**Given** WidgetLayout 의 BookmarkCard grid DndContext 가 mount 된 상태에서

**When** React Testing Library 또는 props inspector 로 DndContext 의 `collisionDetection` prop 을 확인하면

**Then** `collisionDetection === closestCorners` (`@dnd-kit/core` 의 import) 이어야 한다.

기본 `closestCenter` 또는 `pointerWithin` 또는 `rectIntersection` 이 아니어야 한다.

→ REQ-UX-008-011

### AC-014: 부가 메타데이터 보존 (favorite/tags/usage)

**Given** `cat-1.links === [{ id: 'l1', name: 'Gmail', url: '...', tags: ['email', 'work'], favorite: true }]` 상태에서

**When** `moveLinkBetweenGroups('l1', 'cat-1', 'cat-2', 0)` 호출

**Then** `cat-2.links[0]` 의 객체는 다음을 만족해야 한다.

- `id === 'l1'`
- `name === 'Gmail'`
- `tags === ['email', 'work']` (배열 동일)
- `favorite === true`
- 추가 속성(`usage`, `createdAt` 등) 이 원본 객체에 존재했다면 모두 보존

→ REQ-UX-008-014

### AC-015: 즐겨찾기 뷰 invariant — 원본 카테고리 순서 비변경

**Given** PivotLayout 의 `context.kind === 'favorites'` 뷰가 활성이고, 다음 시드 상태에서:

```
cat-1.links === [{ l1: favorite: true }, { l2: favorite: false }]
cat-2.links === [{ l5: favorite: false }, { l6: favorite: true }]
```

PivotLayout 의 즐겨찾기 뷰는 favorite === true 인 링크만 표시 (l1, l6).

**When** WidgetLayout 측에서 `moveLinkBetweenGroups('l1', 'cat-1', 'cat-2', 0)` 가 호출되면

**Then** 다음이 만족되어야 한다.

- `bookmarks` 의 카테고리 순서 [cat-1, cat-2] 는 **변경되지 않음**
- cat-1.links === [l2], cat-2.links === [l1, l5, l6]
- PivotLayout 의 즐겨찾기 뷰는 favorite === true 인 l1, l6 을 표시하되, l1 의 origin 이 cat-2 로 바뀌었음을 반영(컨텍스트 헤더 또는 origin label 이 있다면)

**And** 본 SPEC 은 PivotLayout 측 즐겨찾기 뷰의 정렬 변경 UX 를 **도입하지 않으며**, 향후 도입되더라도 원본 `bookmarks[].links` 순서를 변경해서는 안 된다(invariant).

→ REQ-UX-008-015, SPEC-UX-008 Exclusions

### AC-016: 회귀 — SPEC-UX-006/007 기존 케이스 통과

**Given** SPEC-UX-008 구현 완료 후

**When** 다음 명령을 실행하면

```
npm run typecheck
npm run lint
npm test -- src/renderer/components/BookmarkCard/BookmarkCard.test.tsx
npm test -- src/renderer/components/WidgetLayout/WidgetLayout.test.tsx
npm test -- src/renderer/stores/bookmarkStore.test.ts
```

**Then** 모든 명령이 종료 코드 0 으로 성공해야 하고, 기존 SPEC-UX-006/007 의 acceptance 시나리오에 대응되는 테스트가 100% 통과해야 한다.

→ REQ-UX-008-017, REQ-UX-008-018, NFR-004

## 엣지 케이스

### EDGE-001: drag 도중 viewMode 가 'pivot' 으로 전환

**Given** `isEditing === true` 상태에서 사용자가 l1 의 드래그를 시작한 직후

**When** 외부 코드가 `viewMode` 를 `'pivot'` 으로 전환하여 WidgetLayout 이 unmount 되면

**Then** 다음이 만족되어야 한다.

- DndContext 가 unmount 되며 onDragCancel 또는 onDragEnd 가 자연 발생
- localBookmarks 임시 상태가 null 로 reset
- bookmarkStore 의 상태는 dragStart 이전 상태와 동일 (영속화 호출 없음)

→ REQ-UX-008-013

### EDGE-002: 모바일 long-press 250ms 미만 클릭

**Given** 모바일 환경(isMobile === true), `isEditing === true` 상태에서

**When** 사용자가 l1 을 100ms 만 누르고 release

**Then** 드래그가 활성되지 않고 일반 클릭으로 처리 — `useSortable` 의 PointerSensor activationConstraint.delay 250 적용 (SPEC-UX-006 패턴 유지)

→ REQ-UX-008-009, NFR-003

### EDGE-003: dnd-kit dragCancel (사용자가 Esc 또는 외부 영역으로 release)

**Given** `isEditing === true`, l1 의 드래그 시작 후 onDragOver 로 이미 cat-2 로 임시 이동된 상태에서

**When** 사용자가 Esc 키를 눌러 드래그 취소 (`onDragCancel` 발생)

**Then** 다음이 만족되어야 한다.

- localBookmarks === null 로 reset
- store 의 bookmarks 는 원본 그대로 (cat-1.links === [l1, l2], cat-2.links === [l5, l6])
- `storage.set` 호출 0회
- 단, SPEC-UX-007 의 Esc 키 동작(편집 모드 종료) 과 충돌하는지 검증 필요 — dnd-kit 의 dragCancel Esc 가 우선 처리되도록 stopPropagation 또는 isDragging 분기

→ REQ-UX-008-010, REQ-UX-008-013, EDGE 통합

### EDGE-004: 카테고리 자체 드래그 vs 링크 드래그 동시 활성

**Given** `isEditing === true` 상태에서

**When** 사용자가 카테고리 카드 헤더(widget-drag-handle) 를 드래그하면

**Then** active.data.current.type === 'category' 분기로 SPEC-UX-007 의 카테고리 reorder 만 실행되어야 하고, moveLinkBetweenGroups 는 호출되지 않아야 한다.

**And When** 사용자가 카드 내부의 링크를 드래그하면

**Then** active.data.current.type === 'link' 분기로 본 SPEC 의 cross-category 또는 single-group 이동만 실행되어야 한다.

→ REQ-UX-008-001, REQ-UX-008-005

## 인수 기준 매트릭스

| AC | REQ |
|---|---|
| AC-001 | REQ-UX-008-007, REQ-UX-008-008, REQ-UX-008-013, REQ-UX-008-014 |
| AC-002 | REQ-UX-008-008 |
| AC-003 | REQ-UX-008-008, REQ-UX-008-014 |
| AC-004 | REQ-UX-008-008 |
| AC-005 | REQ-UX-008-006, REQ-UX-008-017 |
| AC-006 | REQ-UX-008-001, REQ-UX-008-007, REQ-UX-008-013 |
| AC-007 | REQ-UX-008-007 |
| AC-008 | REQ-UX-008-003, REQ-UX-008-007 |
| AC-009 | REQ-UX-008-016 |
| AC-010 | REQ-UX-008-009 |
| AC-011 | REQ-UX-008-010, REQ-UX-008-013 |
| AC-012 | REQ-UX-008-012 |
| AC-013 | REQ-UX-008-011 |
| AC-014 | REQ-UX-008-014 |
| AC-015 | REQ-UX-008-015 |
| AC-016 | REQ-UX-008-017, REQ-UX-008-018 |
| EDGE-001 | REQ-UX-008-013 |
| EDGE-002 | REQ-UX-008-009, NFR-003 |
| EDGE-003 | REQ-UX-008-010, REQ-UX-008-013 |
| EDGE-004 | REQ-UX-008-001, REQ-UX-008-005 |
