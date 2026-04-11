---
id: SPEC-UI-001
type: plan
---

# SPEC-UI-001: 구현 계획

## 구현 전략

`productivity-hub.jsx`(403줄)의 동작하는 코드를 TypeScript + Electron IPC 아키텍처로 마이그레이션한다.
TDD(RED-GREEN-REFACTOR) 방식으로 테스트를 먼저 작성하고, 프로토타입 코드를 참조하여 구현한다.

## 의존성 순서

```
T-001 (types) ─────────────────────────────────────────┐
T-002 (themes) ────────────────────────────────────────┤
T-003 (globals.css) ───────────────────────────────────┤
                                                        ├→ T-006 (stores) ──┐
T-004 (IPC handlers) → T-005 (preload bridge) ─────────┘                    │
                                                                             ├→ T-007~T-011 (components)
                                                                             │
                                                                             └→ T-012 (App.tsx 통합)
```

## 태스크 분해

### T-001: TypeScript 타입 정의

- **파일**: `src/renderer/types/index.ts`
- **내용**: Bookmark, Todo, Category, ThemeMode, ThemeTokens 인터페이스
- **참조**: productivity-hub.jsx 전체 -- 데이터 구조 추출
- **우선순위**: High
- **의존성**: 없음

### T-002: 테마 토큰

- **파일**: `src/renderer/styles/themes.ts`
- **내용**: darkTheme, lightTheme 객체 (CSS 변수 이름 : 값 매핑)
- **참조**: productivity-hub.jsx:15-35 (CSS 변수 정의 영역)
- **우선순위**: High
- **의존성**: T-001

### T-003: CSS 글로벌 스타일

- **파일**: `src/renderer/styles/globals.css`
- **내용**: CSS 리셋, 스크롤바 스타일, `:root` CSS 변수 기본값, 폰트 (Inter, JetBrains Mono)
- **참조**: productivity-hub.jsx:1-14 (스타일 섹션)
- **우선순위**: High
- **의존성**: 없음

### T-004: electron-store IPC 핸들러

- **파일**: `src/main/ipc/storage.ts`, `src/main/index.ts` (수정)
- **내용**: `ipcMain.handle('storage:get', ...)`, `ipcMain.handle('storage:set', ...)` 등록
- **참조**: 프로토타입의 `window.storage.get/set` 패턴
- **우선순위**: High
- **의존성**: 없음

### T-005: Preload 스토리지 브릿지

- **파일**: `src/preload/index.ts` (수정)
- **내용**: `contextBridge.exposeInMainWorld('storage', { get, set })` 구현
- **참조**: Electron contextBridge 패턴
- **우선순위**: High
- **의존성**: T-004

### T-006: Zustand 스토어

- **파일**: `src/renderer/stores/bookmarkStore.ts`, `todoStore.ts`, `themeStore.ts`
- **내용**: 각 스토어의 CRUD 액션, 초기 로드(loaded flag), 자동 저장 로직
- **참조**: productivity-hub.jsx 전체 -- 상태 관리 로직 추출
- **우선순위**: High
- **의존성**: T-001, T-002, T-005
- **MX 계획**:
  - bookmarkStore: `@MX:ANCHOR` -- fan_in >= 3 (App, BookmarkCard, EditModal에서 사용)
  - todoStore: `@MX:NOTE` -- fan_in 2 (App, TodoWidget)
  - themeStore: `@MX:NOTE` -- fan_in 2 (App, TopBar)

### T-007: Clock 컴포넌트 + 테스트

- **파일**: `src/renderer/components/Clock/Clock.tsx`, `Clock.test.tsx`
- **내용**: 1초 갱신 시계, 한국어 날짜, 시간대별 인사말
- **참조**: productivity-hub.jsx:88-107 (Clock 컴포넌트)
- **TDD**: vi.useFakeTimers로 setInterval/clearInterval 테스트
- **우선순위**: Medium
- **의존성**: T-001

### T-008: SearchBar 컴포넌트 + 테스트

- **파일**: `src/renderer/components/SearchBar/SearchBar.tsx`, `SearchBar.test.tsx`
- **내용**: Google 검색 폼, window.open 호출
- **참조**: productivity-hub.jsx:109-130 (SearchBar 컴포넌트)
- **TDD**: window.open 모킹, 빈 검색어 무시 테스트
- **우선순위**: Medium
- **의존성**: T-001

### T-009: BookmarkCard + EditModal 컴포넌트 + 테스트

- **파일**: `src/renderer/components/BookmarkCard/BookmarkCard.tsx`, `BookmarkCard.test.tsx`, `src/renderer/components/EditModal/EditModal.tsx`, `EditModal.test.tsx`
- **내용**: 카테고리 카드 + 링크 그리드, 편집 모달 (아이콘/이름/링크 편집, 저장/삭제)
- **참조**: productivity-hub.jsx:132-230 (BookmarkCard), 232-350 (EditModal)
- **TDD**: 렌더링, 모달 열기/닫기, 저장/삭제 콜백 테스트
- **우선순위**: Medium
- **의존성**: T-001, T-006

### T-010: TodoWidget 컴포넌트 + 테스트

- **파일**: `src/renderer/components/TodoWidget/TodoWidget.tsx`, `TodoWidget.test.tsx`
- **내용**: 할 일 추가/토글/삭제, 미완료 수 표시
- **참조**: productivity-hub.jsx:352-390 (TodoWidget)
- **TDD**: 항목 추가(Enter), 토글, 삭제, 빈 텍스트 무시 테스트
- **우선순위**: Medium
- **의존성**: T-001, T-006

### T-011: NotesWidget 컴포넌트 + 테스트

- **파일**: `src/renderer/components/NotesWidget/NotesWidget.tsx`, `NotesWidget.test.tsx`
- **내용**: textarea 디바운스 자동 저장(600ms), 언마운트 시 타이머 정리
- **참조**: productivity-hub.jsx:392-403 (NotesWidget)
- **TDD**: vi.useFakeTimers로 디바운스 테스트, window.storage.set 호출 검증
- **우선순위**: Medium
- **의존성**: T-001, T-005

### T-012: App.tsx 레이아웃 통합

- **파일**: `src/renderer/App.tsx`
- **내용**: TopBar + Hero(인사말+Clock+SearchBar) + Main(BookmarkGrid+Sidebar) 조합
- **참조**: productivity-hub.jsx:350-403 (ProductivityHub 레이아웃)
- **TDD**: 전체 레이아웃 렌더링, 컴포넌트 존재 확인 통합 테스트
- **우선순위**: Medium
- **의존성**: T-001~T-011 전체

## 마일스톤

### M1: 인프라 계층 (T-001 ~ T-005)

- **우선순위**: High
- **산출물**: 타입, 테마, CSS, IPC 핸들러, Preload 브릿지
- **완료 기준**: `npm run typecheck` 통과, IPC 채널 등록 확인

### M2: 상태 관리 (T-006)

- **우선순위**: High
- **산출물**: 3개 Zustand 스토어 + 단위 테스트
- **완료 기준**: 스토어 CRUD 테스트 전부 통과, 자동 저장 로직 검증

### M3: 위젯 컴포넌트 (T-007 ~ T-011)

- **우선순위**: Medium
- **산출물**: 6개 컴포넌트(Clock, SearchBar, BookmarkCard, EditModal, TodoWidget, NotesWidget) + 테스트
- **완료 기준**: 각 컴포넌트 테스트 통과, 85% 이상 커버리지

### M4: 통합 (T-012)

- **우선순위**: Medium
- **산출물**: App.tsx 완성, 전체 레이아웃 동작
- **완료 기준**: `npm run build` 오류 0건, 통합 테스트 통과

## 기술 접근 방식

### 스타일링 전략

인라인 스타일 + CSS 변수 패턴을 그대로 유지한다. `themes.ts`에서 dark/light 토큰 객체를 정의하고,
루트 `<div>`의 `style` 속성에 적용한다. CSS Modules는 도입하지 않는다.

### 스토리지 패턴

```
Renderer (window.storage.get/set)
  → Preload (contextBridge)
    → Main (ipcMain.handle)
      → electron-store (JSON 파일)
```

### 테스트 전략

- `window.storage`를 `vi.stubGlobal`로 모킹
- `vi.useFakeTimers`로 Clock 디바운스/인터벌 테스트
- `@testing-library/react`의 `render`, `screen`, `fireEvent` 사용
- 각 컴포넌트 독립 테스트 (스토어 의존성은 실제 Zustand 스토어 사용)

## 위험 요소

### R-001: electron-store IPC 타이밍

- **위험**: Renderer가 스토어 초기 로드 전에 컴포넌트를 렌더링할 수 있음
- **영향**: 기본값이 잠깐 표시된 후 스토리지 데이터로 교체됨 (깜빡임)
- **완화**: loaded flag 패턴으로 초기 로드 완료 전까지 상태 변경을 스토리지에 저장하지 않음

### R-002: 테스트 환경에서 window.storage 부재

- **위험**: Vitest(jsdom)에서 `window.storage`가 undefined
- **영향**: 스토어 초기화 실패
- **완화**: `vi.stubGlobal('storage', mockStorage)` 패턴 표준화

### R-003: CSS 변수 브라우저 호환성

- **위험**: Electron의 Chromium 버전이 CSS 변수를 지원하지 않을 가능성
- **영향**: 없음 (Electron 35는 최신 Chromium 포함)
- **완화**: 위험도 매우 낮음, 별도 대응 불필요

### R-004: Zustand v5 + React 19 호환성

- **위험**: Zustand 5.x와 React 19의 호환성 이슈 가능성
- **영향**: 스토어 구독 오동작
- **완화**: Zustand 5.x는 React 19 공식 지원. 이슈 발생 시 useSyncExternalStore 패턴 확인
