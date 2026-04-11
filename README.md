# Deskflow

개인 생산성을 극대화하는 올인원 데스크톱 허브 애플리케이션.

Electron + React 19 + TypeScript로 구현된 크로스플랫폼 데스크톱 앱으로,
북마크, 할 일, 메모, 검색을 하나의 화면에서 관리합니다.

## 기술 스택

| 카테고리 | 기술 |
|------|------|
| 런타임 | Electron 35.x |
| UI | React 19 + TypeScript 5.7 (strict) |
| 빌드 | electron-vite 5.0.0 (Main / Preload / Renderer 3-프로세스) |
| 상태 관리 | Zustand 5.x |
| 스토리지 | electron-store 10.x |
| 테스트 | Vitest 3.x + @testing-library/react 16.x |
| 린터 | ESLint 9 (flat config) + Prettier 3.x |

## 시작하기

### 요구사항

- Node.js 18 이상
- npm 또는 pnpm

### 설치

```bash
npm install
```

### 개발 서버 실행

```bash
npm run dev
```

Electron 앱이 실행되며 HMR(Hot Module Replacement)이 활성화됩니다.

### 빌드

```bash
npm run build
```

빌드 결과물은 `out/` 디렉터리에 생성됩니다.

## 스크립트

| 명령 | 설명 |
|------|------|
| `npm run dev` | 개발 서버 + Electron 앱 실행 (HMR 포함) |
| `npm run build` | 프로덕션 빌드 (`out/` 생성) |
| `npm run preview` | 빌드된 앱 미리보기 |
| `npm test` | Vitest 테스트 실행 |
| `npm run test:coverage` | 커버리지 리포트 생성 |
| `npm run lint` | ESLint 검사 |
| `npm run format` | Prettier 포맷팅 |
| `npm run typecheck` | TypeScript 타입 검사 |

## 프로젝트 구조

```
src/
├── main/          # Electron 메인 프로세스 (BrowserWindow, IPC)
│   └── index.ts
├── preload/       # 프리로드 스크립트 (contextBridge)
│   └── index.ts
└── renderer/      # React 렌더러 프로세스
    ├── index.html
    ├── main.tsx
    ├── App.tsx
    └── __tests__/
        └── App.test.tsx
```

### 아키텍처

electron-vite의 3-프로세스 구조를 따릅니다.

- **Main**: Node.js 환경, BrowserWindow 관리, 시스템 API 접근
- **Preload**: `contextBridge`로 Main ↔ Renderer 간 안전한 IPC 브릿지
- **Renderer**: 브라우저 환경, React 앱

보안 설정: `contextIsolation: true`, `nodeIntegration: false`

## 개발 현황

- [x] SPEC-DESKFLOW-001: 프로젝트 스캐폴딩 (v0.1.0)
  - electron-vite 5.0.0 + React 19 + TypeScript 5.7 빌드 환경
  - Vitest 스모크 테스트, ESLint 9 flat config, Prettier
- [ ] 위젯 구현 (Clock, SearchBar, BookmarkCard, TodoWidget, NotesWidget)
- [ ] electron-store IPC 통신
- [ ] CSS 변수/테마 시스템 (다크/라이트)
- [ ] electron-builder 패키징

## 라이선스

Private

---

제작: ZeroJuneK
