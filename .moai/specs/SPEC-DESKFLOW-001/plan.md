# SPEC-DESKFLOW-001: 구현 계획

## 목표

electron-vite + React 19 + TypeScript 프로젝트를 처음부터 초기화하여, 이후 모든 SPEC의 기반이 되는 개발 환경을 구축한다.

## 생성할 디렉터리 구조

```
Deskflow/
├── electron.vite.config.ts
├── package.json
├── tsconfig.json
├── tsconfig.node.json
├── tsconfig.web.json
├── eslint.config.mjs
├── .prettierrc
├── vitest.config.ts
├── src/
│   ├── main/
│   │   └── index.ts
│   ├── preload/
│   │   └── index.ts
│   └── renderer/
│       ├── index.html
│       ├── main.tsx
│       └── App.tsx
└── src/renderer/__tests__/
    └── App.test.tsx
```

## 마일스톤

### M1: 프로젝트 메타데이터 및 의존성 (Priority: High)

package.json 작성 및 의존성 정의.

**dependencies:**

| 패키지 | 버전 |
|--------|------|
| react | ^19.0.0 |
| react-dom | ^19.0.0 |
| zustand | ^5.0.0 |
| electron-store | ^10.0.0 |

**devDependencies:**

| 패키지 | 버전 |
|--------|------|
| electron | ^35.0.0 |
| electron-vite | ^5.0.0 |
| electron-builder | ^25.0.0 |
| typescript | ^5.7.0 |
| @types/react | ^19.0.0 |
| @types/react-dom | ^19.0.0 |
| @types/node | ^22.0.0 |
| @vitejs/plugin-react | ^4.0.0 |
| vitest | ^3.0.0 |
| @testing-library/react | ^16.0.0 |
| @testing-library/jest-dom | ^6.0.0 |
| @testing-library/user-event | ^14.0.0 |
| jsdom | ^26.0.0 |
| eslint | ^9.0.0 |
| @eslint/js | ^9.0.0 |
| typescript-eslint | ^8.0.0 |
| eslint-plugin-react | ^7.0.0 |
| eslint-plugin-react-hooks | ^5.0.0 |
| prettier | ^3.0.0 |

**scripts:**

```json
{
  "dev": "electron-vite dev",
  "build": "electron-vite build",
  "preview": "electron-vite preview",
  "test": "vitest",
  "test:coverage": "vitest --coverage",
  "lint": "eslint .",
  "format": "prettier --write \"src/**/*.{ts,tsx}\"",
  "typecheck": "tsc --noEmit"
}
```

**main 필드:** `"main": "dist/main/index.js"`

### M2: TypeScript 설정 (Priority: High)

**tsconfig.json (루트 - Project References):**
- `files: []` (직접 컴파일하지 않음)
- `references`: `tsconfig.node.json`, `tsconfig.web.json` 참조

**tsconfig.node.json (Main + Preload):**
- `target`: `"ESNext"`
- `module`: `"ESNext"`
- `moduleResolution`: `"bundler"`
- `strict`: `true`
- `include`: `["src/main/**/*", "src/preload/**/*", "electron.vite.config.ts"]`
- `types`: `["node"]`

**tsconfig.web.json (Renderer):**
- `target`: `"ESNext"`
- `module`: `"ESNext"`
- `moduleResolution`: `"bundler"`
- `strict`: `true`
- `jsx`: `"react-jsx"`
- `include`: `["src/renderer/**/*"]`
- `types`: `["node"]`

### M3: electron-vite 빌드 설정 (Priority: High)

**electron.vite.config.ts:**
- `main`: entry는 `src/main/index.ts`, externals로 electron 설정
- `preload`: entry는 `src/preload/index.ts`, externals로 electron 설정
- `renderer`: entry는 `src/renderer/index.html`, `@vitejs/plugin-react` 플러그인 적용, `resolve.alias`로 `@renderer` 단축 경로 설정

### M4: Main/Preload/Renderer 스텁 (Priority: High)

**src/main/index.ts:**
- `app.whenReady()`로 앱 초기화
- `BrowserWindow` 생성 (`width: 1200`, `height: 800`)
- `webPreferences`: `contextIsolation: true`, `nodeIntegration: false`, `preload` 경로 지정
- 개발 모드: `win.loadURL(process.env['ELECTRON_RENDERER_URL'])` 
- 프로덕션: `win.loadFile(join(__dirname, '../renderer/index.html'))`
- `app.on('window-all-closed')`: macOS 외 `app.quit()`

**src/preload/index.ts:**
- `contextBridge.exposeInMainWorld('api', {})` 스텁
- 주석으로 향후 IPC API 확장 가이드 기재

**src/renderer/index.html:**
- `<!DOCTYPE html>` HTML5 문서
- `<meta charset="UTF-8">`
- `<meta name="viewport">`
- `<title>Deskflow</title>`
- `<div id="root"></div>`
- `<script type="module" src="./main.tsx"></script>`

**src/renderer/main.tsx:**
- `createRoot(document.getElementById('root')!).render(<App />)`

**src/renderer/App.tsx:**
- 최소 함수형 컴포넌트: `<div><h1>Deskflow</h1></div>` 반환

### M5: 테스트 환경 (Priority: High)

**vitest.config.ts:**
- `test.environment`: `"jsdom"`
- `test.globals`: `true`
- `test.include`: `["src/**/*.test.{ts,tsx}"]`
- `test.setupFiles`: 필요시 setup 파일 경로

**src/renderer/__tests__/App.test.tsx (스모크 테스트):**
- App 컴포넌트 렌더링 후 "Deskflow" 텍스트 존재 확인
- `@testing-library/react`의 `render`, `screen` 사용

### M6: 코드 품질 도구 (Priority: High)

**eslint.config.mjs (ESLint 9 flat config):**
- `@eslint/js` recommended 규칙
- `typescript-eslint` strict 규칙
- `eslint-plugin-react` recommended 규칙
- `eslint-plugin-react-hooks` recommended 규칙
- React 버전 자동 감지 (`settings.react.version: "detect"`)
- ignorePatterns: `dist/`, `node_modules/`

**.prettierrc:**
- `semi`: `false`
- `singleQuote`: `true`
- `tabWidth`: `2`
- `trailingComma`: `"es5"`
- `printWidth`: `100`

## 기술적 접근

- electron-vite가 Main/Preload/Renderer를 각각 별도 Vite 인스턴스로 빌드하므로, 각 프로세스의 환경(Node.js vs Browser)이 자연스럽게 격리됨
- TypeScript Project References를 사용하여 IDE에서도 프로세스 간 타입 경계를 명확히 유지
- Vitest는 Renderer 전용으로 설정하되, `jsdom` 환경에서 React 컴포넌트 테스트 가능

## 구현 이력

### electron-vite 버전 업데이트 (실제 구현 시)

원계획에서는 electron-vite ^3.0.0을 명시했으나, 실제 구현 시 ^5.0.0이 설치되었습니다. 
이는 Vite 7.x 호환성 요구로 인한 선택이며, 빌드 출력 경로가 `dist/`에서 `out/`으로 변경되었습니다.
모든 인수 기준(S3~S6)은 electron-vite 5.0.0 환경에서 정상 통과했습니다.

## 리스크

| 리스크 | 영향 | 완화 방안 |
|--------|------|-----------|
| electron-vite 3.x와 React 19 호환성 | 빌드 실패 | electron-vite 공식 템플릿 참조, 버전 호환 매트릭스 확인 |
| ESLint 9 flat config + typescript-eslint 설정 복잡도 | lint 설정 오류 | eslint.config.mjs에서 점진적으로 규칙 추가 |
| Vitest의 Electron 환경 모킹 한계 | 테스트 커버리지 제한 | Renderer 레이어만 단위 테스트, IPC는 별도 SPEC에서 통합 테스트 |
