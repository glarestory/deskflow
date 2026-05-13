# SPEC-UX-010: 인수 조건

## 시나리오

### 영역 1: Undo (Cmd/Ctrl + Z)

#### AC-001: editHistoryStore 초기 상태

**Given** 앱이 막 부팅되어 어떤 변경도 없는 초기 상태에서
**When** `useEditHistoryStore.getState()` 를 읽으면
**Then** `past === []` 그리고 `future === []` 이어야 한다

→ REQ-UX-010-001

#### AC-002: editHistoryStore push 동작

**Given** 빈 히스토리 store 에서
**When** `push({ type: 'bookmarks', bookmarks: [{ id: 'A' }, { id: 'B' }] })` 를 호출하면
**Then** `past.length === 1` 이어야 한다
**And** `past[0]` 은 push 한 snapshot 과 동일해야 한다
**And** `future === []` 이어야 한다 (새 push 는 future 무효화)

→ REQ-UX-010-001, REQ-UX-010-003

#### AC-003: editHistoryStore 최대 깊이 10 + FIFO 만료

**Given** push 가 10회 호출되어 `past.length === 10` 인 상태에서
**When** 11번째 push 가 호출되면
**Then** `past.length === 10` 이 유지되어야 한다
**And** 가장 오래된 snapshot(이전 past[0]) 은 제거되어야 한다 (FIFO 만료)
**And** 새 snapshot 은 `past[9]` 에 위치해야 한다

→ REQ-UX-010-002

#### AC-004: editHistoryStore undo

**Given** `past = [S1, S2, S3]`, `future = []` 상태에서
**When** `undo()` 를 호출하면
**Then** 반환값은 `S3` 이어야 한다
**And** `past === [S1, S2]` 이어야 한다
**And** `future === [S3]` 이어야 한다

→ REQ-UX-010-001

#### AC-005: editHistoryStore undo 빈 past

**Given** `past === []` 상태에서
**When** `undo()` 를 호출하면
**Then** 반환값은 `null` 이어야 한다
**And** store 상태에 변동이 없어야 한다 (no-op)

→ REQ-UX-010-001

#### AC-006: 카테고리 reorder 시 자동 push

**Given** 편집 모드 ON, `bookmarks = [A, B, C]`, `editHistoryStore.past === []` 상태에서
**When** `bookmarkStore.reorderCategories(['C', 'A', 'B'])` 를 호출하면
**Then** `editHistoryStore.past.length === 1` 이어야 한다
**And** `past[0] === { type: 'bookmarks', bookmarks: [A, B, C] }` (직전 상태) 이어야 한다
**And** `bookmarkStore.bookmarks === [C, A, B]` (새 상태) 이어야 한다

→ REQ-UX-010-003

#### AC-007: 링크 이동 시 자동 push (cross-category)

**Given** 편집 모드 ON, `bookmarks = [{ A: [L1, L2] }, { B: [] }]`, `editHistoryStore.past === []` 상태에서
**When** `bookmarkStore.moveLinkBetweenGroups('L1', 'A', 'B', 0)` 를 호출하면
**Then** `editHistoryStore.past.length === 1` 이어야 한다
**And** `past[0] === { type: 'bookmarks', bookmarks: [{ A: [L1, L2] }, { B: [] }] }` (직전 상태) 이어야 한다

→ REQ-UX-010-003

#### AC-008: 위젯 layout 변경 시 자동 push

**Given** 편집 모드 ON, `layoutStore.layout = [...]`, `editHistoryStore.past === []` 상태에서
**When** `layoutStore.updateLayout(newLayout)` 가 호출되면
**Then** `editHistoryStore.past.length === 1` 이어야 한다
**And** `past[0] === { type: 'layout', layout: [...prev] }` 이어야 한다

→ REQ-UX-010-003

#### AC-009: Cmd+Z (macOS) 단축키

**Given** 편집 모드 ON, macOS 환경(`navigator.platform === 'MacIntel'`), 카테고리 reorder 가 1회 수행된 상태에서
**When** 사용자가 `Cmd+Z` (`event.metaKey === true && event.key === 'z' && !event.shiftKey`) 를 누르면
**Then** `editHistoryStore.undo()` 가 호출되어야 한다
**And** `bookmarkStore.bookmarks` 가 직전 상태로 복원되어야 한다
**And** `storage.set('hub-bookmarks', ...)` 가 1회 호출되어 영속화되어야 한다

→ REQ-UX-010-004

#### AC-010: Ctrl+Z (Windows/Linux) 단축키

**Given** 편집 모드 ON, Windows 환경(`navigator.platform === 'Win32'`), 카테고리 reorder 가 1회 수행된 상태에서
**When** 사용자가 `Ctrl+Z` (`event.ctrlKey === true && event.key === 'z' && !event.shiftKey`) 를 누르면
**Then** `editHistoryStore.undo()` 가 호출되어야 한다
**And** 동작은 AC-009 와 동일해야 한다

→ REQ-UX-010-004

#### AC-011: Cmd+Shift+Z 무시 (1차 구현)

**Given** 편집 모드 ON, 카테고리 reorder 가 수행되고 Cmd+Z 로 undo 까지 한 상태에서(`future.length === 1`)
**When** 사용자가 `Cmd+Shift+Z` 를 누르면
**Then** `editHistoryStore.redo()` 가 호출되어서는 안 된다 (본 SPEC 1차 구현은 redo 단축키 미지원)
**And** store 상태에 변동이 없어야 한다

→ REQ-UX-010-004 (Exclusions 참고)

#### AC-012: Undo 후 토스트 알림

**Given** 편집 모드 ON, undo 가 성공적으로 수행된 직후
**When** WidgetLayout 이 토스트 state 를 set 하면
**Then** DOM 에 `EditModeToast` 가 렌더되어야 한다
**And** 메시지는 `"되돌리기 완료"` 이어야 한다
**And** 액션 버튼 라벨은 `"되돌리기"` 이어야 한다
**And** 3초 후 자동 dismiss 되어야 한다 (`setTimeout` mock 으로 검증)

→ REQ-UX-010-005

#### AC-013: Undo 토스트의 "되돌리기" 버튼 = redo

**Given** AC-012 의 토스트가 노출된 상태에서
**When** 사용자가 토스트의 "되돌리기" 버튼을 click 하면
**Then** `editHistoryStore.redo()` 가 1회 호출되어야 한다
**And** `bookmarkStore.bookmarks` 또는 `layoutStore.layout` 이 undo 직전 상태로 복원되어야 한다 (사용자가 실수로 Cmd+Z 를 누른 경우 즉시 복구)

→ REQ-UX-010-005

#### AC-014: 편집 모드 OFF 시 Cmd+Z 비활성

**Given** 편집 모드 OFF (`isEditing === false`) 상태에서, `editHistoryStore.past.length > 0` 이라도
**When** 사용자가 `Cmd+Z` 를 누르면
**Then** `editHistoryStore.undo()` 가 호출되어서는 안 된다
**And** `bookmarkStore` / `layoutStore` 의 상태에 변동이 없어야 한다

→ REQ-UX-010-006

### 영역 2: 자동 종료 타임아웃

#### AC-015: 30초 무동작 시 자동 종료

**Given** 편집 모드 ON, `editModeStore.autoExitEnabled === true`, `setTimeout` mock 활성 상태에서
**When** Playwright `page.clock` (또는 vi.useFakeTimers) 로 30,000ms 를 advance 하면
**Then** `editModeStore.isEditing === false` 로 전환되어야 한다
**And** 다른 사용자 조작 이벤트가 발생하지 않았다는 가정 하에 자동 종료가 실행되어야 한다

→ REQ-UX-010-007

#### AC-016: 사용자 조작 시 타이머 리셋

**Given** 편집 모드 ON, 타이머 시작 후 20초 경과 상태에서
**When** 사용자가 mousedown / keydown / touchstart / pointerdown 이벤트를 트리거하면
**Then** 타이머가 리셋되어 다시 30,000ms 카운트다운 시작해야 한다
**And** 리셋 후 10초 경과 시점(원래 타이머 기준 30초) 에도 `isEditing === true` 유지되어야 한다

→ REQ-UX-010-007

#### AC-017: autoExitEnabled === false 시 타이머 미등록

**Given** `editModeStore.autoExitEnabled === false`, 편집 모드 ON 상태에서
**When** 60초가 경과해도
**Then** `editModeStore.isEditing === true` 가 유지되어야 한다
**And** `setTimeout` mock 호출 수는 autoExit 관련 0회 이어야 한다

→ REQ-UX-010-008

#### AC-018: autoExitEnabled 영속화

**Given** `editModeStore.setAutoExitEnabled(false)` 가 호출된 후
**When** 페이지를 새로고침하고 store 가 재초기화되면
**Then** `editModeStore.autoExitEnabled === false` 가 유지되어야 한다 (localStorage 또는 storage 영속화)

→ REQ-UX-010-008

#### AC-019: 25초 시점 경고 토스트

**Given** 편집 모드 ON, `autoExitEnabled === true`, 사용자 조작이 25초간 없는 상태에서
**When** Playwright `page.clock` 으로 25,000ms 를 advance 하면
**Then** `EditModeToast` 가 노출되어야 한다 (variant === 'auto-exit-warning')
**And** 메시지는 `"5초 후 편집 모드 자동 종료"` 이어야 한다
**And** 액션 버튼 라벨은 `"유지"` 이어야 한다

→ REQ-UX-010-009

#### AC-020: "유지" 클릭 시 타이머 리셋

**Given** AC-019 의 경고 토스트가 노출된 상태에서
**When** 사용자가 "유지" 버튼을 click 하면
**Then** 타이머가 리셋되어 추가 30,000ms 가 시작되어야 한다
**And** 경고 토스트는 dismiss 되어야 한다
**And** `editModeStore.isEditing === true` 가 유지되어야 한다

→ REQ-UX-010-009

### 영역 3: 빈 그룹 placeholder

#### AC-021: 빈 카테고리 placeholder 표시 (편집 모드 ON)

**Given** 카테고리 X 의 `links.length === 0`, 편집 모드 ON 상태에서
**When** BookmarkCard X 가 렌더되면
**Then** `[data-empty-placeholder]` 매칭 요소가 1개 존재해야 한다
**And** 텍스트 내용은 `"여기로 드래그하여 추가"` 이어야 한다
**And** 점선 outline (`outline: 1px dashed var(--text-faint)`) 이 적용되어야 한다

→ REQ-UX-010-010

#### AC-022: 빈 카테고리 placeholder 미표시 (편집 모드 OFF)

**Given** 카테고리 X 의 `links.length === 0`, 편집 모드 OFF 상태에서
**When** BookmarkCard X 가 렌더되면
**Then** `[data-empty-placeholder]` 매칭 요소가 존재해서는 안 된다 (또는 `opacity === 0`, layout 영향 없음)

→ REQ-UX-010-010

#### AC-023: hideEmptyCategories === true + 편집 모드 OFF

**Given** `editModeStore.hideEmptyCategories === true`, 편집 모드 OFF, `bookmarks = [{ A: [L1] }, { B: [] }, { C: [L2] }]` 상태에서
**When** WidgetLayout 의 BookmarkCard grid 가 렌더되면
**Then** 빈 카테고리 B 의 BookmarkCard 가 DOM 에 렌더되어서는 안 된다
**And** A 와 C 의 BookmarkCard 만 렌더되어야 한다

→ REQ-UX-010-011

#### AC-024: hideEmptyCategories === true + 편집 모드 ON

**Given** AC-023 의 상태에서 편집 모드 ON 으로 전환하면
**When** WidgetLayout 의 BookmarkCard grid 가 재렌더되면
**Then** 빈 카테고리 B 의 BookmarkCard 가 DOM 에 렌더되어야 한다 (drop target 보장)
**And** B 카드는 AC-021 의 placeholder 를 표시해야 한다

→ REQ-UX-010-011

#### AC-025: isOver 시 placeholder text 숨김

**Given** 편집 모드 ON, 빈 카테고리 B 가 렌더되고 placeholder text 가 노출된 상태에서
**When** 다른 카테고리의 링크 L1 을 B 의 droppable 영역 위로 드래그(`isOver === true`) 하면
**Then** placeholder text 의 `opacity === 0` 이어야 한다
**And** SPEC-UX-008 의 `--accent-subtle` 배경이 placeholder 영역에 적용되어야 한다

→ REQ-UX-010-012

### 영역 4: 모바일 햅틱 피드백

#### AC-026: 드래그 시작 시 vibrate 호출 (지원 환경)

**Given** `navigator.vibrate` 가 정의된 환경(예: Chrome on Android), `prefers-reduced-motion: reduce` 가 비활성 상태에서
**When** 사용자가 BookmarkCard 의 카테고리 또는 링크를 드래그 시작하면(dnd-kit `onDragStart`)
**Then** `navigator.vibrate(10)` 가 1회 호출되어야 한다 (mock 검증)

→ REQ-UX-010-013

#### AC-027: 드래그 시작 시 vibrate 호출 (RGL 위젯)

**Given** AC-026 의 환경에서
**When** 사용자가 위젯 헤더(`widget-drag-handle`) 를 잡고 RGL 드래그를 시작하면
**Then** `navigator.vibrate(10)` 가 1회 호출되어야 한다

→ REQ-UX-010-013

#### AC-028: 미지원 환경 graceful fallback

**Given** `navigator.vibrate === undefined` 인 환경(예: iOS Safari, 데스크탑 Safari) 에서
**When** 사용자가 드래그를 시작하면
**Then** `tryHaptic(10)` 호출이 에러를 발생시켜서는 안 된다 (try/catch 가드)
**And** 드래그 동작 자체는 정상 진행되어야 한다

→ REQ-UX-010-014

#### AC-029: prefers-reduced-motion 시 vibrate 미호출

**Given** `window.matchMedia('(prefers-reduced-motion: reduce)').matches === true` 인 환경에서
**When** 사용자가 드래그를 시작하면
**Then** `navigator.vibrate` 가 호출되어서는 안 된다 (mock 검증)
**And** 드래그 동작 자체는 정상 진행되어야 한다

→ REQ-UX-010-015

## 엣지 케이스

### EDGE-001: Undo 후 새 변경 시 future 무효화

**Given** 카테고리 reorder 3회 수행 후 Cmd+Z 1회 (past 2개, future 1개) 상태에서
**When** 사용자가 새 카테고리 reorder 를 수행하면
**Then** `editHistoryStore.future === []` 로 비워져야 한다 (새 변경은 redo 가능성 무효화)
**And** `past` 에 새 snapshot 이 추가되어야 한다

→ REQ-UX-010-001, REQ-UX-010-003

### EDGE-002: 편집 모드 OFF 전환 시 history clear

**Given** 편집 모드 ON 상태에서 `past.length === 5` 인 상태에서
**When** 사용자가 편집 모드 OFF (완료 버튼 click 또는 Esc 키 또는 자동 종료) 하면
**Then** `editHistoryStore.past === []` 그리고 `editHistoryStore.future === []` 이어야 한다
**And** 편집 모드 재진입 시 undo 시도해도 no-op 이어야 한다

→ REQ-UX-010-019

### EDGE-003: 자동 종료 직전 사용자 조작 race condition

**Given** 편집 모드 ON, 29.9초 경과 상태에서
**When** 사용자가 29.95초 시점에 mousedown 이벤트를 트리거하면
**Then** 타이머가 리셋되어야 한다
**And** `editModeStore.isEditing === true` 가 유지되어야 한다 (자동 종료 실행 안됨)

→ REQ-UX-010-007

### EDGE-004: 텍스트 input 에서 Cmd+Z

**Given** 편집 모드 ON, 검색바 input 에 포커스가 있는 상태에서
**When** 사용자가 `Cmd+Z` 를 누르면
**Then** input 의 native undo 가 동작해야 한다 (브라우저 기본)
**And** `editHistoryStore.undo()` 가 호출되어서는 안 된다 (`e.target` 이 input/textarea 인 경우 가드)

**Note**: 본 EDGE-004 의 가드는 plan.md 리스크 섹션 "Cmd+Z 가 텍스트 input 의 native undo 와 충돌" 의 완화 전략

→ REQ-UX-010-004, REQ-UX-010-006

### EDGE-005: SPEC-UX-009 KeyboardSensor 와 자동 종료 타이머 호환

**Given** SPEC-UX-009 가 병행 적용된 환경에서, 편집 모드 ON, 사용자가 Tab+Space 로 카테고리 핸들을 잡고 정렬 변경 중인 상태에서
**When** 25초 시점에 도달하면
**Then** keydown 이벤트(Arrow / Space)가 타이머 리셋 트리거로 동작해야 한다 (REQ-UX-010-007 의 `keydown` 이벤트 포함)
**And** 자동 종료가 발생해서는 안 된다 (사용자가 적극 조작 중)

→ REQ-UX-010-007 (SPEC-UX-009 KeyboardSensor 호환)

### EDGE-006: 빈 그룹 placeholder + 카테고리 자체 drag

**Given** 편집 모드 ON, 빈 카테고리 B 의 placeholder 가 노출된 상태에서
**When** 사용자가 B 의 카테고리 핸들(SPEC-UX-009 의 `data-group-handle` 또는 SPEC-UX-007 의 헤더) 을 잡고 다른 위치로 이동하면
**Then** `bookmarkStore.reorderCategories` 가 호출되어야 한다 (카테고리 정렬은 정상 동작)
**And** placeholder text 는 카드와 함께 transform 되어야 한다 (DragOverlay 또는 useSortable transform)
**And** 카테고리 정렬 후 B 가 새 위치에서 placeholder text 를 그대로 표시해야 한다

→ REQ-UX-010-010, REQ-UX-010-012 (SPEC-UX-007/008 통합)

## 품질 게이트

- [ ] `npm run typecheck` TypeScript 오류 0 (strict)
- [ ] `npm run lint` ESLint 경고/오류 0
- [ ] `npm run build` 정상 종료
- [ ] `npm run test:run` 기존 단위 테스트 100% 통과 (SPEC-UX-006/007/008 회귀 0)
- [ ] 신규 추가 테스트 (`editHistoryStore.test.ts`, `editModeStore.test.ts` 갱신, `bookmarkStore.test.ts` 갱신, `layoutStore.test.ts` 갱신, `WidgetLayout.test.tsx` 확장, `BookmarkCard.test.tsx` 갱신, `EditModeToast.test.tsx`, `haptic.test.ts`) 100% 통과
- [ ] `editHistoryStore` 커버리지 95% 이상 (push, undo, redo, clear, FIFO 만료 모두 커버)
- [ ] `haptic.ts` 커버리지 100% (3개 가드: navigator 미정의, vibrate 미정의, reduced-motion)
- [ ] e2e Playwright `spec-ux-010-undo.spec.ts` 통과 (6개 시나리오)
- [ ] e2e Playwright `spec-ux-010-auto-exit.spec.ts` 통과 (4개 시나리오, `page.clock` 결정론적 검증)
- [ ] e2e Playwright `spec-ux-010-empty-placeholder.spec.ts` 통과 (5개 시나리오)
- [ ] e2e Playwright `spec-ux-010-haptic.spec.ts` 통과 (`navigator.vibrate` mock 호출 횟수 검증)
- [ ] mobile viewport(375×667) + desktop viewport(1280×720) 양쪽 e2e 모두 통과

## Definition of Done

- [ ] REQ-UX-010-001 ~ REQ-UX-010-019 모두 구현
- [ ] AC-001 ~ AC-029 통과
- [ ] EDGE-001 ~ EDGE-006 처리
- [ ] 파일 변경 맵의 20개 파일만 수정/생성 (그 외 파일은 touch 금지 — Surgical Changes)
- [ ] 신규 외부 의존성 추가 없음 (`zustand` 만 기존 설치 활용 + Web Vibration API 표준)
- [ ] 신규 파일 (`editHistoryStore.ts/.test.ts`, `EditModeToast.tsx/.test.tsx`, `haptic.ts/.test.ts`, e2e 4개) 모두 첫 줄에 한국어 한 줄 헤더 주석 포함
- [ ] SPEC-UX-006 / SPEC-UX-007 / SPEC-UX-008 회귀 0 (모든 acceptance 시나리오 통과)
- [ ] SPEC-UX-009 와 병행 시 SPEC-UX-009 회귀 0 (특히 KeyboardSensor 호환 — EDGE-005)
- [ ] PR 본문에 본 SPEC ID(`SPEC-UX-010`) 와 4개 영역(Undo / 자동 종료 / 빈 그룹 placeholder / 모바일 햅틱) 모두 명시
- [ ] PR 본문에 사용자가 제기한 핵심 결함 4개(잘못된 드래그 복원 불가, 편집 모드 계속 활성, 빈 카테고리 drop target 인지 어려움, 모바일 햅틱 부재) 의 해소 여부 명시
