---
id: SPEC-UX-009
version: 1.0.0
status: planned
created: 2026-05-13
updated: 2026-05-13
author: ZeroJuneK
priority: high
issue_number: 0
---

# SPEC-UX-009: 드래그 핸들 시각 분리 (Per-Level Drag Handle Tokens)

## HISTORY

| 버전 | 날짜 | 작성자 | 변경 내용 |
|------|------|--------|-----------|
| 1.0.0 | 2026-05-13 | ZeroJuneK | 최초 작성 (편집 모드 단일 토글 유지 + 레벨별 드래그 핸들 시각 토큰 분리) |

## 개요

SPEC-UX-007(전역 편집 모드, iOS Wiggle 패턴) 과 SPEC-UX-008(카테고리 간 링크 이동, 단일 DndContext 통합) 의 누적 결과, Deskflow 의 위젯 모드(`viewMode === 'widgets'`) 는 단일 "편집" 토글 1개로 4개 레벨의 드래그 가능성을 동시 활성화한다.

1. **위젯 레벨**: `react-grid-layout` 의 `widget-drag-handle` (Clock 셀, SearchBar 셀, 즐겨찾기 위젯 타이틀, TodoWidget/NotesWidget/WeatherWidget/PomodoroWidget/FeedWidget 헤더)
2. **그룹(카테고리) 레벨**: `BookmarkCard` 헤더의 `useSortable` listeners (SPEC-UX-008 D1, `data-category-handle` 마커)
3. **그룹간 링크 레벨**: `SortableLink` 의 `useSortable` listeners (카테고리 간 이동 — SPEC-UX-008 REQ-UX-008-007)
4. **그룹내 링크 레벨**: `SortableLink` 의 동일 listeners (같은 카테고리 정렬 — SPEC-UX-006 REQ-UX-006-008)

현재 grep 결과(`src/renderer/components/BookmarkCard/BookmarkCard.tsx:92` `cursor: isEditing ? 'grab' : 'default'`, `src/renderer/components/BookmarkCard/SortableLink.tsx:57` `cursor: isEditing ? 'grab' : 'pointer'`, `src/renderer/components/WidgetLayout/WidgetLayout.tsx:710` `cursor: isEditing && !isMobile && !isMobileBreakpoint ? 'grab' : 'default'`) 에 따르면, 편집 모드 ON 시 3개 레벨이 모두 `cursor: grab` 으로만 표기되며 시각 토큰이 동일하다. 사용자가 "무엇을 잡는지" 의도(위젯 이동 vs 카테고리 정렬 vs 링크 이동) 를 미리 식별할 수 없다.

본 SPEC 은 **편집 모드는 단일 토글을 유지**하되, 각 레벨의 드래그 핸들에 **레벨별 시각 토큰(아이콘/색/크기/위치)** 을 부여하여 사용자가 핸들을 보는 순간 "어느 레벨의 이동을 시작할지" 파악 가능하게 한다. iOS / Notion / Trello 의 multi-level sortable 패턴을 참고한다.

### 현재 구조의 한계 (grep 검증)

- `globals.css:80-90` — `.widget-drag-handle` 규칙은 `touch-action: none; cursor: grab; min-height: 44px` 만 정의. 시각 토큰(아이콘, 배경, 점 패턴) 없음
- `BookmarkCard.tsx:84-95` — 카테고리 헤더 자체가 `cursor: grab` 영역. 별도 핸들 아이콘 없음
- `SortableLink.tsx:60-87` — 링크 카드 전체가 드래그 영역. 핸들 영역이 카드 = 본문과 분리되지 않음
- `WidgetLayout.tsx:703-714` — 즐겨찾기 위젯 타이틀 div 가 위젯 드래그 핸들. 점/grip 아이콘 없음

### 본 SPEC 의 핵심 아이디어

- **레벨 A — 위젯 핸들**: 위젯 카드 헤더 좌측에 `lucide-react` `GripVertical`(6점) 아이콘 + `--text-muted` 색. 위치 = 헤더 좌측 패딩 영역(8px). 영향 위젯: TodoWidget, NotesWidget, WeatherWidget, PomodoroWidget, FeedWidget 헤더 + Clock 셀 + SearchBar 셀 + 즐겨찾기 위젯 타이틀
- **레벨 B — 그룹 핸들**: BookmarkCard 헤더 좌측에 `lucide-react` `Grip`(8점) 아이콘 + `--accent` 색. 위치 = 카테고리 아이콘 좌측. 카테고리 아이콘/이름 영역은 그대로 유지(클릭/탭 본래 동작)
- **레벨 C — 링크 핸들**: 각 SortableLink 행 좌측에 `lucide-react` `GripVertical`(6점, 작은 사이즈 12px) 아이콘 + `--text-faint` 색. 링크 본문(이름) 클릭은 평소처럼 새 탭 열기

본 SPEC 의 핵심 invariant: **편집 모드 OFF 시 모든 핸들은 숨김**(시각적으로 0px or display:none), **편집 모드 ON 시에만 핸들이 노출되며 핸들 영역만 드래그를 시작**한다. 핸들 외부(카드 본문/링크 텍스트/빈 공간)는 편집 모드 ON 이어도 평소 동작(새 탭 열기, 본문 인터랙션) 을 유지한다.

**분류**: SPEC (구현 대상 기능)
**성격**: Brownfield — `BookmarkCard.tsx` / `SortableLink.tsx` / `WidgetLayout.tsx` 핸들 영역 수정 + `globals.css` 핸들 시각 토큰 추가 + 위젯별 헤더에 핸들 슬롯 삽입
**선행 SPEC**: SPEC-UX-006 (반응형 그리드 + 북마크 링크 정렬), SPEC-UX-007 (전역 편집 모드 + 카테고리 카드 정렬), SPEC-UX-008 (카테고리 간 링크 이동 + 단일 DndContext 통합)
**범위**: `viewMode === 'widgets'` 의 모든 드래그 가능 영역. PivotLayout 은 적용 제외(Exclusions 참고).

## 요구사항

### REQ-UX-009-001: 단일 편집 토글 유지 (회귀 0)

**[Ubiquitous]** 본 SPEC 구현 후에도 **항상** 편집 모드는 **단일 zustand store**(`editModeStore`) 의 단일 토글로 관리되어야 한다. 위젯/그룹/링크 레벨별 별도 편집 토글을 신설해서는 안 된다(SPEC-UX-007 REQ-UX-007-001/006 보존).

### REQ-UX-009-002: 단일 DndContext 구조 유지 (회귀 0)

**[Unwanted]** `WidgetLayout.tsx` 의 BookmarkCard grid 를 감싸는 **단일 `DndContext`**(현재 line 728-788 부근) 는 본 SPEC 구현 후에도 **분할되어서는 안 된다**. 추가 `DndContext` 신설 금지(SPEC-UX-008 REQ-UX-008-001/002 보존).

본 SPEC 은 핸들 영역의 **시각 토큰과 위치만** 변경하며, dnd-kit 의 sensor/context/collisionDetection 구조는 그대로 유지한다.

### REQ-UX-009-003: 레벨 A — 위젯 핸들 시각 토큰

**[Ubiquitous]** 편집 모드 ON 시, 모든 위젯 카드(`react-grid-layout` 의 `widget-drag-handle` 영역) 는 **항상** 다음 시각 토큰을 만족하는 핸들 슬롯을 가져야 한다.

- 아이콘: `lucide-react` 의 `GripVertical` (6점 세로 패턴)
- 아이콘 색: `var(--text-muted)`
- 아이콘 크기: 16px
- 위치: 위젯 헤더 좌측(`flex-start` 정렬 내부의 첫 자식)
- 핸들 영역 hit-area: 최소 44×44px (모바일 터치 보장, NFR-001)

대상 위젯 (현재 `widget-drag-handle` 매칭 위치 — `WidgetLayout.tsx:677, 682, 704` 및 각 위젯 내부 헤더):

| 위젯 | 핸들 슬롯 위치 |
|------|----------------|
| Clock | 위젯 셀(`<div key="clock">`) — 좌상단 absolute |
| SearchBar | 위젯 셀(`<div key="search">`) — 좌상단 absolute |
| 즐겨찾기 위젯 타이틀 | `WidgetLayout.tsx:703-726` 의 `⭐ 즐겨찾기` div 좌측 |
| TodoWidget | 헤더 div("할 일 목록") 좌측 |
| NotesWidget | 헤더 div("빠른 메모") 좌측 |
| WeatherWidget | 헤더 div 좌측 |
| PomodoroWidget | 카드 좌상단 absolute (전체 카드가 핸들이므로 시각 마커만 표시) |
| FeedWidget | 헤더 div 좌측 |

### REQ-UX-009-004: 레벨 B — 그룹 핸들 시각 토큰

**[Ubiquitous]** 편집 모드 ON 시, 모든 `BookmarkCard` 의 카테고리 헤더(`BookmarkCard.tsx:84-96`, `data-category-handle` 영역) 는 **항상** 다음 시각 토큰을 만족하는 핸들 슬롯을 가져야 한다.

- 아이콘: `lucide-react` 의 `Grip` (8점 격자 패턴)
- 아이콘 색: `var(--accent)`
- 아이콘 크기: 18px
- 위치: 카테고리 헤더의 **카테고리 아이콘(`category.icon`) 좌측** — 즉 헤더 내 가장 좌측에 핸들 → 아이콘 → 이름 순으로 배치
- 핸들 영역 hit-area: 최소 44×44px

판별 기준: 핸들 영역은 `data-group-handle` 마커를 가지며, `useSortable` 의 `attributes` / `listeners` 는 이 마커가 부여된 영역에만 적용된다. 카테고리 아이콘/이름 영역(`<span>{category.icon}</span> <span>{category.name}</span>`) 은 listeners 가 적용되어서는 안 된다(REQ-UX-009-007 참고).

### REQ-UX-009-005: 레벨 C — 링크 핸들 시각 토큰

**[Ubiquitous]** 편집 모드 ON 시, 모든 `SortableLink`(`SortableLink.tsx`) 행은 **항상** 다음 시각 토큰을 만족하는 핸들 슬롯을 가져야 한다.

- 아이콘: `lucide-react` 의 `GripVertical` (6점 세로 패턴, 작은 사이즈)
- 아이콘 색: `var(--text-faint)`
- 아이콘 크기: 12px
- 위치: 링크 행의 가장 좌측(`flex` 컨테이너 내 첫 자식, 링크 이름 좌측에 8px gap)
- 핸들 영역 hit-area: 최소 44×44px (모바일 터치 보장)

판별 기준: 핸들 영역은 `data-link-handle` 마커를 가지며, `useSortable` 의 `attributes` / `listeners` 는 이 마커가 부여된 영역에만 적용된다. 링크 이름 영역(`<span>{link.name}</span>`) 은 listeners 가 적용되어서는 안 된다(REQ-UX-009-008 참고).

### REQ-UX-009-006: 편집 모드 OFF 시 모든 핸들 숨김

**[State-Driven]** **While** 편집 모드가 비활성화되어 있는 동안(`useEditMode().isEditing === false`), 레벨 A/B/C 의 모든 핸들 슬롯은 **항상** 시각적으로 숨김 처리되어야 한다.

숨김 방식:
- `opacity: 0` (또는 `display: none`)
- `pointer-events: none`
- 핸들 슬롯이 차지하던 공간은 layout shift 방지를 위해 `opacity` 방식 권장(설계 detail 은 plan.md D1 참고)

판별 기준: 편집 모드 OFF 시 `document.querySelectorAll('[data-group-handle], [data-link-handle]')` 의 가시 핸들 수는 0 이어야 한다(시각 영역 0). 위젯 핸들(레벨 A) 은 layout 공간을 유지하기 위해 `opacity: 0` 만 적용한다.

### REQ-UX-009-007: 그룹 핸들 외부 클릭은 평소 동작 유지

**[Event-Driven]** **When** 편집 모드가 ON 인 상태에서 사용자가 `BookmarkCard` 의 카테고리 아이콘 또는 이름 영역(핸들 외부) 을 클릭하면, 시스템은 카테고리 자체 드래그를 **시작해서는 안 된다**. 클릭은 평소 동작(카드 hover, focus) 만 수행한다.

판별 기준: `useSortable` 의 `attributes` 와 `listeners` 는 `data-group-handle` 마커 영역에만 spread 되며, 카테고리 아이콘/이름 영역에는 spread 되지 않는다(현재 `BookmarkCard.tsx:95` 의 `{...(isEditing ? { ...attributes, ...listeners } : {})}` 는 헤더 전체에 적용 중 → 본 SPEC 에서 핸들 영역에만 제한).

### REQ-UX-009-008: 링크 핸들 외부 클릭은 평소 동작 유지

**[Event-Driven]** **When** 편집 모드가 ON 인 상태에서 사용자가 `SortableLink` 의 링크 이름 영역(핸들 외부) 을 클릭하면, 시스템은 링크 드래그를 **시작해서는 안 된다**.

다만 SPEC-UX-006 REQ-UX-006-009 결정에 따라 편집 모드 ON 시 링크 본문 클릭의 `href` 는 비활성(`preventDefault`) 되어 새 탭 열기가 수행되지 않는다. 본 SPEC 은 이 결정을 유지한다(편집 모드 OFF 시에만 새 탭 열기).

핵심 차이는: 편집 모드 ON 시 링크 본문 클릭은 **아무 동작도 하지 않는다**(드래그도 시작 안함, 새 탭도 안 열림). 드래그를 시작하려면 핸들 영역을 잡아야 한다.

판별 기준: `useSortable` 의 `listeners` 는 `data-link-handle` 마커 영역에만 spread 되며, 링크 본문(`<span>{link.name}</span>`) 에는 spread 되지 않는다(현재 `SortableLink.tsx:69` 의 `{...(isEditing ? listeners : {})}` 는 `<a>` 태그 전체에 적용 중 → 본 SPEC 에서 핸들 영역에만 제한).

### REQ-UX-009-009: 위젯 핸들에서만 RGL 드래그 시작

**[State-Driven]** **While** 편집 모드가 ON 인 상태에서, `react-grid-layout` 의 위젯 드래그는 **항상** 위젯 핸들 슬롯(레벨 A) 의 mousedown/pointerdown 으로만 시작되어야 한다.

판별 기준: `WidgetLayout.tsx` 의 `<ResponsiveGridLayout draggableHandle=".widget-drag-handle">`(현재 line 669) 는 본 SPEC 후에도 유지된다. 단, `.widget-drag-handle` 클래스는 본 SPEC 에서 정의하는 핸들 슬롯 영역에만 부여되며, 위젯 본문(textarea, scroll list, link grid) 은 `.widget-drag-handle` 클래스를 가져서는 안 된다.

### REQ-UX-009-010: 모바일 터치 hit-area 44×44px 보장

**[Ubiquitous]** 모든 핸들 슬롯(레벨 A/B/C) 은 **항상** 최소 44×44px 의 hit-area 를 가져야 한다(WCAG 2.5.5 Target Size 권고).

판별 기준: 시각 아이콘은 12~18px 이지만 핸들의 `padding` 또는 `min-width` / `min-height` 로 44×44px 영역 확보. CSS 토큰은 `globals.css` 에 정의(plan.md D2 참고).

### REQ-UX-009-011: 키보드 접근성 — role 과 aria-label

**[Ubiquitous]** 모든 핸들 슬롯(레벨 A/B/C) 은 **항상** 다음 a11y 속성을 가져야 한다.

- `role="button"`
- `tabindex={0}` (편집 모드 ON 시), `tabindex={-1}` (편집 모드 OFF 시)
- `aria-label`:
  - 레벨 A: `"위젯 이동: {위젯명}"` (예: `"위젯 이동: 할 일 목록"`)
  - 레벨 B: `"카테고리 이동: {category.name}"` (예: `"카테고리 이동: 개발"`)
  - 레벨 C: `"링크 이동: {link.name}"` (예: `"링크 이동: GitHub"`)

키보드 조작:
- `Tab` 으로 핸들 사이 이동
- `Space` / `Enter` 로 드래그 시작 (dnd-kit `KeyboardSensor` 활성 — SPEC-UX-006 의 PointerSensor 와 공존)
- `Arrow` 키로 정렬 변경
- `Esc` 로 드래그 취소 (편집 모드는 유지)

### REQ-UX-009-012: KeyboardSensor 추가 (한정 활성)

**[Ubiquitous]** `WidgetLayout.tsx` 의 단일 `DndContext`(현재 line 728) 의 `sensors` 는 **항상** 다음 두 sensor 의 조합으로 구성되어야 한다.

```typescript
useSensors(
  useSensor(PointerSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
  useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
)
```

`KeyboardSensor` 는 `@dnd-kit/core` 의 기존 API 이며 신규 의존성 추가는 없다(NFR-002).

### REQ-UX-009-013: dnd-kit data 페이로드 확장

**[Ubiquitous]** `useSortable({ id, data: { type, categoryId } })` 의 `data` 페이로드는 본 SPEC 변경 후에도 SPEC-UX-008 의 형상을 **그대로 유지**해야 한다.

- 카테고리: `data: { type: 'category' as const }` (`BookmarkCard.tsx:41`)
- 링크: `data: { type: 'link' as const, categoryId }` (`SortableLink.tsx:38`)

본 SPEC 은 핸들 영역의 spread 위치만 변경하며, dnd-kit data 페이로드 / collision detection / onDragEnd 핸들러 로직은 그대로 유지한다.

### REQ-UX-009-014: 회귀 0 — SPEC-UX-006/007/008 acceptance 보존

**[Unwanted]** 본 SPEC 구현 후 다음 기존 SPEC 들의 acceptance 시나리오에 회귀가 발생해서는 안 된다.

- SPEC-UX-006 (특히 AC-008/010/011 — 같은 카테고리 링크 정렬 + 영속화 + long-press 250ms)
- SPEC-UX-007 (특히 AC-005/006/011/012/015 — 편집 모드 토글, 카테고리 카드 정렬, 위젯 드래그 핸들 통일, ⚙️ 버튼 가시성)
- SPEC-UX-008 (특히 AC-* — 카테고리 간 링크 이동, 단일 DndContext, DragOverlay)

핵심: 단일 편집 토글, 단일 DndContext, dnd-kit data 페이로드, collision detection(`closestCorners`), DragOverlay 모두 그대로 유지.

### REQ-UX-009-015: prefers-reduced-motion 존중

**[Optional]** **Where** 사용자가 OS 설정에서 `prefers-reduced-motion: reduce` 를 활성화한 환경에서는, 핸들 슬롯의 hover / 등장 / 사라짐 transition 이 즉시 적용/해제되어야 한다.

`globals.css:233` 부근에 이미 존재하는 `@media (prefers-reduced-motion: reduce)` 블록에 핸들 transition 규칙을 추가한다.

### REQ-UX-009-016: 외부 의존성 무증가

**[Ubiquitous]** 본 SPEC 구현 과정에서 **항상** 신규 npm 패키지를 추가해서는 안 된다.

검증:
- `lucide-react@^1.11.0` 이미 설치 (`package.json:35`) — `GripVertical`, `Grip` 아이콘 직접 import 가능
- `@dnd-kit/core` 의 `KeyboardSensor` + `sortableKeyboardCoordinates` 이미 export 됨 (현재 v6+ 버전)
- `@dnd-kit/sortable` 의 `useSortable` 의 `attributes` / `listeners` spread 위치 변경만 필요

### REQ-UX-009-017: 빌드/린트/타입 통과

**[Ubiquitous]** 본 SPEC 구현 후 다음 명령이 **항상** 성공해야 한다.

- `npm run build`
- `npm run lint` (ESLint 오류 0)
- `npm run typecheck` (TypeScript 오류 0)

## 비기능 요구사항

### NFR-001: 모바일 터치 hit-area

WCAG 2.5.5 Target Size 권고에 따라 모든 핸들 슬롯은 최소 44×44px hit-area 를 보장한다. 핸들 아이콘 자체는 12~18px 이지만 `padding` 으로 hit-area 확장.

### NFR-002: 외부 의존성 무증가

신규 npm 패키지 추가 금지. 기존 `lucide-react`, `@dnd-kit/*`, `zustand` 만 사용.

### NFR-003: TDD 준수

`quality.yaml` `development_mode: tdd` 에 따라 RED → GREEN → REFACTOR 순으로 진행. 각 REQ 의 GREEN 단계 진입 전 실패 테스트 선작성.

### NFR-004: 회귀 방지

기존 SPEC-UX-006 / SPEC-UX-007 / SPEC-UX-008 단위 + 통합 테스트 100% 통과 (BookmarkCard.test.tsx, bookmarkStore.test.ts, WidgetLayout.test.tsx, SortableLink 관련 테스트).

### NFR-005: e2e 검증

Playwright e2e 로 다음 시나리오 검증:
1. 3개 레벨 핸들이 시각적으로 구별됨 (아이콘/색/크기)
2. 각 핸들을 잡으면 해당 레벨만 드래그 시작 (위젯/그룹/링크)
3. 핸들 외부 클릭은 평소 동작 유지
4. 키보드 Tab + Space + Arrow 시퀀스로 정렬 변경 가능

## 제약사항

- React 19 / TypeScript strict / Zustand 5 유지
- 한국어 코드 주석 (per `.moai/config/sections/language.yaml` `code_comments: ko`)
- 신규 파일 첫 줄은 한국어 한 줄 헤더 주석
- 신규 외부 의존성 추가 금지 (NFR-002)
- TDD 모드 준수 (NFR-003)
- "Surgical Changes" 원칙 — SPEC 외 리팩토링 금지
- 백엔드/Firestore 스키마 변경 금지
- 단일 편집 토글 보존 (REQ-UX-009-001)
- 단일 DndContext 보존 (REQ-UX-009-002)

## 데이터 스키마

본 SPEC 은 store 변경 없음. dnd-kit data 페이로드(SPEC-UX-008) 그대로 유지.

### 핸들 마커 DOM 속성

| 레벨 | data 속성 | 위치 |
|------|-----------|------|
| A (위젯) | `className="widget-drag-handle"` | RGL `draggableHandle` 셀렉터 매칭 영역 — 위젯 헤더 좌측 슬롯 |
| B (그룹) | `data-group-handle` | `BookmarkCard` 헤더의 핸들 슬롯(카테고리 아이콘 좌측) |
| C (링크) | `data-link-handle` | `SortableLink` 의 핸들 슬롯(링크 이름 좌측) |

### CSS 토큰 (globals.css 신규 규칙)

```css
/* 레벨 A: 위젯 핸들 — GripVertical 16px, --text-muted */
.widget-drag-handle-slot {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 44px;
  min-height: 44px;
  color: var(--text-muted);
  opacity: 0;
  pointer-events: none;
  transition: opacity .15s ease-out;
}
body.is-edit-mode .widget-drag-handle-slot {
  opacity: 1;
  pointer-events: auto;
}

/* 레벨 B: 그룹 핸들 — Grip 18px, --accent */
[data-group-handle] {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 44px;
  min-height: 44px;
  color: var(--accent);
  opacity: 0;
  pointer-events: none;
  cursor: grab;
  transition: opacity .15s ease-out;
}
body.is-edit-mode [data-group-handle] {
  opacity: 1;
  pointer-events: auto;
}
[data-group-handle]:active {
  cursor: grabbing;
}

/* 레벨 C: 링크 핸들 — GripVertical 12px, --text-faint */
[data-link-handle] {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 44px;
  min-height: 44px;
  color: var(--text-faint);
  opacity: 0;
  pointer-events: none;
  cursor: grab;
  transition: opacity .15s ease-out;
  flex-shrink: 0;
}
body.is-edit-mode [data-link-handle] {
  opacity: 1;
  pointer-events: auto;
}
[data-link-handle]:active {
  cursor: grabbing;
}

@media (prefers-reduced-motion: reduce) {
  .widget-drag-handle-slot,
  [data-group-handle],
  [data-link-handle] {
    transition: none;
  }
}
```

## Exclusions (What NOT to Build)

- **편집 모드 자체의 변경**: 단일 토글, zustand store 형상, Esc 키 종료, body.is-edit-mode 클래스 — SPEC-UX-007 그대로 유지
- **DndContext 분리**: 단일 DndContext 구조 보존 — SPEC-UX-008 그대로 유지
- **collision detection 변경**: `closestCorners` 유지 — SPEC-UX-008 REQ-UX-008-011 보존
- **dnd-kit data 페이로드 형식 변경**: `{ type, categoryId }` 형식 유지 — SPEC-UX-008 보존
- **DragOverlay 시각 변경**: SPEC-UX-008 REQ-UX-008-012 의 단순 카드 카피 유지
- **위젯 자체 wiggle keyframe 애니메이션**: dashed outline + 핸들 노출만으로 시각 신호. 정교한 wiggle 은 별도 SPEC
- **PivotLayout 영향**: 본 SPEC 은 `viewMode === 'widgets'` 한정. PivotLayout 의 BookmarkList 정렬 변경은 본 SPEC 범위 외
- **드래그 핸들 위치 사용자 설정**: 핸들 위치/색/크기는 본 SPEC 의 토큰 값으로 고정. 사용자 커스터마이징은 별도 SPEC
- **데스크탑 키보드 단축키 확장**: Tab/Space/Arrow/Esc 외 다른 단축키 추가 금지
- **Firestore 동기화 메커니즘 변경**: 본 SPEC 은 시각만 변경 — store 변경 없음

## 추적성 (Traceability)

| REQ | 관련 파일 (현재 grep 검증) | 변경 영역 |
|-----|---------------------------|----------|
| REQ-UX-009-001 | `src/renderer/stores/editModeStore.ts` (변경 없음) | 보존 |
| REQ-UX-009-002 | `src/renderer/components/WidgetLayout/WidgetLayout.tsx:728-788` (변경 없음) | 보존 |
| REQ-UX-009-003 | `src/renderer/components/WidgetLayout/WidgetLayout.tsx:677, 682, 703-726` + 각 위젯 헤더 | 핸들 슬롯 추가 |
| REQ-UX-009-004 | `src/renderer/components/BookmarkCard/BookmarkCard.tsx:84-108` | 핸들 슬롯 추가 + listeners 위치 변경 |
| REQ-UX-009-005 | `src/renderer/components/BookmarkCard/SortableLink.tsx:60-87` | 핸들 슬롯 추가 + listeners 위치 변경 |
| REQ-UX-009-006 | `src/renderer/styles/globals.css:80-90` (확장) | `body.is-edit-mode` 기반 opacity 토글 |
| REQ-UX-009-007 | `src/renderer/components/BookmarkCard/BookmarkCard.tsx:95` | listeners spread 위치 제한 |
| REQ-UX-009-008 | `src/renderer/components/BookmarkCard/SortableLink.tsx:69` | listeners spread 위치 제한 |
| REQ-UX-009-009 | `src/renderer/components/WidgetLayout/WidgetLayout.tsx:669` (보존) | `draggableHandle` 셀렉터 유지 |
| REQ-UX-009-010 | `src/renderer/styles/globals.css` (신규) | hit-area CSS 토큰 |
| REQ-UX-009-011 | 모든 핸들 슬롯 컴포넌트 | role/tabindex/aria-label |
| REQ-UX-009-012 | `src/renderer/components/WidgetLayout/WidgetLayout.tsx:109-126` 부근 sensors 정의 | KeyboardSensor 추가 |
| REQ-UX-009-013 | dnd-kit useSortable 호출 (보존) | data 페이로드 유지 |
| REQ-UX-009-014 | 전 영역 회귀 테스트 | acceptance 보존 |
| REQ-UX-009-015 | `src/renderer/styles/globals.css:233` 부근 | reduced-motion 규칙 추가 |
