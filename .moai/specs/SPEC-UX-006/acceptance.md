# SPEC-UX-006: 인수 조건

## 시나리오

### AC-001: iPhone 16 Plus 단일 컬럼 렌더링

**Given** 뷰포트가 430×932 (iPhone 16 Plus) 인 모바일 환경에서
**When** 사용자가 위젯 모드로 진입하면
**Then** 모든 위젯(Clock, Search, Bookmarks, Todo, Notes, Feed)이 세로 단일 컬럼으로 스택되어 렌더링되어야 한다
**And** 페이지 전체에 가로 스크롤이 발생하지 않아야 한다 (`document.body.scrollWidth === document.body.clientWidth`)

→ REQ-UX-006-001, REQ-UX-006-002, REQ-UX-006-021

### AC-002: 브레이크포인트별 컬럼 수

**Given** Responsive 그리드 활성 상태에서
**When** 뷰포트 너비가 각 브레이크포인트로 변경되면
**Then** 그리드의 컬럼 수가 다음과 같이 적용되어야 한다.

| 뷰포트 너비 | 브레이크포인트 | 컬럼 수 |
|------------|--------------|--------|
| ≥ 1200px | lg | 12 |
| ≥ 996px, < 1200px | md | 10 |
| ≥ 768px, < 996px | sm | 6 |
| ≥ 480px, < 768px | xs | 4 |
| < 480px | xxs | 2 |

→ REQ-UX-006-001

### AC-003: xs/xxs에서 드래그·리사이즈 비활성

**Given** 뷰포트가 xs 또는 xxs 범위에 있는 상태에서
**When** 사용자가 위젯 헤더를 mousedown/touchstart 하면
**Then** Responsive 그리드의 `isDraggable=false`, `isResizable=false` 가 적용되어 위치/크기 변경이 발생하지 않아야 한다

→ REQ-UX-006-002, REQ-UX-006-016

### AC-004: 기존 평면 레이아웃 자동 마이그레이션

**Given** `localStorage` 의 `widget-layout` 키에 기존 형태의 `WidgetLayout[]` (평면 배열) 이 저장되어 있고
**When** 앱이 시작되어 `loadLayout()` 이 호출되면
**Then** 메모리상 layout 값이 `{lg: [...기존 배열]}` 형태의 `ResponsiveLayout` 으로 변환되어야 한다
**And** 변환된 값으로 `widget-layout` 키가 재저장되어야 한다

→ REQ-UX-006-004

### AC-005: 이미 변환된 레이아웃은 재변환하지 않음 (idempotent)

**Given** `widget-layout` 키에 `{lg: [...]}` 형태가 이미 저장된 상태에서
**When** 앱이 다시 시작되면
**Then** layout 값이 동일하게 유지되고 추가 변환이 발생하지 않아야 한다

→ REQ-UX-006-004, NFR-004

### AC-006: `.widget-drag-handle` 모바일 CSS 속성

**Given** 빌드된 globals.css 가 로드된 상태에서
**When** `.widget-drag-handle` 셀렉터의 computed style 을 검사하면
**Then** 다음이 모두 적용되어야 한다.

- `touch-action: none`
- `user-select: none`
- `-webkit-user-select: none`
- `cursor: grab`
- `min-height: 44px`

**And** `.widget-drag-handle:active` 의 `cursor` 가 `grabbing` 이어야 한다

→ REQ-UX-006-005

### AC-007: 드래그 중 body 스크롤 잠금

**Given** 데스크탑 또는 모바일 뷰 모드 OFF 환경에서
**When** 사용자가 위젯 헤더를 잡고 드래그를 시작(`onDragStart`)하면
**Then** `document.body.classList` 에 `is-dragging-widget` 이 추가되어 `overflow:hidden; overscroll-behavior:contain` 이 적용되어야 한다
**And** 드래그가 종료(`onDragStop`)되면 해당 클래스가 즉시 제거되어야 한다

→ REQ-UX-006-007

### AC-008: 북마크 편집 모드에서 드래그 정렬

**Given** 데스크탑에서 `BookmarkCard` 의 `⚙️` 버튼을 클릭해 편집 모드를 활성화한 상태에서
**When** 사용자가 카테고리 내부 링크 A를 드래그해 B 위에 드롭하면
**Then** `useBookmarkStore` 의 update 액션이 `links` 배열 순서가 변경된 카테고리로 1회 호출되어야 한다
**And** 화면상 링크 순서가 즉시 갱신되어야 한다

→ REQ-UX-006-008, REQ-UX-006-009, REQ-UX-006-011

### AC-009: 편집 모드 OFF 시 드래그 불가

**Given** `BookmarkCard` 의 편집 모드가 비활성화된 상태에서
**When** 사용자가 링크를 mousedown 후 이동을 시도하면
**Then** 어떤 드래그 동작도 발생하지 않아야 하며, 기존 `<a>` 클릭 동작(새 탭 열기)이 정상 작동해야 한다

→ REQ-UX-006-009

### AC-010: 모바일 long-press 250ms로 북마크 드래그 시작

**Given** 모바일 뷰포트(xs/xxs)에서 편집 모드 활성 상태에서
**When** 사용자가 링크를 250ms 이상 long-press 하면
**Then** dnd-kit `PointerSensor` (`activationConstraint: {delay: 250, tolerance: 5}`) 가 활성화되어 드래그가 시작되어야 한다
**And** 250ms 미만 tap 의 경우 일반 클릭으로 처리되어야 한다

→ REQ-UX-006-010

### AC-011: 북마크 순서 영속화

**Given** 사용자가 편집 모드에서 카테고리 내부 링크 순서를 [A,B,C] → [B,A,C] 로 변경 후
**When** 페이지를 새로고침하면
**Then** 동일 카테고리 내부 링크 순서가 [B,A,C] 로 복원되어야 한다

→ REQ-UX-006-011

### AC-012: 모바일 헤더 More 메뉴 collapse

**Given** 뷰포트 너비가 sm 이하(≤768px) 인 환경에서
**When** WidgetLayout 의 헤더를 렌더링하면
**Then** 헤더에 직접 노출되는 버튼은 "빠른 추가" 와 테마 토글 2개뿐이어야 한다
**And** 나머지 7개 액션(카테고리 추가, 가져오기, 내보내기, 중복 탐지, 레이아웃 초기화, Pivot 모드, 로그아웃)은 More(⋯) 메뉴 안에 있어야 한다
**And** 사용자가 More(⋯) 버튼을 클릭하면 7개 액션 목록이 표시되어야 한다

→ REQ-UX-006-012

### AC-013: Clock 폰트 clamp 적용

**Given** Clock 컴포넌트가 렌더링된 상태에서
**When** 시간 표시 요소의 inline style 을 검사하면
**Then** `fontSize` 가 `clamp(2rem, 8vw, 5rem)` 으로 설정되어야 한다

→ REQ-UX-006-013

### AC-014: SearchBar 모바일 자체 row

**Given** 뷰포트가 sm 이하인 환경에서
**When** WidgetLayout 이 렌더링되면
**Then** SearchBar 는 헤더와 분리된 자체 row 에 위치하며 `width: 100%` 를 가져야 한다

→ REQ-UX-006-014

### AC-015: 리사이즈 핸들 크기 분기

**Given** 빌드된 globals.css 가 로드된 상태에서
**When** 다음 두 환경에서 `.react-grid-item > .react-resizable-handle` 의 크기를 측정하면
**Then**
- 일반 데스크탑(hover 지원): 14×14px
- 터치 환경(`hover: none and pointer: coarse`): 24×24px

→ REQ-UX-006-015

### AC-016: 모바일 뷰 모드에서 리사이즈 핸들 비표시

**Given** 모바일 뷰 모드가 활성화된 상태에서
**When** 위젯을 렌더링하면
**Then** Responsive 그리드의 `isResizable=false` 에 의해 리사이즈 핸들이 DOM 에 존재하지 않거나 비표시되어야 한다

→ REQ-UX-006-016

### AC-017: Viewport meta 검증

**Given** 빌드된 `index.html` 에서
**When** `<meta name="viewport">` 의 content 를 확인하면
**Then** `width=device-width, initial-scale=1.0, viewport-fit=cover` 가 포함되어야 한다

→ REQ-UX-006-017

### AC-018: PWA meta 태그 검증

**Given** 빌드된 `index.html` 에서
**When** head 의 meta 태그를 확인하면
**Then** 다음 두 태그가 존재해야 한다.

- `<meta name="apple-mobile-web-app-capable" content="yes">`
- `<meta name="theme-color" content="#0f0f12">`

→ REQ-UX-006-018

### AC-019: Safe-area inset 헤더 padding

**Given** 모바일 환경(`isMobile === true`)에서
**When** WidgetLayout TopBar 가 렌더링되면
**Then** TopBar 의 padding 에 `env(safe-area-inset-top)`, `env(safe-area-inset-left)`, `env(safe-area-inset-right)` 가 반영되어야 한다 (notch 영역 침범 방지)

→ REQ-UX-006-019

### AC-020: 데스크탑 1200px 회귀 0

**Given** 뷰포트가 1200px 이상인 데스크탑 환경에서
**When** 위젯 모드로 진입해 다음 SPEC 들의 시나리오를 모두 수행하면 (SPEC-LAYOUT-001 드래그/리사이즈/레이아웃 초기화, SPEC-UI-001 시각 토큰, SPEC-UX-005 mode toggle)
**Then** SPEC-UX-006 변경 이전과 100% 동일하게 동작해야 한다 (기존 테스트 통과)

→ REQ-UX-006-020, NFR-001

## 엣지 케이스

### EDGE-001: 손상된 layout 값

**Given** `widget-layout` 키에 JSON parse 가 실패하는 손상된 값이 저장되어 있을 때
**When** `loadLayout()` 이 호출되면
**Then** `DEFAULT_LAYOUT` 을 `{lg: DEFAULT_LAYOUT}` 으로 감싼 형태로 fallback 되어야 한다

→ NFR-004

### EDGE-002: 빠른 연속 드래그

**Given** 사용자가 드래그 시작 직후 빠르게 다른 위젯의 드래그를 시작할 때
**When** 첫 드래그가 종료되기 전에 두 번째 드래그가 시작되면
**Then** body 의 `is-dragging-widget` 클래스가 일관성 있게 유지되어야 하며 (적어도 1개 드래그 진행 중에는 클래스 유지) 모든 드래그 종료 후에만 해제되어야 한다

→ REQ-UX-006-007

### EDGE-003: 편집 모드 중 카테고리 외부 클릭

**Given** BookmarkCard 가 편집 모드인 상태에서
**When** 사용자가 카드 외부 영역(다른 위젯 또는 빈 공간)을 클릭하면
**Then** 편집 모드가 자동 종료되어 dnd 가 비활성화되어야 한다

→ REQ-UX-006-009

### EDGE-004: 드래그 중 모드 전환

**Given** 사용자가 위젯 드래그 중인 상태에서
**When** 코드 또는 토글로 viewMode 가 'widgets' → 'pivot' 으로 전환되면
**Then** WidgetLayout 의 unmount cleanup 에서 `is-dragging-widget` 클래스가 반드시 제거되어야 한다 (leak 방지)

→ REQ-UX-006-007

### EDGE-005: 단일 링크 카테고리에서 드래그 시도

**Given** 카테고리 내부 링크가 1개뿐인 상태에서 편집 모드 활성화 시
**When** 사용자가 그 링크를 드래그하면
**Then** 위치 변경이 발생하지 않아도 store 의 links 배열은 그대로 유지되어야 하며 (no-op) 에러가 발생하지 않아야 한다

→ REQ-UX-006-011

## 품질 게이트

- [ ] `npm run typecheck` TypeScript 오류 0 (strict)
- [ ] `npm run lint` ESLint 경고/오류 0
- [ ] `npm run build` 정상 종료
- [ ] `npm run test:run` 기존 561개 테스트 100% 통과 (pomodoro 기지 이슈 제외)
- [ ] 신규 추가 테스트 (`layoutMigration.test.ts`, `HeaderMoreMenu.test.tsx`, `BookmarkCard.test.tsx` 확장, `WidgetLayout.test.tsx` 확장) 100% 통과
- [ ] `layoutMigration` 커버리지 85% 이상
- [ ] `BookmarkCard` dnd 정렬 커버리지 85% 이상
- [ ] iPhone 16 Plus(430×932) Safari 시뮬레이션에서 가로 스크롤 발생 없음

## Definition of Done

- [ ] REQ-UX-006-001 ~ REQ-UX-006-021 모두 구현
- [ ] AC-001 ~ AC-020 통과
- [ ] EDGE-001 ~ EDGE-005 처리
- [ ] 파일 변경 맵의 15개 파일만 수정/생성 (그 외 파일은 touch 금지 — Surgical)
- [ ] `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` 외 신규 의존성 추가 없음
- [ ] 신규 파일 4개(`layoutMigration.ts`, `layoutMigration.test.ts`, `HeaderMoreMenu.tsx`, `HeaderMoreMenu.test.tsx`, `SortableLink.tsx`) 모두 첫 줄에 한국어 한 줄 헤더 주석 포함
- [ ] 데스크탑 1200px 환경 회귀 0 (AC-020 검증)
- [ ] PR 본문에 본 SPEC ID(`SPEC-UX-006`) 와 6개 목표 영역(반응형 그리드 / 드래그 UX / 북마크 정렬 / 모바일 헤더 / 리사이즈 핸들 / Viewport·PWA) 모두 명시
