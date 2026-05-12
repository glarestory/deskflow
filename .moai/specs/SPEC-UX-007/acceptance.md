# SPEC-UX-007: 인수 조건

## 시나리오

### AC-001: editModeStore 초기값

**Given** 앱이 막 부팅되어 어떤 사용자 토글도 발생하지 않은 초기 상태에서
**When** `useEditModeStore.getState()` 를 읽으면
**Then** `isEditing === false` 이어야 한다

→ REQ-UX-007-001, REQ-UX-007-020

### AC-002: editModeStore toggle / set

**Given** 초기 상태의 `editModeStore` 에서
**When** `toggle()` 을 호출하면 `isEditing` 이 반전되어야 하고
**And** `set(true)` 호출 시 `isEditing === true`, `set(false)` 호출 시 `isEditing === false` 이어야 한다

→ REQ-UX-007-001

### AC-003: 데스크탑 헤더 편집 토글 버튼 노출

**Given** `viewMode === 'widgets'`, 데스크탑 뷰포트(1200px 이상), `isMobile === false` 환경에서
**When** `WidgetLayout` 이 렌더링되면
**Then** 헤더에 `data-testid="edit-mode-toggle"` 버튼이 존재해야 하고
**And** 버튼의 라벨은 `editModeStore.isEditing === false` 일 때 "편집", `true` 일 때 "완료" 이어야 한다
**And** 아이콘은 `lucide-react` 의 `Pencil` (편집 모드 OFF) 또는 `Check` (편집 모드 ON) 이 사용되어야 한다

→ REQ-UX-007-002

### AC-004: 모바일 More 메뉴에 편집 토글 항목 노출

**Given** `viewMode === 'widgets'`, `isMobile === true` 환경에서
**When** 사용자가 `data-testid="more-menu-btn"` 을 클릭해 More 메뉴를 열면
**Then** 메뉴 내부에 `data-testid="more-edit-toggle"` 항목이 존재해야 하고
**And** 라벨은 `editModeStore.isEditing` 값에 따라 "편집" 또는 "완료" 로 변해야 한다
**And** 직접 노출 영역(빠른 추가, 테마 토글)에는 편집 토글 버튼이 존재하지 않아야 한다

→ REQ-UX-007-003

### AC-005: 편집 모드 ON 시 데스크탑 드래그·리사이즈 활성

**Given** 데스크탑(1200px) 환경 + `isMobile === false`, `isMobileBreakpoint === false` 상태에서
**When** 사용자가 편집 토글 버튼을 클릭해 `isEditing === true` 가 되면
**Then** `ResponsiveGridLayout` 의 props `isDraggable === true` 이어야 한다
**And** `isResizable === true` 이어야 한다
**And** 위젯 헤더(`widget-drag-handle`)를 mousedown → mousemove 하면 위젯이 실제로 이동해야 한다

→ REQ-UX-007-004

### AC-006: 편집 모드 OFF 시 드래그·리사이즈 비활성

**Given** `isEditing === false` 상태에서
**When** WidgetLayout 이 렌더링되면
**Then** `ResponsiveGridLayout` 의 props `isDraggable === false`, `isResizable === false` 이어야 한다
**And** 위젯 헤더를 mousedown → mousemove 해도 위젯 위치가 변경되지 않아야 한다

→ REQ-UX-007-005

### AC-007: 편집 토글 버튼 클릭 이벤트

**Given** `isEditing === false` 인 상태에서
**When** 사용자가 데스크탑 편집 토글 버튼 또는 모바일 More 메뉴의 "편집" 항목을 클릭하면
**Then** `editModeStore.isEditing` 이 `true` 로 변경되어야 한다
**And** 한 번 더 클릭하면 `false` 로 반전되어야 한다

→ REQ-UX-007-006

### AC-008: Esc 키로 편집 모드 종료

**Given** `WidgetLayout` 이 mount 된 상태에서 `isEditing === true` 인 상태에서
**When** 사용자가 Esc 키를 누르면 (`window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))`)
**Then** `editModeStore.isEditing` 이 즉시 `false` 가 되어야 한다
**And** `isEditing === false` 인 상태에서 Esc 키를 눌러도 부수 효과가 발생하지 않아야 한다(`set(false)` 는 idempotent)

→ REQ-UX-007-007

### AC-009: 편집 모드 시각 신호 (body.is-edit-mode)

**Given** `WidgetLayout` 이 mount 된 상태에서
**When** `editModeStore.set(true)` 가 호출되면
**Then** `document.body.classList.contains('is-edit-mode') === true` 이어야 한다
**And** `globals.css` 에 정의된 `body.is-edit-mode .react-grid-item { outline: 2px dashed var(--accent); outline-offset: 4px; }` 규칙이 모든 위젯 컨테이너에 적용되어야 한다
**And** `set(false)` 호출 시 클래스가 즉시 제거되어야 한다

→ REQ-UX-007-008

### AC-010: prefers-reduced-motion 시 transition 비활성

**Given** OS 또는 브라우저가 `prefers-reduced-motion: reduce` 를 보고하는 환경에서
**When** 편집 모드를 ON/OFF 전환하면
**Then** outline 의 transition 이 없거나 즉시 적용되어야 한다(`transition: none` 또는 `transition-duration: 0`)

→ REQ-UX-007-009

### AC-011: 위젯 드래그 핸들 통일

**Given** `WidgetLayout` 이 렌더링된 데스크탑 환경에서
**When** `document.querySelectorAll('.widget-drag-handle')` 를 수집하면
**Then** 다음 위젯 영역에 최소 1개씩 매칭되어야 한다.

| 위젯 | 매칭 위치 |
|------|----------|
| Clock | 위젯 셀 래퍼 (`<div key="clock" />`) |
| SearchBar (데스크탑) | 위젯 셀 래퍼 (`<div key="search" />`) |
| Bookmarks (BookmarkCard grid 전체) | 각 `BookmarkCard` 헤더 (아이콘 + 이름 영역) |
| Todo | TodoWidget 내부 헤더 div (`"할 일 목록"` 포함) |
| Notes | NotesWidget 내부 헤더 div (`"빠른 메모"` 포함) |
| Weather | WeatherWidget 내부 헤더 div |
| Pomodoro | PomodoroWidget 카드 (기존) |
| Feed | FeedWidget 헤더 (기존) |

→ REQ-UX-007-010

### AC-012: BookmarkCard 카테고리 정렬 활성 (편집 모드 ON)

**Given** 편집 모드 `isEditing === true`, 데스크탑 환경에서
**When** 사용자가 BookmarkCard 카테고리 A 의 헤더(아이콘 + 이름)를 잡고 카테고리 B 위로 드래그한 후 mouseup 하면
**Then** `bookmarkStore.reorderCategories(newOrder)` 가 1회 호출되어야 한다
**And** `bookmarkStore.bookmarks` 의 순서가 변경된 새 순서로 갱신되어야 한다
**And** 화면상 BookmarkCard grid 순서가 즉시 갱신되어야 한다

→ REQ-UX-007-011, REQ-UX-007-012, REQ-UX-007-013

### AC-013: BookmarkCard 카테고리 정렬 비활성 (편집 모드 OFF)

**Given** 편집 모드 `isEditing === false` 상태에서
**When** 사용자가 BookmarkCard 카테고리 헤더를 mousedown 후 이동을 시도하면
**Then** 어떤 드래그 동작도 발생하지 않아야 한다(`useSortable({ disabled: true })` 효과)
**And** BookmarkCard 내부 링크(SortableLink) 의 새 탭 열기 onClick 동작은 정상 작동해야 한다

→ REQ-UX-007-012

### AC-014: bookmarkStore.reorderCategories 의미론

**Given** `bookmarks = [A, B, C, D]` 상태에서
**When** `reorderCategories(['C', 'A', 'B'])` 를 호출하면
**Then** 새 순서는 `[C, A, B, D]` 이어야 한다 (D 는 orderedIds 에 없으므로 끝에 보존)
**And** `reorderCategories(['B', 'A'])` 호출 시 `[B, A, C, D]` 이어야 한다 (C, D 보존)
**And** `reorderCategories(['unknown', 'A', 'X'])` 호출 시 unknown 과 X 는 무시되고 `[A, B, C, D]` (A 만 매칭, B/C/D 보존, A 가 1번째 자리로 이동)이어야 한다

→ REQ-UX-007-014

### AC-015: BookmarkCard 로컬 isEditing 제거 + ⚙️ 버튼 의미 변경

**Given** `BookmarkCard` 가 렌더링된 상태에서
**When** 컴포넌트 소스의 `useState(false)` 기반 `isEditing` 이 존재하지 않고
**Then** 컴포넌트는 `useEditMode().isEditing` 만 사용해야 한다
**And** `data-testid="bookmark-edit-btn"` (`⚙️`) 버튼 onClick 은 `onEdit(category)` 만 호출해야 한다(`setIsEditing(true)` 호출 없음)
**And** 편집 모드 OFF 일 때 ⚙️ 버튼의 `opacity === 0` 이어야 한다
**And** 편집 모드 ON 일 때 ⚙️ 버튼의 `opacity === 1` 이어야 한다
**And** "카드 외부 클릭 시 편집 모드 OFF" `useEffect` 가 컴포넌트에 존재하지 않아야 한다 (REQ-UX-007-016)

→ REQ-UX-007-015, REQ-UX-007-016

## 엣지 케이스

### EDGE-001: 데스크탑 모바일 뷰 모드 + 편집 모드 ON

**Given** 사용자가 데스크탑 화면 너비에서 `useIsMobile()` 훅을 통해 모바일 뷰 모드를 수동 활성화(`isMobile === true`) 한 상태에서
**When** 모바일 More 메뉴의 "편집" 항목을 클릭해 `isEditing === true` 가 되면
**Then** `ResponsiveGridLayout` 의 `isDraggable === false`, `isResizable === false` 가 유지되어야 한다 (REQ-UX-007-017)
**And** 시각 신호(dashed outline) 는 적용되지만 실제 드래그는 비활성

→ REQ-UX-007-017

### EDGE-002: xs/xxs 브레이크포인트 + 편집 모드 ON

**Given** 화면 너비가 xs 또는 xxs 브레이크포인트(< 768px) 인 환경에서
**When** 편집 모드 ON 으로 전환하면
**Then** `ResponsiveGridLayout` 의 `isDraggable === false`, `isResizable === false` 가 유지되어야 한다
**And** BookmarkCard 카테고리 자체의 정렬도 비활성이어야 한다 (`isEditing && !isMobile && !isMobileBreakpoint` 조건 일관 적용)
**And** SPEC-UX-006 REQ-UX-006-010 의 BookmarkCard 내부 링크 long-press 250ms 정렬은 본 SPEC 변경 후에도 정상 동작해야 한다

→ REQ-UX-007-018, NFR-001

### EDGE-003: PivotLayout 으로 모드 전환 시 body 클래스 누수 방지

**Given** `viewMode === 'widgets'`, `isEditing === true` 상태(`body.is-edit-mode === true`) 에서
**When** 사용자가 viewMode 를 'pivot' 으로 전환해 `WidgetLayout` 이 unmount 되면
**Then** `WidgetLayout` 의 useEffect cleanup 으로 `document.body.classList.contains('is-edit-mode') === false` 이어야 한다 (leak 방지)

→ REQ-UX-007-008 (cleanup 의무)

### EDGE-004: 단일 카테고리 상태에서 드래그 시도

**Given** `bookmarks` 가 1개 카테고리만 가진 상태에서 편집 모드 ON 인 상황에서
**When** 사용자가 해당 카테고리를 드래그 시도하면
**Then** drop 위치가 변경되지 않아 `reorderCategories` 가 호출되지 않거나, 호출되더라도 순서가 동일하게 유지되어야 한다 (no-op, 에러 없음)

→ REQ-UX-007-013, REQ-UX-007-014

### EDGE-005: 편집 모드 ON 상태에서 EditModal 열림 시 Esc 충돌

**Given** `isEditing === true` 인 상태에서 BookmarkCard ⚙️ 버튼 클릭으로 EditModal 이 열린 상태에서
**When** 사용자가 Esc 키를 누르면
**Then** 본 SPEC 1차 구현은 단순 토글이므로 `editModeStore.isEditing` 이 `false` 가 되며, 동시에 모달이 닫힐 수 있다(브라우저 이벤트 순서 의존)
**And** 두 동작이 모두 발생하더라도 사용자 데이터 손실은 없어야 한다 (모달 상태와 editModeStore 는 독립)
**Note**: 1차 구현 후 사용자 회귀 보고 시 가드 추가(`e.target` 이 모달 내부인 경우 무시) 검토 — Risk 항목 참고

→ REQ-UX-007-007 (1차 구현 결정 사항)

## 품질 게이트

- [ ] `npm run typecheck` TypeScript 오류 0 (strict)
- [ ] `npm run lint` ESLint 경고/오류 0
- [ ] `npm run build` 정상 종료
- [ ] `npm run test:run` 기존 단위 테스트 100% 통과 (PivotLayout / pomodoro 사전 회귀 제외)
- [ ] 신규 추가 테스트 (`editModeStore.test.ts`, `WidgetLayout.test.tsx` 확장, `HeaderMoreMenu.test.tsx` 확장, `BookmarkCard.test.tsx` 갱신, `bookmarkStore.test.ts` 확장) 100% 통과
- [ ] `editModeStore` 커버리지 100% (4개 매서드: 초기값, toggle, set true, set false)
- [ ] `bookmarkStore.reorderCategories` 커버리지 85% 이상 (정상, missing, unknown id 케이스 포함)
- [ ] 데스크탑 1200px + xs/xxs 브레이크포인트 모두에서 SPEC-UX-006 AC-008 ~ AC-011 (북마크 내부 링크 정렬) 회귀 0

## Definition of Done

- [ ] REQ-UX-007-001 ~ REQ-UX-007-020 모두 구현
- [ ] AC-001 ~ AC-015 통과
- [ ] EDGE-001 ~ EDGE-005 처리
- [ ] 파일 변경 맵의 14개 파일만 수정/생성 (그 외 파일은 touch 금지 — Surgical Changes)
- [ ] 신규 외부 의존성 추가 없음 (`@dnd-kit`, `lucide-react`, `zustand` 모두 기존 설치 활용)
- [ ] 신규 파일 2개(`editModeStore.ts`, `editModeStore.test.ts`) 모두 첫 줄에 한국어 한 줄 헤더 주석 포함
- [ ] SPEC-UX-005 / SPEC-UX-006 회귀 0 (AC-008 ~ AC-011 동일 시나리오 통과)
- [ ] PR 본문에 본 SPEC ID(`SPEC-UX-007`) 와 5개 변경 영역(전역 편집 모드 store / 헤더 토글 / 모바일 More 메뉴 / 위젯 드래그 핸들 통일 / BookmarkCard 카테고리 정렬) 모두 명시
- [ ] PR 본문에 사용자가 보고한 3개 결함(드래그 핸들 누락, 상시 드래그 활성, 카테고리 순서 고정) 의 해소 여부 명시
