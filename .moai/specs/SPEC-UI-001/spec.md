---
id: SPEC-UI-001
version: 1.0.0
status: draft
created: 2026-04-11
updated: 2026-04-11
author: ZeroJuneK
priority: high
issue_number: 0
---

# SPEC-UI-001: Deskflow 위젯 시스템 구현

## HISTORY

| 버전 | 날짜 | 작성자 | 변경 내용 |
|------|------|--------|-----------|
| 1.0.0 | 2026-04-11 | ZeroJuneK | 최초 작성 |

## 개요

`productivity-hub.jsx` 프로토타입을 TypeScript + Electron IPC 아키텍처로 마이그레이션한다.
5개 위젯(Clock, SearchBar, BookmarkCard, TodoWidget, NotesWidget)과 EditModal을
React 19 컴포넌트로 분리하고, Zustand 상태 관리 + electron-store IPC 스토리지를 통합한다.

**분류**: SPEC (구현 대상 기능)
**성격**: Brownfield -- 기존 프로토타입의 TypeScript 마이그레이션 + Electron IPC 통합

## 요구사항

### REQ-001: 앱 레이아웃 (App Layout)

**[Ubiquitous]** 시스템은 TopBar, Hero 영역(Clock + SearchBar), Main 그리드(BookmarkCard 그리드 | TodoWidget + NotesWidget 컬럼) 구조의 레이아웃을 **항상** 렌더링해야 한다.

**[Event-Driven]** **When** 앱이 시작되면, 시스템은 스토리지에서 북마크/할 일/테마 데이터를 로드하고 메인 화면을 렌더링**해야 한다**.

**[Ubiquitous]** TopBar는 로고("My Hub"), 카테고리 추가 버튼("+ 카테고리"), 다크/라이트 토글 버튼을 **항상** 포함해야 한다.

**[Ubiquitous]** Main 그리드는 `1fr 360px` 비율로 좌측에 BookmarkCard 그리드, 우측에 TodoWidget + NotesWidget 컬럼을 **항상** 배치해야 한다.

**[Ubiquitous]** Hero 영역은 시간대별 인사말(Good Morning/Afternoon/Evening/Night)을 **항상** 표시해야 한다.

### REQ-002: Clock 위젯

**[Ubiquitous]** Clock 위젯은 1초 간격으로 현재 시간을 HH:MM 형식(24시간)으로 갱신하며, 초를 별도 크기(24px, opacity 0.4)로 **항상** 표시해야 한다.

**[Ubiquitous]** Clock 위젯은 한국어 날짜(년, 월, 일, 요일)를 `toLocaleDateString("ko-KR")` 형식으로 **항상** 표시해야 한다.

**[Event-Driven]** **When** Clock 컴포넌트가 언마운트되면, 시스템은 `setInterval` 타이머를 `clearInterval`로 정리**해야 한다**.

### REQ-003: SearchBar 위젯

**[Event-Driven]** **When** 사용자가 검색어를 입력하고 Enter 키 또는 submit 버튼을 누르면, 시스템은 `https://www.google.com/search?q={검색어}` URL을 새 창에서 열**어야 한다**.

**[Unwanted]** 시스템은 빈 검색어(공백만 포함)로 검색을 실행**해서는 안 된다**.

### REQ-004: BookmarkCard 위젯

**[Ubiquitous]** BookmarkCard는 카테고리별로 아이콘, 이름, 2열 링크 그리드를 **항상** 표시해야 한다.

**[State-Driven]** **While** 마우스가 BookmarkCard 위에 있는 동안, 시스템은 `translateY(-2px)` + box-shadow 상승 효과를 적용**해야 한다**.

**[Event-Driven]** **When** 편집(설정) 버튼을 클릭하면, 시스템은 해당 카테고리의 EditModal을 열**어야 한다**.

**[Event-Driven]** **When** EditModal에서 저장 버튼을 누르면, 시스템은 수정된 카테고리 데이터로 bookmarkStore를 업데이트**해야 한다**.

**[Event-Driven]** **When** EditModal에서 삭제 버튼을 누르면, 시스템은 해당 카테고리를 bookmarkStore에서 제거**해야 한다**.

**[Event-Driven]** **When** TopBar의 "+ 카테고리" 버튼을 누르면, 시스템은 빈 카테고리의 EditModal을 열**어야 한다**.

### REQ-005: TodoWidget

**[Event-Driven]** **When** 사용자가 텍스트를 입력하고 Enter 키를 누르면, 시스템은 새 할 일 항목을 목록에 추가**해야 한다**.

**[Event-Driven]** **When** 체크박스를 클릭하면, 시스템은 해당 항목의 완료 상태를 토글**해야 한다**.

**[Event-Driven]** **When** 삭제 버튼을 클릭하면, 시스템은 해당 항목을 목록에서 제거**해야 한다**.

**[Ubiquitous]** TodoWidget은 미완료 항목 수를 **항상** 표시해야 한다.

**[Unwanted]** 시스템은 빈 텍스트(공백만 포함)로 할 일 항목을 추가**해서는 안 된다**.

### REQ-006: NotesWidget

**[Event-Driven]** **When** 텍스트 영역 내용이 변경되면, 시스템은 600ms 디바운스 후 `window.storage.set("hub-notes", value)`를 호출하여 자동 저장**해야 한다**.

**[Event-Driven]** **When** 컴포넌트가 언마운트되면, 시스템은 pending된 디바운스 타이머를 정리**해야 한다**.

**[Event-Driven]** **When** 컴포넌트가 마운트되면, 시스템은 `window.storage.get("hub-notes")`로 저장된 메모를 로드**해야 한다**.

### REQ-007: Storage IPC

**[Event-Driven]** **When** Renderer 프로세스가 `window.storage.get(key)`를 호출하면, Main 프로세스는 electron-store에서 해당 키의 값을 반환**해야 한다**.

**[Event-Driven]** **When** Renderer 프로세스가 `window.storage.set(key, value)`를 호출하면, Main 프로세스는 electron-store에 해당 키-값 쌍을 저장**해야 한다**.

**[Ubiquitous]** IPC 통신은 `storage:get`, `storage:set` 채널만 사용**해야 한다**.

**[Ubiquitous]** Preload 스크립트는 `contextBridge.exposeInMainWorld`를 통해 `window.storage` API를 노출**해야 한다**.

### REQ-008: Zustand 상태 관리

**[Ubiquitous]** 시스템은 bookmarkStore(북마크 CRUD), todoStore(할 일 CRUD), themeStore(테마 전환)를 Zustand로 관리**해야 한다**.

**[Event-Driven]** **When** 앱이 시작되면, 각 스토어는 `window.storage.get()`으로 저장된 데이터를 로드하고, 데이터가 없으면 기본값(DEFAULT_BOOKMARKS, DEFAULT_TODOS)을 사용**해야 한다**.

**[Complex]** **While** 스토어가 초기 로드를 완료한 상태에서(loaded === true), **When** 상태가 변경되면, 시스템은 자동으로 `window.storage.set()`을 호출하여 저장**해야 한다**.

### REQ-009: 테마 시스템

**[Event-Driven]** **When** 테마 토글 버튼을 클릭하면, 시스템은 다크/라이트 모드를 전환**해야 한다**.

**[Ubiquitous]** 테마는 CSS 변수(`--bg`, `--bg-pattern`, `--card-bg`, `--border`, `--text-primary`, `--text-muted`, `--link-bg`, `--link-hover`, `--accent`, `--shadow`)로 전체 UI에 적용**되어야 한다**.

**[Event-Driven]** **When** 테마가 변경되면, 시스템은 themeStore를 통해 스토리지에 저장하여 앱 재시작 후에도 유지**해야 한다**.

## 비기능 요구사항

### NFR-001: 테스트 커버리지

- 단위 테스트 커버리지 85% 이상 (Vitest + @testing-library/react)
- 모든 컴포넌트에 대한 독립적 테스트 파일 존재
- `window.storage` 모킹은 `vi.stubGlobal` 패턴 사용

### NFR-002: 타입 안전성

- TypeScript strict mode 준수
- 모든 컴포넌트 props에 명시적 타입 정의
- `any` 타입 사용 금지

### NFR-003: 빌드

- `npm run build` 시 TypeScript 오류 0건
- 빌드 출력 경로: `out/` (electron-vite 기본값)

## 제약사항

- Electron 35.x + electron-vite 5.0.0 환경 (SPEC-DESKFLOW-001에서 구성 완료)
- `contextIsolation: true`, `nodeIntegration: false` 필수
- React 19 + TypeScript 5.7 strict mode
- 스타일링: 인라인 스타일 + CSS 변수 패턴 (productivity-hub.jsx와 동일)

## Exclusions (What NOT to Build)

- **CSS Modules 도입**: 인라인 스타일 + CSS 변수 패턴 유지 (프로토타입과 동일)
- **Playwright E2E 테스트**: 별도 SPEC에서 다룸
- **electron-builder 패키징**: 별도 SPEC에서 다룸 (v1.5 목표)
- **위젯 드래그 앤 드롭**: v1.0 계획
- **글로벌 단축키 / 트레이 아이콘**: v1.0 계획
- **다국어(i18n) 지원**: 현재 한국어 하드코딩 유지
- **북마크 import/export 기능**: 향후 기능
- **반응형 레이아웃**: 데스크톱 고정 해상도 대상
- **애니메이션 라이브러리**: CSS transition만 사용
