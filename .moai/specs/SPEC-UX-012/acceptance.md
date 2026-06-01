# SPEC-UX-012: 인수 조건

## 시나리오

### 영역 1: 아코디언 구조

#### AC-001: 고정 높이 카드 제거

**Given** 즐겨찾기 위젯이 렌더된 상태에서
**When** 카테고리 카드의 computed style 을 읽으면
**Then** `height: 220px` 고정이 적용되어서는 안 된다 (`height: auto` 또는 콘텐츠 기반)
**And** 카드 내부에 `overflowY: auto` 스크롤 래퍼(`flex: 1, minHeight: 0`)가 존재해서는 안 된다

→ REQ-UX-012-001

#### AC-002: 고정 행 높이 그리드 제거

**Given** 즐겨찾기 위젯의 카테고리 컨테이너에서
**When** 컨테이너의 computed style 을 읽으면
**Then** `gridAutoRows: 220px` 가 적용되어서는 안 된다
**And** 카테고리는 세로 스택(또는 1열)으로 배치되어야 한다
**And** 위젯 컨테이너 자체의 스크롤(`overflowY: auto`)은 유지되어야 한다

→ REQ-UX-012-001

#### AC-003: 멀티 확장 (다중 동시 펼침)

**Given** 카테고리 A, B, C 가 모두 펼쳐진 상태에서
**When** 사용자가 카테고리 B 를 접으면
**Then** B 만 접혀야 한다 (`isExpanded(B) === false`)
**And** A 와 C 는 펼친 상태(`isExpanded(A) === true`, `isExpanded(C) === true`)를 유지해야 한다

→ REQ-UX-012-002

#### AC-004: 확장 상태 localStorage 영속화

**Given** 카테고리 A 를 접은 상태(`isExpanded(A) === false`)에서
**When** 페이지를 새로고침하고 store 가 재초기화되면
**Then** `localStorage.getItem('favorites-expanded')` 에 A 의 접힘 상태가 영속화되어 있어야 한다
**And** 재초기화 후 `isExpanded(A) === false` 가 복원되어야 한다

→ REQ-UX-012-003

#### AC-005: 최초 실행 기본 = 모두 펼침

**Given** `localStorage` 에 `favorites-expanded` 키가 없는 최초 실행 환경에서
**When** 즐겨찾기 위젯이 렌더되면
**Then** 모든 카테고리가 펼쳐진 상태(`isExpanded(any) === true`)로 표시되어야 한다

→ REQ-UX-012-004

#### AC-006: 영속화 map 에 없는 신규 카테고리 = 펼침

**Given** `favorites-expanded = { "A": false }` 영속화 상태에서 신규 카테고리 D 가 추가되면
**When** `useFavoritesExpandStore.getState().isExpanded('D')` 를 호출하면
**Then** `true` 를 반환해야 한다 (키 없으면 펼침)
**And** A 는 `false` 를 반환해야 한다

→ REQ-UX-012-004

### 영역 2: 카테고리 헤더

#### AC-007: 링크 수 배지 표시

**Given** 카테고리 X 가 12개의 링크를 가진 상태에서
**When** BookmarkCard X 의 헤더가 렌더되면
**Then** 헤더에 "(12)" 형태의 링크 수 배지가 표시되어야 한다
**And** 배지 색은 `var(--text-muted)` 이어야 한다

→ REQ-UX-012-005

#### AC-008: 셰브론 펼침 상태 반영

**Given** 카테고리 X 가 펼쳐진 상태에서
**When** 헤더의 셰브론 아이콘을 검사하면
**Then** `ChevronDown` 이 펼침 시각(예: `rotate(180deg)`)으로 표시되어야 한다
**And** 셰브론은 `aria-hidden="true"` 이어야 한다
**And** 접힘 상태에서는 펼침과 다른 회전 상태로 표시되어야 한다

→ REQ-UX-012-005

#### AC-009: 헤더 클릭 시 토글

**Given** 카테고리 X 가 펼쳐진 상태에서
**When** 사용자가 헤더 본문(아이콘/이름/배지 영역)을 클릭하면
**Then** `toggleExpand('X')` 가 호출되어야 한다
**And** 칩 링크 영역이 숨겨지고 `aria-expanded === "false"` 로 전환되어야 한다

→ REQ-UX-012-006

#### AC-010: ⚙️ 편집 버튼 클릭 시 토글 미발생

**Given** 편집 모드 ON, 카테고리 X 가 펼쳐진 상태에서
**When** 사용자가 헤더의 ⚙️ 편집 버튼(`data-testid="bookmark-edit-btn"`)을 클릭하면
**Then** `toggleExpand` 가 호출되어서는 안 된다 (stopPropagation)
**And** 카테고리 편집 모달(`onEdit`)이 열려야 한다
**And** 카테고리 X 는 펼친 상태를 유지해야 한다

→ REQ-UX-012-006

#### AC-011: 그룹 핸들 클릭 시 토글 미발생

**Given** 편집 모드 ON, 카테고리 X 가 펼쳐진 상태에서
**When** 사용자가 그룹 핸들(`data-group-handle`)에 pointerdown 하면
**Then** `toggleExpand` 가 호출되어서는 안 된다 (stopPropagation)
**And** 카테고리 드래그가 시작될 수 있어야 한다

→ REQ-UX-012-006, REQ-UX-012-012

#### AC-012: 헤더 ARIA disclosure 속성

**Given** 카테고리 X 헤더가 렌더된 상태에서
**When** 헤더 토글 요소를 검사하면
**Then** `role="button"` (또는 native button), `aria-expanded` 가 펼침 상태와 일치해야 한다
**And** `aria-controls` 가 칩 패널 영역의 id 와 연결되어야 한다

→ REQ-UX-012-007

#### AC-013: 키보드 Enter/Space 토글

**Given** 카테고리 X 헤더 토글에 포커스가 있는 상태에서
**When** 사용자가 `Enter` 또는 `Space` 를 누르면
**Then** `toggleExpand('X')` 가 호출되어야 한다
**And** `aria-expanded` 가 토글되어야 한다

→ REQ-UX-012-007

### 영역 3: 칩 인라인 wrap 링크

#### AC-014: 펼친 카테고리 = 칩 flex-wrap

**Given** 카테고리 X 가 펼쳐지고 여러 링크를 가진 상태에서
**When** 칩 컨테이너의 computed style 을 읽으면
**Then** `display: flex`, `flexWrap: wrap` 이 적용되어야 한다
**And** `gridTemplateColumns: 1fr 1fr` (2열 그리드)가 적용되어서는 안 된다

→ REQ-UX-012-008

#### AC-015: 접힌 카테고리 = 칩 미표시

**Given** 카테고리 X 가 접힌 상태(`isExpanded === false`)에서
**When** BookmarkCard X 가 렌더되면
**Then** 링크 칩 영역이 렌더되지 않거나 시각적으로 숨겨져야 한다 (`display: none` 또는 조건부 미렌더)

→ REQ-UX-012-008

#### AC-016: 칩 시각 토큰

**Given** 펼친 카테고리의 링크 칩에서
**When** 칩의 computed style 을 읽으면
**Then** 배경은 `var(--link-bg)`, 텍스트는 `var(--text-primary)`, 폰트 13px 이어야 한다
**And** hover 시 배경이 `var(--link-hover)` 로 전환되어야 한다

→ REQ-UX-012-009

#### AC-017: 칩 truncation 완화

**Given** 긴 이름을 가진 링크 칩에서
**When** 칩의 폭을 검사하면
**Then** 칩은 합리적 최대 폭(예: `maxWidth: 200px`) 내에서 이름을 표시하려 시도해야 한다
**And** 2열 그리드(카드 폭 절반) 대비 넓은 폭을 허용해야 한다
**And** 짧은 이름의 칩은 이름 길이에 맞춰 폭이 축소되어 wrap 되어야 한다

→ REQ-UX-012-010

#### AC-018: 드래그 중 칩 시각 보존 (SPEC-UX-011)

**Given** 편집 모드 ON, 펼친 카테고리에서 링크 칩을 드래그 중인 상태에서
**When** 드래그 중인 칩을 검사하면
**Then** `opacity: 0.4` + `--accent-soft` 배경 + dashed outline (SPEC-UX-011) 이 보존되어야 한다

→ REQ-UX-012-009

### 영역 4: DnD invariant 보존

#### AC-019: 단일 DndContext 보존

**Given** 즐겨찾기 위젯이 렌더된 상태에서
**When** DOM 의 DndContext 수를 검사하면
**Then** 즐겨찾기 영역에 단일 DndContext 만 존재해야 한다 (추가 DndContext 신설 없음)

→ REQ-UX-012-011

#### AC-020: 카테고리 재정렬 (그룹 핸들)

**Given** 편집 모드 ON, 2개 이상의 카테고리가 있는 상태에서
**When** 사용자가 첫 번째 카테고리의 그룹 핸들(`data-group-handle`)을 잡고 다음 위치로 드래그하면
**Then** 카테고리 순서가 변경되어야 한다 (`reorderCategories` 호출)
**And** 카테고리 수는 유지되어야 한다

→ REQ-UX-012-012

#### AC-021: 카테고리 내 링크 재정렬

**Given** 편집 모드 ON, 펼친 카테고리에 2개 이상의 링크가 있는 상태에서
**When** 사용자가 첫 번째 링크 핸들(`data-link-handle`)을 같은 카테고리 내 다른 위치로 드래그하면
**Then** 같은 카테고리 내 링크 순서가 변경되어야 한다 (`updateBookmark` 호출)
**And** 링크 수는 유지되어야 한다

→ REQ-UX-012-013

#### AC-022: cross-group 링크 이동 비목표 (no-op)

**Given** 편집 모드 ON, 펼친 카테고리 A 의 링크 L1, 다른 카테고리 B 가 있는 상태에서
**When** 사용자가 L1 을 카테고리 B 영역으로 드래그하여 드롭하면
**Then** `moveLinkBetweenGroups` 가 호출되어서는 안 된다 (본 SPEC 비목표)
**And** L1 은 카테고리 A 에 그대로 남아야 한다
**And** 에러가 발생해서는 안 된다 (graceful no-op)

→ REQ-UX-012-014

#### AC-023: 접힌 카테고리는 링크 drop target 불필요

**Given** 편집 모드 ON, 카테고리 B 가 접힌 상태에서
**When** 사용자가 다른 카테고리 링크를 B 헤더 위로 드래그하면
**Then** B 로의 링크 이동이 발생해서는 안 된다 (cross-group 비목표)
**And** 카테고리 B 는 카테고리 재정렬 drop target 으로만 동작할 수 있다 (그룹 정렬은 정상)

→ REQ-UX-012-014

### 영역 5: 접근성 / 타이머 / 반응형

#### AC-024: 자동 종료 타이머 일시 중지 (SPEC-UX-011 보존)

**Given** 편집 모드 ON, `autoExitEnabled === true`, 카운트다운(`data-testid="edit-mode-countdown"`)이 표시되는 상태에서
**When** 사용자가 링크 핸들을 잡고 드래그를 시작하여 3초 유지하면
**Then** 카운트다운 값이 정지(또는 2초 이내 변동)해야 한다 (`isDragInProgress` 가드)
**And** 드래그 종료 후 타이머가 재개되어야 한다

→ REQ-UX-012-015

#### AC-025: 헤더 토글이 타이머 활동으로 인식

**Given** 편집 모드 ON, 자동 종료 타이머가 진행 중인 상태에서
**When** 사용자가 카테고리 헤더를 클릭(토글)하면
**Then** `pointerdown` 활동 리스너로 타이머가 리셋되어야 한다 (`lastActivityRef` 갱신)
**And** `editModeStore.isEditing === true` 가 유지되어야 한다

→ REQ-UX-012-015

#### AC-026: 모바일 반응형 stack + 칩 wrap

**Given** 모바일 viewport(375×667)에서 즐겨찾기 위젯이 렌더된 상태에서
**When** 레이아웃을 검사하면
**Then** 카테고리가 1열 세로 스택으로 표시되어야 한다
**And** 펼친 카테고리의 칩이 좁은 폭에서 wrap 되어 가독성을 유지해야 한다
**And** 헤더 토글 hit-area 가 최소 44px 높이여야 한다

→ REQ-UX-012-017

#### AC-027: 편집 모드 시각 단서 보존

**Given** 편집 모드 ON 으로 전환된 상태에서
**When** 카테고리 카드를 검사하면
**Then** accent border(`border: 1px solid var(--accent)`)가 적용되어야 한다 (SPEC-UX-007 보존)
**And** 그룹 핸들(`data-group-handle`)이 노출되어야 한다 (SPEC-UX-009 보존)

→ REQ-UX-012-018

#### AC-028: 외부 의존성 무증가

**Given** 본 SPEC 구현 완료 후
**When** `package.json` 의 dependencies 를 검사하면
**Then** 신규 npm 패키지가 추가되어서는 안 된다 (`lucide-react`, `@dnd-kit/*`, `zustand` 만 기존 활용)

→ REQ-UX-012-016

## 엣지 케이스

### EDGE-001: localStorage JSON 파싱 실패

**Given** `localStorage.getItem('favorites-expanded')` 가 손상된 JSON("not-json")을 반환하는 환경에서
**When** `favoritesExpandStore` 가 초기화되면
**Then** 에러 없이 빈 map(`{}`)으로 fallback 해야 한다 (try/catch)
**And** 모든 카테고리가 펼침(`isExpanded === true`)으로 간주되어야 한다

→ REQ-UX-012-003, REQ-UX-012-004

### EDGE-002: 모든 카테고리 펼침 + 다수 링크 성능

**Given** 카테고리 20개, 카테고리당 링크 30개가 모두 펼쳐진 상태에서
**When** 펼침/접힘 토글을 수행하면
**Then** 토글이 즉각 반응해야 한다 (체감 지연 없음)
**And** 접힌 카테고리는 링크 칩을 렌더하지 않아야 한다 (조건부 렌더로 비용 절감)

→ NFR-003

### EDGE-003: 빈 카테고리 펼침/접힘

**Given** 링크 0개인 카테고리 Y 가 펼쳐진 상태에서
**When** BookmarkCard Y 가 렌더되면
**Then** 헤더에 "(0)" 배지가 표시되어야 한다
**And** 펼침 시 SPEC-UX-010 placeholder(빈 상태 안내) 가 칩 컨테이너 내부에 표시되어야 한다 (cross-group 비목표 반영하여 "북마크가 없습니다" 문구)
**And** 접힘 시 placeholder 가 표시되지 않아야 한다

→ REQ-UX-012-008, SPEC-UX-010 적응

### EDGE-004: 카테고리 재정렬 시 펼침 상태 유지

**Given** 편집 모드 ON, 카테고리 A(펼침), B(접힘), C(펼침) 순서에서
**When** 사용자가 C 를 첫 번째 위치로 재정렬하면
**Then** C 는 여전히 펼친 상태, B 는 접힌 상태를 유지해야 한다 (확장 상태는 id 기반, 순서 무관)
**And** localStorage 의 확장 map 이 카테고리 id 기준으로 보존되어야 한다

→ REQ-UX-012-002, REQ-UX-012-012

### EDGE-005: 키보드 정렬과 헤더 토글 키 공존

**Given** 편집 모드 ON, 그룹 핸들에 포커스가 있고 dnd-kit KeyboardSensor(SPEC-UX-009)가 활성인 상태에서
**When** 사용자가 핸들에서 `Space` 를 눌러 드래그를 시작하면
**Then** dnd-kit 키보드 정렬이 시작되어야 한다 (헤더 토글이 아닌)
**And** 헤더 토글 요소에서 `Space`/`Enter` 는 펼침 토글을 담당해야 한다 (포커스 대상에 따라 동작 분리)

→ REQ-UX-012-007, REQ-UX-012-012 (SPEC-UX-009 KeyboardSensor 호환)

### EDGE-006: 드래그 중 헤더 토글 방지

**Given** 편집 모드 ON, 사용자가 그룹 핸들을 잡고 카테고리를 드래그하는 중에
**When** 드래그가 진행되면
**Then** 드래그 시작으로 인한 pointerdown 이 헤더 토글을 발생시켜서는 안 된다 (핸들 stopPropagation)
**And** 드래그 종료 후 카테고리의 펼침 상태가 드래그 이전과 동일해야 한다

→ REQ-UX-012-006, REQ-UX-012-012

## 품질 게이트

- [ ] `npm run typecheck` TypeScript 오류 0 (strict)
- [ ] `npm run lint` ESLint 경고/오류 0
- [ ] `npm run build` 정상 종료
- [ ] `npm run test:run` 기존 단위 테스트 100% 통과 (SPEC-UX-006~011 회귀 0, cross-group 비목표 항목 제외)
- [ ] 신규 추가 테스트(`favoritesExpandStore.test.ts`, `BookmarkCard.test.tsx` 갱신, `SortableLink` 관련 갱신, `WidgetLayout.test.tsx` 갱신) 100% 통과
- [ ] `favoritesExpandStore` 커버리지 95% 이상 (isExpanded 기본값, toggleExpand, 영속화, JSON fallback 모두 커버)
- [ ] e2e Playwright `spec-ux-012-favorites-accordion.spec.ts` 통과 (아코디언 + DnD 보존 + 반응형)
- [ ] mobile viewport(375×667) + desktop viewport(1280×720) 양쪽 e2e 모두 통과

## Definition of Done

- [ ] REQ-UX-012-001 ~ REQ-UX-012-020 모두 구현
- [ ] AC-001 ~ AC-028 통과
- [ ] EDGE-001 ~ EDGE-006 처리
- [ ] 파일 변경 맵의 파일만 수정/생성 (그 외 파일 touch 금지 — Surgical Changes)
- [ ] 신규 외부 의존성 추가 없음 (`lucide-react` `ChevronDown` + 기존 `@dnd-kit/*` / `zustand` 활용)
- [ ] 신규 파일(`favoritesExpandStore.ts/.test.ts`, e2e)은 첫 줄에 한국어 한 줄 헤더 주석 포함
- [ ] 수정 anchor 의 `@MX:SPEC` 에 `SPEC-UX-012` 추가, 신규 store 가 fan_in >= 3 이면 `@MX:ANCHOR` + `@MX:REASON`
- [ ] SPEC-UX-006/007/009/010/011 회귀 0
- [ ] SPEC-UX-008 cross-group 링크 이동은 본 SPEC 에서 비목표(no-op)로 명시 — store 액션은 보존
- [ ] PR 본문에 본 SPEC ID(`SPEC-UX-012`)와 핵심 변경(고정 높이 카드 → 멀티 확장 아코디언 + 칩 링크) 명시
- [ ] PR 본문에 사용자 핵심 문제(북마크 가시성 부족, 이름 truncation) 해소 여부 + cross-group 비목표 명시
</content>
