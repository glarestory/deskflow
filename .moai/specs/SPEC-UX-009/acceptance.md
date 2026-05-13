# SPEC-UX-009: 인수 조건

## 시나리오

### AC-001: 단일 편집 토글 보존 (회귀 0)

**Given** SPEC-UX-007 의 단일 편집 토글이 적용된 상태에서
**When** 본 SPEC 구현 후 헤더 토글 버튼을 클릭하거나 Esc 키를 누르면
**Then** `editModeStore.isEditing` 값이 반전 또는 false 로 전환되어야 한다
**And** 본 SPEC 변경으로 인해 별도 편집 토글이 신설되어서는 안 된다(`grep "editModeStore" src/renderer/stores/` 외 추가 store 부재)

→ REQ-UX-009-001

### AC-002: 단일 DndContext 보존 (회귀 0)

**Given** SPEC-UX-008 의 단일 DndContext 구조가 적용된 상태에서
**When** 본 SPEC 구현 후 `WidgetLayout.tsx` 의 `<DndContext>` 요소를 count 하면
**Then** BookmarkCard grid 영역의 `<DndContext>` 는 정확히 1개여야 한다
**And** 추가 DndContext 가 신설되어서는 안 된다(SPEC-UX-008 REQ-UX-008-001/002 보존)

→ REQ-UX-009-002

### AC-003: 위젯 핸들 시각 토큰 — 레벨 A

**Given** 편집 모드 ON 인 데스크탑 환경에서
**When** `document.querySelectorAll('[data-widget-handle]')` 를 수집하면
**Then** 최소 8개의 요소가 매칭되어야 한다 (Clock, SearchBar, 즐겨찾기 위젯 타이틀, TodoWidget, NotesWidget, WeatherWidget, PomodoroWidget, FeedWidget)
**And** 각 핸들 요소 내부에 `lucide-react` 의 `GripVertical` 아이콘(16px, `--text-muted` 색) 이 렌더되어야 한다
**And** 각 핸들의 hit-area 는 `getBoundingClientRect()` 기준 width × height >= 44 × 44 이어야 한다

→ REQ-UX-009-003, REQ-UX-009-010

### AC-004: 그룹 핸들 시각 토큰 — 레벨 B

**Given** 편집 모드 ON, BookmarkCard 가 N 개 렌더된 상태에서
**When** `document.querySelectorAll('[data-group-handle]')` 를 수집하면
**Then** 정확히 N 개의 요소가 매칭되어야 한다 (카테고리 1개당 1개)
**And** 각 핸들 내부에 `lucide-react` 의 `Grip` 아이콘(18px, `--accent` 색) 이 렌더되어야 한다
**And** 핸들의 DOM 위치는 카테고리 아이콘 좌측이어야 한다 (헤더 내 첫 자식)
**And** 핸들의 hit-area 는 width × height >= 44 × 44 이어야 한다

→ REQ-UX-009-004, REQ-UX-009-010

### AC-005: 링크 핸들 시각 토큰 — 레벨 C

**Given** 편집 모드 ON, BookmarkCard 내부에 M 개의 링크가 있는 상태에서
**When** 해당 카테고리 내부의 `document.querySelectorAll('[data-link-handle]')` 를 수집하면
**Then** 정확히 M 개의 요소가 매칭되어야 한다 (링크 1개당 1개)
**And** 각 핸들 내부에 `lucide-react` 의 `GripVertical` 아이콘(12px, `--text-faint` 색) 이 렌더되어야 한다
**And** 핸들의 DOM 위치는 링크 이름 좌측이어야 한다 (링크 행 내 첫 자식)
**And** 핸들의 hit-area 는 width × height >= 44 × 44 이어야 한다

→ REQ-UX-009-005, REQ-UX-009-010

### AC-006: 편집 모드 OFF 시 모든 핸들 숨김

**Given** 편집 모드 OFF (`isEditing === false`) 상태에서
**When** `document.querySelectorAll('[data-group-handle], [data-link-handle], .widget-drag-handle-slot')` 를 수집하면
**Then** 모든 요소의 `getComputedStyle().opacity === '0'` 이어야 한다
**And** 모든 요소의 `getComputedStyle().pointerEvents === 'none'` 이어야 한다
**And** 모든 요소의 `tabindex === '-1'` 이어야 한다 (키보드 포커스 제외)

→ REQ-UX-009-006, REQ-UX-009-011

### AC-007: 편집 모드 ON 시 핸들 노출

**Given** 편집 모드 OFF 인 초기 상태에서
**When** 사용자가 편집 토글 버튼을 클릭해 `isEditing === true` 로 전환되면
**Then** `body.is-edit-mode` 클래스가 토글되고
**And** 모든 핸들의 `getComputedStyle().opacity === '1'` 이어야 한다
**And** 모든 핸들의 `tabindex === '0'` 이어야 한다

→ REQ-UX-009-006

### AC-008: 그룹 핸들에서만 카테고리 드래그 시작

**Given** 편집 모드 ON, BookmarkCard A 가 렌더된 상태에서
**When** 사용자가 카테고리 A 의 `[data-group-handle]` 요소를 mousedown → mousemove → mouseup 으로 다른 위치로 이동하면
**Then** `bookmarkStore.reorderCategories(newOrder)` 가 1회 호출되어야 한다
**And** `BookmarkCard A` 의 `bookmarks` 배열 내 인덱스가 변경되어야 한다

→ REQ-UX-009-004, REQ-UX-009-013

### AC-009: 그룹 핸들 외부 클릭은 드래그 시작 안 함

**Given** 편집 모드 ON, BookmarkCard A 가 렌더된 상태에서
**When** 사용자가 카테고리 A 의 아이콘(`category.icon`) 또는 이름(`category.name`) span 영역(핸들 외부) 을 mousedown → mousemove → mouseup 하면
**Then** `bookmarkStore.reorderCategories` 가 호출되어서는 안 된다
**And** 카테고리 드래그 시각 효과(useSortable transform) 가 발생해서는 안 된다

→ REQ-UX-009-007

### AC-010: 링크 핸들에서만 같은 카테고리 정렬 시작

**Given** 편집 모드 ON, BookmarkCard A 내부에 링크 L1, L2 가 있는 상태에서
**When** 사용자가 L1 의 `[data-link-handle]` 을 mousedown → L2 위로 mousemove → mouseup 하면
**Then** `bookmarkStore.updateBookmark` 가 1회 호출되어 L1 과 L2 의 순서가 swap 되어야 한다 (SPEC-UX-006 AC-008 패턴)

→ REQ-UX-009-005, REQ-UX-009-013

### AC-011: 링크 핸들에서만 다른 카테고리로 이동 시작

**Given** 편집 모드 ON, BookmarkCard A 의 링크 L1 과 BookmarkCard B 가 렌더된 상태에서
**When** 사용자가 L1 의 `[data-link-handle]` 을 mousedown → BookmarkCard B 의 link grid 위로 mousemove → mouseup 하면
**Then** `bookmarkStore.moveLinkBetweenGroups(L1.id, A.id, B.id, toIndex)` 가 1회 호출되어야 한다 (SPEC-UX-008 패턴)

→ REQ-UX-009-005, REQ-UX-009-013

### AC-012: 링크 핸들 외부 클릭 — 편집 모드 ON

**Given** 편집 모드 ON, BookmarkCard A 내부에 링크 L1 이 있는 상태에서
**When** 사용자가 L1 의 이름 span 영역(핸들 외부) 을 click 하면
**Then** 드래그가 시작되어서는 안 되며
**And** `link.url` 의 새 탭이 열려서는 안 된다 (`href === undefined` + `onClick preventDefault` 보존)
**And** `usageStore.recordUsage` 가 호출되어서는 안 된다

→ REQ-UX-009-008

### AC-013: 링크 핸들 외부 클릭 — 편집 모드 OFF

**Given** 편집 모드 OFF, BookmarkCard A 내부에 링크 L1 이 있는 상태에서
**When** 사용자가 L1 의 이름 span 영역(핸들 외부) 을 click 하면
**Then** `link.url` 의 새 탭이 열려야 한다 (SPEC-UX-002 새 탭 + usage 기록)
**And** `usageStore.recordUsage('bookmark', L1.id)` 가 호출되어야 한다

→ REQ-UX-009-008 (SPEC-UX-002, SPEC-UX-006 보존)

### AC-014: 위젯 핸들에서만 RGL 드래그 시작

**Given** 편집 모드 ON, 데스크탑 환경에서 TodoWidget 카드가 렌더된 상태에서
**When** 사용자가 TodoWidget 의 `widget-drag-handle` 영역(헤더 div) 을 mousedown → mousemove 하면
**Then** RGL 의 위젯 위치가 변경되어야 한다
**And** TodoWidget 의 본문 영역(할 일 목록 ul) mousedown → mousemove 는 RGL 드래그를 시작해서는 안 된다 (현재 SPEC-UX-007 보존)

→ REQ-UX-009-009

### AC-015: 키보드 접근성 — Tab + Space + Arrow

**Given** 편집 모드 ON, BookmarkCard 가 렌더된 상태에서
**When** 사용자가 Tab 키로 `[data-group-handle]` 요소에 포커스를 이동하고 Space 키를 누르면
**Then** dnd-kit 의 KeyboardSensor 가 드래그를 시작해야 한다
**And** Arrow Down 키를 누르면 다음 카테고리 위치로 sortable 이 이동해야 한다
**And** Space 키를 다시 누르면 `bookmarkStore.reorderCategories` 가 1회 호출되어 정렬이 영속화되어야 한다

→ REQ-UX-009-011, REQ-UX-009-012

### AC-016: aria-label 정확성

**Given** 편집 모드 ON, 카테고리 "개발" 과 링크 "GitHub" 이 렌더된 상태에서
**When** 각 핸들의 `aria-label` 을 검사하면
**Then** 카테고리 "개발" 의 그룹 핸들 `aria-label === '카테고리 이동: 개발'` 이어야 한다
**And** 링크 "GitHub" 의 링크 핸들 `aria-label === '링크 이동: GitHub'` 이어야 한다
**And** TodoWidget 의 위젯 핸들 `aria-label === '위젯 이동: 할 일 목록'` 이어야 한다

→ REQ-UX-009-011

## 엣지 케이스

### EDGE-001: 모바일 터치 hit-area 검증

**Given** mobile viewport(`375 × 667` Playwright preset), 편집 모드 ON 인 환경에서
**When** 각 핸들의 `getBoundingClientRect()` 를 측정하면
**Then** 모든 핸들의 `width >= 44 && height >= 44` 이어야 한다
**And** 인접한 두 핸들 간 거리(예: 그룹 핸들 ↔ ⚙️ 버튼) 는 시각적으로 분리되어야 한다 (overlap 0)
**And** SPEC-UX-006 REQ-UX-006-010 의 long-press 250ms 패턴이 보존되어야 한다

→ REQ-UX-009-010, NFR-001

### EDGE-002: prefers-reduced-motion 환경

**Given** 사용자 OS 의 `prefers-reduced-motion: reduce` 설정이 활성화된 환경에서
**When** 편집 모드 ON/OFF 전환을 5회 반복하면
**Then** 핸들의 opacity 전환이 transition 없이 즉시 적용/해제되어야 한다 (`transition-duration === '0s'` 또는 `transition === 'none'`)
**And** 시각 jank(prolonged fade) 가 발생해서는 안 된다

→ REQ-UX-009-015

### EDGE-003: 카테고리 카드 hover 시 핸들 가시성

**Given** 편집 모드 OFF 인 데스크탑 환경에서
**When** 사용자가 BookmarkCard 위에 hover 하면
**Then** 그룹 핸들(`[data-group-handle]`) 은 여전히 invisible (`opacity === 0`) 이어야 한다
**And** SPEC-UX-007 REQ-UX-007-015 의 ⚙️ 버튼은 편집 모드 OFF 일 때 `opacity === 0` 으로 유지되어야 한다 (hover-reveal 패턴 변경 없음)

→ REQ-UX-009-006

### EDGE-004: SortableContext nested + KeyboardSensor 회귀

**Given** 편집 모드 ON, BookmarkCard 가 2개 이상 렌더된 상태에서
**When** 사용자가 Tab 으로 첫 번째 카테고리의 링크 핸들에 포커스 → Space → Arrow Right → Space (같은 카테고리 내 정렬 변경) 시퀀스를 수행하면
**Then** SPEC-UX-006 의 단일 카테고리 정렬이 키보드로도 동작해야 한다 (`bookmarkStore.updateBookmark` 호출)
**And** dnd-kit 의 multi-container sortable 이 KeyboardSensor 와 충돌해서는 안 된다 (카테고리 간 이동도 키보드로 가능)

→ REQ-UX-009-011, REQ-UX-009-012

## 품질 게이트

- [ ] `npm run typecheck` TypeScript 오류 0 (strict)
- [ ] `npm run lint` ESLint 경고/오류 0
- [ ] `npm run build` 정상 종료
- [ ] `npm run test:run` 기존 단위 테스트 100% 통과 (SPEC-UX-006/007/008 회귀 0)
- [ ] 신규 추가 테스트 (`DragHandleSlot.test.tsx`, `BookmarkCard.test.tsx` 갱신, `SortableLink.test.tsx`, `WidgetLayout.test.tsx` 확장) 100% 통과
- [ ] `DragHandleSlot` 컴포넌트 커버리지 90% 이상
- [ ] e2e Playwright `spec-ux-009-handle-separation.spec.ts` 통과 (8개 시나리오)
- [ ] e2e Playwright `spec-ux-009-keyboard-a11y.spec.ts` 통과 (Tab+Space+Arrow 시퀀스)
- [ ] mobile viewport(375×667) + desktop viewport(1280×720) 양쪽 e2e 모두 통과

## Definition of Done

- [ ] REQ-UX-009-001 ~ REQ-UX-009-017 모두 구현
- [ ] AC-001 ~ AC-016 통과
- [ ] EDGE-001 ~ EDGE-004 처리
- [ ] 파일 변경 맵의 15개 파일만 수정/생성 (그 외 파일은 touch 금지 — Surgical Changes)
- [ ] 신규 외부 의존성 추가 없음 (`lucide-react`, `@dnd-kit/*`, `zustand` 모두 기존 설치 활용)
- [ ] 신규 파일 (`DragHandleSlot.tsx`, `DragHandleSlot.test.tsx`, e2e 2개) 모두 첫 줄에 한국어 한 줄 헤더 주석 포함
- [ ] SPEC-UX-006 / SPEC-UX-007 / SPEC-UX-008 회귀 0 (모든 acceptance 시나리오 통과)
- [ ] PR 본문에 본 SPEC ID(`SPEC-UX-009`) 와 5개 변경 영역(공통 핸들 슬롯 / 그룹 핸들 분리 / 링크 핸들 분리 / 위젯 핸들 시각 마커 / KeyboardSensor) 모두 명시
- [ ] PR 본문에 사용자가 제기한 핵심 결함("편집 모드 시 무엇을 잡을지 의도 불명확") 의 해소 여부 명시
