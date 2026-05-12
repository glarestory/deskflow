---
id: SPEC-UX-008
version: 1.0.0
status: completed
created: 2026-05-12
updated: 2026-05-12
author: ZeroJuneK
priority: high
issue_number: 0
---

# SPEC-UX-008: Cross-Category Bookmark Item Drag (그룹 간 링크 이동)

## HISTORY

| 버전 | 날짜 | 작성자 | 변경 내용 |
|------|------|--------|-----------|
| 1.0.0 | 2026-05-12 | ZeroJuneK | 최초 작성 (위젯 모드 BookmarkCard 카테고리 간 링크 드래그 이동) |

## 개요

Deskflow의 위젯 모드(`viewMode === 'widgets'`)는 SPEC-UX-006 으로 같은 카테고리 내부 링크 정렬, SPEC-UX-007 로 카테고리 카드 자체 순서 변경을 지원한다. 그러나 **카테고리 A의 링크를 카테고리 B로 이동**하는 동작은 여전히 불가능하다. 사용자는 링크를 다른 그룹으로 옮기려면 삭제 후 새 카테고리에서 재추가해야 하며, 이 과정에서 favorite 플래그·태그·usage 카운트 등 부가 메타데이터가 손실된다.

본 SPEC 은 SPEC-UX-006/007 의 누적 위에 **그룹 간 링크 드래그-앤-드롭 이동**을 추가한다. iOS/Notion 의 nested sortable 패턴을 채용하며, dnd-kit 의 다중 컨테이너 sortable 권장 패턴을 따른다.

### 현재 구조의 한계 (grep 검증)

- `BookmarkCard.tsx:160` — 카테고리 내부에 **자체 `DndContext`** 가 존재(`useSensors(PointerSensor, delay 250)`) → 외부 DndContext와 격리되어 카테고리 간 이벤트 전파 불가
- `WidgetLayout.tsx:553` — 외부 DndContext 는 **카테고리(`BookmarkCard`) 자체의 순서 변경 전용** (`items={bookmarks.map(b => b.id)}`)
- `bookmarkStore.ts` — `reorderCategories`, `updateBookmark`, `addLink`, `toggleFavorite` 만 존재. 카테고리 간 링크 이동 API 부재
- 현재 두 DndContext 는 D2 격리(SPEC-UX-007 결정) 로 분리되어 있으므로, 본 SPEC 은 **링크 sortable 의 DndContext 위치를 재배치**해야 한다

본 SPEC 의 핵심 아이디어는 다음과 같다.

- **WidgetLayout 의 BookmarkCard grid 영역에 단일 DndContext** 를 두고 모든 카테고리를 그 안에 배치
- 각 BookmarkCard 는 **별도의 `useDroppable` 컨테이너 + 링크용 `SortableContext`** 를 가진다
- 카테고리 카드 자체 정렬(SPEC-UX-007) 과 **링크용 SortableContext** 를 같은 DndContext 안에 공존시킨다 — 컨테이너 id(`category.id`) 와 링크 id(`link.id`) 가 충돌 없이 식별 가능해야 한다(D3 결정)
- `onDragOver` 에서 미리 그룹 간 이동을 반영하여 시각적 일관성 확보, `onDragEnd` 에서 최종 인덱스로 영속화

**분류**: SPEC (구현 대상 기능)
**성격**: Brownfield — `WidgetLayout.tsx` / `BookmarkCard.tsx` / `bookmarkStore.ts` 수정 + `SortableLink.tsx` 의 sortable 컨테이너 식별자 강화
**선행 SPEC**: SPEC-UX-006 (링크 내부 정렬), SPEC-UX-007 (전역 편집 모드 + 카테고리 카드 정렬), SPEC-LAYOUT-001, SPEC-UI-001
**범위**: `viewMode === 'widgets'` 의 BookmarkCard grid 한정. PivotLayout 은 본 SPEC 적용 제외(Exclusions 참고).

## 요구사항

### REQ-UX-008-001: WidgetLayout 단일 DndContext 통합

**[Ubiquitous]** `WidgetLayout.tsx` 의 BookmarkCard grid 영역(현재 line 543-575 부근) 은 **항상** 모든 카테고리를 감싸는 **단일 `DndContext`** 를 가져야 한다. 이 DndContext 는 카테고리 자체 순서 변경(SPEC-UX-007 REQ-UX-007-011) 과 카테고리 간 링크 이동(본 SPEC) 둘 다를 담당한다.

기존 SPEC-UX-007 의 카테고리 전용 `DndContext`(`handleCategoryDragEnd`) 는 본 SPEC 에 의해 onDragEnd / onDragOver 핸들러가 확장된다(별도 DndContext 신설 금지 — D1 결정).

### REQ-UX-008-002: BookmarkCard 내부 DndContext 제거

**[Unwanted]** `BookmarkCard.tsx` 내부의 **로컬 `DndContext`**(현재 line 160-182) 는 본 SPEC 구현 후 **존재해서는 안 된다**. 링크용 `SortableContext` 와 `useSensors` 는 유지되지만 상위 단일 DndContext 의 sensor / collision detection 을 사용한다.

이유: 중첩 `DndContext` 가 존재하면 부모 컨텍스트가 자식 컨테이너 간 이동을 인지하지 못한다(dnd-kit 공식 권고). 단일 DndContext 만이 다중 컨테이너 sortable 을 지원한다.

### REQ-UX-008-003: 각 카테고리는 별도 droppable 컨테이너

**[Ubiquitous]** 각 `BookmarkCard` 는 **항상** `useDroppable({ id: category.id })` 를 가지며, 카테고리 id 를 droppable container id 로 노출해야 한다. 링크 그리드 영역(`<div style={{ display: 'grid', ... }}>`) 이 droppable 영역이다.

빈 카테고리도 droppable 이어야 하며, 시각적으로 drop target 임을 인지할 수 있도록 최소 높이(`min-height: 48px`)를 가져야 한다(D4 결정).

### REQ-UX-008-004: 각 카테고리는 독립 SortableContext

**[Ubiquitous]** 각 `BookmarkCard` 는 **항상** 자신의 링크 배열에 대한 `SortableContext`(`items={category.links.map(l => l.id)}`, `strategy={rectSortingStrategy}`) 를 가져야 한다. `SortableContext` 의 `id` prop 에는 `category.id` 를 명시적으로 전달하여 dnd-kit 이 `sortable.containerId` 로 식별할 수 있게 한다.

### REQ-UX-008-005: SortableItem 에 카테고리 식별자 부여

**[Ubiquitous]** `SortableLink`(또는 본 SPEC 에 의해 변경되는 후속 컴포넌트) 는 **항상** `useSortable({ id: link.id, data: { type: 'link', categoryId } })` 형태로 자신이 속한 카테고리 id 를 `data` 에 포함해야 한다.

이는 `onDragOver` / `onDragEnd` 에서 active item 의 소속 카테고리를 즉시 식별하기 위함이다(`active.data.current.categoryId`).

### REQ-UX-008-006: 같은 카테고리 내 정렬 회귀 0

**[Ubiquitous]** 본 SPEC 구현 후, 같은 카테고리 내부에서의 링크 정렬(SPEC-UX-006 REQ-UX-006-008 ~ REQ-UX-006-011) 은 **항상** 기존과 동일하게 `arrayMove` 기반으로 동작해야 한다.

판정 기준: `active.data.current.categoryId === over.data.current.categoryId` (또는 over 가 같은 카테고리의 카드인 경우) 이면 단일 그룹 reorder.

### REQ-UX-008-007: 카테고리 간 이동 핸들러

**[Event-Driven]** **When** `onDragEnd` 이벤트가 발생하고 `active.data.current.categoryId !== targetCategoryId` 이면(여기서 `targetCategoryId` 는 `over.data.current.sortable.containerId` 또는 `over.id` 가 droppable 컨테이너인 경우 `over.id`), 시스템은 다음을 1회 트랜잭션으로 수행해야 한다.

- 소스 카테고리(`fromCategoryId`) 의 `links` 배열에서 `linkId` 제거
- 타겟 카테고리(`toCategoryId`) 의 `links` 배열에 다음 위치로 삽입:
  - over 가 링크 카드면 그 인덱스에 삽입
  - over 가 빈 droppable 컨테이너면 배열 끝(`links.length`) 에 삽입

이 동작은 `bookmarkStore.moveLinkBetweenGroups(linkId, fromCategoryId, toCategoryId, toIndex)` 를 1회 호출함으로써 수행된다.

### REQ-UX-008-008: bookmarkStore.moveLinkBetweenGroups API

**[Ubiquitous]** `bookmarkStore` 는 **항상** 다음 시그니처의 액션을 보유해야 한다.

```typescript
moveLinkBetweenGroups: (
  linkId: string,
  fromCategoryId: string,
  toCategoryId: string,
  toIndex: number,
) => void
```

이 액션은:

- `fromCategoryId === toCategoryId` 인 경우 no-op (방어, 의미상 단일 그룹 정렬은 `updateBookmark` 가 담당)
- 소스/타겟 카테고리가 존재하지 않으면 no-op (idempotent 안전망)
- 링크가 소스 카테고리에 없으면 no-op
- 단일 `set` 호출로 `bookmarks` 전체를 한 번에 갱신(부분 적용 방지)
- 링크의 `favorite`, `tags`, `usage` 등 모든 부가 메타데이터를 **보존**한다(객체 참조 그대로 이동)
- 기존 `storage.set('hub-bookmarks', ...)` 영속화 흐름 재사용 (별도 Firestore 동기화 메커니즘 추가 금지)

`toIndex` 가 타겟 `links.length` 보다 크면 끝에 삽입, 0 보다 작으면 맨 앞에 삽입(`clamp` 동작).

### REQ-UX-008-009: 카테고리 간 이동 활성 조건

**[State-Driven]** **While** 전역 편집 모드가 활성화되어 있는 동안(`useEditMode().isEditing === true`) 에만, 카테고리 간 링크 드래그-앤-드롭 이동이 가능해야 한다.

편집 모드 OFF 일 때 링크는 일반 `<a>` 클릭 동작(새 탭 열기 + usage 기록) 만 허용되며 드래그 자체가 비활성이다(SPEC-UX-006 REQ-UX-006-009 패턴 유지).

### REQ-UX-008-010: onDragOver 그룹 간 이동 사전 반영

**[Event-Driven]** **When** `onDragOver` 이벤트에서 active 링크가 다른 카테고리의 영역(droppable 컨테이너 또는 그 컨테이너 내부 카드) 위로 진입하면, 시스템은 즉시 로컬 React 상태(`bookmarks`) 를 갱신해 시각적으로 이동을 반영해야 한다.

다음을 만족해야 한다.

- 동일 카테고리 위 호버는 onDragOver 반영 없이(no-op) onDragEnd 까지 대기
- 다른 카테고리 위 호버는 즉시 소스에서 제거 + 타겟에 삽입
- 영속화(`storage.set`) 는 onDragEnd 에서만 수행 (onDragOver 는 in-memory 상태만 변경)

이는 dnd-kit 공식 multi-container 패턴이며, 사용자 시각적 일관성을 보장한다.

### REQ-UX-008-011: collisionDetection 알고리즘

**[Ubiquitous]** WidgetLayout 의 BookmarkCard grid DndContext 는 **항상** `closestCorners` 또는 `pointerWithin` 기반 collision detection 을 사용해야 한다(기본 `closestCenter` 금지). 결정 사유는 plan.md D2 에 명시한다.

이유: `closestCenter` 는 카드 중심점 기준이므로 빈 카테고리의 좁은 placeholder 영역을 포착하지 못한다. `closestCorners` 또는 `pointerWithin` 은 droppable 컨테이너 경계 인식에 더 적합하다.

### REQ-UX-008-012: DragOverlay 렌더링

**[Ubiquitous]** WidgetLayout 의 BookmarkCard grid DndContext 는 **항상** `<DragOverlay>` 를 포함해야 하며, 드래그 중인 active 항목(링크 또는 카테고리) 의 시각적 미러를 표시해야 한다.

링크 드래그 시: `SortableLink` 와 동일한 시각 표현의 정적 카피(클릭 핸들러 제거, opacity 1)
카테고리 드래그 시: 본 SPEC 변경 사항 아님 — SPEC-UX-007 기존 동작 유지 (overlay 도입은 본 SPEC 1차 범위, 정교한 애니메이션은 Exclusions)

DragOverlay 컴포넌트 자체는 `WidgetLayout.tsx` 의 단일 DndContext 내부에 한 번만 위치해야 한다.

### REQ-UX-008-013: 영속화 트랜잭션 단일성

**[Ubiquitous]** 카테고리 간 이동 한 번에 대해 `storage.set('hub-bookmarks', ...)` 호출은 **항상** 정확히 1회만 발생해야 한다. onDragOver 의 중간 상태 변경은 영속화하지 않으며, onDragEnd 의 최종 상태만 영속화한다.

### REQ-UX-008-014: 부가 메타데이터 보존

**[Unwanted]** 카테고리 간 이동 과정에서 링크의 `favorite`, `tags`, `usage` 등 부가 메타데이터가 **소실되어서는 안 된다**. `moveLinkBetweenGroups` 는 링크 객체 참조 그대로(또는 deep clone 후) 이동해야 한다.

### REQ-UX-008-015: 즐겨찾기 뷰 정렬 invariant

**[Unwanted]** PivotLayout 의 즐겨찾기 뷰(`context.kind === 'favorites'`) 에서의 정렬 변경은 본 SPEC 의 적용 범위가 **아니어야 한다**. 즐겨찾기 뷰 내부의 순서 변경(만약 향후 도입되더라도) 은 원본 카테고리(`bookmarks[].links`) 의 순서를 **변경해서는 안 된다**(invariant).

본 SPEC 구현 시 이 invariant 가 깨지지 않는지 회귀 테스트로 검증한다.

### REQ-UX-008-016: 같은 위치 no-op

**[Unwanted]** 사용자가 링크를 자기 자신의 원래 위치로 드롭한 경우(`active.id === over.id` AND 같은 카테고리), 시스템은 어떤 상태 변경도 일으켜서는 **안 된다** (`updateBookmark` / `moveLinkBetweenGroups` / `storage.set` 모두 호출 금지).

### REQ-UX-008-017: 회귀 0

**[Unwanted]** 본 SPEC 구현 후 다음 SPEC 들의 acceptance 시나리오에 회귀가 발생해서는 안 된다.

- SPEC-UX-006 (특히 AC-008/010/011 — 같은 카테고리 링크 정렬, long-press 250ms)
- SPEC-UX-007 (특히 AC-005/006/011/012 — 편집 모드 토글, 카테고리 카드 정렬)
- SPEC-LAYOUT-001, SPEC-UI-001 (위젯 그리드, 시각 토큰)

### REQ-UX-008-018: 빌드/린트/타입 통과

**[Ubiquitous]** 본 SPEC 구현 후 다음 명령이 **항상** 성공해야 한다.

- `npm run build`
- `npm run lint` (ESLint 오류 0)
- `npm run typecheck` (TypeScript 오류 0)

## 비기능 요구사항

### NFR-001: 외부 의존성 무증가

본 SPEC 구현 과정에서 신규 npm 패키지를 추가하지 않는다. `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` 는 SPEC-UX-006/007 에서 이미 설치되어 있음(검증 완료).

### NFR-002: TDD 준수

`quality.yaml` `development_mode: tdd` 에 따라 RED → GREEN → REFACTOR 순으로 진행한다. 각 REQ 의 GREEN 단계 진입 전 실패하는 단위 테스트가 선작성되어야 한다.

### NFR-003: 모바일 호환

SPEC-UX-006 의 long-press 250ms PointerSensor 활성화 제약을 유지한다. 빈 카테고리 droppable 의 최소 높이(`min-height: 48px`) 는 모바일에서도 충분한 hit-area 를 제공해야 한다.

### NFR-004: 회귀 방지

기존 SPEC-UX-006 / SPEC-UX-007 단위/통합 테스트 100% 통과(BookmarkCard.test.tsx, bookmarkStore.test.ts, WidgetLayout.test.tsx 등).

## 제약사항

- React 19 / TypeScript strict / Zustand 5 유지
- 한국어 코드 주석 (per `.moai/config/sections/language.yaml` `code_comments: ko`)
- 신규 파일 첫 줄은 한국어 한 줄 헤더 주석 (per 글로벌 CLAUDE.md Rule 6)
- 신규 외부 의존성 추가 금지 (NFR-001)
- TDD 모드 준수 (NFR-002)
- "Surgical Changes" 원칙 — SPEC 외 리팩토링 금지
- 백엔드/Firestore 스키마 변경 금지
- PivotLayout / 즐겨찾기 뷰 변경 금지(REQ-UX-008-015 invariant 유지를 위한 최소 변경만 허용)

## 데이터 스키마

### moveLinkBetweenGroups 의미론

입력:

- `linkId: string` — 이동할 링크 id
- `fromCategoryId: string` — 소스 카테고리 id
- `toCategoryId: string` — 타겟 카테고리 id
- `toIndex: number` — 타겟 카테고리 내 삽입 위치(0-based)

출력 (의사 코드):

```
if fromCategoryId === toCategoryId: return  // no-op (의미상 단일 그룹은 updateBookmark)

let bookmarks = state.bookmarks
let fromCat = find(bookmarks, b => b.id === fromCategoryId)
let toCat = find(bookmarks, b => b.id === toCategoryId)
if !fromCat || !toCat: return

let link = find(fromCat.links, l => l.id === linkId)
if !link: return

let nextFromLinks = fromCat.links.filter(l => l.id !== linkId)
let clampedIndex = clamp(toIndex, 0, toCat.links.length)
let nextToLinks = [
  ...toCat.links.slice(0, clampedIndex),
  link,  // 객체 참조 그대로 이동 → favorite/tags/usage 보존
  ...toCat.links.slice(clampedIndex),
]

let nextBookmarks = bookmarks.map(b => {
  if b.id === fromCategoryId: return { ...b, links: nextFromLinks }
  if b.id === toCategoryId: return { ...b, links: nextToLinks }
  return b
})

set({ bookmarks: nextBookmarks })
if loaded: storage.set('hub-bookmarks', JSON.stringify(nextBookmarks))
```

### onDragOver / onDragEnd 식별자 매핑

| dnd-kit 이벤트 필드 | 의미 | 본 SPEC 매핑 |
|---|---|---|
| `active.id` | 드래그 중인 항목 id | linkId (또는 categoryId — 카테고리 자체 드래그 시) |
| `active.data.current.type` | 항목 종류 | `'link'` 또는 `'category'` |
| `active.data.current.categoryId` | active 가 속한 카테고리 id | sourceCategoryId (link 인 경우) |
| `over.id` | 호버 대상 id | 링크 id (카드 위) 또는 카테고리 id (droppable 컨테이너 위) |
| `over.data.current.sortable.containerId` | 호버 대상이 속한 SortableContext id | targetCategoryId (over 가 링크 카드일 때) |
| `over.data.current.type` | 호버 대상 종류 | `'link'` 또는 `'category'` |

판정 로직:

```
if active.data.current.type === 'category':
  → SPEC-UX-007 카테고리 정렬 분기 (기존 handleCategoryDragEnd)
else if active.data.current.type === 'link':
  sourceCategoryId = active.data.current.categoryId
  targetCategoryId = over.data.current.sortable?.containerId ?? over.id  // droppable 컨테이너 직접 호버 케이스

  if sourceCategoryId === targetCategoryId:
    → 단일 그룹 reorder (arrayMove + updateBookmark)
  else:
    → 그룹 간 이동 (moveLinkBetweenGroups)
```

## Exclusions (What NOT to Build)

- **PivotLayout(SPEC-UX-003) 의 cross-category DnD**: 본 SPEC 은 `viewMode === 'widgets'` 의 BookmarkCard grid 한정. PivotLayout 의 BookmarkList(가상화 행 기반) 는 별도 SPEC 후보.
- **PivotLayout 정렬 옵션(이름순/추가순/빈도순) 과의 충돌 해소**: 본 SPEC 적용 화면(WidgetLayout) 과 무관. progress.md "후속 후보" 에만 기록.
- **카테고리 CRUD UI 변경**: 기존 `handleAddCategory` / `EditModal` 흐름 유지.
- **DragOverlay 의 정교한 애니메이션 / 스프링 / 그림자**: 단순 카드 미러로 시작. 정교한 모션은 향후 SPEC 후보.
- **카테고리 자체의 정렬**: SPEC-UX-007 에서 이미 지원, 본 SPEC 은 그 위에 cross-category link 이동을 추가만 함.
- **Cmd+Z (Undo) / 이동 히스토리**: 본 SPEC 1차 범위 아님 — 후속 후보.
- **즐겨찾기 뷰 내부의 정렬 변경**: 본 SPEC 은 invariant(REQ-UX-008-015) 유지만 책임지며, 즐겨찾기 뷰 내부 정렬 UX 자체는 도입하지 않음.
- **Firebase Firestore 동기화 메커니즘 변경**: 기존 `storage.set` 로직 그대로 사용. 별도 sync 큐 / 트랜잭션 API 추가 금지.
- **다중 선택(multi-select) 후 일괄 이동**: 단일 항목 이동만 지원. 다중 선택은 별도 SPEC 후보.
- **카테고리 간 카테고리 이동(예: 카테고리 A 를 카테고리 B 내부로 nest)**: 본 SPEC 의 범위 아님 — Deskflow 는 1-depth 카테고리 모델 유지.
