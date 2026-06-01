---
id: SPEC-UX-012
version: 1.0.0
status: planned
created: 2026-06-02
updated: 2026-06-02
author: ZeroJuneK
priority: high
issue_number: 0
---

# SPEC-UX-012: 즐겨찾기 위젯 멀티 확장 아코디언 재설계 (Fixed-Height Card Grid → Multi-Expand Accordion + Chip Links)

## HISTORY

| 버전 | 날짜 | 작성자 | 변경 내용 |
|------|------|--------|-----------|
| 1.0.0 | 2026-06-02 | ZeroJuneK | 최초 작성 (고정 높이 카드 그리드 → 멀티 확장 아코디언 + 칩 인라인 wrap 링크 + 링크 수 배지 + localStorage 확장 상태 영속화) |

## 개요

즐겨찾기 위젯은 현재 카테고리를 **고정 높이(220px) 카드 그리드**로 렌더한다. grep 검증:

- 외부 그리드: `WidgetLayout.tsx:979` `gridAutoRows: '220px'`
- 개별 카드: `BookmarkCard.tsx:80` `height: 220` + `overflow: 'hidden'` + 내부 스크롤 래퍼(`flex: 1, minHeight: 0, overflowY: 'auto'`)
- 링크 레이아웃: `BookmarkCard.tsx:201-209` 2열 그리드(`gridTemplateColumns: '1fr 1fr'`)

이 고정 높이는 원래 **드래그 재정렬 시 세로 jitter 방지**를 위해 도입되었다(`BookmarkCard.tsx:75-79`, `WidgetLayout.tsx:976-978` 주석: "행 높이를 카드 height(220)와 동일하게 고정 → swap 시 row 높이 변동으로 인한 세로 jitter 미발생"). 그러나 다음 부작용이 확인되었다.

### 1. 북마크 가시성 결함 (UX 핵심 문제)

각 카테고리는 220px 안에 헤더(48px) + margin + padding을 빼면 링크 영역이 약 122px(3행 표시)만 남는다. 2열 그리드 기준 **약 4~6개 링크만 보이고 나머지는 카드 내부 스크롤에 숨는다**. 사용자가 자신의 북마크 대부분을 한눈에 볼 수 없다.

### 2. 링크 이름 과도한 truncation

2열 그리드에서 각 링크는 카드 폭의 절반만 차지하므로 이름이 심하게 잘린다(`SortableLink.tsx:115-122` `textOverflow: 'ellipsis', whiteSpace: 'nowrap'`). 사용자가 어떤 북마크인지 식별하기 어렵다.

사용자 보고: "즐겨찾기에 링크를 많이 넣었는데 카드마다 몇 개밖에 안 보이고 이름도 다 잘린다. 스크롤을 카드마다 따로 해야 해서 불편하다."

### 본 SPEC 의 해결 방향

고정 높이 카드 그리드를 **멀티 확장 아코디언(multi-expand accordion)** 으로 대체한다.

- 각 카테고리는 접을 수 있는(collapsible) 섹션이 되며, 사용자는 **여러 카테고리를 동시에 펼칠 수 있다**(단일 open 아코디언이 아님).
- 펼쳐진 카테고리의 링크는 **칩(chip) 인라인 wrap** 으로 렌더되어 가로로 흐르며(`flex-wrap`), 공간 효율적으로 더 많은 링크를 더 적은 truncation 으로 표시한다.
- 카테고리 헤더는 아이콘 + 이름 + **링크 수 배지**("(12)") + 펼침/접힘 셰브론을 표시한다.

본 SPEC 은 SPEC-UX-007/008/009/010/011 의 누적 DnD invariant 를 **보존**한다(아래 REQ-UX-012-008 ~ 014). 단, 카테고리 간 링크 이동(cross-group move, SPEC-UX-008)은 본 SPEC 에서 **명시적 비목표(non-goal)** 로 분류한다(아래 Exclusions + REQ-UX-012-010 참고).

**분류**: SPEC (구현 대상 기능)
**성격**: Brownfield — `BookmarkCard.tsx` (고정 높이 카드 → collapsible 아코디언 섹션 + 칩 링크 레이아웃) + `WidgetLayout.tsx` 즐겨찾기 섹션(고정 높이 그리드 → 아코디언 스택) 수정 + 확장 상태 store(기존 `editModeStore` localStorage 패턴 확장 또는 신규 `favoritesExpandStore`) + `globals.css` 칩/아코디언 시각 토큰 추가
**선행 SPEC**: SPEC-UX-006 (반응형 + 링크 정렬), SPEC-UX-007 (전역 편집 모드 + 카테고리 정렬), SPEC-UX-008 (카테고리 간 링크 이동 + 단일 DndContext), SPEC-UX-009 (레벨별 핸들 시각 분리), SPEC-UX-010 (자동 종료 + 빈 그룹 placeholder), SPEC-UX-011 (DnD UX 개선 + 타이머 일시 중지)
**범위**: `viewMode === 'widgets'` 의 즐겨찾기 위젯(`isWidgetVisible('bookmarks')`) 한정. PivotLayout 적용 제외(Exclusions 참고).

## 요구사항

### 영역 1: 아코디언 구조

#### REQ-UX-012-001: 고정 높이 카드 → collapsible 아코디언 섹션

**[Ubiquitous]** 즐겨찾기 위젯의 각 카테고리는 **항상** 펼침/접힘이 가능한 아코디언 섹션으로 렌더되어야 하며, 고정 높이(220px) 카드 + 카드 내부 스크롤 구조를 가져서는 안 된다.

판별 기준:
- `BookmarkCard.tsx:80` 의 `height: 220` 고정 제거
- `BookmarkCard.tsx:182-198` 의 내부 스크롤 래퍼(`flex: 1, minHeight: 0, overflowY: 'auto'`) 제거 — 카테고리 콘텐츠는 펼쳐진 만큼 세로로 자연 확장
- `WidgetLayout.tsx:979` 의 `gridAutoRows: '220px'` 고정 행 높이 그리드 제거 — 카테고리는 세로 스택으로 배치
- 즐겨찾기 위젯 컨테이너(`WidgetLayout.tsx:900-948`) 자체의 스크롤(`overflowY: 'auto'`) 은 유지 — 모든 카테고리가 펼쳐졌을 때 위젯 영역 스크롤로 처리

#### REQ-UX-012-002: 멀티 확장 (다중 동시 펼침)

**[Ubiquitous]** 시스템은 **항상** 여러 카테고리를 동시에 펼친 상태로 유지할 수 있어야 한다(classic single-open 아코디언이 아님). 한 카테고리를 펼쳐도 다른 펼쳐진 카테고리가 자동으로 접혀서는 안 된다.

판별 기준: 확장 상태는 카테고리별 boolean 의 집합(`Record<categoryId, boolean>` 또는 `Set<categoryId>`)으로 관리되며, 한 카테고리의 토글이 다른 카테고리의 상태에 영향을 주지 않는다.

#### REQ-UX-012-003: 확장/접힘 상태 localStorage 영속화

**[Event-Driven]** **When** 사용자가 카테고리를 펼치거나 접으면, 시스템은 해당 카테고리의 확장 상태를 `localStorage` 에 영속화해야 한다.

판별 기준:
- 기존 `editModeStore.ts:32-45` 의 `readBool` / 영속화 키 패턴을 따른다.
- 영속화 키: `favorites-expanded` (값은 펼쳐진 카테고리 id 배열의 JSON 직렬화, 또는 카테고리별 boolean map)
- 페이지 새로고침 후에도 마지막 확장/접힘 상태가 복원되어야 한다.

#### REQ-UX-012-004: 최초 실행 기본 확장 상태

**[State-Driven]** **While** `localStorage` 에 `favorites-expanded` 키가 존재하지 않는 최초 실행 환경에서는, 시스템은 **모든 카테고리를 펼친 상태(default: all expanded)** 로 렌더해야 한다.

이유:
1. 본 SPEC 의 핵심 동기는 "북마크가 안 보이는 문제 해결" — 최초 진입 시 모두 보이는 것이 의도에 부합
2. 사용자는 필요에 따라 개별 카테고리를 접어 정리 가능
3. 신규 카테고리 추가 시(localStorage 에 키 없음) 기본적으로 펼쳐진 상태로 노출 — 새 카테고리가 숨지 않음

판별 기준: 영속화된 상태에 명시되지 않은 카테고리 id 는 펼침(true) 으로 간주한다.

### 영역 2: 카테고리 헤더

#### REQ-UX-012-005: 헤더 구성 — 아이콘 + 이름 + 링크 수 배지 + 셰브론

**[Ubiquitous]** 각 카테고리 헤더는 **항상** 다음 요소를 포함해야 한다.

- 카테고리 아이콘(`category.icon`) — 기존 `BookmarkCard.tsx:130` 보존
- 카테고리 이름(`category.name`) — 기존 `BookmarkCard.tsx:131-139` 보존
- **링크 수 배지**: 카테고리 링크 개수를 "(N)" 형태로 표시(예: "(12)"). `category.links.length` 기반. 색 `var(--text-muted)`, 이름 우측에 인접
- **펼침/접힘 셰브론(chevron)**: 펼침 상태에 따라 회전(접힘=오른쪽/아래, 펼침=아래/위). `lucide-react` 의 `ChevronDown`(이미 설치된 `lucide-react` 사용 — REQ-UX-012-016). 색 `var(--text-muted)`
- 편집 버튼(⚙️) — 기존 `BookmarkCard.tsx:143-170` 보존(편집 모드 ON 시에만 노출)

#### REQ-UX-012-006: 헤더 클릭 시 토글 (인터랙티브 컨트롤 예외)

**[Event-Driven]** **When** 사용자가 카테고리 헤더를 클릭하면, 시스템은 해당 카테고리의 펼침/접힘을 토글해야 한다. 단, 헤더 내 인터랙티브 컨트롤(편집 ⚙️ 버튼, 드래그 핸들) 클릭 시에는 토글이 발생해서는 **안 된다**.

판별 기준:
- 헤더 영역 클릭 → `toggleExpand(category.id)` 호출
- ⚙️ 편집 버튼(`data-testid="bookmark-edit-btn"`) 의 `onClick` / `onPointerDown` 은 `stopPropagation()` (기존 `BookmarkCard.tsx:144-152` 패턴 보존 + 확장)
- 드래그 핸들(`data-group-handle`, `DragHandleSlot`) 의 pointerdown 은 `stopPropagation()` 으로 헤더 토글로 버블링되지 않음

#### REQ-UX-012-007: 헤더 키보드 접근성 (ARIA disclosure 패턴)

**[Ubiquitous]** 각 카테고리 헤더의 펼침/접힘 토글은 **항상** ARIA disclosure 패턴을 만족해야 한다.

- 헤더 토글 요소: `role="button"` (또는 native `<button>`), `aria-expanded={isExpanded}`
- 펼쳐지는 콘텐츠 영역과의 연결: `aria-controls={panelId}`
- 키보드: `Enter` 와 `Space` 로 토글 가능, `Tab` 으로 포커스 이동
- 셰브론 아이콘은 `aria-hidden="true"` (장식 요소)

판별 기준: 헤더 토글 요소는 `aria-expanded` 속성이 펼침 상태와 일치해야 하며, `Enter`/`Space` keydown 이 `toggleExpand` 를 호출해야 한다.

### 영역 3: 칩 인라인 wrap 링크 레이아웃

#### REQ-UX-012-008: 펼친 카테고리 링크 = 칩 인라인 wrap

**[State-Driven]** **While** 카테고리가 펼쳐진 상태(`isExpanded === true`)인 동안, 해당 카테고리의 링크는 **항상** 칩(chip) 형태로 가로 wrap 렌더되어야 한다(기존 2열 그리드 아님).

판별 기준:
- 컨테이너: `display: 'flex', flexWrap: 'wrap', gap: 8` (기존 `gridTemplateColumns: '1fr 1fr'` 제거)
- 각 링크 칩은 내용(이름)에 맞춰 폭이 결정되며(`width: auto` / `flex: '0 0 auto'`), 카드 폭 절반에 강제되지 않음
- 카테고리가 접힌 상태(`isExpanded === false`)에서는 링크 칩 영역을 렌더하지 않거나 시각적으로 숨긴다(`display: none` 또는 조건부 렌더)

#### REQ-UX-012-009: 칩 시각 스펙 (디자인 토큰)

**[Ubiquitous]** 각 링크 칩은 **항상** 다음 시각 토큰을 만족해야 한다(grep 검증된 기존 토큰 재사용 — `globals.css:240-262`).

- 배경: `var(--link-bg)` (= `--surface-2`)
- hover 배경: `var(--link-hover)` (= `--surface-2`) — 기존 `SortableLink.tsx:93-97` hover 패턴 보존
- 텍스트 색: `var(--text-primary)`
- 패딩: 컴팩트(예: `4px 10px`), 모서리 둥글게(`borderRadius: 8~10`)
- 폰트 크기: 13px (기존 `SortableLink.tsx:64` 보존)
- 칩 간 간격: `gap: 8`
- 편집 모드 드래그 중 칩: 기존 SPEC-UX-011 시각(`opacity: 0.4` + `--accent-soft` 배경 + dashed outline — `SortableLink.tsx:49-56`) 보존

#### REQ-UX-012-010: 링크 이름 표시 정책 — truncation 완화

**[Ubiquitous]** 칩 링크의 이름은 **항상** 현재 2열 그리드 대비 더 적은 truncation 으로 표시되어야 한다.

판별 기준:
- 칩은 합리적 최대 폭(예: `maxWidth: 200px`) 내에서 이름 전체를 표시하려 시도한다.
- 이름이 최대 폭을 초과하면 `ellipsis` 로 truncation 하되, 2열 그리드(카드 폭의 절반) 대비 훨씬 넓은 폭을 허용한다.
- 짧은 이름의 칩은 이름 길이에 맞춰 폭이 축소되어 한 줄에 여러 칩이 wrap 된다.

### 영역 4: DnD invariant 보존 (회귀 0)

#### REQ-UX-012-011: 단일 편집 토글 + 단일 DndContext 보존

**[Unwanted]** 본 SPEC 구현 후에도 편집 모드는 **단일 `editModeStore` 토글**로 관리되어야 하며, `WidgetLayout.tsx:951-968` 의 **단일 `DndContext`** 가 분할되어서는 안 된다(SPEC-UX-007 REQ-UX-007-001, SPEC-UX-008 REQ-UX-008-001/002, SPEC-UX-009 REQ-UX-009-001/002 보존).

본 SPEC 은 카테고리 콘텐츠 레이아웃(고정 높이 → 아코디언, 2열 그리드 → 칩 wrap)만 변경하며, dnd-kit 의 sensor / context / `closestCorners` collision detection / DragOverlay 구조는 그대로 유지한다.

#### REQ-UX-012-012: 카테고리 재정렬(그룹 핸들) 보존

**[Ubiquitous]** 편집 모드 ON 시, 사용자는 **항상** 카테고리 헤더의 그룹 핸들(`data-group-handle`, `DragHandleSlot level="group"`)을 잡고 카테고리 순서를 재정렬할 수 있어야 한다(SPEC-UX-007 카테고리 정렬 + SPEC-UX-009 핸들 보존).

판별 기준:
- `BookmarkCard.tsx:36-43` 의 카테고리 `useSortable({ id, data: { type: 'category' } })` 보존
- `WidgetLayout.tsx:971` 의 카테고리 `SortableContext` (`rectSortingStrategy` 또는 세로 스택에 맞는 전략) 보존
- 그룹 핸들의 pointerdown 은 헤더 토글(REQ-UX-012-006)로 버블링되지 않음

#### REQ-UX-012-013: 카테고리 내부 링크 재정렬 보존

**[Ubiquitous]** 편집 모드 ON 시, 사용자는 펼쳐진 카테고리 내부에서 **항상** 링크 칩을 잡고 같은 카테고리 내 순서를 재정렬할 수 있어야 한다(SPEC-UX-006 링크 정렬 + SPEC-UX-009 링크 핸들 보존).

판별 기준:
- `SortableLink.tsx:38-43` 의 링크 `useSortable({ id, data: { type: 'link', categoryId } })` 보존
- `BookmarkCard.tsx:179` 의 링크 `SortableContext` 보존 — 칩 wrap 레이아웃에 맞는 sorting strategy(`rectSortingStrategy` 권장)
- 접힌 카테고리는 링크 칩을 렌더하지 않으므로 내부 정렬 대상이 아님(REQ-UX-012-008)

#### REQ-UX-012-014: 카테고리 간 링크 이동(cross-group) 비목표 — 아코디언에서 일시 중단

**[Unwanted]** 본 SPEC 에서는 카테고리 간 링크 이동(cross-group move, SPEC-UX-008 REQ-UX-008-007/008 `moveLinkBetweenGroups`)을 **지원하지 않는다(비목표)**. 접힌 카테고리는 링크 drop target 이 될 필요가 없으며, 펼친 카테고리 간 링크 이동도 본 SPEC 범위에서 의도적으로 일시 중단한다.

근거(rationale):
1. **드롭 모호성**: 아코디언에서 접힌 카테고리에 링크를 드롭하는 것은 시각적으로 모호하다(드롭 대상 영역이 헤더 한 줄뿐). 사용자가 어디에 떨어질지 예측하기 어렵다.
2. **레이아웃 가변성**: 펼침/접힘으로 카테고리 높이가 동적으로 변하므로, 드래그 중 다른 카테고리로의 정확한 드롭 지점 계산이 불안정하다.
3. **본 SPEC 의 초점**: 본 SPEC 은 가시성/레이아웃 재설계가 목표이며, cross-group 이동은 별도 후속 SPEC 에서 아코디언에 맞는 드롭 UX(예: 접힌 헤더로 hover 시 자동 펼침)를 설계한 후 재도입한다.

판별 기준:
- SPEC-UX-008 의 `moveLinkBetweenGroups` store 액션 자체는 **삭제하지 않는다**(다른 경로 또는 후속 SPEC 에서 사용 가능). 본 SPEC 은 아코디언 UI 에서 cross-group **드롭 경로만** 비활성/미구현 상태로 둔다.
- 링크 드래그는 같은 카테고리 내 재정렬(REQ-UX-012-013)로 한정한다.
- 접힌 카테고리는 링크 `useDroppable` drop target 으로 등록할 필요가 없다(`BookmarkCard.tsx:58` 의 droppable 은 펼친 카테고리에 한정하거나, 등록하되 cross-group 핸들러를 no-op 처리).

### 영역 5: 접근성 / 타이머 / 반응형 보존

#### REQ-UX-012-015: 자동 종료 타이머 일시 중지 보존 (SPEC-UX-011)

**[Unwanted]** 본 SPEC 구현 후에도 SPEC-UX-011 의 "드래그 중 자동 종료 타이머 일시 중지"(`editModeStore.isDragging` / `setDragging` + `WidgetLayout.tsx:463-499` 의 `isDragInProgress` 가드) 가 동작을 멈춰서는 안 된다.

판별 기준:
- `handleDragStart`(`WidgetLayout.tsx:153-159`) 의 `setDragging(true)`, `handleDragEnd`/`handleDragCancel`(`:237-314`) 의 `setDragging(false)` 보존
- `data-testid="edit-mode-countdown"`(`WidgetLayout.tsx:771`) 카운트다운 UI 보존
- 아코디언 헤더 토글(펼침/접힘) 도 사용자 활동으로 간주되어 타이머가 리셋되어야 한다(`WidgetLayout.tsx:488-492` 의 `pointerdown`/`keydown` 활동 리스너에 자연 포함)

#### REQ-UX-012-016: 외부 의존성 무증가

**[Ubiquitous]** 본 SPEC 구현 과정에서 **항상** 신규 npm 패키지를 추가해서는 안 된다.

검증:
- `lucide-react` 이미 설치(`DragHandleSlot.tsx:3` 에서 `GripVertical`, `Grip` import 중) — `ChevronDown` 직접 import 가능
- `@dnd-kit/*`, `zustand` 이미 설치 — 확장 상태 store 즉시 작성 가능
- 칩/아코디언 시각은 기존 `globals.css` 토큰 재사용

#### REQ-UX-012-017: 모바일 반응형 보존

**[State-Driven]** **While** 모바일 viewport(react-grid-layout 의 모바일 breakpoint)에서, 즐겨찾기 아코디언은 **항상** 세로로 자연 stack 되어야 하며, 칩은 좁은 폭에서도 wrap 되어 가독성을 유지해야 한다.

판별 기준:
- 모바일에서 카테고리는 1열 세로 스택(react-grid-layout 모바일 레이아웃 내부)
- 칩 wrap 은 좁은 폭에서 자동으로 행을 늘려 표시
- 헤더 토글 hit-area 는 모바일 터치 보장(최소 44px 높이 — SPEC-UX-009 NFR-001 / WCAG 2.5.5 권고)

#### REQ-UX-012-018: 편집 모드 시각 단서 보존

**[Ubiquitous]** 편집 모드 ON 시 카테고리의 시각 단서(accent border — `BookmarkCard.tsx:71` `border: isEditing ? '1px solid var(--accent)'`, 핸들 노출)는 **항상** 본 SPEC 의 아코디언 구조에서도 유지되어야 한다(SPEC-UX-007/009 보존).

#### REQ-UX-012-019: 빌드/린트/타입 통과

**[Ubiquitous]** 본 SPEC 구현 후 다음 명령이 **항상** 성공해야 한다.

- `npm run build`
- `npm run lint` (ESLint 오류 0)
- `npm run typecheck` (TypeScript 오류 0)

#### REQ-UX-012-020: 회귀 0 — SPEC-UX-006~011 acceptance 보존

**[Unwanted]** 본 SPEC 구현 후 다음 기존 SPEC 들의 acceptance 시나리오에 (본 SPEC 이 명시적으로 변경하는 항목을 제외하고) 회귀가 발생해서는 안 된다.

- SPEC-UX-006 (같은 카테고리 링크 정렬 + 영속화 + long-press 250ms) — REQ-UX-012-013 으로 보존
- SPEC-UX-007 (편집 모드 토글, Esc 종료, 카테고리 정렬) — REQ-UX-012-011/012 로 보존
- SPEC-UX-008 (단일 DndContext, DragOverlay) — REQ-UX-012-011 로 보존. **단, cross-group 링크 이동은 본 SPEC 에서 비목표(REQ-UX-012-014)** — 이 항목만 의도적 변경
- SPEC-UX-009 (레벨별 핸들 시각 — group/link 핸들) — REQ-UX-012-012/013 로 보존
- SPEC-UX-010 (자동 종료 + 빈 그룹 placeholder) — 빈 카테고리 placeholder 는 아코디언 펼침 시 표시로 적응
- SPEC-UX-011 (타이머 일시 중지 + accessibility announcements) — REQ-UX-012-015 로 보존

## 비기능 요구사항

### NFR-001: 접근성 (WCAG 2.1 AA + ARIA disclosure)

- 헤더 토글은 ARIA disclosure 패턴(`aria-expanded`, `aria-controls`, `Enter`/`Space`) 준수 (REQ-UX-012-007)
- dnd-kit 키보드 정렬(SPEC-UX-009 KeyboardSensor) 과 헤더 키보드 토글이 충돌 없이 공존
- 셰브론/그립 아이콘은 `aria-hidden="true"`
- 헤더 토글 hit-area 최소 44px (REQ-UX-012-017)
- SPEC-UX-011 의 dnd-kit accessibility announcements(`WidgetLayout.tsx:958-963`) 보존

### NFR-002: DnD jitter 무회귀

고정 높이 제거로 카테고리 재정렬 시 세로 jitter 가 재발하지 않아야 한다. 아코디언 세로 스택에서 카테고리 swap 시 dnd-kit 의 transform 기반 정렬이 부드럽게 동작해야 한다(접힌 카테고리는 헤더 높이로 일정하므로 jitter 위험 낮음, 펼친 카테고리는 높이 가변이지만 드래그 대상은 헤더 핸들이므로 DragOverlay 미러로 처리).

### NFR-003: 성능 (다수 카테고리/링크)

- 카테고리 수십 개 + 카테고리당 링크 수십 개 환경에서 펼침/접힘 토글이 즉각 반응(60fps 목표)
- `linkIds` / `displayBookmarkIds` 의 `useMemo` 패턴(`BookmarkCard.tsx:61`, `WidgetLayout.tsx:320`) 보존으로 드래그 중 배열 안정성 유지
- 접힌 카테고리는 링크 칩을 렌더하지 않아 초기 렌더 비용 절감(조건부 렌더)

### NFR-004: TDD 준수

`quality.yaml` `development_mode` 에 따라 진행. 각 REQ 의 구현 전 실패 테스트 선작성.

### NFR-005: e2e 검증

Playwright e2e 로 아코디언 펼침/접힘, 멀티 확장, localStorage 영속화, 칩 wrap, 카테고리/링크 정렬, 키보드 토글, 타이머 일시 중지를 검증한다. 기존 `e2e/spec-ux-011-favorites-dnd.spec.ts` 를 sibling 패턴으로 참고한다.

## 제약사항

- React 19 / TypeScript strict / Zustand 5 유지
- 한국어 코드 주석 (per `.moai/config/sections/language.yaml` `code_comments: ko`)
- 신규 파일 첫 줄은 한국어 한 줄 헤더 주석
- 신규 외부 의존성 추가 금지 (REQ-UX-012-016)
- TDD 모드 준수 (NFR-004)
- "Surgical Changes" 원칙 — SPEC 외 리팩토링 금지
- 백엔드/Firestore 스키마 변경 금지 — `category.links` 데이터 구조는 그대로, 표시 레이아웃만 변경
- 단일 편집 토글, 단일 DndContext 보존 (REQ-UX-012-011)
- cross-group 링크 이동은 본 SPEC 비목표 (REQ-UX-012-014, Exclusions)

## 데이터 스키마

### 확장 상태 store (신규 또는 editModeStore 확장)

본 SPEC 은 기존 `editModeStore.ts` 의 localStorage 영속화 패턴(`readBool` + 키 상수)을 따르되, 확장 상태는 boolean 단일 값이 아닌 카테고리별 map 이므로 별도 store(`favoritesExpandStore`) 또는 `editModeStore` 확장으로 구현한다(결정은 plan.md D1 참고).

```typescript
// 확장 상태 형상 (예시 — 신규 store 또는 editModeStore 확장)
interface FavoritesExpandState {
  /** 카테고리별 확장 상태 — 키 없으면 펼침(default: all expanded, REQ-UX-012-004) */
  expanded: Record<string, boolean>
  /** 카테고리 펼침/접힘 토글 + localStorage 영속화 */
  toggleExpand: (categoryId: string) => void
  /** 특정 카테고리 확장 여부 조회 (키 없으면 true 반환) */
  isExpanded: (categoryId: string) => boolean
}

// 영속화 키 (editModeStore.ts:33-34 패턴 일관)
const FAVORITES_EXPANDED_KEY = 'favorites-expanded'
```

### 칩 링크 레이아웃 DOM 구조 (예시)

```jsx
{/* BookmarkCard — 펼친 카테고리의 칩 컨테이너 */}
{isExpanded && (
  <div
    id={panelId}
    style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}
  >
    {category.links.map((link) => (
      <SortableLink key={link.id} link={link} isEditing={isEditing} categoryId={category.id} onUsage={...} />
    ))}
    {/* SPEC-UX-010 빈 카테고리 placeholder — 펼침 시 표시 */}
    {category.links.length === 0 && (
      <div data-empty-placeholder>...</div>
    )}
  </div>
)}
```

### 헤더 토글 DOM 구조 (예시 — ARIA disclosure)

```jsx
<div data-category-handle ...그룹 핸들 listeners...>
  <DragHandleSlot level="group" .../>  {/* pointerdown stopPropagation */}
  <button
    role="button"
    aria-expanded={isExpanded}
    aria-controls={panelId}
    onClick={() => toggleExpand(category.id)}
    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') toggleExpand(category.id) }}
  >
    <span>{category.icon}</span>
    <span>{category.name}</span>
    <span style={{ color: 'var(--text-muted)' }}>({category.links.length})</span>
    <ChevronDown aria-hidden="true" style={{ transform: isExpanded ? 'rotate(180deg)' : undefined }} />
  </button>
  <button data-testid="bookmark-edit-btn" onClick={stopPropagation}>⚙️</button>
</div>
```

## @MX 태깅 가이드

본 SPEC 으로 수정되는 anchor 의 `@MX:SPEC` sub-line 에 `SPEC-UX-012` 를 추가한다(per `.claude/rules/moai/workflow/mx-tag-protocol.md`, `code_comments: ko`).

- `BookmarkCard.tsx:3` 의 `// @MX:SPEC: ... SPEC-UX-011` → `SPEC-UX-012` 추가
- `SortableLink.tsx` 의 SPEC 주석 라인 → `SPEC-UX-012` 추가
- `editModeStore.ts:49` 의 `@MX:SPEC` ANCHOR → 확장 store 를 editModeStore 에 통합 시 `SPEC-UX-012` 추가, 별도 store 신규 시 신규 파일에 `@MX:ANCHOR` + `@MX:SPEC: SPEC-UX-012` 작성
- 신규 확장 store 가 fan_in >= 3 (BookmarkCard, WidgetLayout, 헤더 토글) 이면 `@MX:ANCHOR` + `@MX:REASON` 필수

## Exclusions (What NOT to Build)

- **카테고리 간 링크 이동(cross-group move)**: SPEC-UX-008 의 `moveLinkBetweenGroups` 드롭 경로는 본 SPEC 아코디언에서 비활성/미구현(REQ-UX-012-014). store 액션 자체는 삭제하지 않으며 후속 SPEC 에서 아코디언 친화적 드롭 UX(접힌 헤더 hover 자동 펼침 등) 설계 후 재도입
- **단일 open 아코디언(classic accordion)**: 본 SPEC 은 멀티 확장(REQ-UX-012-002). 한 번에 하나만 펼치는 모드는 미지원
- **확장 상태의 Firestore 세션 간 동기화**: `favorites-expanded` 는 localStorage 로컬 영속화만. 디바이스 간 동기화는 별도 SPEC
- **카테고리 접힘 시 미니 미리보기(접힌 상태에서 링크 일부 노출)**: 접힌 카테고리는 헤더만 표시. 미리보기는 별도 SPEC
- **칩 색상/태그 커스터마이징**: 칩 시각은 기존 토큰(`--link-bg` 등) 고정. 사용자 정의 색/태그는 별도 SPEC
- **드래그로 카테고리 펼침 트리거(drag-to-expand)**: 접힌 카테고리 위로 링크 hover 시 자동 펼침 등은 cross-group 재도입 SPEC 에 포함 — 본 SPEC 범위 외
- **링크 칩 다중 선택/일괄 작업**: 본 SPEC 은 칩 레이아웃 + 정렬만. 다중 선택은 별도 SPEC
- **아코디언 펼침/접힘 애니메이션 정교화(height transition spring 등)**: 기본 토글 + 셰브론 회전만. 정교한 모션은 별도 SPEC (prefers-reduced-motion 존중은 기존 globals.css 블록 유지)
- **PivotLayout 영향**: 본 SPEC 은 `viewMode === 'widgets'` 즐겨찾기 위젯 한정
- **빈 카테고리 자동 정리/삭제**: SPEC-UX-010 의 `hideEmptyCategories` / EditModal 흐름 유지

## 추적성 (Traceability)

| REQ | 관련 파일 (현재 grep 검증) | 변경 영역 |
|-----|---------------------------|----------|
| REQ-UX-012-001 | `BookmarkCard.tsx:80` (`height: 220`), `:182-198` (스크롤 래퍼), `WidgetLayout.tsx:979` (`gridAutoRows: '220px'`) | 고정 높이 제거 + 아코디언 세로 확장 |
| REQ-UX-012-002 | 확장 store (신규/`editModeStore` 확장) | 멀티 확장 map |
| REQ-UX-012-003 | 확장 store + `editModeStore.ts:32-45` (`readBool` 패턴) | localStorage 영속화 (`favorites-expanded`) |
| REQ-UX-012-004 | 확장 store 초기화 | 기본값 all expanded |
| REQ-UX-012-005 | `BookmarkCard.tsx:99-171` (헤더) | 링크 수 배지 + 셰브론 추가 |
| REQ-UX-012-006 | `BookmarkCard.tsx:143-152` (⚙️ stopPropagation) | 헤더 클릭 토글 + 인터랙티브 예외 |
| REQ-UX-012-007 | `BookmarkCard.tsx` 헤더 토글 요소 | `aria-expanded`/`aria-controls`/Enter/Space |
| REQ-UX-012-008 | `BookmarkCard.tsx:201-209` (2열 그리드) | 칩 flex-wrap 레이아웃 |
| REQ-UX-012-009 | `globals.css:240-262` (토큰), `SortableLink.tsx:49-70` | 칩 시각 토큰 |
| REQ-UX-012-010 | `SortableLink.tsx:111-141` (이름 span) | truncation 완화 (maxWidth) |
| REQ-UX-012-011 | `WidgetLayout.tsx:951-968` (단일 DndContext) | 보존 |
| REQ-UX-012-012 | `BookmarkCard.tsx:36-43` (카테고리 useSortable), `WidgetLayout.tsx:971` | 카테고리 정렬 보존 |
| REQ-UX-012-013 | `SortableLink.tsx:38-43`, `BookmarkCard.tsx:179` (링크 SortableContext) | 카테고리 내 링크 정렬 보존 |
| REQ-UX-012-014 | `BookmarkCard.tsx:58` (useDroppable), SPEC-UX-008 `moveLinkBetweenGroups` | cross-group 드롭 경로 비활성 (비목표) |
| REQ-UX-012-015 | `editModeStore.ts:16-29, 57-84`, `WidgetLayout.tsx:463-499, 771` | 타이머 일시 중지 + 카운트다운 보존 |
| REQ-UX-012-016 | `package.json` (변경 없음) | 의존성 무증가 |
| REQ-UX-012-017 | `WidgetLayout.tsx` 모바일 breakpoint | 반응형 stack + 칩 wrap |
| REQ-UX-012-018 | `BookmarkCard.tsx:71` (accent border) | 편집 시각 단서 보존 |
| REQ-UX-012-020 | 전 영역 회귀 테스트 | acceptance 보존 (cross-group 제외) |
</content>
</invoke>
