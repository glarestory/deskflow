---
id: SPEC-WEB-001
type: plan
version: 1.0.0
---

# SPEC-WEB-001: 구현 계획

## 기술 접근 방식

### 핵심 전략: Runtime Detection + Adapter Pattern

Electron과 웹 환경을 빌드 타임이 아닌 런타임에 감지하여 동일 코드베이스에서 두 환경을 모두 지원한다.
`storage.ts` 모듈이 Adapter 역할을 하며, 소비자(스토어, 위젯)는 환경을 의식하지 않고 동일한 API를 호출한다.

### 감지 메커니즘

```
typeof window.storage !== 'undefined'
  ? Electron IPC 어댑터 (window.storage.get/set)
  : localStorage 어댑터 (localStorage.getItem/setItem -> Promise 래핑)
```

### 빌드 구성 전략

기존 `electron.vite.config.ts`는 변경하지 않는다.
새로운 `vite.web.config.ts`를 생성하여 `src/renderer/`를 루트로 하는 순수 웹 빌드를 구성한다.
`@vitejs/plugin-react`를 재사용하고, `web-dist/`에 출력한다.

## 마일스톤

### M1: Storage Abstraction Layer (Priority High)

- T-001: `src/renderer/lib/storage.ts` 생성
  - `get(key: string): Promise<{ value: string | null }>` 구현
  - `set(key: string, value: string): Promise<void>` 구현
  - Electron/웹 런타임 감지 로직 포함
  - 관련 요구사항: REQ-001, REQ-002

### M2: Store Migration (Priority High)

- T-002: `bookmarkStore.ts` -- `window.storage` -> `storage.ts` import로 변경
  - `loadBookmarks`: `window.storage.get` -> `get` 함수
  - `addBookmark`, `updateBookmark`, `removeBookmark`: `window.storage.set` -> `set` 함수
  - 관련 요구사항: REQ-003
- T-003: `todoStore.ts` -- `window.storage` -> `storage.ts` import로 변경
  - `loadTodos`: `window.storage.get` -> `get` 함수
  - `addTodo`, `toggleTodo`, `removeTodo`: `window.storage.set` -> `set` 함수
  - 관련 요구사항: REQ-003
- T-004: `themeStore.ts` -- `window.storage` -> `storage.ts` import로 변경
  - `loadTheme`: `window.storage.get` -> `get` 함수
  - `toggleMode`: `window.storage.set` -> `set` 함수
  - 관련 요구사항: REQ-003

### M3: Widget Migration (Priority High)

- T-005: `NotesWidget.tsx` -- `window.storage` -> `storage.ts` import로 변경
  - `useEffect` 내 `window.storage.get` -> `get` 함수
  - `handleChange` 내 `window.storage.set` -> `set` 함수
  - 600ms 디바운스 로직 보존 확인
  - 관련 요구사항: REQ-004

### M4: Web Build Configuration (Priority High)

- T-006: `vite.web.config.ts` 생성
  - `src/renderer/` 루트, `src/renderer/index.html` 엔트리
  - `@vitejs/plugin-react` 플러그인
  - `web-dist/` 출력 디렉토리
  - `@renderer` 별칭 설정
  - Electron 의존성 external 처리 불필요 (웹 빌드에서는 import하지 않음)
  - 관련 요구사항: REQ-005, REQ-006, REQ-007
- T-007: `package.json`에 스크립트 추가
  - `dev:web`: `vite --config vite.web.config.ts`
  - `build:web`: `vite build --config vite.web.config.ts`
  - 관련 요구사항: REQ-005, REQ-006

### M5: Validation (Priority High)

- T-008: `npm run build:web` 실행 및 출력 검증
  - `web-dist/index.html` 존재 확인
  - JS/CSS 번들 생성 확인
  - Electron 의존성 미포함 확인
  - 관련 요구사항: REQ-005, REQ-007, REQ-008

## 리스크

### R1: 기존 Electron 빌드 회귀 (확률: 낮음)

- **영향**: 기존 `npm run dev` / `npm run build` 동작 불능
- **대응**: storage.ts 어댑터는 Electron 환경에서 기존 `window.storage`를 그대로 위임하므로 동작 변경 없음. 기존 테스트 스위트로 검증.

### R2: window.storage 타입 충돌 (확률: 중간)

- **영향**: 웹 빌드 시 `window.storage` 타입이 정의되지 않아 TS 오류 발생 가능
- **대응**: 스토어/위젯이 `window.storage`를 직접 참조하지 않으므로 (storage.ts를 통해 접근) 문제 없음. `electron.d.ts`는 Electron 빌드에서만 관련.

### R3: Vite 설정 호환성 (확률: 낮음)

- **영향**: `vite.web.config.ts`와 기존 `electron.vite.config.ts` 간 충돌
- **대응**: 완전히 독립된 설정 파일이므로 상호 영향 없음.

## 파일 변경 목록

| 파일 | 변경 유형 | 설명 |
|------|----------|------|
| `src/renderer/lib/storage.ts` | 신규 생성 | Storage Abstraction Layer |
| `src/renderer/stores/bookmarkStore.ts` | 수정 | window.storage -> storage.ts |
| `src/renderer/stores/todoStore.ts` | 수정 | window.storage -> storage.ts |
| `src/renderer/stores/themeStore.ts` | 수정 | window.storage -> storage.ts |
| `src/renderer/components/NotesWidget/NotesWidget.tsx` | 수정 | window.storage -> storage.ts |
| `vite.web.config.ts` | 신규 생성 | 웹 전용 Vite 빌드 설정 |
| `package.json` | 수정 | dev:web, build:web 스크립트 추가 |

## 전문가 상담 권장

- **expert-frontend**: Vite 웹 빌드 설정 최적화 및 번들 분석
