# SPEC-UX-009: 구현 계획

## 기술 접근 방식

본 SPEC 은 SPEC-UX-007/008 의 단일 편집 토글 + 단일 DndContext 구조를 **그대로 유지**하면서, 4개 레벨(위젯/그룹/그룹내링크/그룹간링크) 의 드래그 핸들에 **레벨별 시각 토큰**(아이콘/색/크기/위치) 을 부여한다.

핵심 변화 5개 영역:

1. **신규 컴포넌트: DragHandleSlot**: 재사용 가능한 핸들 슬롯 컴포넌트 — `level: 'widget' | 'group' | 'link'` props 로 시각 토큰 분기
2. **BookmarkCard 핸들 분리 (레벨 B)**: 카테고리 헤더 좌측에 별도 핸들 슬롯(`data-group-handle`) 추가. `useSortable` 의 `listeners` spread 위치를 헤더 전체 → 핸들 슬롯으로 이동
3. **SortableLink 핸들 분리 (레벨 C)**: 링크 행 좌측에 별도 핸들 슬롯(`data-link-handle`) 추가. `listeners` spread 위치를 `<a>` 전체 → 핸들 슬롯으로 이동
4. **위젯 헤더에 핸들 슬롯 삽입 (레벨 A)**: TodoWidget, NotesWidget, WeatherWidget, FeedWidget, PomodoroWidget, Clock 셀, SearchBar 셀, 즐겨찾기 위젯 타이틀 의 8개 위치에 위젯 핸들 슬롯 추가
5. **globals.css 핸들 시각 토큰 + KeyboardSensor 통합**: `body.is-edit-mode` 기반 opacity 토글, hit-area 44px 보장, KeyboardSensor 추가

### 핵심 결정 사항

**결정 D1 — 핸들 슬롯의 가시성 토글 방식 (REQ-UX-009-006)**

선택지:
- (a) `opacity: 0` + `pointer-events: none` — layout 공간 유지, transition 가능
- (b) `display: none` — layout 공간 제거, transition 불가
- (c) 조건부 렌더링(JSX `isEditing && <Handle />`) — layout 공간 제거, React reconcile 비용

**결정: (a) `opacity: 0` + `pointer-events: none`**

**이유**:
1. **Layout shift 방지**: 편집 모드 ON/OFF 전환 시 카드 너비/높이 변화 없음 — 사용자 시각 흐름 보존
2. **Transition 가능**: REQ-UX-009-015 의 `prefers-reduced-motion` 규칙과 통합 용이
3. **a11y**: `tabindex={-1}` 과 결합해 키보드 포커스 순서에서도 제외
4. **DOM 보존**: dnd-kit 의 `useSortable` 이 mount 상태에서 listeners 를 register 한 채로 유지 → 토글 시 dnd-kit 재초기화 회피

**결정 D2 — 핸들 hit-area 확보 방식 (REQ-UX-009-010)**

선택지:
- (a) 아이콘 자체 크기 44px — 시각 weight 과도, 디자인 침해
- (b) `padding` 으로 hit-area 확장, 시각 아이콘은 작게 — Apple HIG / Material Design 권고 패턴
- (c) `::before` 가상 요소로 invisible hit-area — 복잡, 디버깅 어려움

**결정: (b) padding 확장**

**이유**:
1. CSS 단순(`min-width: 44px; min-height: 44px` + `padding` 으로 시각 아이콘 중앙 정렬)
2. 사용자가 핸들 위치를 시각으로 정확히 인지 (시각 12~18px 아이콘이 명확)
3. WCAG 2.5.5 Target Size 권고 충족

**결정 D3 — BookmarkCard 헤더의 ⚙️ 버튼 위치**

현재 `BookmarkCard.tsx:110-133` 의 ⚙️ 버튼은 헤더 우측에 위치. 본 SPEC 의 그룹 핸들(레벨 B) 은 좌측에 추가.

**결정**: ⚙️ 버튼 위치는 **변경 없음**(헤더 우측). 본 SPEC 은 헤더 **좌측에만** 그룹 핸들 슬롯을 추가하므로 SPEC-UX-007 REQ-UX-007-015 (⚙️ 버튼 의미 = 카테고리 메타 편집 모달) 와 충돌 없음.

**최종 헤더 레이아웃**: `[grip(레벨B)] [icon] [name] ........ [⚙️]`

**결정 D4 — SortableLink 의 grid 셀 너비 영향**

`BookmarkCard.tsx:140-154` 의 링크 grid 는 `gridTemplateColumns: '1fr 1fr'`. 본 SPEC 의 링크 핸들(레벨 C) 은 링크 행 좌측에 44px 너비 추가 → 셀 내부 가용 너비 감소.

**결정**: grid 컬럼 수와 grid 자체는 변경 없음. 링크 셀 내부에서 핸들 + 이름이 `flex` 컨테이너로 배치되며, 이름 영역은 `overflow: hidden; text-overflow: ellipsis` 로 처리 (현재 `SortableLink.tsx:78-86` 이미 동일 패턴).

**이유**: grid 구조 변경은 SPEC-UX-006 의 BookmarkCard 레이아웃 회귀 위험. 핸들 영역은 셀 내부에서만 변동.

**결정 D5 — KeyboardSensor 활성 조건 (REQ-UX-009-012)**

`useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor))` 추가 시 PointerSensor 의 `activationConstraint: { delay: 250, tolerance: 5 }`(SPEC-UX-006 long-press) 와 KeyboardSensor 가 동시 활성 → 모바일 long-press 와 데스크탑 Tab+Space 모두 동작.

KeyboardSensor 는 default `coordinateGetter: sortableKeyboardCoordinates` 를 사용해 SortableContext 내부에서만 동작 — RGL 의 위젯 그리드는 키보드로 정렬 불가(별도 SPEC 후보).

**결정**: KeyboardSensor 는 **BookmarkCard grid 영역의 단일 DndContext** 에만 추가. RGL 의 위젯 그리드 키보드 정렬은 본 SPEC 범위 외.

**결정 D6 — PomodoroWidget 의 핸들 슬롯 위치**

현재 `PomodoroWidget` 은 카드 전체에 `widget-drag-handle` 적용 (SPEC-UX-007 plan.md D1 결정). 본 SPEC 의 레벨 A 핸들은 **시각 마커** 역할이므로 카드 좌상단에 absolute positioning 으로 grip 아이콘만 표시.

**결정**: PomodoroWidget 카드 전체의 `widget-drag-handle` 은 그대로 유지, 추가로 카드 좌상단(상단 좌측 12px 여백) 에 grip 아이콘 absolute 배치. 카드 자체 드래그는 변동 없음.

### 핸들 슬롯 컴포넌트 설계

**`src/renderer/components/common/DragHandleSlot.tsx` 신규**:

```typescript
// 드래그 핸들 슬롯 — 레벨별 시각 토큰 분기 (SPEC-UX-009)
import { GripVertical, Grip } from 'lucide-react'

type Level = 'widget' | 'group' | 'link'

interface DragHandleSlotProps {
  level: Level
  ariaLabel: string
  /** dnd-kit useSortable attributes/listeners spread 대상 */
  attributes?: Record<string, unknown>
  listeners?: Record<string, unknown>
  /** 편집 모드 여부 — true 일 때만 노출/포커스 가능 */
  isEditing: boolean
}

const SIZE_MAP: Record<Level, number> = { widget: 16, group: 18, link: 12 }
const ICON_MAP: Record<Level, typeof GripVertical> = {
  widget: GripVertical,
  group: Grip,
  link: GripVertical,
}
const DATA_ATTR_MAP: Record<Level, string> = {
  widget: 'data-widget-handle',  // 시각 마커 only — RGL draggableHandle 셀렉터는 .widget-drag-handle 유지
  group: 'data-group-handle',
  link: 'data-link-handle',
}

export function DragHandleSlot({ level, ariaLabel, attributes, listeners, isEditing }: DragHandleSlotProps) {
  const Icon = ICON_MAP[level]
  return (
    <span
      role="button"
      tabIndex={isEditing ? 0 : -1}
      aria-label={ariaLabel}
      {...{ [DATA_ATTR_MAP[level]]: '' }}
      {...(isEditing ? attributes : {})}
      {...(isEditing ? listeners : {})}
    >
      <Icon size={SIZE_MAP[level]} />
    </span>
  )
}
```

위치 / 색 / hit-area 는 globals.css 의 CSS 토큰으로 분리(데이터 속성 셀렉터로 매칭).

## 마일스톤

### M1: 공통 핸들 슬롯 + CSS 토큰 (Priority High)

- **T-001**: `DragHandleSlot.tsx` 신규
  - 파일: `src/renderer/components/common/DragHandleSlot.tsx` (신규, 한국어 헤더 주석)
  - 레벨별 아이콘/색/크기 분기 — 위 설계 참고
- **T-002**: `DragHandleSlot.test.tsx` 신규
  - 파일: `src/renderer/components/common/DragHandleSlot.test.tsx` (신규)
  - 케이스: 각 레벨별 올바른 아이콘 렌더, `isEditing=false` 시 `tabIndex=-1`, aria-label 정확성
- **T-003**: `globals.css` 핸들 시각 토큰 규칙 추가
  - 파일: `src/renderer/styles/globals.css` (수정)
  - 영역: `[data-group-handle]`, `[data-link-handle]`, `.widget-drag-handle-slot` 규칙 추가 (spec.md 데이터 스키마 섹션의 CSS 참고)
  - `@media (prefers-reduced-motion: reduce)` 블록(line 233 부근) 에 transition: none 추가

### M2: 그룹 핸들 분리 — BookmarkCard 레벨 B (Priority High)

- **T-004**: `BookmarkCard.tsx` 헤더에 그룹 핸들 슬롯 추가
  - 파일: `src/renderer/components/BookmarkCard/BookmarkCard.tsx` (수정, 현재 line 84-108)
  - 변경: 헤더 div 의 `{...attributes} {...listeners}` 를 제거 → 좌측 `DragHandleSlot level="group"` 에만 spread
  - 헤더 레이아웃: `[grip] [icon] [name] [⚙️]`
  - `ariaLabel` 은 `\`카테고리 이동: ${category.name}\``
- **T-005**: `BookmarkCard.test.tsx` 갱신
  - 파일: `src/renderer/components/BookmarkCard/BookmarkCard.test.tsx` (수정)
  - 신규: `data-group-handle` 매칭 요소가 1개 존재
  - 신규: 카테고리 아이콘/이름 영역 click 으로는 `useSortable` 의 onDragStart 가 호출되지 않음 (mock 검증)
  - 신규: `isEditing=false` 일 때 grip 의 `opacity === 0`, `tabIndex === -1`
  - 회귀: SPEC-UX-007 AC-015 의 ⚙️ 버튼 가시성 그대로 유지

### M3: 링크 핸들 분리 — SortableLink 레벨 C (Priority High)

- **T-006**: `SortableLink.tsx` 좌측에 링크 핸들 슬롯 추가
  - 파일: `src/renderer/components/BookmarkCard/SortableLink.tsx` (수정, 현재 line 60-87)
  - 변경: `<a>` 의 `{...attributes} {...(isEditing ? listeners : {})}` 를 제거 → 내부 첫 자식 `DragHandleSlot level="link"` 에만 spread
  - 링크 본문 클릭 동작: 편집 모드 OFF 시 새 탭 열기, 편집 모드 ON 시 `preventDefault` (SPEC-UX-006 REQ-UX-006-009 보존)
  - `<a>` 의 layout: `[grip] [name]` flex 컨테이너
- **T-007**: `SortableLink.test.tsx` 갱신 (또는 신규)
  - 파일: `src/renderer/components/BookmarkCard/SortableLink.test.tsx` (수정 또는 신규)
  - 신규: `data-link-handle` 매칭 요소가 1개 존재
  - 신규: 편집 모드 ON 시 링크 이름 영역 click 으로는 드래그 시작 안 함 (mock 검증)
  - 회귀: SPEC-UX-006 AC-008 (단일 카테고리 링크 정렬) 통과

### M4: 위젯 핸들 시각 마커 — 레벨 A (Priority High)

- **T-008**: 즐겨찾기 위젯 타이틀에 핸들 시각 마커 추가
  - 파일: `src/renderer/components/WidgetLayout/WidgetLayout.tsx` (수정, 현재 line 703-726)
  - 변경: `⭐ 즐겨찾기` 헤더 div 의 좌측에 `DragHandleSlot level="widget" ariaLabel="위젯 이동: 즐겨찾기"` 삽입
  - `widget-drag-handle` 클래스는 div 자체에 유지 (RGL `draggableHandle` 셀렉터 매칭 유지)
- **T-009**: Clock 셀 + SearchBar 셀에 핸들 시각 마커 추가
  - 파일: `src/renderer/components/WidgetLayout/WidgetLayout.tsx` (수정, 현재 line 677, 682)
  - 변경: 각 셀 좌상단에 absolute positioning 으로 `DragHandleSlot level="widget"` 삽입
  - 셀 자체의 `widget-drag-handle` 클래스 유지 (RGL 매칭)
- **T-010**: TodoWidget / NotesWidget / WeatherWidget / FeedWidget 헤더에 핸들 추가
  - 파일: 각 위젯 컴포넌트 (수정 1줄 ~ 5줄)
  - 변경: 각 위젯 헤더 div 좌측에 `DragHandleSlot level="widget"` 삽입
  - 헤더 div 의 `widget-drag-handle` 클래스 유지 (RGL 매칭)
  - 영향: `TodoWidget.tsx`, `NotesWidget.tsx`, `WeatherWidget.tsx`, `FeedWidget/FeedWidget.tsx`
- **T-011**: PomodoroWidget 좌상단에 핸들 시각 마커 추가
  - 파일: `src/renderer/components/PomodoroWidget/PomodoroWidget.tsx` (수정)
  - 변경: 카드 좌상단(absolute 12px) 에 `DragHandleSlot level="widget"` 시각 마커만 추가
  - 카드 전체의 `widget-drag-handle` 클래스 유지 (현재 패턴 보존)
- **T-012**: WidgetLayout 회귀 + 신규 테스트
  - 파일: `src/renderer/components/WidgetLayout/WidgetLayout.test.tsx` (수정)
  - 신규: 편집 모드 ON 시 `[data-widget-handle]` 또는 widget 레벨 grip 아이콘 수 == 8 (Clock + SearchBar + 즐겨찾기 + Todo + Notes + Weather + Pomodoro + Feed)
  - 신규: 편집 모드 OFF 시 모든 핸들의 `opacity === 0`
  - 회귀: SPEC-UX-007 AC-011 의 `.widget-drag-handle` 매칭 위젯 수 유지

### M5: KeyboardSensor 통합 (Priority High)

- **T-013**: WidgetLayout 의 `categorySensors` 에 KeyboardSensor 추가
  - 파일: `src/renderer/components/WidgetLayout/WidgetLayout.tsx` (수정, 현재 line 109-126 부근)
  - 변경: `import { KeyboardSensor } from '@dnd-kit/core'` + `import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'`
  - sensors: `useSensors(useSensor(PointerSensor, ...), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }))`
- **T-014**: KeyboardSensor 단위 테스트
  - 파일: `src/renderer/components/WidgetLayout/WidgetLayout.test.tsx` (수정)
  - 신규: Tab → 핸들 포커스 → Space → 드래그 시작 → Arrow → 정렬 변경 → Space → 드래그 종료 시퀀스
  - (Playwright e2e 에서 본격 검증 — 단위 테스트는 sensors 구성 검증만)

### M6: e2e Playwright 시나리오 (Priority Medium)

- **T-015**: 3개 레벨 핸들 시각 구별 e2e
  - 파일: `e2e/specs/spec-ux-009-handle-separation.spec.ts` (신규)
  - 시나리오:
    1. 편집 모드 OFF → 모든 핸들 invisible (opacity 0)
    2. 편집 모드 ON → 위젯/그룹/링크 3개 레벨 핸들이 각각 다른 색/크기로 노출
    3. 위젯 핸들 잡고 이동 → 위젯 위치만 변경 (RGL 이동)
    4. 그룹 핸들 잡고 이동 → 카테고리 순서만 변경 (`bookmarkStore.reorderCategories` 호출)
    5. 링크 핸들 잡고 같은 카테고리 내 이동 → 단일 카테고리 reorder
    6. 링크 핸들 잡고 다른 카테고리로 이동 → `moveLinkBetweenGroups` 호출
    7. 그룹 핸들 외부(카테고리 이름) 클릭 → 드래그 시작 안 함
    8. 링크 핸들 외부(링크 이름) 클릭 → 편집 모드 OFF 시 새 탭, 편집 모드 ON 시 no-op
- **T-016**: 키보드 접근성 e2e
  - 파일: `e2e/specs/spec-ux-009-keyboard-a11y.spec.ts` (신규)
  - 시나리오: Tab → 그룹 핸들 포커스 → Space → 드래그 시작 → Arrow Down → 다음 카테고리로 이동 → Space → 드래그 종료 → bookmarkStore 갱신 확인

### M7: 검증 (Priority High)

- **T-017**: 회귀 테스트 (SPEC-UX-006/007/008 회귀 0)
  - 기존 단위/통합 테스트 100% 통과
- **T-018**: 신규 acceptance 시나리오 통과
  - acceptance.md AC-001 ~ AC-016 + EDGE-001 ~ EDGE-004 모두 통과
  - `npm run build` / `npm run lint` / `npm run typecheck` 0 error

## 파일 변경 맵 (실제 grep 결과 기반)

| 파일 경로 | 변경 유형 | 사유 / 관련 REQ |
|----------|----------|----------------|
| `src/renderer/components/common/DragHandleSlot.tsx` | 신규 | 공통 핸들 슬롯 / REQ-003, 004, 005, 011 |
| `src/renderer/components/common/DragHandleSlot.test.tsx` | 신규 | DragHandleSlot 단위 테스트 |
| `src/renderer/styles/globals.css` | 수정 | 핸들 시각 토큰 + reduced-motion / REQ-003~005, 010, 015 |
| `src/renderer/components/BookmarkCard/BookmarkCard.tsx` | 수정 | 그룹 핸들 분리, listeners spread 위치 변경 / REQ-004, 007 |
| `src/renderer/components/BookmarkCard/BookmarkCard.test.tsx` | 수정 | 그룹 핸들 노출 + listeners 격리 케이스 |
| `src/renderer/components/BookmarkCard/SortableLink.tsx` | 수정 | 링크 핸들 분리, listeners spread 위치 변경 / REQ-005, 008 |
| `src/renderer/components/BookmarkCard/SortableLink.test.tsx` | 수정 or 신규 | 링크 핸들 노출 + listeners 격리 케이스 |
| `src/renderer/components/WidgetLayout/WidgetLayout.tsx` | 수정 | 위젯 핸들 시각 마커 8개 위치 + KeyboardSensor / REQ-003, 009, 012 |
| `src/renderer/components/WidgetLayout/WidgetLayout.test.tsx` | 수정 | 위젯 핸들 시각 마커 검증 + KeyboardSensor 검증 |
| `src/renderer/components/TodoWidget/TodoWidget.tsx` | 수정 (소량) | 위젯 핸들 마커 추가 / REQ-003 |
| `src/renderer/components/NotesWidget/NotesWidget.tsx` | 수정 (소량) | 위젯 핸들 마커 추가 / REQ-003 |
| `src/renderer/components/WeatherWidget/WeatherWidget.tsx` | 수정 (소량) | 위젯 핸들 마커 추가 / REQ-003 |
| `src/renderer/components/FeedWidget/FeedWidget.tsx` | 수정 (소량) | 위젯 핸들 마커 추가 / REQ-003 |
| `src/renderer/components/PomodoroWidget/PomodoroWidget.tsx` | 수정 (소량) | 위젯 핸들 마커 absolute 추가 / REQ-003 |
| `e2e/specs/spec-ux-009-handle-separation.spec.ts` | 신규 | 3-레벨 핸들 e2e |
| `e2e/specs/spec-ux-009-keyboard-a11y.spec.ts` | 신규 | 키보드 접근성 e2e |

**조사 결과 발견된 기존 자산** (중복 작업 회피):

- `lucide-react@^1.11.0` 이미 설치 (`package.json:35`) — `GripVertical`, `Grip` 직접 import 가능
- `@dnd-kit/core` 의 `KeyboardSensor` + `@dnd-kit/sortable` 의 `sortableKeyboardCoordinates` 둘 다 SPEC-UX-006/007/008 의 기존 dnd-kit 버전에서 export 됨 — 추가 의존성 불필요
- `editModeStore` 변경 없음 (SPEC-UX-007 보존)
- `bookmarkStore` 변경 없음 (SPEC-UX-007/008 보존)
- 단일 DndContext 구조 변경 없음 (SPEC-UX-008 D1 보존)
- collision detection (`closestCorners`) 변경 없음 (SPEC-UX-008 REQ-UX-008-011 보존)
- DragOverlay 변경 없음 (SPEC-UX-008 REQ-UX-008-012 보존)
- `@media (prefers-reduced-motion: reduce)` 블록 이미 존재 (`globals.css:233`) — 핸들 transition 규칙만 추가

## 리스크

| 리스크 | 영향 | 완화 전략 |
|--------|------|-----------|
| 카테고리 헤더의 listeners spread 위치 변경 후 SPEC-UX-007/008 회귀 | 카테고리 정렬/이동 불가 | T-005 의 단위 테스트로 `data-group-handle` 영역 listeners 정상 동작 검증 + SPEC-UX-007 AC-012/013 회귀 테스트 |
| SortableLink 의 listeners 위치 변경 후 같은 카테고리 정렬 회귀 | 링크 정렬 불가 | T-007 의 단위 테스트로 `data-link-handle` 영역 listeners 정상 동작 검증 + SPEC-UX-006 AC-008 회귀 테스트 |
| 링크 셀 내부 핸들(44px) 추가로 링크 이름 표시 영역 감소 | 긴 링크 이름이 잘림 | `text-overflow: ellipsis` 패턴 유지 (현재 SortableLink.tsx:78-86 보존) — 시각 회귀 없음. e2e 에서 긴 링크명 케이스 검증 |
| KeyboardSensor 추가 후 PointerSensor 와 충돌 | 마우스/터치 드래그 회귀 | dnd-kit 공식 권장 패턴(useSensors 다중 호출) — SPEC-UX-006 의 long-press 250ms 보존. 단위 테스트로 검증 |
| 핸들 opacity 토글 시 layout reflow 비용 | 편집 모드 ON/OFF 전환 시 jank | `opacity` 만 변경하므로 GPU 가속 — reflow 없음. `pointer-events: none` 으로 hit-test 비용도 0 |
| Pomodoro 카드 좌상단 absolute 핸들이 본문 인터랙션 가로채임 | 타이머 시작/정지 클릭 실패 | absolute positioning 의 z-index 와 hit-area 를 12px 여백 내부로 제한 → 본문 버튼(시작/정지) 영역과 분리 |
| 모바일 hit-area 44px 가 카테고리 헤더에서 ⚙️ 버튼과 인접해 오탭 발생 | 사용자 혼란 | 헤더 너비가 충분(`viewMode === 'widgets'` 카드 너비 240px+) — `gap: 8px` 로 분리. 모바일 long-press 250ms 도 보조 |
| dnd-kit 의 `useSortable` listeners 분리 spread 시 sortable 동작 변동 | 정렬 회귀 | dnd-kit 공식 문서: listeners 는 핸들 영역에만 spread 권장 패턴(공식 권장). `attributes` 는 sortable wrapper 에 spread. 명세 일관 |
| 위젯 핸들 시각 마커 추가 후 위젯 헤더 layout 변경 | 시각 회귀 | 헤더 div 의 `display: flex` + `gap` 패턴 유지 — 좌측에 핸들만 prepend. 시각 변화는 핸들 노출 영역(편집 모드 ON 시) 만 |

## 의존성

- **선행**: SPEC-UX-006 (반응형 + 북마크 링크 정렬), SPEC-UX-007 (전역 편집 모드 + 카테고리 정렬), SPEC-UX-008 (카테고리 간 링크 이동 + 단일 DndContext)
- **병행**: SPEC-UX-010 (편집 모드 UX 개선) — 본 SPEC 과 독립 영역, 동시 진행 가능
- **후행** (후속 SPEC 후보):
  - 위젯 자체 wiggle keyframe 애니메이션
  - PivotLayout 의 BookmarkList cross-category DnD
  - 사용자 정의 핸들 색/위치 옵션
  - RGL 그리드 키보드 정렬

## 권장 / 검토 사항

**핸들 아이콘 시각 선택 — 권장 여부**

본 SPEC 은 `lucide-react` 의 `GripVertical`(6점) 과 `Grip`(8점) 을 사용. 선택지:

- (a) `GripVertical` (6점 세로 패턴) — 컨텍스트 메뉴/리스트 정렬에 흔히 사용 (Notion, Linear)
- (b) `Grip` (8점 격자) — 더 두드러진 시각 weight, 그룹 헤더에 적합
- (c) `Move` (방향 화살표) — 단일 방향이 아니므로 부적합
- (d) `MoreVertical` 점 3개 — 더보기 메뉴와 혼동 위험

**권장: (a) + (b) 조합** (현재 spec.md REQ-003/004/005 결정)

**이유**:
1. 위젯/링크 = `GripVertical` 로 세로 패턴 통일 (사용자 인지 부담 감소)
2. 그룹 = `Grip` 으로 시각 weight 증가 → 그룹이 위젯과 링크의 중간 hierarchy 임을 암시
3. 색 분리(`--text-muted` / `--accent` / `--text-faint`) 로 추가 구별
4. Notion / Trello 의 multi-level sortable 패턴과 일관

**시각 토큰 미세 조정**: 사용자 테스트 후 색/크기 조정 가능 — 1차 구현은 spec.md 의 토큰 값 사용

**키보드 접근성 — 권장 여부: 권장**

이유:
1. WCAG 2.1.1 Keyboard / 2.4.7 Focus Visible 준수
2. 본 SPEC 이 핸들 영역을 별도 요소로 분리하므로 `role="button"` + `tabindex` + `aria-label` 추가 비용 낮음
3. KeyboardSensor 는 dnd-kit 공식 지원 (외부 의존성 불필요)
4. 데스크탑 접근성 사용자 + power user 모두에게 유용

**기타 권장 사항**:
- 핸들 아이콘 hover 시 색 미세 변경(예: `--text-muted` → `--text-primary`) 으로 시각 피드백 — 1차 구현은 단순 opacity 만, 회귀 후 검토
- 핸들 영역에 `outline-offset` 으로 focus ring 표시 — REQ-UX-009-011 의 키보드 접근성과 통합
- e2e Playwright 시나리오는 mobile viewport(예: 375×667) + desktop viewport(1280×720) 모두 커버
