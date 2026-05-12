---
id: SPEC-UX-007
version: 1.0.0
status: completed
created: 2026-05-12
updated: 2026-05-12
author: ZeroJuneK
priority: high
issue_number: 0
---

# SPEC-UX-007: Global Edit Mode (iOS Wiggle Mode 패턴)

## HISTORY

| 버전 | 날짜 | 작성자 | 변경 내용 |
|------|------|--------|-----------|
| 1.0.0 | 2026-05-12 | ZeroJuneK | 최초 작성 (전역 편집 모드 + 위젯 드래그 핸들 일관화 + 북마크 카테고리 순서 변경) |

## 개요

Deskflow는 SPEC-LAYOUT-001 + SPEC-UI-001 + SPEC-UX-005/006의 누적 결과로 위젯 모드(`viewMode === 'widgets'`)에서 react-grid-layout(이하 RGL) 기반의 드래그·리사이즈 가능한 위젯 그리드를 제공한다. 그러나 사용자 보고로 다음 3개의 회귀/UX 결함이 확인되었다.

1. **드래그 핸들 누락 회귀**: 현재 `.widget-drag-handle` 클래스를 가진 위젯은 `PomodoroWidget`(전체 카드)과 `FeedWidget`(헤더 내부) 2개뿐이며, `TodoWidget` / `NotesWidget` / `WeatherWidget` / `Clock` / `BookmarkCard` 카드 영역은 드래그 핸들이 없어 위치 이동이 불가능하다 (grep 검증 완료: `src/renderer/styles/globals.css:80`, `src/renderer/components/PomodoroWidget/PomodoroWidget.tsx:74`, `src/renderer/components/FeedWidget/FeedWidget.tsx:66`, `src/renderer/components/WidgetLayout/WidgetLayout.tsx:445`).
2. **상시 드래그 가능 상태**: 위젯이 평소에도 드래그 가능한 상태이므로 일반 클릭/탭(북마크 진입, 할 일 토글 등)과 위젯 이동이 혼동된다. 특히 모바일에서 의도하지 않은 이동이 빈번하게 발생한다.
3. **북마크 카테고리 순서 고정**: SPEC-UX-006으로 같은 카테고리 내부 링크 정렬은 지원되었으나, 카테고리(`BookmarkCard`) 자체의 grid 내부 순서는 변경 불가능하다. `bookmarkStore` 에 카테고리 순서를 갱신하는 API도 존재하지 않는다 (grep 검증 완료: `src/renderer/stores/bookmarkStore.ts` 1~265 — `reorderCategories` 등 카테고리 reorder 메서드 없음).

본 SPEC은 iOS 홈 스크린 "wiggle mode" 패턴을 채용해 위 3가지 결함을 한꺼번에 해결한다.

- 헤더에 **전역 "편집" 토글 버튼**을 추가하고 zustand 기반 `editModeStore` 로 상태를 관리한다.
- 평소에는 위젯 클릭/탭이 본래 액션이며 드래그·리사이즈는 비활성, 편집 모드 ON일 때만 활성화한다.
- 편집 모드에서 모든 위젯에 dashed outline 시각 신호를 부여한다(과도한 wiggle 애니메이션은 본 SPEC에서 도입하지 않음 — Exclusions 참고).
- 편집 모드에서 북마크 카테고리(`BookmarkCard`) 자체도 dnd-kit 으로 순서 변경이 가능하다.
- `BookmarkCard` 로컬 `isEditing` 상태를 제거하고 전역 `useEditMode()` 로 통일한다.

**분류**: SPEC (구현 대상 기능)
**성격**: Brownfield -- WidgetLayout.tsx / BookmarkCard.tsx / HeaderMoreMenu.tsx / globals.css / bookmarkStore.ts 수정 + editModeStore.ts 신규
**선행 SPEC**: SPEC-LAYOUT-001 (위젯 그리드), SPEC-UI-001 (시각 토큰), SPEC-UX-005 (viewMode 분기), SPEC-UX-006 (모바일 반응형 + 북마크 링크 정렬)

## 요구사항

### REQ-UX-007-001: 전역 편집 모드 store 존재

**[Ubiquitous]** 시스템은 **항상** zustand 기반의 `editModeStore` 를 보유해야 하며, 다음 형상을 만족해야 한다.

```typescript
interface EditModeState {
  isEditing: boolean
  toggle: () => void
  set: (value: boolean) => void
}
```

해당 store 는 영속화하지 않는다(세션 단위 휘발성).

### REQ-UX-007-002: 헤더 토글 버튼 (데스크탑)

**[Ubiquitous]** `WidgetLayout` 헤더는 데스크탑 모드(`isMobile === false`)에서 **항상** 편집 모드 토글 버튼을 노출해야 한다. 버튼은 `lucide-react` 의 `Pencil` 아이콘(편집 모드 OFF) 또는 `Check` 아이콘(편집 모드 ON)을 사용한다. 라벨 텍스트는 OFF일 때 "편집", ON일 때 "완료" 로 표시한다.

### REQ-UX-007-003: 헤더 토글 버튼 (모바일 More 메뉴)

**[Ubiquitous]** `WidgetLayout` 의 모바일 모드(`isMobile === true`)에서는 `HeaderMoreMenu` 메뉴 항목에 **항상** "편집" / "완료" 토글 항목이 포함되어야 한다. 직접 노출 버튼(빠른 추가, 테마 토글)에는 포함하지 않는다.

### REQ-UX-007-004: 편집 모드 ON 시 드래그·리사이즈 활성

**[State-Driven]** **While** 편집 모드가 활성화되어 있는 동안(`useEditMode().isEditing === true`), `ResponsiveGridLayout` 의 `isDraggable` 및 `isResizable` 는 다음 결합 조건에 따라 결정되어야 한다.

- `isDraggable = isEditing && !isMobile && !isMobileBreakpoint`
- `isResizable = isEditing && !isMobile && !isMobileBreakpoint`

### REQ-UX-007-005: 편집 모드 OFF 시 드래그·리사이즈 비활성

**[State-Driven]** **While** 편집 모드가 비활성화되어 있는 동안(`isEditing === false`), `isDraggable === false` 및 `isResizable === false` 이어야 하며, 위젯 헤더 mousedown 으로 위치/크기 변경이 발생하지 않아야 한다.

### REQ-UX-007-006: 편집 모드 토글 이벤트

**[Event-Driven]** **When** 사용자가 헤더의 편집 토글 버튼(데스크탑) 또는 모바일 More 메뉴의 "편집" 항목을 클릭하면, 시스템은 `editModeStore.toggle()` 을 호출해 `isEditing` 값을 반전시켜야 한다.

### REQ-UX-007-007: Esc 키로 편집 모드 종료

**[Event-Driven]** **When** 편집 모드가 활성화된 상태에서 사용자가 Esc 키를 누르면, 시스템은 즉시 `editModeStore.set(false)` 를 호출해 편집 모드를 종료해야 한다.

이 동작은 `WidgetLayout` mount 동안에만 활성이며, unmount 시 keydown 리스너는 cleanup 된다.

### REQ-UX-007-008: 편집 모드 시각 신호

**[State-Driven]** **While** 편집 모드가 활성화되어 있는 동안, 모든 위젯 래퍼(`.react-grid-item`) 는 다음 시각 신호를 가져야 한다.

- `outline: 2px dashed var(--accent)` (또는 동등한 dashed border 효과)
- `outline-offset: 4px`

전역 효과는 `body.is-edit-mode` 클래스로 토글한다. 편집 모드 OFF 시 outline 은 제거된다.

### REQ-UX-007-009: prefers-reduced-motion 존중

**[Optional]** **Where** 사용자가 OS 설정에서 `prefers-reduced-motion: reduce` 를 활성화한 환경에서는, 시각 신호가 부드러운 transition 없이 즉시 적용/해제되어야 한다. 향후 wiggle 애니메이션이 추가될 때 해당 환경에서는 애니메이션이 비활성된다(본 SPEC 1차 구현에서는 wiggle 애니메이션을 도입하지 않으므로 dashed outline만 적용한다).

### REQ-UX-007-010: 위젯 드래그 핸들 통일

**[Ubiquitous]** 위젯 모드의 모든 위젯 카드는 **항상** RGL `draggableHandle=".widget-drag-handle"` 셀렉터와 일치하는 영역을 가져야 한다. 누락 위젯에 해당 클래스를 부여하는 방법은 plan.md "파일 변경 맵" 에 명시한다.

대상 위젯(현재 누락):
- `TodoWidget`
- `NotesWidget`
- `WeatherWidget`
- `Clock`
- `BookmarkCard` (카테고리 카드)
- `SearchBar` 위젯 래퍼

이미 적용된 위젯:
- `PomodoroWidget` (전체 카드)
- `FeedWidget` (헤더)

### REQ-UX-007-011: BookmarkCard grid 카테고리 순서 변경

**[Ubiquitous]** `WidgetLayout.tsx` 의 BookmarkCard grid (현재 line 474-491 부근) 는 **항상** `@dnd-kit/core` 의 `DndContext` 및 `@dnd-kit/sortable` 의 `SortableContext` 로 래핑되어야 한다.

### REQ-UX-007-012: BookmarkCard 카테고리 정렬 활성 조건

**[State-Driven]** **While** 전역 편집 모드가 활성화되어 있는 동안에만, BookmarkCard 카테고리 자체의 드래그 정렬이 가능해야 한다. 편집 모드 OFF 일 때 카테고리 정렬은 비활성이며, BookmarkCard 의 onClick(편집 모달 열기 등) 기존 동작이 보존된다.

### REQ-UX-007-013: 카테고리 순서 영속화

**[Event-Driven]** **When** 사용자가 BookmarkCard 카테고리의 순서를 변경하고 드래그가 종료되면, 시스템은 `bookmarkStore` 의 `reorderCategories(orderedIds: string[])` 액션을 1회 호출해 `bookmarks` 배열의 순서를 변경된 순서로 갱신해야 한다.

영속화는 기존 `bookmarkStore` 의 `storage.set('hub-bookmarks', ...)` 패턴을 그대로 재사용한다(별도 동기화 메커니즘 추가 금지).

### REQ-UX-007-014: bookmarkStore.reorderCategories API

**[Ubiquitous]** `bookmarkStore` 는 **항상** 다음 시그니처의 액션을 보유해야 한다.

```typescript
reorderCategories: (orderedIds: string[]) => void
```

이 액션은:
- `orderedIds` 순서대로 `bookmarks` 배열을 재정렬한다
- `orderedIds` 에 포함되지 않은 기존 카테고리는 변경 없이 끝에 유지된다(idempotent 안전망)
- 기존 `storage.set('hub-bookmarks', ...)` 영속화 흐름을 그대로 사용한다

### REQ-UX-007-015: BookmarkCard 전역 편집 모드 통합

**[Ubiquitous]** `BookmarkCard` 의 로컬 `isEditing: useState` 상태는 **항상** 제거되어야 하며, 대신 `useEditMode()` 훅의 `isEditing` 값을 직접 사용해야 한다.

기존 BookmarkCard 의 `⚙️` 버튼(`data-testid="bookmark-edit-btn"`):
- 의미 변경: "카드별 편집 모드 토글" → "카테고리 메타데이터 편집(이름/아이콘/색)"
- onClick 동작: 기존 `onEdit(category)` props 호출만 유지(카테고리 편집 모달 열기). 로컬 토글 동작 제거.
- 가시성: 편집 모드 ON 일 때만 노출(편집 모드 OFF 일 때는 hidden 또는 opacity 0). 모바일 hit-area 44×44px 유지.

### REQ-UX-007-016: BookmarkCard 카드 외부 클릭 cleanup 제거

**[Unwanted]** `BookmarkCard` 의 기존 "카드 외부 클릭 시 편집 모드 OFF" `useEffect` (현재 line 36-45) 는 본 SPEC 구현 후 **존재해서는 안 된다**. 편집 모드 종료는 전역 토글 버튼 또는 Esc 키 하나로 통일된다.

### REQ-UX-007-017: 데스크탑 모바일 뷰 모드 시 드래그 비활성 유지

**[Unwanted]** 사용자가 데스크탑 화면 너비에서 `useIsMobile` 훅으로 모바일 뷰 모드를 수동 활성화한 상태에서, 편집 모드를 ON 으로 전환하더라도 위젯 드래그는 **활성화되어서는 안 된다** (SPEC-UX-006 REQ-UX-006-002 / REQ-UX-006-016 결정 유지).

조건식: `isDraggable = isEditing && !isMobile && !isMobileBreakpoint`

### REQ-UX-007-018: 모바일 브레이크포인트(xs/xxs) 드래그 비활성 유지

**[Unwanted]** 화면 너비가 xs 또는 xxs 브레이크포인트에 있는 동안, 편집 모드 ON 이라도 `isDraggable === false`, `isResizable === false` 이어야 한다 (SPEC-UX-006 RGL long-press 미지원 한계 유지).

### REQ-UX-007-019: 회귀 0

**[Unwanted]** 본 SPEC 구현 후 다음 기존 SPEC 들의 acceptance 시나리오에 회귀가 발생해서는 안 된다.

- SPEC-LAYOUT-001
- SPEC-UI-001
- SPEC-UX-005
- SPEC-UX-006 (특히 AC-008 / AC-010 / AC-011 — 같은 카테고리 내부 링크 정렬은 본 SPEC 변경 후에도 동일하게 동작)

### REQ-UX-007-020: 편집 모드 OFF 기본값

**[Ubiquitous]** 앱 부팅 시 `editModeStore.isEditing` 의 기본값은 **항상** `false` 여야 한다(세션 단위 휘발).

## 비기능 요구사항

### NFR-001: 회귀 방지

기존 SPEC-LAYOUT-001 / SPEC-UI-001 / SPEC-UX-005 / SPEC-UX-006 / SPEC-MOBILE-RESPONSIVE-001 단위 테스트 100% 통과.

### NFR-002: 빌드/린트/타입

- `npm run build` 통과
- `npm run lint` ESLint 오류 0
- `npm run typecheck` TypeScript 오류 0

### NFR-003: 외부 의존성 무증가

본 SPEC 구현 과정에서 신규 npm 패키지를 추가하지 않는다. `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` (SPEC-UX-006), `lucide-react`, `zustand` 는 이미 설치되어 있음(grep 검증 완료: `package.json:35` `lucide-react ^1.11.0`).

### NFR-004: TDD 준수

`quality.yaml` `development_mode: tdd` 에 따라 RED → GREEN → REFACTOR 순으로 진행한다. 각 REQ 의 GREEN 단계 진입 전 실패하는 단위 테스트가 선작성되어야 한다.

## 제약사항

- React 19 / TypeScript strict / Zustand 5 유지
- 한국어 코드 주석 (per `.moai/config/sections/language.yaml` `code_comments: ko`)
- 신규 파일 첫 줄은 한국어 한 줄 헤더 주석 (per 글로벌 CLAUDE.md Rule 6)
- 신규 외부 의존성 추가 금지 (NFR-003)
- TDD 모드 준수 (NFR-004)
- "Surgical Changes" 원칙 — SPEC 외 리팩토링 금지
- 백엔드/Firestore 스키마 변경 금지

## 데이터 스키마

### editModeStore 형상

```typescript
// src/renderer/stores/editModeStore.ts
interface EditModeState {
  isEditing: boolean
  toggle: () => void
  set: (value: boolean) => void
}

export const useEditModeStore = create<EditModeState>((set) => ({
  isEditing: false,
  toggle: () => set((s) => ({ isEditing: !s.isEditing })),
  set: (value) => set({ isEditing: value }),
}))

// 편의 훅
export const useEditMode = () => useEditModeStore()
```

### bookmarkStore reorderCategories 의미론

입력: `orderedIds: string[]` — 변경된 카테고리 id 순서대로 정렬된 배열
출력: 다음 규칙에 따라 `bookmarks` 가 재정렬된다.

```
let next = orderedIds.map(id => find(bookmarks, b => b.id === id)).filter(exists)
let missing = bookmarks.filter(b => !orderedIds.includes(b.id))
bookmarks = [...next, ...missing]
```

미존재 id(`find` 가 undefined 반환)는 무시. `missing` 항목은 본래 순서대로 끝에 유지.

### body.is-edit-mode 클래스 토글

```typescript
useEffect(() => {
  if (isEditing) document.body.classList.add('is-edit-mode')
  else document.body.classList.remove('is-edit-mode')
  return () => document.body.classList.remove('is-edit-mode')
}, [isEditing])
```

## Exclusions (What NOT to Build)

- **Firebase 동기화에 editMode 상태 반영**: editMode 는 세션 휘발이며 사용자 간 / 디바이스 간 공유 불필요
- **항목 카테고리 간 이동**: 위젯 → 위젯 또는 카테고리 → 카테고리 간 항목 이동 (별도 SPEC 후보)
- **카테고리 신규 생성/삭제 UI 변경**: 기존 `handleAddCategory` / `EditModal` 흐름 유지
- **모바일 long-press 패턴 변경**: SPEC-UX-006 결정(xs/xxs 위젯 드래그 비활성, 북마크 링크 정렬만 long-press 250ms) 유지
- **위젯 자체 wiggle keyframe 애니메이션**: 1차 구현은 단순 dashed outline 으로 시작 — 향후 SPEC 후보
- **데스크탑 키보드 단축키 확장**: Esc 외 다른 단축키(편집 모드 진입 단축키, 위젯 선택 단축키 등) 추가 금지
- **`BookmarkCard` 의 `⚙️` 버튼 자체 제거**: 카드 헤더 버튼은 의미 변경(카테고리 메타 편집) 후에도 유지 — UI 완전 제거는 별도 의사결정 필요
- **PivotLayout(SPEC-UX-003) 영향 범위**: 본 SPEC 은 `viewMode === 'widgets'` 경로에만 적용
