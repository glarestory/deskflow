# SPEC-UX-007: 구현 계획

## 기술 접근 방식

본 SPEC 은 iOS 홈 스크린 wiggle 모드 패턴을 채용하여 위젯 모드(`viewMode === 'widgets'`)의 드래그·리사이즈 활성 정책과 BookmarkCard 카테고리 정렬 활성 정책을 **단일 전역 토글**(`editModeStore`)로 통합한다. 5개의 외과적(Surgical) 변경 영역으로 구성된다.

1. **전역 편집 모드 store**: `src/renderer/stores/editModeStore.ts` 신규. 세션 휘발성 zustand store. 영속화 없음.
2. **WidgetLayout 헤더 토글 + ResponsiveGridLayout 조건식 변경**: `WidgetLayout.tsx` 의 `isDraggable`/`isResizable` 를 `isEditing && !isMobile && !isMobileBreakpoint` 로 변경. 데스크탑 헤더에 lucide-react `Pencil`/`Check` 토글 버튼 추가. Esc 키 리스너 등록.
3. **모바일 More 메뉴에 토글 항목 추가**: `HeaderMoreMenu.tsx` 에 "편집"/"완료" 항목 추가.
4. **위젯 드래그 핸들 통일**: 누락된 6개 위젯 영역에 `widget-drag-handle` 클래스 부여 (각 위젯의 헤더 div 가 명확히 존재하므로 위젯 내부 수정 또는 WidgetLayout 의 위젯 래퍼 div 에 클래스 부여 둘 중 결정 — 아래 결정 사항 참고).
5. **BookmarkCard 카테고리 정렬 + bookmarkStore.reorderCategories**: WidgetLayout 의 BookmarkCard grid 를 `DndContext` + `SortableContext` 로 래핑하고, `BookmarkCard` 컴포넌트를 sortable item 으로 변환. `bookmarkStore` 에 `reorderCategories` 액션 추가. 동시에 `BookmarkCard` 의 로컬 `isEditing` 제거 후 `useEditMode()` 로 대체.

### 핵심 결정 사항

**결정 D1 — 위젯 드래그 핸들 부여 위치 (REQ-UX-007-010)**

grep 결과:
- 각 위젯(`TodoWidget`, `NotesWidget`, `WeatherWidget`, `Clock`, `BookmarkCard`)은 자체 내부에 헤더 div 를 가짐(예: TodoWidget line 86~109 "할 일 목록" span 포함 div)
- WidgetLayout 의 위젯 래퍼(`<div key="clock" />`, `<div key="todo" />` 등)는 단순 컨테이너로 그리드 셀 역할만 함
- `PomodoroWidget` 은 위젯 전체에 `widget-drag-handle` 적용, `FeedWidget` 은 헤더 div 에만 적용 — 일관성 부재

**결정**: 위젯 내부 헤더 div 에 `className="widget-drag-handle"` 을 부여한다. 위젯이 헤더를 가진 경우 헤더에, 헤더가 없는 위젯(`Clock`, `SearchBar` 위젯 셀)은 위젯 래퍼(`WidgetLayout.tsx` 의 `<div key="clock" />`) 에 직접 부여한다.

**이유**:
1. 위젯 내부 헤더는 이미 시각적으로 "잡을 수 있는 영역" 역할을 한다 (의미론적 일치)
2. 위젯 본문(textarea, scroll list, link grid) 전체에 드래그 핸들을 부여하면 본문 인터랙션과 충돌
3. `FeedWidget` 의 기존 패턴과 일치
4. `PomodoroWidget` 의 전체 카드 핸들은 본 SPEC 에서 그대로 유지(타이머 위젯은 본문 인터랙션이 거의 없어 회귀 위험 없음, Surgical 원칙)

**결정 D2 — BookmarkCard 의 onClick vs 드래그 충돌 해소 (REQ-UX-007-012, REQ-UX-007-015)**

BookmarkCard 는 같은 카드 안에 다음 인터랙션이 공존한다.
- 카테고리 헤더의 `⚙️` 버튼 (편집 모달 열기)
- 카테고리 카드 내부 링크 grid (링크 클릭 = 새 탭 / 편집 모드 시 드래그 정렬 — SPEC-UX-006 결정 유지)
- 카테고리 카드 자체 드래그 (본 SPEC 신규 — 편집 모드에서만 활성)

**결정**: BookmarkCard 자체를 `useSortable` 로 래핑하되, 드래그 핸들은 **카테고리 헤더 영역(아이콘 + 이름 span 영역)** 에 한정한다. 내부 링크 grid 는 SPEC-UX-006 의 SortableContext(`linkIds`) 가 계속 담당하며, 카테고리 자체 SortableContext(`categoryIds`) 와는 별도의 `DndContext` 로 격리하여 충돌을 방지한다.

**이유**: dnd-kit 은 동일 DndContext 내부에서 nested SortableContext 충돌이 발생할 수 있으므로(상위 sensor 가 하위 항목 드래그를 가로챔), 카테고리용 DndContext 는 `WidgetLayout.tsx` 의 BookmarkCard grid 래퍼에 두고 BookmarkCard 내부의 링크 DndContext 는 그대로 유지한다.

**결정 D3 — Esc 키 리스너 위치 (REQ-UX-007-007)**

`WidgetLayout.tsx` 의 최상위 `useEffect` 에서 `window.addEventListener('keydown', ...)` 으로 등록. Pivot 모드에서는 본 SPEC 의 편집 모드 자체가 의미 없으므로 PivotLayout 에는 추가하지 않는다.

**결정 D4 — `body.is-edit-mode` 토글 위치**

`WidgetLayout.tsx` 의 `useEffect(() => {...}, [isEditing])` 에서 `document.body.classList.toggle('is-edit-mode', isEditing)` 으로 처리. unmount 시 cleanup 으로 클래스 제거(viewMode 가 'pivot' 으로 전환되어 WidgetLayout 이 unmount 되는 경우 leak 방지).

**결정 D5 — BookmarkCard 의 `⚙️` 버튼 의미 변경 처리 (REQ-UX-007-015)**

`onEdit(category)` props 호출만 유지 → 부모(WidgetLayout)에서 `onSetEditingCategory(category)` 가 호출되어 `EditModal` 이 열린다. 로컬 `isEditing` 토글 동작은 제거. 버튼 가시성 조건: `opacity: isEditing ? 1 : 0`(편집 모드 ON 일 때만 시각적으로 노출, 평소에는 hover-reveal 패턴 대체).

## 마일스톤

### M1: 전역 편집 모드 store (Priority High)

- **T-001**: `editModeStore.ts` 신규 작성
  - 파일: `src/renderer/stores/editModeStore.ts` (신규, 한국어 헤더 주석)
  - 인터페이스: `EditModeState { isEditing: boolean; toggle: () => void; set: (v: boolean) => void }`
  - `useEditMode` 편의 훅 export
  - 영속화 없음

- **T-002**: `editModeStore` 단위 테스트
  - 파일: `src/renderer/stores/editModeStore.test.ts` (신규)
  - 초기값 `false`, `toggle` 반전, `set(true)`/`set(false)`, 새 store 인스턴스 격리(`vi.resetModules`)

### M2: WidgetLayout 헤더 토글 + 그리드 조건식 (Priority High)

- **T-003**: WidgetLayout 데스크탑 헤더에 토글 버튼 추가
  - 파일: `src/renderer/components/WidgetLayout/WidgetLayout.tsx` (수정)
  - import: `import { Pencil, Check } from 'lucide-react'`
  - 데스크탑 헤더 버튼 그룹(line 251-410 부근, 빠른 추가 옆) 에 `data-testid="edit-mode-toggle"` 버튼 삽입
  - 라벨: `isEditing ? '완료' : '편집'`, 아이콘: `isEditing ? <Check /> : <Pencil />`
  - onClick: `useEditMode().toggle()`

- **T-004**: ResponsiveGridLayout 조건식 변경
  - 파일: `src/renderer/components/WidgetLayout/WidgetLayout.tsx` (수정, line 446-447)
  - 변경 전: `isResizable={!isMobile && !isMobileBreakpoint}` / `isDraggable={!isMobile && !isMobileBreakpoint}`
  - 변경 후: `isResizable={isEditing && !isMobile && !isMobileBreakpoint}` / `isDraggable={isEditing && !isMobile && !isMobileBreakpoint}`
  - `isEditing` 은 `useEditMode()` 로 획득

- **T-005**: `body.is-edit-mode` 클래스 토글 useEffect
  - 파일: `src/renderer/components/WidgetLayout/WidgetLayout.tsx` (수정)
  - `useEffect(() => { document.body.classList.toggle('is-edit-mode', isEditing); return () => document.body.classList.remove('is-edit-mode') }, [isEditing])`

- **T-006**: Esc 키 리스너
  - 파일: `src/renderer/components/WidgetLayout/WidgetLayout.tsx` (수정)
  - 별도 `useEffect` 에서 `window.addEventListener('keydown', handler)` 등록
  - handler: `if (e.key === 'Escape' && isEditing) setEditMode(false)`
  - cleanup 으로 removeEventListener

- **T-007**: WidgetLayout 회귀/신규 테스트
  - 파일: `src/renderer/components/WidgetLayout/WidgetLayout.test.tsx` (수정)
  - 기존 회귀: 편집 모드 OFF 시 드래그 비활성 확인
  - 신규: 토글 버튼 click → `editModeStore.isEditing` true → ResponsiveGridLayout props `isDraggable` true 검증
  - 신규: Esc 키 누름 → `isEditing` false 전환

### M3: 모바일 More 메뉴 편집 토글 (Priority High)

- **T-008**: HeaderMoreMenu 에 편집 토글 항목 추가
  - 파일: `src/renderer/components/WidgetLayout/HeaderMoreMenu.tsx` (수정)
  - props 추가: `isEditing: boolean`, `onToggleEdit: () => void`
  - 메뉴 최상단에 항목 삽입: `data-testid="more-edit-toggle"`, 라벨 `isEditing ? '완료' : '편집'`
  - WidgetLayout 에서 props 전달 (`useEditMode` 값 사용)

- **T-009**: HeaderMoreMenu 테스트 갱신
  - 파일: `src/renderer/components/WidgetLayout/HeaderMoreMenu.test.tsx` (수정)
  - `isEditing=false` 일 때 "편집" 라벨, `isEditing=true` 일 때 "완료" 라벨 검증
  - click 시 `onToggleEdit` 호출 검증

### M4: 위젯 드래그 핸들 통일 (Priority High)

- **T-010**: TodoWidget 헤더에 `widget-drag-handle` 추가
  - 파일: `src/renderer/components/TodoWidget/TodoWidget.tsx` (수정, line 87 부근 헤더 div 의 className)
  - 기존 헤더 div 의 style 유지, className 추가

- **T-011**: NotesWidget 헤더에 `widget-drag-handle` 추가
  - 파일: `src/renderer/components/NotesWidget/NotesWidget.tsx` (수정, line 43 부근 "빠른 메모" div)

- **T-012**: WeatherWidget 헤더에 `widget-drag-handle` 추가
  - 파일: `src/renderer/components/WeatherWidget/WeatherWidget.tsx` (수정, 헤더 영역 div — 정확한 line 은 구현 단계에서 확정)

- **T-013**: Clock / SearchBar 위젯 셀 래퍼에 `widget-drag-handle` 추가
  - 파일: `src/renderer/components/WidgetLayout/WidgetLayout.tsx` (수정, line 452-460 부근)
  - Clock 위젯 셀(`<div key="clock" />`) 과 SearchBar 위젯 셀(`<div key="search" />`)에 className 추가
  - 이유: Clock 과 SearchBar 는 자체 헤더가 없어 위젯 셀에 직접 부여

- **T-014**: 회귀 테스트 — `.widget-drag-handle` 선택자 매칭 위젯 수
  - 파일: 신규 또는 `WidgetLayout.test.tsx` (수정)
  - `container.querySelectorAll('.widget-drag-handle').length` 가 모든 위젯 카드 수와 일치(또는 위젯별 핸들 존재) 검증

### M5: BookmarkCard 카테고리 정렬 (Priority High)

- **T-015**: `bookmarkStore.reorderCategories` API 추가
  - 파일: `src/renderer/stores/bookmarkStore.ts` (수정)
  - `BookmarkState` 인터페이스에 `reorderCategories: (orderedIds: string[]) => void` 추가
  - 구현: orderedIds 순서대로 재배치 + 미존재 카테고리는 끝에 유지 (idempotent)
  - 영속화: 기존 `storage.set('hub-bookmarks', JSON.stringify(bookmarks))` 패턴 재사용

- **T-016**: `bookmarkStore.reorderCategories` 단위 테스트
  - 파일: `src/renderer/stores/bookmarkStore.test.ts` (수정 또는 신규 케이스)
  - 정상 reorder, 누락 id 처리(`missing` 보존), 잘못된 id 무시

- **T-017**: BookmarkCard grid 를 카테고리용 SortableContext 로 래핑
  - 파일: `src/renderer/components/WidgetLayout/WidgetLayout.tsx` (수정, line 474-491 부근)
  - 별도 `DndContext` + `SortableContext` (categoryIds, `rectSortingStrategy`)
  - `useSensors(useSensor(PointerSensor, { activationConstraint: { delay: 250, tolerance: 5 } }))` 재사용 패턴
  - `onDragEnd` → `bookmarkStore.reorderCategories(newOrder)`
  - 비활성 조건: `!isEditing` 일 때 SortableContext 는 렌더되지만 `useSortable` 의 `disabled` 옵션을 사용해 정렬 비활성

- **T-018**: BookmarkCard 를 useSortable item 으로 변환
  - 파일: `src/renderer/components/BookmarkCard/BookmarkCard.tsx` (수정)
  - `import { useSortable } from '@dnd-kit/sortable'`
  - `const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: category.id, disabled: !isEditing })`
  - 드래그 핸들 영역: 카테고리 헤더(아이콘 + 이름 span, line 101-112 부근) 에 `{...attributes} {...listeners}` 적용
  - 카드 외곽 div 에 `ref={setNodeRef}` + transform/transition 스타일 적용

- **T-019**: BookmarkCard 로컬 `isEditing` 제거 + `useEditMode` 통합 (REQ-UX-007-015, REQ-UX-007-016)
  - 파일: `src/renderer/components/BookmarkCard/BookmarkCard.tsx` (수정)
  - `useState(false)` 의 `isEditing` 제거 → `useEditMode().isEditing` 으로 대체
  - "카드 외부 클릭 시 편집 모드 OFF" `useEffect` (line 36-45) 완전 삭제 (REQ-UX-007-016)
  - `⚙️` 버튼 onClick: `setIsEditing(true); onEdit(category)` → `onEdit(category)` 만 호출 (모달 열기)
  - 버튼 가시성: `opacity: isEditing ? 1 : 0`
  - SortableLink 의 `isEditing` props 는 그대로 `useEditMode().isEditing` 으로 전달

- **T-020**: BookmarkCard 단위 테스트 갱신
  - 파일: `src/renderer/components/BookmarkCard/BookmarkCard.test.tsx` (수정)
  - 기존 "카드 외부 클릭 시 편집 종료" 케이스 제거 (해당 동작 자체 제거)
  - 신규: `useEditMode` 모킹, isEditing=true 일 때만 ⚙️ 버튼 노출 검증
  - 신규: 카테고리 reorder 트리거(WidgetLayout 측 통합 테스트는 별도)

### M6: 시각 신호 CSS (Priority Medium)

- **T-021**: `body.is-edit-mode` outline 규칙 추가
  - 파일: `src/renderer/styles/globals.css` (수정)
  - 셀렉터: `body.is-edit-mode .react-grid-item { outline: 2px dashed var(--accent); outline-offset: 4px; transition: outline-color 0.15s ease-out; }`
  - `prefers-reduced-motion: reduce` 환경 처리: 기존 line 233 부근 `@media (prefers-reduced-motion: reduce)` 블록에 `body.is-edit-mode .react-grid-item { transition: none; }` 추가

### M7: 검증 (Priority High)

- **T-022**: 회귀 테스트 (SPEC-UX-006 회귀 0)
  - SPEC-UX-006 AC-008 ~ AC-011 (북마크 링크 정렬 + 영속화 + long-press) 시나리오를 본 SPEC 변경 후에도 동일하게 수행
  - 기존 단위 테스트 100% 통과 (PivotLayout / sidebar-toggle 등 사전 회귀 제외)

- **T-023**: 신규 acceptance 시나리오 통과
  - acceptance.md AC-001 ~ AC-015 + EDGE-001 ~ EDGE-005 모두 통과
  - `npm run build` / `npm run lint` / `npm run typecheck` 0 error

## 파일 변경 맵 (실제 grep 결과 기반)

| 파일 경로 | 변경 유형 | 사유 / 관련 REQ |
|----------|----------|----------------|
| `src/renderer/stores/editModeStore.ts` | 신규 | 전역 편집 모드 store / REQ-001, 006, 020 |
| `src/renderer/stores/editModeStore.test.ts` | 신규 | store 단위 테스트 |
| `src/renderer/stores/bookmarkStore.ts` | 수정 | `reorderCategories` API 추가 / REQ-013, 014 |
| `src/renderer/stores/bookmarkStore.test.ts` | 수정 | reorderCategories 케이스 추가 |
| `src/renderer/components/WidgetLayout/WidgetLayout.tsx` | 수정 | 편집 토글 버튼, isDraggable/isResizable 조건식, Esc 리스너, body.is-edit-mode 토글, BookmarkCard SortableContext, Clock/SearchBar 셀 widget-drag-handle / REQ-002, 004, 005, 006, 007, 010, 011, 012, 013, 017, 018 |
| `src/renderer/components/WidgetLayout/WidgetLayout.test.tsx` | 수정 | 편집 토글 + 드래그 활성/비활성 회귀 + 카테고리 reorder |
| `src/renderer/components/WidgetLayout/HeaderMoreMenu.tsx` | 수정 | "편집"/"완료" 항목 추가 + props 확장 / REQ-003 |
| `src/renderer/components/WidgetLayout/HeaderMoreMenu.test.tsx` | 수정 | 신규 항목 라벨 + onClick 검증 |
| `src/renderer/components/BookmarkCard/BookmarkCard.tsx` | 수정 | useSortable 통합, 로컬 isEditing 제거, useEditMode 통합, 외부 클릭 useEffect 삭제 / REQ-011, 012, 015, 016 |
| `src/renderer/components/BookmarkCard/BookmarkCard.test.tsx` | 수정 | 신규 동작에 맞춰 테스트 갱신 |
| `src/renderer/components/TodoWidget/TodoWidget.tsx` | 수정 (1줄) | 헤더 div className 에 `widget-drag-handle` 추가 / REQ-010 |
| `src/renderer/components/NotesWidget/NotesWidget.tsx` | 수정 (1줄) | "빠른 메모" 헤더 div className 추가 / REQ-010 |
| `src/renderer/components/WeatherWidget/WeatherWidget.tsx` | 수정 (1줄) | 헤더 div className 추가 / REQ-010 |
| `src/renderer/styles/globals.css` | 수정 | `body.is-edit-mode .react-grid-item` outline 규칙 / REQ-008, 009 |

**조사 결과 발견된 기존 자산** (중복 작업 회피):

- `lucide-react@^1.11.0` 이미 설치 (`package.json:35`) — `Pencil`, `Check` 아이콘 직접 import 가능
- `@dnd-kit/core` + `@dnd-kit/sortable` + `@dnd-kit/utilities` 이미 설치 (SPEC-UX-006) — 추가 의존성 불필요
- `zustand` 이미 설치 — editModeStore 즉시 작성 가능
- `globals.css` 의 `.widget-drag-handle` 규칙(line 80-90) 과 `body.is-dragging-widget`(line 93) 규칙 그대로 재사용
- `@media (prefers-reduced-motion: reduce)` 블록 이미 존재 (`globals.css:233`) — outline transition 만 추가
- `HeaderMoreMenu` 구조 확인됨 (line 1-154) — props 확장 시 기존 핸들러 패턴 일관 유지
- `BookmarkCard` 의 내부 링크 SortableContext (line 143-165) 는 카테고리용 SortableContext 와 별개 DndContext 로 격리 — 충돌 없음
- WidgetLayout 의 BookmarkCard grid (line 474-491) 위치 재확인 완료 — `bookmarks.map((cat) => <BookmarkCard key={cat.id} ... />)`
- `bookmarkStore` 에 카테고리 reorder 메서드 없음 (line 1-265 전체 확인) — `reorderCategories` 신규 추가 필요
- `Clock` 컴포넌트는 자체 헤더가 없음 (line 1-84 확인) — 위젯 셀 래퍼에 drag handle 부여 결정 (결정 D1 참고)
- `SearchBar` 위젯 셀(`<div key="search" />`) 도 동일 패턴 적용

## 리스크

| 리스크 | 영향 | 완화 전략 |
|--------|------|-----------|
| 카테고리용 DndContext 와 BookmarkCard 내부 링크 DndContext nested 충돌 | 링크 정렬 회귀 | 결정 D2 — 각각 별도 DndContext 인스턴스 사용. SPEC-UX-006 AC-008 ~ AC-011 회귀 테스트로 검증 |
| `useSortable({ disabled: !isEditing })` 의 dnd-kit 라이브러리 동작 차이 | 편집 모드 OFF 시 의도치 않은 드래그 | `disabled` 옵션은 dnd-kit 공식 지원이며 검증된 패턴(SPEC-UX-006 의 PointerSensor 와 동일 라이브러리 버전 사용). 단위 테스트로 확인 |
| `widget-drag-handle` 헤더 부여 후 헤더 내부 버튼(Pomodoro 설정, Feed 새로고침 등) 클릭 가로채임 | 본문 인터랙션 회귀 | 결정 D1 — 헤더 div 자체에만 클래스 부여, 헤더 내부 버튼은 그대로 유지. RGL 의 `draggableHandle` 매칭은 마우스다운 지점이 핸들 셀렉터에 매칭될 때만 동작하므로 버튼 onClick 우선 처리됨(브라우저 이벤트 버블링 + RGL 동작 검증 완료) |
| Esc 키 리스너가 다른 모달(EditModal, ImportModal 등) 의 Esc 동작과 충돌 | 모달 닫기 + 편집 모드 OFF 가 동시에 발생 | handler 내부에서 `e.target` 이 modal 내부일 경우 무시하는 가드 추가 검토 (구현 단계에서 결정) — 1차 구현은 단순 토글로 시작, 회귀 발생 시 가드 추가 |
| `BookmarkCard` 로컬 isEditing 제거 후 기존 테스트 다수 실패 | 회귀 | T-020 에서 모든 영향받는 테스트 케이스 갱신. SPEC-UX-006 AC-008 ~ AC-011 은 `useEditMode` 모킹으로 동일 시나리오 검증 |
| `body.is-edit-mode` 클래스가 PivotLayout 으로 전환 시 누수 | 시각 신호 잔류 | T-005 의 useEffect cleanup 에서 unmount 시 클래스 제거 보장. EDGE-004 시나리오로 검증 |
| `reorderCategories` 가 잘못된 id 입력 시 데이터 손실 | bookmarks 배열 손상 | `missing` 항목 보존 로직(미존재 id 무시, 누락 카테고리는 끝에 유지)으로 안전망. T-016 단위 테스트로 검증 |
| 모바일 뷰포트(xs/xxs)에서 편집 모드 ON 후 사용자 혼란 | UX 결함 | REQ-UX-007-018 로 xs/xxs 에서는 드래그 비활성 명시. 헤더 More 메뉴의 "편집" 토글은 동작하지만 시각 신호(dashed outline)만 적용되고 실제 이동 불가 — 일관된 동작 |

## 의존성

- 선행: SPEC-LAYOUT-001 (위젯 그리드), SPEC-UI-001 (시각 토큰), SPEC-UX-005 (viewMode 분기), SPEC-UX-006 (반응형 그리드 + 북마크 링크 정렬)
- 병행: 없음
- 후행 (후속 SPEC 후보):
  - 위젯 자체 wiggle keyframe 애니메이션 도입
  - 항목 카테고리 간 이동(위젯 → 위젯 또는 카테고리 → 카테고리)
  - 편집 모드의 Firebase 동기화 (사용자 결정 시)
  - 편집 모드 진입 단축키 확장 (Cmd+E 등)

## 권장 / 검토 사항

**키보드 단축키 (REQ-UX-007-007 외)**: 본 SPEC 은 Esc 키만 지원한다. 사용자 요청 ("Esc 키로 편집 모드 종료 — plan.md에 권장 여부 표기") 에 대한 결정.

**권장 여부: 권장**.

이유:
1. iOS 홈 스크린 wiggle 모드 종료 패턴 (홈 버튼 = Esc) 과 직관적으로 일치
2. 키보드 전용 사용자 접근성 개선 (마우스 클릭 없이 종료 가능)
3. 구현 복잡도 낮음 (window keydown 리스너 1개)

**진입 단축키(예: Cmd+E)**: 본 SPEC 범위 외. 향후 SPEC 후보로 분리.

**기타 권장 사항**:
- 시각 신호 강도(outline 굵기, color, offset)는 사용자 테스트 후 조정 가능 — 1차 구현은 `2px dashed var(--accent)` + `outline-offset: 4px` 로 시작
- `BookmarkCard` 의 ⚙️ 버튼은 의미 변경(카테고리 메타 편집) 후에도 노출 유지 — UI 단순화를 위한 완전 제거는 별도 의사결정 필요(Exclusions 참고)
