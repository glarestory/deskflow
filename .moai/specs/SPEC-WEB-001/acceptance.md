---
id: SPEC-WEB-001
type: acceptance
version: 1.0.0
---

# SPEC-WEB-001: 수락 기준

## 시나리오

### AC-001: Storage Abstraction Layer -- Electron 환경 동작

**Given** Electron 앱이 실행 중이고 `window.storage`가 존재할 때
**When** `storage.ts`의 `get('hub-bookmarks')`를 호출하면
**Then** `window.storage.get('hub-bookmarks')`가 호출되고 동일한 결과가 반환된다

**Given** Electron 앱이 실행 중이고 `window.storage`가 존재할 때
**When** `storage.ts`의 `set('hub-bookmarks', '[]')`를 호출하면
**Then** `window.storage.set('hub-bookmarks', '[]')`가 호출된다

### AC-002: Storage Abstraction Layer -- 웹 브라우저 환경 동작

**Given** 웹 브라우저에서 실행 중이고 `window.storage`가 존재하지 않을 때
**When** `storage.ts`의 `get('hub-notes')`를 호출하면
**Then** `localStorage.getItem('hub-notes')` 결과가 `{ value: string | null }` 형태로 반환된다

**Given** 웹 브라우저에서 실행 중이고 `window.storage`가 존재하지 않을 때
**When** `storage.ts`의 `set('hub-notes', 'hello')`를 호출하면
**Then** `localStorage.setItem('hub-notes', 'hello')`가 호출된다

### AC-003: bookmarkStore 추상화 적용

**Given** bookmarkStore가 `storage.ts`를 import하고 있을 때
**When** `loadBookmarks()`를 호출하면
**Then** `storage.get('hub-bookmarks')`가 호출되고 (window.storage.get이 아닌) 북마크가 로드된다

**Given** bookmarkStore에서 북마크를 추가할 때
**When** `addBookmark(bookmark)`를 호출하면
**Then** `storage.set('hub-bookmarks', ...)`가 호출되어 저장된다

### AC-004: todoStore 추상화 적용

**Given** todoStore가 `storage.ts`를 import하고 있을 때
**When** `loadTodos()`를 호출하면
**Then** `storage.get('hub-todos')`가 호출되고 할 일 목록이 로드된다

### AC-005: themeStore 추상화 적용

**Given** themeStore가 `storage.ts`를 import하고 있을 때
**When** `loadTheme()`를 호출하면
**Then** `storage.get('hub-theme')`가 호출되고 테마 설정이 로드된다

### AC-006: NotesWidget 추상화 적용

**Given** NotesWidget이 `storage.ts`를 import하고 있을 때
**When** 컴포넌트가 마운트되면
**Then** `storage.get('hub-notes')`가 호출되어 메모가 로드된다

**Given** NotesWidget에서 텍스트를 변경할 때
**When** 600ms 디바운스 후 저장이 트리거되면
**Then** `storage.set('hub-notes', value)`가 호출된다

### AC-007: 웹 빌드 스크립트 동작

**Given** `vite.web.config.ts`가 존재할 때
**When** `npm run build:web`을 실행하면
**Then** `web-dist/` 디렉토리에 `index.html`과 JS/CSS 번들이 생성된다

**Given** `npm run build:web`이 완료된 후
**When** `web-dist/` 내용을 검사하면
**Then** `electron`, `electron-vite`, `electron-store` 관련 코드가 번들에 포함되어 있지 않다

### AC-008: 웹 개발 서버 동작

**Given** `vite.web.config.ts`가 존재할 때
**When** `npm run dev:web`을 실행하면
**Then** Vite 개발 서버가 시작되고 브라우저에서 앱이 로드된다

### AC-009: 기존 Electron 빌드 하위 호환

**Given** storage 추상화가 적용된 후
**When** `npm run dev` (Electron 개발 모드)를 실행하면
**Then** 기존과 동일하게 Electron 앱이 시작되고 모든 위젯이 정상 동작한다

**Given** storage 추상화가 적용된 후
**When** `npm run build` (Electron 빌드)를 실행하면
**Then** 빌드가 오류 없이 완료된다

### AC-010: TypeScript 타입 호환성

**Given** 웹 빌드 모드에서
**When** `vite build --config vite.web.config.ts`를 실행하면
**Then** TypeScript 컴파일 오류가 0건이다

## 엣지 케이스

### E-001: localStorage 비가용

**Given** 웹 브라우저에서 localStorage가 비활성화(시크릿 모드 등)되어 있을 때
**When** `storage.set()`을 호출하면
**Then** 예외가 발생하지 않고 graceful하게 실패한다 (기존 try-catch 패턴 활용)

### E-002: 빈 localStorage 키

**Given** 웹 브라우저에서 해당 키가 localStorage에 존재하지 않을 때
**When** `storage.get('hub-bookmarks')`를 호출하면
**Then** `{ value: null }`이 반환되고, 스토어는 DEFAULT 값을 사용한다

### E-003: window.storage 부분 정의

**Given** `window.storage`가 존재하지만 `get` 또는 `set` 메서드가 없는 비정상 환경일 때
**When** storage 모듈이 로드되면
**Then** `typeof window.storage !== 'undefined'` 검사를 통과하여 Electron 어댑터를 선택한다 (이 경우 런타임 오류는 환경 문제)

## 품질 게이트 기준

### QG-001: 테스트 커버리지

- `storage.ts` 단위 테스트: Electron 어댑터 / localStorage 어댑터 분기 테스트
- 기존 스토어 테스트가 storage 추상화 적용 후에도 통과
- 커버리지 85% 이상 유지

### QG-002: 빌드 검증

- `npm run build` (Electron): 오류 0건
- `npm run build:web` (Web): 오류 0건
- `web-dist/` 출력물 존재 및 정적 서빙 가능

### QG-003: 타입 검증

- `npm run typecheck`: 오류 0건
- `storage.ts` 반환 타입이 `window.storage` API 시그니처와 동일

## Definition of Done

- [ ] `src/renderer/lib/storage.ts` 생성 및 Electron/웹 어댑터 구현
- [ ] `bookmarkStore.ts` -- window.storage -> storage.ts 마이그레이션
- [ ] `todoStore.ts` -- window.storage -> storage.ts 마이그레이션
- [ ] `themeStore.ts` -- window.storage -> storage.ts 마이그레이션
- [ ] `NotesWidget.tsx` -- window.storage -> storage.ts 마이그레이션
- [ ] `vite.web.config.ts` 생성
- [ ] `package.json`에 `dev:web`, `build:web` 스크립트 추가
- [ ] `npm run build:web` 성공 및 `web-dist/` 출력 확인
- [ ] 기존 Electron 빌드 회귀 없음 확인
- [ ] TypeScript 컴파일 오류 0건
