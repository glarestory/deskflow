---
id: SPEC-UX-010
version: 1.0.0
status: planned
created: 2026-05-13
updated: 2026-05-13
author: ZeroJuneK
priority: high
issue_number: 0
---

# SPEC-UX-010: 편집 모드 UX 개선 — Undo + Auto-Timeout + Empty Placeholder + Haptic (Priority High Bundle)

## HISTORY

| 버전 | 날짜 | 작성자 | 변경 내용 |
|------|------|--------|-----------|
| 1.0.0 | 2026-05-13 | ZeroJuneK | 최초 작성 (Undo + 자동 종료 타임아웃 + 빈 그룹 placeholder + 모바일 햅틱 피드백) |

## 개요

SPEC-UX-007(전역 편집 모드) + SPEC-UX-008(카테고리 간 링크 이동) 의 누적 결과로 Deskflow 의 편집 모드는 4개 레벨(위젯/그룹/그룹간링크/그룹내링크) 의 드래그를 지원한다. 그러나 다음 4개 회복성/안전성/접근성 결함이 확인되었다.

### 1. Undo 부재 (회복성 결함)

사용자가 실수로 카테고리 또는 링크를 잘못된 위치로 드래그했을 때 직전 상태로 복원할 방법이 없다. grep 결과(`src/renderer/components/WidgetLayout/WidgetLayout.tsx:197-264` `handleDragEnd` 부분) `updateBookmark`, `moveLinkBetweenGroups`, `reorderCategories` 의 호출 직후 영속화(`storage.set`) 가 즉시 이루어지며 히스토리 보존 메커니즘 부재. `useBookmarkStore` 와 `useLayoutStore` 모두 prev state 스냅샷을 가지지 않는다.

사용자 보고: "잘못 드래그해서 카테고리 순서가 엉켰는데 되돌릴 방법이 없음 — Cmd+Z 가 동작했으면 좋겠다."

### 2. 자동 종료 타임아웃 부재 (안전성 결함)

사용자가 편집 모드를 ON 하고 다른 작업으로 전환하면 편집 모드가 계속 활성 상태로 남는다. 이 동안 의도하지 않은 클릭이 드래그로 인식되거나(레벨 A/B/C 핸들이 활성), 사용자가 편집 모드인 것을 잊고 일반 동작(링크 클릭) 을 시도하면 새 탭이 열리지 않아 혼란을 야기한다.

현재 grep(`editModeStore.ts`) 결과 자동 종료 메커니즘 없음. 종료는 헤더 토글 버튼 또는 Esc 키 수동 조작에만 의존.

### 3. 빈 그룹 placeholder 부재 (UX 결함)

SPEC-UX-008 REQ-UX-008-003 에서 빈 카테고리의 droppable 영역을 `min-height: 48px` 로 확보했지만, 시각적으로 "여기에 드롭하라" 는 안내 텍스트가 없다. 현재 `BookmarkCard.tsx:140-165` 의 링크 grid 는 링크 0개 시 단순 빈 영역으로 표시. 사용자가 카테고리 간 이동을 시도할 때 빈 카테고리를 drop target 으로 인식하기 어렵다.

### 4. 모바일 햅틱 피드백 부재 (접근성 결함)

모바일 long-press(SPEC-UX-006 250ms) 로 드래그가 시작되어도 사용자가 "드래그가 시작되었다" 는 신호를 인지하기 어렵다. 시각 신호(opacity 0.5 — `BookmarkCard.tsx:46`, `SortableLink.tsx:44`) 만으로는 작은 화면에서 부족.

본 SPEC 은 4개 결함을 하나의 Priority High 묶음으로 해결한다.

**분류**: SPEC (구현 대상 기능)
**성격**: Brownfield — `editModeStore.ts` / `bookmarkStore.ts` / `layoutStore.ts` 수정 + `historyStore.ts` 신규 + `BookmarkCard.tsx` / `WidgetLayout.tsx` / `SortableLink.tsx` 수정 + Toast UI 신규(또는 기존 ProgressToast 패턴 재사용)
**선행 SPEC**: SPEC-UX-006 (반응형 + 북마크 링크 정렬), SPEC-UX-007 (전역 편집 모드 + 카테고리 정렬), SPEC-UX-008 (카테고리 간 링크 이동 + 단일 DndContext)
**병행 가능 SPEC**: SPEC-UX-009 (드래그 핸들 시각 분리) — 본 SPEC 과 독립 영역
**범위**: `viewMode === 'widgets'` 의 편집 모드 관련 모든 드래그/정렬 동작. PivotLayout 적용 제외(Exclusions 참고).

## 요구사항

### 영역 1: Undo (Cmd/Ctrl + Z)

#### REQ-UX-010-001: 편집 히스토리 store 신규

**[Ubiquitous]** 시스템은 **항상** zustand 기반의 `editHistoryStore` 를 보유해야 하며, 다음 형상을 만족해야 한다.

```typescript
type HistorySnapshot =
  | { type: 'bookmarks'; bookmarks: Category[] }
  | { type: 'layout'; layout: WidgetLayoutItem[] }
  | { type: 'composite'; bookmarks: Category[]; layout: WidgetLayoutItem[] }

interface EditHistoryState {
  /** 최근 N개의 직전 상태 스냅샷 (LIFO 스택, 최대 10) */
  past: HistorySnapshot[]
  /** undo 후 재실행 가능한 redo 스택 (LIFO, 최대 10) */
  future: HistorySnapshot[]
  /** 새 변경 발생 시 직전 상태를 past에 push */
  push: (snapshot: HistorySnapshot) => void
  /** past 의 마지막 스냅샷을 꺼내 적용 — future 에 현재 상태 push */
  undo: () => HistorySnapshot | null
  /** future 의 마지막 스냅샷을 꺼내 적용 — past 에 현재 상태 push */
  redo: () => HistorySnapshot | null
  /** past/future 모두 비움 (편집 모드 종료 시 등) */
  clear: () => void
}
```

해당 store 는 영속화하지 않는다(세션 단위 휘발성). 본 SPEC 1차 구현에서 redo 는 internal API 만 제공 (UI 노출은 본 SPEC 범위 외 — Exclusions 참고).

#### REQ-UX-010-002: 히스토리 최소 깊이

**[Ubiquitous]** `editHistoryStore.past` 는 **항상** 최소 10개의 스냅샷을 보유할 수 있어야 한다. 11번째 push 발생 시 가장 오래된 스냅샷을 제거한다(FIFO 만료).

#### REQ-UX-010-003: 변경 발생 시 자동 push

**[Event-Driven]** **When** 다음 액션 중 하나가 호출되면, 시스템은 호출 **직전** 의 상태를 `editHistoryStore.push()` 로 1회 저장해야 한다.

- `bookmarkStore.reorderCategories` (카테고리 순서 변경, SPEC-UX-007 REQ-UX-007-014)
- `bookmarkStore.updateBookmark` (같은 카테고리 내 링크 정렬, SPEC-UX-006)
- `bookmarkStore.moveLinkBetweenGroups` (카테고리 간 링크 이동, SPEC-UX-008 REQ-UX-008-008)
- `layoutStore.updateLayout` (위젯 RGL layout 변경)

스냅샷 type 분기:
- `bookmark*` 호출 → `{ type: 'bookmarks', bookmarks: prev }`
- `layoutStore.updateLayout` 호출 → `{ type: 'layout', layout: prev }`
- 향후 위젯과 북마크 동시 변경 패턴 등장 시 `composite` 사용 (1차 구현 범위 외)

#### REQ-UX-010-004: Cmd+Z (macOS) / Ctrl+Z (Windows/Linux) 단축키

**[Event-Driven]** **When** 편집 모드 ON 상태에서 사용자가 `Cmd+Z` (macOS) 또는 `Ctrl+Z` (Windows/Linux) 를 누르면, 시스템은 `editHistoryStore.undo()` 를 호출해 직전 상태를 복원해야 한다.

- macOS 감지: `event.metaKey === true && event.key === 'z' && !event.shiftKey`
- Windows/Linux 감지: `event.ctrlKey === true && event.key === 'z' && !event.shiftKey`
- Shift 동반(`Cmd+Shift+Z` / `Ctrl+Shift+Z`): 본 SPEC 1차 구현은 무시 (redo 단축키는 본 SPEC 범위 외)

복원 동작:
- `type === 'bookmarks'`: `useBookmarkStore.setState({ bookmarks: snapshot.bookmarks })` + `storage.set('hub-bookmarks', ...)` 1회
- `type === 'layout'`: `useLayoutStore.setState({ layout: snapshot.layout })` + 영속화 패턴 재사용
- `past` 가 empty 면 no-op (에러 없음)

#### REQ-UX-010-005: Undo 후 토스트 알림

**[Event-Driven]** **When** `editHistoryStore.undo()` 가 성공적으로 직전 상태를 복원하면, 시스템은 **항상** 우측 하단에 토스트를 3초간 표시해야 한다.

토스트 내용:
- 메시지: `"되돌리기 완료"` (한국어)
- "되돌리기" 버튼 노출 — 클릭 시 `editHistoryStore.redo()` 1회 호출 (사용자가 실수로 Cmd+Z 를 눌렀을 때 즉시 복구 가능)
- 자동 dismiss: 3초 후 또는 토스트 외부 click

토스트 구현은 기존 `ProgressToast` 패턴(`src/renderer/components/ProgressToast/`) 을 참고하되 별도 컴포넌트 `UndoToast` 로 신규.

#### REQ-UX-010-006: Undo 비활성 조건

**[Unwanted]** 편집 모드 OFF 상태에서는 `Cmd+Z` / `Ctrl+Z` 가 `editHistoryStore.undo()` 를 호출해서는 **안 된다**. 단축키 리스너는 `WidgetLayout` mount 동안만 활성이며, `isEditing === false` 일 때 keydown 이벤트는 무시한다.

이유: 편집 모드 종료 후 우연한 Cmd+Z 가 사용자의 다른 작업(예: 텍스트 편집) 을 방해해서는 안 됨.

### 영역 2: 자동 종료 타임아웃

#### REQ-UX-010-007: 30초 무동작 시 자동 종료

**[State-Driven]** **While** 편집 모드가 활성화되어 있는 동안(`isEditing === true`), 시스템은 사용자 조작 없이 **30초(30,000ms)** 가 경과하면 자동으로 `editModeStore.set(false)` 를 호출해 편집 모드를 종료해야 한다.

사용자 조작 정의(타이머 리셋 트리거):
- 헤더 토글 버튼 click (편집 모드 진입 시점 = 초기 타이머)
- 위젯 RGL drag start / drag end
- 카테고리 sortable drag start / drag end
- 링크 sortable drag start / drag end
- 편집 모드 ON 영역 내 mousedown / pointerdown / touchstart
- 키보드 이벤트(Tab, Space, Arrow, Enter — SPEC-UX-009 KeyboardSensor 와 호환)

판별 기준: 타이머는 `setTimeout(autoExitFn, 30_000)` 로 등록되며, 리셋 이벤트마다 `clearTimeout` + `setTimeout` 재등록. 편집 모드 OFF 전환 시 `clearTimeout` 으로 cleanup.

#### REQ-UX-010-008: 자동 종료 설정 키

**[Ubiquitous]** 시스템은 **항상** 자동 종료를 비활성화할 수 있는 설정 키를 제공해야 한다.

- store: `editModeStore` 에 `autoExitEnabled: boolean` (default: `true`) 추가
- 설정 UI: 별도 UI 도입은 본 SPEC 1차 구현 범위 외 — store API 만 노출
- 영속화: `editModeStore` 는 세션 휘발이지만 `autoExitEnabled` 만 `localStorage` 또는 `storage` 로 영속화 (key: `edit-mode-auto-exit`)

자동 종료 동작:
- `autoExitEnabled === false` 일 때 30초 타이머 등록되지 않음
- 사용자가 영구적으로 자동 종료를 비활성화할 수 있는 escape hatch 제공

#### REQ-UX-010-009: 자동 종료 직전 시각 경고

**[Event-Driven]** **When** 자동 종료까지 5초가 남은 시점(타이머 시작 후 25초 경과), 시스템은 토스트를 표시해 사용자에게 경고해야 한다.

토스트 내용:
- 메시지: `"5초 후 편집 모드 자동 종료"` (한국어)
- "유지" 버튼 노출 — 클릭 시 타이머 리셋(즉, 추가 30초)
- 자동 dismiss: 5초 후 또는 사용자 조작 발생 시(다른 사용자 동작으로 타이머가 리셋되면 토스트 함께 dismiss)

토스트 구현은 `UndoToast` 와 별개 컴포넌트 `AutoExitWarningToast` 또는 공통 `EditModeToast` 컴포넌트(공통 props 분기).

### 영역 3: 빈 그룹 placeholder

#### REQ-UX-010-010: 빈 카테고리 placeholder 안내

**[State-Driven]** **While** 편집 모드 ON 상태에서 카테고리의 `category.links.length === 0` 인 경우, BookmarkCard 의 link grid 영역(`BookmarkCard.tsx:140-165`) 은 **항상** placeholder 안내를 표시해야 한다.

placeholder 내용:
- 텍스트: `"여기로 드래그하여 추가"` (한국어)
- 시각: 점선 테두리(`outline: 1px dashed var(--text-faint)`) + 텍스트 가운데 정렬 + `--text-muted` 색
- 최소 높이: 48px (SPEC-UX-008 REQ-UX-008-003 보존)

판별 기준: 편집 모드 OFF 일 때 빈 카테고리는 본 placeholder 를 표시하지 않으며, BookmarkCard 의 link grid 는 기존대로 빈 영역으로 렌더(또는 REQ-UX-010-011 의 hideEmpty 옵션 적용).

#### REQ-UX-010-011: 빈 그룹 hideEmpty 옵션

**[Optional]** **Where** 사용자가 빈 카테고리 자체를 숨기길 원하는 환경에서는, `editModeStore` 또는 `bookmarkStore` 에 `hideEmptyCategories: boolean` (default: `false`) 옵션을 제공해야 한다.

- `hideEmptyCategories === true` AND 편집 모드 OFF: 빈 카테고리 카드 자체 렌더 스킵 (`displayBookmarks.filter(c => c.links.length > 0)`)
- `hideEmptyCategories === true` AND 편집 모드 ON: REQ-UX-010-010 의 placeholder 와 함께 카드 표시 (편집 중에는 drop target 으로 인식 가능해야 함)
- `hideEmptyCategories === false`: 항상 빈 카테고리 카드 표시 (기존 동작)

영속화: `hideEmptyCategories` 는 `localStorage` 또는 `storage` 로 영속화 (key: `hide-empty-categories`)

설정 UI: 별도 UI 도입은 본 SPEC 1차 구현 범위 외 — store API 만 노출

#### REQ-UX-010-012: Placeholder 와 isOver hover 시각 우선순위

**[State-Driven]** **While** 편집 모드 ON 상태에서 빈 카테고리 placeholder 가 표시되고 사용자가 다른 카테고리의 링크를 해당 카테고리 위로 드래그할 때(SPEC-UX-008 `isOver === true`), 시스템은 placeholder 텍스트를 숨기고 SPEC-UX-008 의 `--accent-subtle` 배경 시각을 우선 적용해야 한다.

판별 기준: `isOver && isEditing` 이면 placeholder text 의 `opacity === 0`, 그 외에는 placeholder text 의 `opacity === 1`.

### 영역 4: 모바일 햅틱 피드백

#### REQ-UX-010-013: 드래그 시작 시 vibrate 호출

**[Event-Driven]** **When** 다음 드래그가 시작되면, 시스템은 `navigator.vibrate(10)` 을 1회 호출해야 한다.

- 카테고리 sortable drag start (`onDragStart` 내부, `active.data.current.type === 'category'`)
- 링크 sortable drag start (`onDragStart` 내부, `active.data.current.type === 'link'`)
- RGL 위젯 drag start (`onDragStart` callback in `ResponsiveGridLayout` props)

10ms 진동은 매우 짧고 미세한 햅틱 신호(WebAPIs 표준 권고 범위).

#### REQ-UX-010-014: 지원하지 않는 환경 graceful fallback

**[Unwanted]** 시스템은 `navigator.vibrate` 가 정의되지 않은 환경(데스크탑 Safari, iOS Safari 등) 에서 **에러를 발생시켜서는 안 된다**.

판별 기준: `navigator.vibrate` 호출 전 다음 가드 체크 필수.

```typescript
function tryHaptic(durationMs: number = 10): void {
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    try {
      navigator.vibrate(durationMs)
    } catch {
      // 무시
    }
  }
}
```

#### REQ-UX-010-015: prefers-reduced-motion 환경 시 vibrate 비활성

**[State-Driven]** **While** 사용자 OS 의 `prefers-reduced-motion: reduce` 설정이 활성화된 환경에서는, 시스템은 `navigator.vibrate` 를 호출해서는 안 된다.

판별 기준: `tryHaptic` 호출 전 `window.matchMedia('(prefers-reduced-motion: reduce)').matches === true` 시 early return.

이유: WCAG 2.3.3 Animation from Interactions — 사용자가 모션 감소를 선택한 경우 햅틱도 motion 의 한 종류로 분류 (보수적 해석).

### 영역 5: 회귀 방지 / 공통

#### REQ-UX-010-016: 회귀 0 — SPEC-UX-006/007/008 acceptance 보존

**[Unwanted]** 본 SPEC 구현 후 다음 기존 SPEC 들의 acceptance 시나리오에 회귀가 발생해서는 안 된다.

- SPEC-UX-006 (AC-008/010/011 — 링크 정렬 + 영속화 + long-press 250ms)
- SPEC-UX-007 (AC-005/006/008/011/012 — 편집 모드 토글, Esc 종료, 위젯 드래그 핸들, 카테고리 정렬)
- SPEC-UX-008 (AC-* — 카테고리 간 링크 이동, 단일 DndContext, DragOverlay)
- (병행 시) SPEC-UX-009 — 핸들 시각 토큰 분리

#### REQ-UX-010-017: 외부 의존성 무증가

**[Ubiquitous]** 본 SPEC 구현 과정에서 **항상** 신규 npm 패키지를 추가해서는 안 된다.

검증:
- `zustand` 이미 설치 — `editHistoryStore` 즉시 작성 가능
- 토스트 UI 는 기존 `ProgressToast` 패턴 재사용 — 별도 라이브러리 불필요
- `navigator.vibrate` 는 Web Vibration API (브라우저 표준) — 의존성 없음

#### REQ-UX-010-018: 빌드/린트/타입 통과

**[Ubiquitous]** 본 SPEC 구현 후 다음 명령이 **항상** 성공해야 한다.

- `npm run build`
- `npm run lint` (ESLint 오류 0)
- `npm run typecheck` (TypeScript 오류 0)

#### REQ-UX-010-019: 편집 모드 OFF 시 히스토리 clear

**[Event-Driven]** **When** 편집 모드가 OFF 로 전환되면(`editModeStore.set(false)` 호출 직후), 시스템은 `editHistoryStore.clear()` 를 호출해 past / future 스택을 비워야 한다.

이유:
1. 메모리 누수 방지 (사용자가 며칠 동안 편집 모드를 켜둔 채 떠나는 경우)
2. 편집 세션 단위로 undo 가능 (다른 세션의 변경을 실수로 undo 하지 않음)
3. 사용자가 편집을 완료(완료 버튼 클릭) 한 후의 변경은 영속화로 확정 — 그 이전 상태는 더 이상 "직전 상태" 가 아님

## 비기능 요구사항

### NFR-001: 회귀 방지

기존 SPEC-UX-006 / SPEC-UX-007 / SPEC-UX-008 단위 + 통합 테스트 100% 통과.

### NFR-002: TDD 준수

`quality.yaml` `development_mode: tdd` 에 따라 RED → GREEN → REFACTOR 순으로 진행. 각 REQ 의 GREEN 단계 진입 전 실패 테스트 선작성.

### NFR-003: 외부 의존성 무증가

신규 npm 패키지 추가 금지 (REQ-UX-010-017).

### NFR-004: 메모리 안전성

히스토리 스택은 최대 10개로 제한 (REQ-UX-010-002). 각 스냅샷은 deep clone 으로 immutable 보장. 편집 모드 OFF 시 clear (REQ-UX-010-019).

### NFR-005: 모바일 호환

- `navigator.vibrate` 미지원 환경에서 에러 없음 (REQ-UX-010-014)
- `prefers-reduced-motion` 존중 (REQ-UX-010-015)
- 토스트는 모바일 viewport 에서도 가독성 보장 (font-size 14px+, 최소 hit-area 44px)

### NFR-006: e2e 검증

Playwright e2e 로 다음 시나리오 검증:
1. Undo: 카테고리 reorder → Cmd+Z → 직전 상태 복원 + 토스트 노출
2. Undo: 링크 reorder (같은 카테고리) → Cmd+Z → 복원
3. Undo: 링크 cross-category 이동 → Cmd+Z → 복원
4. Undo: 위젯 layout 변경 → Cmd+Z → 복원
5. Auto-exit: 편집 모드 ON 후 30초 무동작 → 자동 OFF
6. Auto-exit: 25초 시점 경고 토스트 → "유지" 클릭 → 타이머 리셋
7. Empty placeholder: 빈 카테고리 → 편집 모드 ON → "여기로 드래그하여 추가" 텍스트 표시
8. Empty placeholder + isOver: 빈 카테고리 위로 링크 드래그 → 텍스트 사라짐 + 배경 색 변경

## 제약사항

- React 19 / TypeScript strict / Zustand 5 유지
- 한국어 코드 주석 (per `.moai/config/sections/language.yaml` `code_comments: ko`)
- 신규 파일 첫 줄은 한국어 한 줄 헤더 주석
- 신규 외부 의존성 추가 금지 (NFR-003)
- TDD 모드 준수 (NFR-002)
- "Surgical Changes" 원칙 — SPEC 외 리팩토링 금지
- 백엔드/Firestore 스키마 변경 금지
- 단일 편집 토글, 단일 DndContext 보존 (SPEC-UX-007/008 invariant 유지)
- redo UI 도입은 본 SPEC 범위 외 (Exclusions)

## 데이터 스키마

### editHistoryStore 형상

```typescript
// src/renderer/stores/editHistoryStore.ts (신규)
type HistorySnapshot =
  | { type: 'bookmarks'; bookmarks: Category[] }
  | { type: 'layout'; layout: WidgetLayoutItem[] }
  | { type: 'composite'; bookmarks: Category[]; layout: WidgetLayoutItem[] }

interface EditHistoryState {
  past: HistorySnapshot[]
  future: HistorySnapshot[]
  push: (snapshot: HistorySnapshot) => void
  undo: () => HistorySnapshot | null
  redo: () => HistorySnapshot | null
  clear: () => void
}

export const useEditHistoryStore = create<EditHistoryState>((set, get) => ({
  past: [],
  future: [],

  push: (snapshot) => {
    const next = [...get().past, snapshot]
    if (next.length > 10) next.shift()  // FIFO 만료
    set({ past: next, future: [] })  // 새 변경은 redo 가능성 무효화
  },

  undo: () => {
    const { past, future } = get()
    if (past.length === 0) return null
    const snapshot = past[past.length - 1]
    set({ past: past.slice(0, -1), future: [...future, snapshot] })
    return snapshot
  },

  redo: () => {
    const { past, future } = get()
    if (future.length === 0) return null
    const snapshot = future[future.length - 1]
    set({ future: future.slice(0, -1), past: [...past, snapshot] })
    return snapshot
  },

  clear: () => set({ past: [], future: [] }),
}))
```

### editModeStore 확장 (autoExit 옵션)

```typescript
// src/renderer/stores/editModeStore.ts (수정)
interface EditModeState {
  isEditing: boolean
  /** 자동 종료 활성 여부 (default: true, 영속화) */
  autoExitEnabled: boolean
  toggle: () => void
  set: (value: boolean) => void
  setAutoExitEnabled: (enabled: boolean) => void
}
```

### 빈 그룹 placeholder DOM 구조

```jsx
{/* BookmarkCard.tsx link grid 내부 */}
{category.links.length === 0 && isEditing && (
  <div
    data-empty-placeholder
    style={{
      gridColumn: '1 / -1',
      padding: '16px',
      textAlign: 'center',
      outline: '1px dashed var(--text-faint)',
      borderRadius: 8,
      color: 'var(--text-muted)',
      fontSize: 13,
      opacity: isOver && isEditing ? 0 : 1,
      transition: 'opacity .15s',
    }}
  >
    여기로 드래그하여 추가
  </div>
)}
```

### Undo 단축키 리스너 (WidgetLayout)

```typescript
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (!isEditing) return
    const isMac = navigator.platform.toUpperCase().includes('MAC')
    const isUndoKey = isMac ? e.metaKey : e.ctrlKey
    if (isUndoKey && e.key === 'z' && !e.shiftKey) {
      e.preventDefault()
      const snapshot = useEditHistoryStore.getState().undo()
      if (snapshot) applySnapshot(snapshot)
      showUndoToast()
    }
  }
  window.addEventListener('keydown', handleKeyDown)
  return () => window.removeEventListener('keydown', handleKeyDown)
}, [isEditing])
```

### 햅틱 유틸리티

```typescript
// src/renderer/utils/haptic.ts (신규)
export function tryHaptic(durationMs: number = 10): void {
  if (typeof window === 'undefined') return
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
  if (typeof navigator === 'undefined') return
  if (typeof navigator.vibrate !== 'function') return
  try {
    navigator.vibrate(durationMs)
  } catch {
    // 무시
  }
}
```

## Exclusions (What NOT to Build)

- **Cmd+Shift+Z (redo) 단축키 UI**: `editHistoryStore.redo()` API 는 제공하지만 단축키/UI 노출은 본 SPEC 범위 외. 토스트의 "되돌리기" 버튼은 일회성 redo 만 지원
- **편집 모드 외 영역의 undo**: 본 SPEC 의 Undo 는 편집 모드 ON 시에만 활성. 일반 텍스트 편집(검색바 등) undo 는 브라우저 기본 동작 유지
- **자동 종료 타임아웃 값 사용자 설정 UI**: 30초 고정. 사용자 조정 가능 UI 는 별도 SPEC
- **자동 종료 시점에 변경 사항 알림 모달**: 자동 종료는 silent (variants: 25초 경고 토스트 외 추가 알림 없음)
- **빈 그룹 자체 삭제 기능**: 본 SPEC 의 `hideEmptyCategories` 는 시각 숨김만. 카테고리 자체 삭제는 SPEC-UX-007 의 EditModal 흐름 유지
- **모바일 햅틱 강도/지속시간 사용자 설정**: 10ms 고정. 사용자 정의는 별도 SPEC
- **Undo 히스토리 영속화 (세션 간 복원)**: `editHistoryStore` 는 세션 휘발. 다음 세션에서 이전 세션의 undo 불가
- **위젯과 북마크의 composite 변경**: `composite` snapshot type 은 schema 만 정의, 1차 구현은 사용하지 않음(향후 SPEC 후보)
- **PivotLayout 영향**: 본 SPEC 은 `viewMode === 'widgets'` 한정
- **Firestore 동기화 메커니즘 변경**: 기존 `storage.set` 로직 그대로 사용

## 추적성 (Traceability)

| REQ | 관련 파일 (현재 grep 검증) | 변경 영역 |
|-----|---------------------------|----------|
| REQ-UX-010-001 ~ 003 | `src/renderer/stores/editHistoryStore.ts` (신규) | 히스토리 store |
| REQ-UX-010-003 | `src/renderer/stores/bookmarkStore.ts:128, 152, 254, 270` | `addBookmark` 전, `updateBookmark` 전, `reorderCategories` 전, `moveLinkBetweenGroups` 전 snapshot push |
| REQ-UX-010-003 | `src/renderer/stores/layoutStore.ts` | `updateLayout` 전 snapshot push |
| REQ-UX-010-004 | `src/renderer/components/WidgetLayout/WidgetLayout.tsx:322-331` 부근 | keydown 리스너 확장 (Esc + Cmd/Ctrl+Z) |
| REQ-UX-010-005 | `src/renderer/components/UndoToast/UndoToast.tsx` (신규) | 토스트 UI |
| REQ-UX-010-006 | `src/renderer/components/WidgetLayout/WidgetLayout.tsx:322-331` | `isEditing` 가드 |
| REQ-UX-010-007 ~ 008 | `src/renderer/components/WidgetLayout/WidgetLayout.tsx` (신규 useEffect) | 30초 타이머 + autoExitEnabled 가드 |
| REQ-UX-010-008 | `src/renderer/stores/editModeStore.ts:19-25` | `autoExitEnabled` 필드 추가 + 영속화 |
| REQ-UX-010-009 | `src/renderer/components/AutoExitWarningToast/AutoExitWarningToast.tsx` (신규) | 25초 경고 토스트 |
| REQ-UX-010-010 | `src/renderer/components/BookmarkCard/BookmarkCard.tsx:140-165` | 빈 카테고리 placeholder JSX 추가 |
| REQ-UX-010-011 | `src/renderer/stores/editModeStore.ts` 또는 `bookmarkStore.ts` | `hideEmptyCategories` 필드 + 영속화 |
| REQ-UX-010-012 | `src/renderer/components/BookmarkCard/BookmarkCard.tsx:140-165` | `isOver` 와 placeholder opacity 분기 |
| REQ-UX-010-013 ~ 015 | `src/renderer/utils/haptic.ts` (신규) | 햅틱 유틸리티 |
| REQ-UX-010-013 | `src/renderer/components/WidgetLayout/WidgetLayout.tsx:128, 293` (handleDragStart, onDragStart) | drag start 시 `tryHaptic(10)` 호출 |
| REQ-UX-010-016 | 전 영역 회귀 테스트 | acceptance 보존 |
| REQ-UX-010-019 | `src/renderer/components/WidgetLayout/WidgetLayout.tsx:315-320` | `isEditing === false` 전환 시 `editHistoryStore.clear()` 호출 |
