# SPEC-DESKFLOW-001 Compact: Deskflow 프로젝트 스캐폴딩

## 요구사항 (EARS 형식)

### REQ-001: 프로젝트 구조
- **[Ubiquitous]** 시스템은 Main(`src/main/`), Preload(`src/preload/`), Renderer(`src/renderer/`) 3-tier 분리 구조를 유지**해야 한다(shall)**.
- **When** 프로젝트가 초기화되면, 세 디렉터리가 생성**되어야 한다(shall)**.

### REQ-002: 빌드 환경
- **When** `pnpm dev`를 실행하면, electron-vite가 세 프로세스를 동시 빌드하고 HMR을 활성화**해야 한다(shall)**.
- **When** `pnpm build`를 실행하면, `dist/`에 프로덕션 결과물이 생성**되어야 한다(shall)**.
- `electron.vite.config.ts`가 Main/Preload/Renderer 설정을 포함**해야 한다(shall)**.

### REQ-003: TypeScript 설정
- **[Ubiquitous]** 모든 소스 코드는 TypeScript strict 모드로 작성**되어야 한다(shall)**.
- 루트 `tsconfig.json`은 Project References로 `tsconfig.node.json`, `tsconfig.web.json`을 참조**해야 한다(shall)**.
- 각 tsconfig는 해당 프로세스 환경에 맞는 설정을 포함**해야 한다(shall)**.

### REQ-004: 테스트 환경
- **When** `pnpm test`를 실행하면, Vitest가 `**/*.test.{ts,tsx}` 테스트를 실행**해야 한다(shall)**.
- `jsdom` 환경과 `@testing-library/react`가 설정**되어야 한다(shall)**.
- 최소 1개 스모크 테스트가 포함**되어야 한다(shall)**.

### REQ-005: 코드 품질 도구
- **[Ubiquitous]** ESLint 9 flat config + Prettier로 일관된 코드 스타일을 유지**해야 한다(shall)**.
- **When** `pnpm lint`를 실행하면, 모든 스텁 파일에서 ESLint 오류가 0건**이어야 한다(shall)**.

### REQ-006: 기본 앱 구조
- **When** Electron 앱이 시작되면, `BrowserWindow`를 생성하고 `index.html`을 로드**해야 한다(shall)**.
- `contextIsolation: true`, `nodeIntegration: false` 보안 설정이 적용**되어야 한다(shall)**.
- Preload에 `contextBridge` 스텁, Renderer에 React 마운트 스텁이 포함**되어야 한다(shall)**.

## 인수 기준 (Given/When/Then)

**S1 — 개발 서버 시작:**
Given 설치 완료, When `pnpm dev`, Then Electron 윈도우가 열리고 "Deskflow" 텍스트 표시.

**S2 — HMR 동작:**
Given dev 서버 실행 중, When App.tsx 텍스트 변경, Then 재시작 없이 화면 반영.

**S3 — TypeScript 컴파일:**
Given 스텁 파일 작성 완료, When `pnpm typecheck`, Then 오류 0건.

**S4 — 스모크 테스트:**
Given vitest.config.ts + 테스트 파일 존재, When `pnpm test`, Then 전체 PASS.

**S5 — ESLint:**
Given 스텁 파일 작성 완료, When `pnpm lint`, Then 오류 0건.

**S6 — 프로덕션 빌드:**
Given 설정 + 스텁 완료, When `pnpm build`, Then `dist/main/`, `dist/preload/`, `dist/renderer/` 생성.

## 생성할 파일 목록

| 파일 경로 | 설명 |
|-----------|------|
| `package.json` | 의존성, 스크립트, 메타데이터 |
| `electron.vite.config.ts` | electron-vite 빌드 설정 |
| `tsconfig.json` | TypeScript 루트 (Project References) |
| `tsconfig.node.json` | Main/Preload TypeScript 설정 |
| `tsconfig.web.json` | Renderer TypeScript 설정 |
| `eslint.config.mjs` | ESLint 9 flat config |
| `.prettierrc` | Prettier 포맷팅 규칙 |
| `vitest.config.ts` | Vitest 테스트 설정 |
| `src/main/index.ts` | Main 프로세스 (BrowserWindow) |
| `src/preload/index.ts` | Preload 스크립트 (contextBridge 스텁) |
| `src/renderer/index.html` | HTML 진입점 |
| `src/renderer/main.tsx` | React 마운트 포인트 |
| `src/renderer/App.tsx` | 루트 컴포넌트 (최소 스텁) |
| `src/renderer/__tests__/App.test.tsx` | 스모크 테스트 |

## 제외사항 (Exclusions)

- 실제 위젯 구현 (Clock, SearchBar, BookmarkCard, TodoWidget, NotesWidget)
- electron-store IPC 통신 (ipcMain/ipcRenderer 핸들러)
- Zustand 스토어 구현 (의존성 설치만)
- electron-builder 패키징 설정
- E2E 테스트 (Playwright)
- CSS 변수/테마 시스템
- CI/CD 파이프라인
- productivity-hub.jsx 마이그레이션
