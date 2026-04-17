---
id: SPEC-DESKFLOW-001
version: "1.0.0"
status: draft
created: "2026-04-11"
updated: "2026-04-11"
author: ZeroJuneK
priority: high
issue_number: 0
---

# SPEC-DESKFLOW-001: Deskflow 프로젝트 스캐폴딩

## HISTORY

| 버전 | 날짜 | 작성자 | 변경 내용 |
|------|------|--------|-----------|
| 1.0.0 | 2026-04-11 | ZeroJuneK | 초기 SPEC 작성 |

## 개요

Deskflow 프로젝트의 초기 개발 환경을 구축한다. electron-vite + React 19 + TypeScript 기반의 Electron 애플리케이션 스캐폴딩을 생성하고, Main/Preload/Renderer 3-tier 분리 구조, 테스트 환경, 코드 품질 도구를 설정한다.

현재 상태: 빈 프로젝트 (package.json 비어있음, src/ 디렉터리 없음). `productivity-hub.jsx` 샘플 파일만 존재.

## 요구사항

### REQ-001: 프로젝트 구조 (Main/Preload/Renderer 3-tier 분리)

**[Ubiquitous]** Deskflow 시스템은 Electron의 Main, Preload, Renderer 세 프로세스를 독립된 디렉터리(`src/main/`, `src/preload/`, `src/renderer/`)로 분리하여 관리**해야 한다(shall)**.

- REQ-001-1: **When** 프로젝트가 초기화되면, 시스템은 `src/main/`, `src/preload/`, `src/renderer/` 디렉터리를 생성**해야 한다(shall)**.
- REQ-001-2: Main 프로세스는 Node.js 환경에서 실행되며 Electron API에 대한 전체 접근 권한을 가져**야 한다(shall)**.
- REQ-001-3: Preload 스크립트는 `contextBridge`를 통해 Renderer에 안전한 API만 노출**해야 한다(shall)**.
- REQ-001-4: Renderer 프로세스는 브라우저 환경에서 실행되며 Node.js API에 직접 접근할 수 없어**야 한다(shall)**.

### REQ-002: 빌드 환경 (electron-vite)

**[Event-Driven]** **When** 개발자가 `pnpm dev` 명령을 실행하면, electron-vite 개발 서버가 Main/Preload/Renderer 세 프로세스를 동시에 빌드하고 HMR(Hot Module Replacement)을 활성화**해야 한다(shall)**.

- REQ-002-1: `electron.vite.config.ts` 파일이 Main, Preload, Renderer 각각의 빌드 설정을 포함**해야 한다(shall)**.
- REQ-002-2: Renderer 빌드는 `@vitejs/plugin-react`를 사용하여 React JSX를 변환**해야 한다(shall)**.
- REQ-002-3: **When** `pnpm build` 명령을 실행하면, `dist/` 디렉터리에 프로덕션 빌드 결과물(main, preload, renderer)이 생성**되어야 한다(shall)**.

### REQ-003: TypeScript 설정

**[Ubiquitous]** 모든 소스 코드는 TypeScript strict 모드로 작성**되어야 한다(shall)**.

- REQ-003-1: 루트 `tsconfig.json`은 프로젝트 레퍼런스(Project References)를 사용하여 `tsconfig.node.json`과 `tsconfig.web.json`을 참조**해야 한다(shall)**.
- REQ-003-2: `tsconfig.node.json`은 Main/Preload 프로세스를 위한 설정으로, `target: "ESNext"`, `module: "ESNext"`, `strict: true`를 포함**해야 한다(shall)**.
- REQ-003-3: `tsconfig.web.json`은 Renderer 프로세스를 위한 설정으로, `target: "ESNext"`, `module: "ESNext"`, `strict: true`, `jsx: "react-jsx"`를 포함**해야 한다(shall)**.

### REQ-004: 테스트 환경

**[Event-Driven]** **When** 개발자가 `pnpm test` 명령을 실행하면, Vitest가 `**/*.test.{ts,tsx}` 패턴의 모든 테스트 파일을 탐지하고 실행**해야 한다(shall)**.

- REQ-004-1: `vitest.config.ts` 파일이 프로젝트 루트에 존재**해야 한다(shall)**.
- REQ-004-2: Renderer 테스트를 위해 `@testing-library/react`와 `jsdom` 환경이 설정**되어야 한다(shall)**.
- REQ-004-3: 최소 1개의 스모크 테스트가 포함되어 테스트 파이프라인의 정상 동작을 검증**해야 한다(shall)**.

### REQ-005: 코드 품질 도구

**[Ubiquitous]** 프로젝트는 ESLint 9 flat config와 Prettier를 사용하여 일관된 코드 스타일을 유지**해야 한다(shall)**.

- REQ-005-1: `eslint.config.mjs` 파일이 TypeScript, React 규칙을 포함하는 flat config 형식으로 존재**해야 한다(shall)**.
- REQ-005-2: `.prettierrc` 파일이 프로젝트 포맷팅 규칙을 정의**해야 한다(shall)**.
- REQ-005-3: **When** `pnpm lint` 명령을 실행하면, 모든 스텁 파일에서 ESLint 오류가 0건**이어야 한다(shall)**.

### REQ-006: 기본 앱 구조

**[Event-Driven]** **When** Electron 앱이 시작되면, Main 프로세스가 `BrowserWindow`를 생성하고 Renderer의 `index.html`을 로드**해야 한다(shall)**.

- REQ-006-1: `src/main/index.ts`는 `BrowserWindow` 생성, `preload` 스크립트 경로 지정, `webPreferences` 보안 설정(`contextIsolation: true`, `nodeIntegration: false`)을 포함**해야 한다(shall)**.
- REQ-006-2: `src/preload/index.ts`는 `contextBridge.exposeInMainWorld` 호출 스텁을 포함**해야 한다(shall)**.
- REQ-006-3: `src/renderer/index.html`은 React 마운트 포인트(`<div id="root">`)를 포함**해야 한다(shall)**.
- REQ-006-4: `src/renderer/main.tsx`는 `createRoot`로 React 앱을 마운트**해야 한다(shall)**.
- REQ-006-5: `src/renderer/App.tsx`는 "Deskflow" 텍스트를 렌더링하는 최소 컴포넌트로 구현**되어야 한다(shall)**.

## 비기능 요구사항

- NFR-001: **While** 개발 모드에서 실행 중일 때, Renderer 코드 변경 시 HMR이 1초 이내에 반영**되어야 한다(shall)**.
- NFR-002: `contextIsolation: true`, `nodeIntegration: false`가 BrowserWindow 생성 시 항상 설정**되어야 한다(shall)**.

## 제약사항

- 패키지 매니저: pnpm v10.x 사용
- Node.js: electron-vite 3.x가 요구하는 버전 (>=18)
- 기존 `productivity-hub.jsx` 파일은 수정하지 않음 (참조용으로만 보존)

## 제외사항 (Exclusions - What NOT to Build)

- **실제 위젯 구현**: Clock, SearchBar, BookmarkCard, TodoWidget, NotesWidget 등의 실제 컴포넌트 구현은 이 SPEC 범위 밖. App.tsx는 최소 스텁만 포함.
- **electron-store IPC 통신**: `ipcMain`/`ipcRenderer` 핸들러 구현, electron-store 초기화는 별도 SPEC에서 진행.
- **Zustand 스토어 구현**: 상태 관리 스토어 정의는 별도 SPEC에서 진행. 이 SPEC에서는 zustand를 의존성으로만 설치.
- **electron-builder 패키징 설정**: 빌드 결과물 패키징, 인스톨러 생성 설정은 별도 SPEC에서 진행.
- **E2E 테스트 (Playwright)**: Playwright 설정 및 E2E 테스트는 별도 SPEC에서 진행.
- **CSS 변수/테마 시스템**: 다크/라이트 테마 전환 로직은 별도 SPEC에서 구현.
- **CI/CD 파이프라인**: GitHub Actions 등 자동화 파이프라인은 이 SPEC 범위 밖.
- **productivity-hub.jsx 마이그레이션**: 기존 JSX 파일의 TypeScript 전환은 별도 SPEC에서 진행.
