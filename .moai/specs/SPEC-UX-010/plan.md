# SPEC-UX-010: 구현 계획

## 기술 접근 방식

본 SPEC 은 SPEC-UX-007/008 의 단일 편집 토글 + 단일 DndContext 구조를 **그대로 유지**하면서, 편집 모드의 4개 결함(Undo / 자동 종료 / 빈 그룹 placeholder / 모바일 햅틱) 을 한꺼번에 해결한다. 핵심 변화 6개 영역:

1. **신규 store: `editHistoryStore`**: 세션 휘발성 LIFO 히스토리 스택(past + future). 최대 10개 깊이, FIFO 만료. snapshot type 분기로 `bookmarks` / `layout` / `composite` 지원
2. **bookmarkStore + layoutStore push 통합**: 변경 액션 직전 prev state 를 `editHistoryStore.push()` 로 1회 저장. 단일 트랜잭션 보장
3. **WidgetLayout 키보드 단축키 확장**: 기존 Esc 리스너에 Cmd+Z / Ctrl+Z 분기 추가. `isEditing` 가드 필수
4. **자동 종료 타임아웃 useEffect**: 30초 타이머 + 25초 경고 토스트. 사용자 조작 이벤트로 타이머 리셋. `autoExitEnabled` 설정으로 비활성 가능
5. **BookmarkCard placeholder JSX**: 빈 카테고리 + 편집 모드 ON 조건 시 "여기로 드래그하여 추가" 텍스트 표시. `isOver` 시 opacity 분기
6. **햅틱 유틸리티 + drag start 호출**: `tryHaptic(10)` 호출을 `handleDragStart` (dnd-kit) 와 RGL `onDragStart` 에 삽입

### 핵심 결정 사항

**결정 D1 — 히스토리 store 의 push 위치 (REQ-UX-010-003)**

선택지:
- (a) store 액션 내부에서 push (예: `reorderCategories` 가 직접 `editHistoryStore.push` 호출)
- (b) WidgetLayout 의 핸들러(`handleDragEnd`) 에서 호출하기 전에 push
- (c) store 액션을 wrapping 하는 helper 함수로 push

**결정: (a) store 액션 내부에서 push**

**이유**:
1. **단일 진입점 보장**: `bookmarkStore.reorderCategories` 는 dnd-kit + 키보드(SPEC-UX-009 KeyboardSensor) 모두 호출 → store 내부에서 push 하면 호출 경로 무관 일관 동작
2. **테스트 용이성**: store 단위 테스트에서 push 동작을 직접 검증 가능
3. **순환 의존 회피**: `bookmarkStore` 가 `editHistoryStore` 를 import (단방향 의존)
4. **트랜잭션 보장**: snapshot 은 set 호출 **직전** 에 push → race condition 없음

**구현 패턴**:
```typescript
// bookmarkStore.ts
reorderCategories: (orderedIds) => {
  const prev = get().bookmarks  // 직전 상태 캡쳐
  useEditHistoryStore.getState().push({ type: 'bookmarks', bookmarks: prev })
  // ... 기존 reorder 로직 ...
}
```

**결정 D2 — autoExit 타이머 위치 (REQ-UX-010-007)**

선택지:
- (a) `WidgetLayout` 의 useEffect 에서 관리 (component lifecycle 의존)
- (b) `editModeStore` 내부에서 setTimeout 관리 (store 책임 확장)
- (c) 별도 hook (`useAutoExitTimer`)

**결정: (a) `WidgetLayout` useEffect**

**이유**:
1. **WidgetLayout 만이 편집 모드 영역**: PivotLayout 에서는 편집 모드 자체가 의미 없음 → mount 라이프사이클과 자연스럽게 결합
2. **이벤트 구독 단순**: 사용자 조작 이벤트(mousedown / pointerdown / touchstart / keydown) 를 WidgetLayout DOM 영역에 한정 가능
3. **cleanup 보장**: WidgetLayout unmount 시 `clearTimeout` 으로 cleanup → leak 방지
4. **store 의 순수성 보존**: zustand store 는 비동기 부수효과를 갖지 않는 것이 권장 패턴

**결정 D3 — 토스트 컴포넌트 통합 vs 분리**

선택지:
- (a) 단일 `EditModeToast` 컴포넌트 + props 로 variant 분기 (`undo` / `auto-exit-warning`)
- (b) 별개 컴포넌트 `UndoToast` 와 `AutoExitWarningToast`

**결정: (a) 단일 `EditModeToast` 컴포넌트 + variant props**

**이유**:
1. UI 패턴 일관성 (위치/사이즈/dismiss 패턴 동일)
2. 코드 중복 최소화
3. 향후 토스트 종류 확장 시 단일 진입점

**구현 패턴**:
```typescript
type ToastVariant = 'undo' | 'auto-exit-warning'

interface EditModeToastProps {
  variant: ToastVariant
  message: string
  actionLabel: string
  onAction: () => void
  /** auto dismiss ms (0 = no auto dismiss) */
  duration: number
}
```

기존 `ProgressToast` 패턴(`src/renderer/components/ProgressToast/ProgressToast.tsx:1-93`) 의 사이즈/positioning 토큰 재사용. 단, 본 SPEC 의 토스트는 우측 하단이 아닌 **bottom-center** (사용자 시선 + 모바일 가독성).

**결정 D4 — Undo 단축키의 이벤트 위임 위치**

`WidgetLayout.tsx:322-331` 의 기존 Esc 리스너는 `window.addEventListener('keydown', ...)`. Cmd+Z / Ctrl+Z 도 동일 패턴 사용.

**결정**: 기존 Esc 리스너 useEffect 를 확장하여 동일 handler 내부에서 Esc / Cmd+Z / Ctrl+Z 분기 처리. 별도 useEffect 신설 회피(불필요한 리스너 중복 방지).

**결정 D5 — `editHistoryStore` clear 시점 (REQ-UX-010-019)**

`editModeStore.isEditing` 이 `true → false` 로 전환되는 시점에 `editHistoryStore.clear()` 호출.

구현 위치: `WidgetLayout.tsx:315-320` 의 기존 `useEffect(() => { ..body.is-edit-mode 토글... }, [isEditing])` 내부에 clear 호출 추가. `isEditing === false` 일 때만 호출.

**결정 D6 — autoExitEnabled 영속화 방식 (REQ-UX-010-008)**

`editModeStore` 는 세션 휘발이지만 `autoExitEnabled` 만 영속화. zustand persist middleware 또는 store 액션 내부에서 `storage.set` 호출.

선택지:
- (a) zustand `persist` middleware 적용 (selector 로 `autoExitEnabled` 만 영속화)
- (b) `setAutoExitEnabled` 액션 내부에서 `localStorage.setItem` 직접 호출

**결정: (b) 직접 localStorage 호출**

**이유**:
1. `editModeStore` 의 다른 필드(`isEditing`) 는 세션 휘발이어야 함 — persist middleware 의 partialize 옵션 사용 가능하지만 복잡도 증가
2. 단순한 boolean 한 개의 영속화는 직접 호출이 더 명확
3. 기존 store 의 영속화 패턴(`bookmarkStore`, `layoutStore`) 과 일관 — `storage.set` 호출

**결정 D7 — `hideEmptyCategories` 영속화 위치 (REQ-UX-010-011)**

선택지:
- (a) `editModeStore` 에 추가 (편집 모드 관련 옵션이므로)
- (b) `bookmarkStore` 에 추가 (북마크 표시 옵션이므로)
- (c) 별도 `uiPreferencesStore` 신규

**결정: (a) `editModeStore` 에 추가**

**이유**:
1. 본 SPEC 의 UX 옵션은 모두 편집 모드와 관련 → 단일 store 로 통합
2. `bookmarkStore` 는 데이터 store 의미를 유지 (View 관심사 분리)
3. 별도 store 신규는 과한 추상화

## 마일스톤

### M1: editHistoryStore 신규 (Priority High)

- **T-001**: `editHistoryStore.ts` 신규
  - 파일: `src/renderer/stores/editHistoryStore.ts` (신규, 한국어 헤더 주석)
  - 인터페이스: `EditHistoryState { past, future, push, undo, redo, clear }`
  - 최대 깊이 10, FIFO 만료
  - 영속화 없음
- **T-002**: `editHistoryStore.test.ts` 단위 테스트
  - 파일: `src/renderer/stores/editHistoryStore.test.ts` (신규)
  - 케이스: 초기 빈 상태, push 1회/10회/11회(FIFO), undo (past 비어있을 때 null), undo (정상), redo 정상, clear, 새 push 시 future 비움 검증

### M2: bookmarkStore + layoutStore push 통합 (Priority High)

- **T-003**: `bookmarkStore.ts` 의 변경 액션에 snapshot push 추가
  - 파일: `src/renderer/stores/bookmarkStore.ts` (수정)
  - 위치: `reorderCategories` (line 254), `updateBookmark` (line 152), `moveLinkBetweenGroups` (line 270)
  - 패턴: 액션 함수 첫 줄에서 `const prev = get().bookmarks` + `useEditHistoryStore.getState().push({ type: 'bookmarks', bookmarks: prev })`
  - **import 추가**: `import { useEditHistoryStore } from './editHistoryStore'`
  - `addBookmark` / `removeBookmark` 도 동일 패턴 적용 여부 검토 (1차: 적용 안 함 — undo 대상은 정렬/이동만, 추가/삭제는 EditModal 명시 작업)
- **T-004**: `layoutStore.ts` 의 `updateLayout` 에 snapshot push 추가
  - 파일: `src/renderer/stores/layoutStore.ts` (수정)
  - 위치: `updateLayout` 액션
  - 패턴: `const prev = get().layout` + `useEditHistoryStore.getState().push({ type: 'layout', layout: prev })`
- **T-005**: 회귀 테스트 — SPEC-UX-007/008 통과 검증
  - 파일: `bookmarkStore.test.ts`, `layoutStore.test.ts` (수정)
  - 신규: 각 액션 호출 시 `editHistoryStore.past.length` 가 1 증가하는지 검증
  - 회귀: SPEC-UX-007 AC-014 (`reorderCategories` 정확성), SPEC-UX-008 AC-* (`moveLinkBetweenGroups` 정확성)

### M3: WidgetLayout 키보드 단축키 + autoExit 타이머 (Priority High)

- **T-006**: `WidgetLayout.tsx` Esc 리스너 useEffect 확장 — Cmd+Z / Ctrl+Z 추가
  - 파일: `src/renderer/components/WidgetLayout/WidgetLayout.tsx` (수정, 현재 line 322-331)
  - 변경: 단일 handler 내부에 분기 추가
  - 핵심:
    ```typescript
    if (!isEditing) return
    if (e.key === 'Escape') setEditMode(false)
    const isMac = navigator.platform.toUpperCase().includes('MAC')
    const isUndoKey = isMac ? e.metaKey : e.ctrlKey
    if (isUndoKey && e.key === 'z' && !e.shiftKey) {
      e.preventDefault()
      const snapshot = useEditHistoryStore.getState().undo()
      if (snapshot) applySnapshot(snapshot)
    }
    ```
  - `applySnapshot` 헬퍼 추가 — snapshot type 분기로 `useBookmarkStore.setState` / `useLayoutStore.setState` + 영속화 1회
- **T-007**: `WidgetLayout.tsx` autoExit 타이머 useEffect 신규
  - 파일: `src/renderer/components/WidgetLayout/WidgetLayout.tsx` (수정)
  - 별도 useEffect:
    ```typescript
    useEffect(() => {
      if (!isEditing || !autoExitEnabled) return
      let timerId: number
      let warningId: number
      const startTimer = () => {
        clearTimeout(timerId)
        clearTimeout(warningId)
        warningId = window.setTimeout(showAutoExitWarning, 25_000)
        timerId = window.setTimeout(() => setEditMode(false), 30_000)
      }
      const resetTimer = () => startTimer()
      startTimer()
      const events = ['mousedown', 'pointerdown', 'touchstart', 'keydown'] as const
      events.forEach(e => window.addEventListener(e, resetTimer))
      return () => {
        clearTimeout(timerId)
        clearTimeout(warningId)
        events.forEach(e => window.removeEventListener(e, resetTimer))
      }
    }, [isEditing, autoExitEnabled])
    ```
- **T-008**: `WidgetLayout.tsx` 편집 모드 OFF 시 history clear
  - 파일: `src/renderer/components/WidgetLayout/WidgetLayout.tsx` (수정, 현재 line 315-320)
  - 변경: 기존 `useEffect(() => { document.body.classList.toggle(...) }, [isEditing])` 내부에 `if (!isEditing) useEditHistoryStore.getState().clear()` 추가
- **T-009**: `editModeStore.ts` 확장 — autoExitEnabled + hideEmptyCategories
  - 파일: `src/renderer/stores/editModeStore.ts` (수정)
  - 추가: `autoExitEnabled: boolean` (default: true, 영속화), `hideEmptyCategories: boolean` (default: false, 영속화), `setAutoExitEnabled`, `setHideEmptyCategories` 액션
  - 영속화: `storage.set('edit-mode-prefs', JSON.stringify({ autoExitEnabled, hideEmptyCategories }))`
  - mount 시 storage 에서 prefs 로드
- **T-010**: `editModeStore.test.ts` 갱신
  - 파일: `src/renderer/stores/editModeStore.test.ts` (수정)
  - 신규: 초기값 (autoExitEnabled=true, hideEmptyCategories=false), `setAutoExitEnabled` 호출 시 storage.set 호출 검증
- **T-011**: `WidgetLayout.test.tsx` 회귀 + 신규
  - 파일: `src/renderer/components/WidgetLayout/WidgetLayout.test.tsx` (수정)
  - 신규: Cmd+Z 누름 → `editHistoryStore.undo` 호출 + bookmarkStore 복원 검증
  - 신규: 편집 모드 ON 후 setTimeout mock 으로 30초 경과 → `editModeStore.isEditing === false` 전환
  - 신규: 편집 모드 ON 후 25초 시점 → 경고 토스트 노출 (mock 검증)
  - 회귀: 기존 Esc 키 동작 보존 (SPEC-UX-007 AC-008)

### M4: 토스트 UI 컴포넌트 (Priority High)

- **T-012**: `EditModeToast.tsx` 신규
  - 파일: `src/renderer/components/EditModeToast/EditModeToast.tsx` (신규)
  - props: `variant`, `message`, `actionLabel`, `onAction`, `duration`
  - 위치: bottom-center (모바일/데스크탑 공통)
  - 디자인 토큰: 기존 `--surface-2` 배경, `--text-primary` 텍스트, `--accent` 액션 버튼
  - dismiss: `useEffect` 로 `duration` ms 후 자동 dismiss
  - 모바일 hit-area: 액션 버튼 최소 44px
- **T-013**: `EditModeToast.test.tsx` 단위 테스트
  - 파일: `src/renderer/components/EditModeToast/EditModeToast.test.tsx` (신규)
  - 케이스: variant 별 시각 토큰, duration 경과 시 자동 dismiss, 액션 버튼 클릭 시 onAction 호출
- **T-014**: `WidgetLayout.tsx` 토스트 상태 관리 + 렌더
  - 파일: `src/renderer/components/WidgetLayout/WidgetLayout.tsx` (수정)
  - 로컬 state: `const [toast, setToast] = useState<{ variant, message, actionLabel, onAction } | null>(null)`
  - Cmd+Z 핸들러 내부 + autoExit 25초 시점에서 `setToast({...})` 호출
  - WidgetLayout 최하단에 `{toast && <EditModeToast {...toast} onAction={...} />}` 렌더

### M5: 빈 그룹 placeholder (Priority High)

- **T-015**: `BookmarkCard.tsx` 빈 카테고리 placeholder JSX 추가
  - 파일: `src/renderer/components/BookmarkCard/BookmarkCard.tsx` (수정, 현재 line 140-165)
  - 변경: `category.links.length === 0 && isEditing` 조건 시 placeholder div 렌더
  - `isOver` 시 placeholder text opacity 0 (SPEC-UX-008 `--accent-subtle` 배경과 시각 충돌 회피)
  - DOM 구조: `data-empty-placeholder` 마커 + 점선 outline + "여기로 드래그하여 추가" 텍스트
- **T-016**: BookmarkCard grid 표시 분기 — hideEmptyCategories 적용
  - 파일: `src/renderer/components/WidgetLayout/WidgetLayout.tsx` (수정, 현재 line 748)
  - 변경: `displayBookmarks` 정의에 hideEmptyCategories 분기
    ```typescript
    const filteredBookmarks = useMemo(() =>
      hideEmptyCategories && !isEditing
        ? bookmarks.filter(b => b.links.length > 0)
        : bookmarks,
      [bookmarks, hideEmptyCategories, isEditing]
    )
    ```
- **T-017**: BookmarkCard 단위 테스트 갱신
  - 파일: `src/renderer/components/BookmarkCard/BookmarkCard.test.tsx` (수정)
  - 신규: 빈 카테고리 + 편집 모드 ON 시 `[data-empty-placeholder]` 매칭, 텍스트 "여기로 드래그하여 추가"
  - 신규: 빈 카테고리 + 편집 모드 OFF 시 placeholder 없음
  - 신규: `isOver === true` 시 placeholder text opacity === 0

### M6: 모바일 햅틱 (Priority High)

- **T-018**: `haptic.ts` 유틸리티 신규
  - 파일: `src/renderer/utils/haptic.ts` (신규, 한국어 헤더 주석)
  - 함수: `tryHaptic(durationMs: number = 10): void` — navigator.vibrate 가드 + prefers-reduced-motion 가드
- **T-019**: `haptic.test.ts` 단위 테스트
  - 파일: `src/renderer/utils/haptic.test.ts` (신규)
  - 케이스: `navigator.vibrate` 정의 시 호출, 미정의 시 에러 없음, reduced-motion 시 호출 안 함
  - Mock: `navigator.vibrate`, `window.matchMedia`
- **T-020**: `WidgetLayout.tsx` drag start 시 햅틱 호출
  - 파일: `src/renderer/components/WidgetLayout/WidgetLayout.tsx` (수정)
  - 위치: `handleDragStart` (line 128, dnd-kit), `onDragStart` (line 293, RGL)
  - 패턴: 함수 첫 줄에 `tryHaptic(10)` 호출

### M7: e2e Playwright 시나리오 (Priority Medium)

- **T-021**: Undo e2e 시나리오
  - 파일: `e2e/specs/spec-ux-010-undo.spec.ts` (신규)
  - 시나리오:
    1. 편집 모드 ON → 카테고리 reorder → Cmd+Z → 직전 상태 복원
    2. 편집 모드 ON → 링크 reorder → Cmd+Z → 복원
    3. 편집 모드 ON → 카테고리 간 링크 이동 → Cmd+Z → 복원
    4. 편집 모드 ON → 위젯 layout 변경 → Cmd+Z → 복원
    5. 편집 모드 OFF → Cmd+Z → no-op (편집 모드와 무관)
    6. 편집 모드 ON → reorder 11회 → Cmd+Z 11회 → 첫 번째 reorder 직전까지만 복원 (FIFO 만료)
- **T-022**: Auto-exit e2e 시나리오
  - 파일: `e2e/specs/spec-ux-010-auto-exit.spec.ts` (신규)
  - 시나리오 (Playwright `page.clock` 사용):
    1. 편집 모드 ON → 30초 mock 경과 → 자동 OFF + 토스트 표시 안 함(silent)
    2. 편집 모드 ON → 25초 시점 → "5초 후 편집 모드 자동 종료" 토스트 노출
    3. 편집 모드 ON → 25초 시점 → "유지" 클릭 → 타이머 리셋 + 추가 30초
    4. 편집 모드 ON → autoExitEnabled=false → 60초 경과 → 편집 모드 유지
- **T-023**: Empty placeholder e2e 시나리오
  - 파일: `e2e/specs/spec-ux-010-empty-placeholder.spec.ts` (신규)
  - 시나리오:
    1. 빈 카테고리 + 편집 모드 ON → "여기로 드래그하여 추가" 텍스트 visible
    2. 빈 카테고리 + 편집 모드 OFF → 텍스트 invisible
    3. 다른 카테고리 링크를 빈 카테고리 위로 드래그(hover) → placeholder text 사라짐 + `--accent-subtle` 배경 노출
    4. hideEmptyCategories=true + 편집 모드 OFF → 빈 카테고리 자체 미렌더
    5. hideEmptyCategories=true + 편집 모드 ON → 빈 카테고리 렌더 (drop target 보장)
- **T-024**: Haptic e2e 시나리오 (제한적 — navigator.vibrate 의 e2e 검증)
  - 파일: `e2e/specs/spec-ux-010-haptic.spec.ts` (신규)
  - 시나리오: `await page.evaluate(() => navigator.vibrate = jest.fn())` mock 으로 드래그 시작 시 호출 횟수 검증

### M8: 검증 (Priority High)

- **T-025**: 회귀 테스트 (SPEC-UX-006/007/008 회귀 0)
  - 기존 단위/통합 테스트 100% 통과
  - SPEC-UX-009 병행 시 SPEC-UX-009 회귀 0 도 검증
- **T-026**: 신규 acceptance 시나리오 통과
  - acceptance.md AC-001 ~ AC-024 + EDGE-001 ~ EDGE-006 모두 통과
  - `npm run build` / `npm run lint` / `npm run typecheck` 0 error

## 파일 변경 맵 (실제 grep 결과 기반)

| 파일 경로 | 변경 유형 | 사유 / 관련 REQ |
|----------|----------|----------------|
| `src/renderer/stores/editHistoryStore.ts` | 신규 | 히스토리 store / REQ-001, 002, 019 |
| `src/renderer/stores/editHistoryStore.test.ts` | 신규 | store 단위 테스트 |
| `src/renderer/stores/editModeStore.ts` | 수정 | autoExitEnabled + hideEmptyCategories 필드 + 영속화 / REQ-008, 011 |
| `src/renderer/stores/editModeStore.test.ts` | 수정 | 신규 필드 케이스 추가 |
| `src/renderer/stores/bookmarkStore.ts` | 수정 | 변경 액션 직전 snapshot push / REQ-003 |
| `src/renderer/stores/bookmarkStore.test.ts` | 수정 | snapshot push 검증 |
| `src/renderer/stores/layoutStore.ts` | 수정 | updateLayout 직전 snapshot push / REQ-003 |
| `src/renderer/stores/layoutStore.test.ts` | 수정 | snapshot push 검증 |
| `src/renderer/components/WidgetLayout/WidgetLayout.tsx` | 수정 | Cmd+Z 리스너 + autoExit 타이머 + history clear + 햅틱 + hideEmpty 필터 + 토스트 렌더 / REQ-004, 005, 006, 007, 008, 009, 011, 013, 019 |
| `src/renderer/components/WidgetLayout/WidgetLayout.test.tsx` | 수정 | 신규 동작 검증 |
| `src/renderer/components/BookmarkCard/BookmarkCard.tsx` | 수정 | 빈 카테고리 placeholder JSX / REQ-010, 012 |
| `src/renderer/components/BookmarkCard/BookmarkCard.test.tsx` | 수정 | placeholder 케이스 |
| `src/renderer/components/EditModeToast/EditModeToast.tsx` | 신규 | undo / auto-exit-warning 토스트 / REQ-005, 009 |
| `src/renderer/components/EditModeToast/EditModeToast.test.tsx` | 신규 | 토스트 단위 테스트 |
| `src/renderer/utils/haptic.ts` | 신규 | 햅틱 유틸리티 / REQ-013, 014, 015 |
| `src/renderer/utils/haptic.test.ts` | 신규 | 유틸 단위 테스트 |
| `e2e/specs/spec-ux-010-undo.spec.ts` | 신규 | Undo e2e |
| `e2e/specs/spec-ux-010-auto-exit.spec.ts` | 신규 | Auto-exit e2e |
| `e2e/specs/spec-ux-010-empty-placeholder.spec.ts` | 신규 | Empty placeholder e2e |
| `e2e/specs/spec-ux-010-haptic.spec.ts` | 신규 | Haptic e2e |

**조사 결과 발견된 기존 자산** (중복 작업 회피):

- `zustand` 이미 설치 — `editHistoryStore` 즉시 작성 가능
- `bookmarkStore` 의 `storage.set('hub-bookmarks', ...)` 영속화 패턴 그대로 재사용 (snapshot 복원 시에도 동일 패턴)
- `layoutStore` 의 영속화 패턴 그대로 재사용
- `ProgressToast.tsx:1-93` 의 토스트 positioning + sizing 토큰 패턴 참고 (단, 본 SPEC 의 토스트는 bottom-center)
- `editModeStore.ts:20-25` 의 zustand store 패턴 그대로 확장
- `WidgetLayout.tsx:322-331` 의 Esc 리스너 useEffect 패턴 그대로 확장 (별도 useEffect 회피)
- `BookmarkCard.tsx:140-165` 의 grid 구조 보존 — placeholder 는 grid 내부 첫 자식으로 삽입
- `useBookmarkStore.getState()` / `setState()` 패턴 그대로 사용 (snapshot 적용 시)
- `navigator.vibrate` 는 Web Vibration API (브라우저 표준) — 추가 의존성 불필요
- `window.matchMedia('(prefers-reduced-motion: reduce)')` 는 표준 API — 추가 의존성 불필요

## 리스크

| 리스크 | 영향 | 완화 전략 |
|--------|------|-----------|
| `bookmarkStore` / `layoutStore` 의 push 추가 후 SPEC-UX-007/008 회귀 | 정렬/이동 실패 | T-005 의 회귀 테스트(SPEC-UX-007 AC-014, SPEC-UX-008 AC-008/AC-014) 통과 검증. snapshot push 는 `set` 호출 직전 sync 이므로 race 없음 |
| `editHistoryStore` 의 메모리 누수(스택 크기 무제한) | 장시간 편집 시 OOM | REQ-002 의 최대 10개 깊이 + FIFO 만료. NFR-004 메모리 안전성 검증 |
| 자동 종료 타임아웃 중 사용자 조작 이벤트 누락 | 사용자 작업 중 의도치 않은 종료 | T-007 의 4개 이벤트 (mousedown / pointerdown / touchstart / keydown) 등록. dnd-kit 의 KeyboardSensor (SPEC-UX-009) 와 호환 |
| 모바일 long-press(250ms) 중 햅틱 호출 시점 차이 | 사용자 인지 부담 | `handleDragStart` 는 dnd-kit 의 sensor activationConstraint 통과 시점에 호출 → 사용자가 "드래그 시작" 으로 인지하는 시점과 일치. 햅틱은 시각 변화(opacity 0.5) 와 동시 |
| `navigator.vibrate` 가 iOS Safari 에서 정의되지 않음 | 햅틱 부재 (silent fallback) | REQ-014 의 가드 체크로 에러 없음. iOS 는 별도 API(`window.webkit?.messageHandlers`) 가 있지만 본 SPEC 범위 외 (별도 SPEC 후보) |
| `prefers-reduced-motion` 시 햅틱 비활성화로 일부 사용자 불편 | UX 회귀 | REQ-015 의 보수적 해석 — 사용자가 모션 감소를 명시한 경우 햅틱도 제외. 추후 사용자 보고 시 별도 옵션 분리 |
| `editHistoryStore.clear()` 호출 후 사용자가 편집 모드 재진입 시 이전 작업 undo 불가 | 사용자 혼란 | 의도된 동작 — 편집 세션 단위로 undo 가능 (REQ-019). UX 문서에 명시 |
| `EditModeToast` 의 z-index 가 RGL grid / DragOverlay 와 충돌 | 토스트 가려짐 | z-index 명시 (예: 9999) + position: fixed + bottom-center positioning |
| Cmd+Z 가 텍스트 input(검색바) 의 native undo 와 충돌 | 의도치 않은 undo | `e.target` 이 input / textarea 일 경우 early return 추가 (방어 코드) |
| 25초 경고 토스트가 사용자 조작 직후 발생 시 가독성 저하 | UX jank | 사용자 조작 이벤트로 타이머 리셋 → 토스트도 dismiss. T-022 의 e2e 시나리오 3에서 검증 |

## 의존성

- **선행**: SPEC-UX-006 (반응형 + 북마크 링크 정렬), SPEC-UX-007 (전역 편집 모드 + 카테고리 정렬), SPEC-UX-008 (카테고리 간 링크 이동 + 단일 DndContext)
- **병행 가능**: SPEC-UX-009 (드래그 핸들 시각 분리) — 본 SPEC 과 독립 영역. 충돌 없음
- **후행** (후속 SPEC 후보):
  - Cmd+Shift+Z (redo) 단축키 UI + redo 버튼 토스트
  - 자동 종료 타임아웃 값 사용자 설정 UI
  - 모바일 햅틱 강도 사용자 설정
  - 편집 히스토리 영속화 (세션 간 복원)
  - iOS Safari 햅틱 fallback (WKWebView API)
  - 빈 카테고리 자동 정리 (사용자 옵트인)

## 권장 / 검토 사항

**Undo 깊이 — 10개 권장 사유**

선택지: 5 / 10 / 20 / 무제한

**권장: 10개**

이유:
1. **메모리 안전성**: 카테고리 + 모든 링크의 deep clone 1회 = 약 1~10KB (사용자 데이터 크기 따라). 10개 × 10KB = 100KB ≈ 0.5% 메모리
2. **UX 충분성**: 일반 사용자가 10회 이상의 변경을 되돌리는 경우는 드물 (대부분 1~3회 즉시 정정)
3. **테스트 용이성**: 11번째 push 시 FIFO 만료 동작을 단위 테스트로 명확히 검증 가능 (T-002)
4. **확장 여지**: 향후 사용자 요청 시 깊이 늘리기 용이 (단일 상수 변경)

**자동 종료 타임아웃 — 30초 권장 사유**

선택지: 10초 / 20초 / 30초 / 60초

**권장: 30초**

이유:
1. **iOS Wiggle 모드 패턴 일치**: iOS 홈 화면 wiggle 모드는 명시적 종료(홈 버튼) 만 지원하지만, 본 SPEC 은 안전성 보장을 위해 자동 종료 도입. 30초는 사용자가 다음 동작을 고민하기에 충분
2. **25초 경고 토스트 + 5초 grace**: 사용자가 의도치 않게 종료될 위험 최소화
3. **UI tester 통계 (없음, 추정)**: 일반 편집 동작 간격은 5~15초 — 30초 무동작은 명백한 비활성

**모바일 햅틱 지속시간 — 10ms 권장 사유**

선택지: 5ms / 10ms / 20ms / 50ms

**권장: 10ms**

이유:
1. **표준 권고**: Web Vibration API 의 짧은 햅틱 신호 권장 범위(10ms ~ 50ms)
2. **불쾌감 회피**: 50ms 이상은 사용자가 "강한 진동" 으로 인지 가능
3. **드래그 시작 신호로 충분**: 10ms 도 명확히 인지 가능 (Apple Taptic Engine 의 일반 햅틱 사이즈와 유사)

**기타 권장 사항**:
- Undo 토스트의 "되돌리기" 버튼 라벨은 한국어 "되돌리기" 사용 (en: "Undo" 가 아닌 한국어 일관)
- 빈 그룹 placeholder 텍스트는 "여기로 드래그하여 추가" 로 시작 — 사용자 테스트 후 조정 가능
- e2e Playwright 의 `page.clock` API 로 30초 타이머를 결정론적 검증 (실제 wall-clock 대기 회피)
- 햅틱은 데스크탑 Chrome / Edge 에서도 `navigator.vibrate` 가 정의되어 있지만 실제 햅틱 없음 — 가드 체크 후 호출하되 부수효과 없음(silent fallback)
