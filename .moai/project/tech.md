# Deskflow — 기술 스택

## 핵심 의존성

| 카테고리 | 패키지 | 버전 | 역할 |
|---|---|---|---|
| **런타임** | electron | ^35.x | 크로스플랫폼 데스크톱 셸 |
| **빌드** | electron-vite | ^3.x | Electron 전용 Vite 통합, HMR |
| **UI** | react | ^19.x | 컴포넌트 기반 UI |
| **UI** | react-dom | ^19.x | DOM 렌더링 |
| **언어** | typescript | ^5.7 | 정적 타입 시스템 |
| **스토리지** | electron-store | ^10.x | 영속 JSON 스토리지 |
| **상태** | zustand | ^5.x | 경량 상태 관리 |

## 개발 의존성

| 패키지 | 버전 | 역할 |
|---|---|---|
| @types/react | ^19.x | React TypeScript 타입 |
| @types/node | ^22.x | Node.js TypeScript 타입 |
| vitest | ^3.x | 단위 테스트 프레임워크 |
| @testing-library/react | ^16.x | React 컴포넌트 테스트 |
| @testing-library/user-event | ^14.x | 사용자 인터랙션 시뮬레이션 |
| @vitejs/plugin-react | ^4.x | Vite React 플러그인 |
| playwright | ^1.50 | E2E 테스트 (Electron 지원) |
| electron-builder | ^25.x | 크로스플랫폼 패키징 |
| eslint | ^9.x | 코드 품질 검사 |
| prettier | ^3.x | 코드 포맷팅 |

## 패키지 매니저

- **pnpm** v10.x 권장 (빠른 설치, 디스크 효율적 hoisting)

## 빌드 파이프라인

```
electron-vite build
  ├── main/ → dist/main/         (Node.js + Electron API)
  ├── preload/ → dist/preload/   (contextBridge 스크립트)
  └── renderer/ → dist/renderer/ (React 번들 + HTML)
electron-builder
  └── dist/installer/            (플랫폼별 인스톨러)
```

## 개발 환경 스크립트 (목표)

```json
{
  "scripts": {
    "dev": "electron-vite dev",
    "build": "electron-vite build",
    "preview": "electron-vite preview",
    "package": "electron-builder",
    "test": "vitest",
    "test:coverage": "vitest --coverage",
    "test:e2e": "playwright test",
    "lint": "eslint src --ext ts,tsx",
    "typecheck": "tsc --noEmit"
  }
}
```

## 스타일링 전략

- **CSS Variables**: 테마 토큰 정의 (`--bg`, `--card-bg`, `--accent` 등)
- **CSS Modules** (컴포넌트 격리)
- 기존 `productivity-hub.jsx`의 인라인 스타일 → CSS Modules로 점진적 전환

## 테스트 전략

| 레이어 | 도구 | 목표 커버리지 |
|---|---|---|
| 단위 (컴포넌트) | Vitest + Testing Library | 85%+ |
| 통합 (IPC) | Vitest + vi.mock() | 주요 경로 100% |
| E2E | Playwright (Electron) | 핵심 시나리오 |

## 보안 고려사항

- `contextIsolation: true`, `nodeIntegration: false` 필수
- CSP (Content-Security-Policy) 헤더 설정
- IPC 채널 화이트리스트 관리
- 외부 URL은 기본 브라우저에서 열기 (`shell.openExternal`)

---
생성: 2026-04-11
