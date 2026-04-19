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
| 인증/동기화 | Firebase Auth 12.x + Firestore |
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

### 환경 변수 설정

`.env.example`을 `.env`로 복사하고 Firebase 프로젝트 설정값을 입력합니다.

```bash
cp .env.example .env
```

데모 플레이스홀더로도 앱이 시작되지만, 실제 로그인은 Firebase 설정이 필요합니다.

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
| `npm run dev:web` | 웹 개발 서버 실행 (브라우저, HMR) |
| `npm run build` | 프로덕션 빌드 (`out/` 생성) |
| `npm run build:web` | 웹 정적 파일 빌드 (`web-dist/` 생성) |
| `npm run preview` | 빌드된 앱 미리보기 |
| `npm test` | Vitest 테스트 실행 |
| `npm run test:coverage` | 커버리지 리포트 생성 |
| `npm run lint` | ESLint 검사 |
| `npm run format` | Prettier 포맷팅 |
| `npm run typecheck` | TypeScript 타입 검사 |
| `npm run dist` | 프로덕션 인스톨러 패키징 (모든 플랫폼) |
| `npm run dist:mac` | macOS DMG 패키징 |
| `npm run dist:win` | Windows NSIS 패키징 |
| `npm run dist:linux` | Linux deb/AppImage 패키징 |
| `npm run dist:dir` | 언패키지 앱 (테스트용) |

## 프로젝트 구조

```
src/
├── main/          # Electron 메인 프로세스 (BrowserWindow, IPC)
│   ├── index.ts
│   └── ipc/       # IPC 핸들러
│       └── storage.ts
├── preload/       # 프리로드 스크립트 (contextBridge)
│   └── index.ts
└── renderer/      # React 렌더러 프로세스
    ├── index.html
    ├── main.tsx
    ├── App.tsx
    ├── components/ # 위젯 컴포넌트
    │   ├── Clock/
    │   ├── SearchBar/
    │   ├── BookmarkCard/
    │   ├── EditModal/
    │   ├── TodoWidget/
    │   ├── NotesWidget/
    │   ├── CapsuleSwitcher/       # Context Capsule 전환 (드롭다운/바텀시트)
    │   ├── CapsuleEditModal/      # Context Capsule 편집
    │   └── CapsuleListPanel/      # Context Capsule 목록
    ├── lib/       # 유틸리티 라이브러리
    │   ├── storage.ts             # Electron IPC / localStorage 어댑터
    │   ├── capsuleMigration.ts    # 로컬 → Firestore 마이그레이션
    │   └── colorAdjust.ts         # OKLCH lightness 자동 보정
    ├── stores/    # Zustand 상태 관리
    │   ├── bookmarkStore.ts
    │   ├── todoStore.ts
    │   ├── themeStore.ts
    │   └── capsuleStore.ts        # Context Capsule 상태 관리
    ├── styles/    # 스타일 및 테마
    │   ├── themes.ts
    │   └── globals.css
    ├── types/     # TypeScript 타입
    │   ├── index.ts
    │   ├── electron.d.ts
    │   └── capsule.ts             # Capsule 엔티티 타입
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
- [x] SPEC-UI-001: Deskflow 위젯 시스템 (v0.2.0)
  - [x] 위젯 구현 (Clock, SearchBar, BookmarkCard, TodoWidget, NotesWidget)
  - [x] electron-store IPC 통신
  - [x] CSS 변수/테마 시스템 (다크/라이트 모드)
  - 62개 테스트 통과, TypeScript 0 오류, ESLint 0 오류
- [x] SPEC-PKG-001: electron-builder 패키징 (v0.3.0)
- [x] SPEC-WEB-001: 웹 배포 지원 (v0.4.0)
- [x] SPEC-AUTH-001: Firebase OAuth 로그인 + Firestore 동기화 (v0.5.0)
- [x] SPEC-IMPORT-001: Chrome 북마크 가져오기 (v0.6.0)
  - [x] Chrome Netscape Bookmark HTML 파싱 (DOMParser 기반)
  - [x] 카테고리 이름 기반 이모지 자동 할당
  - [x] 병합(merge) / 전체 교체(replace) 모드
  - [x] 빈 폴더 자동 제외, 중복 URL 처리
  - [x] ImportModal: 3단계 UI (파일 선택 → 미리보기 → 확인)
  - 104개 테스트 통과, TypeScript 0 오류
- [x] SPEC-CAPSULE-001: Context Capsule — 개발자 작업 맥락 스냅샷 (v0.7.0)
  - [x] Capsule 도메인 모델 + capsuleStore (CRUD + 영속화 + 메트릭)
  - [x] 활성 캡슐 복원 체인 (viewMode + pivotContext + pomodoro)
  - [x] CapsuleSwitcher (드롭다운/바텀시트 반응형 @640px)
  - [x] CapsuleEditModal + CapsuleListPanel (검색/정렬/보관)
  - [x] Command Palette 캡슐 액션 + Cmd+Shift+N 단축키
  - [x] 북마크/Todo 삭제 시 고아 참조 자동 정리
  - [x] OKLCH lightness 자동 보정 (테마별 대비 보장)
  - 729개 테스트 통과, TypeScript 0 오류, ESLint 0 오류

## RAG 검색 설정

RAG(Retrieval-Augmented Generation) 검색은 북마크를 벡터 임베딩으로 변환하여 자연어 시맨틱 검색을 제공합니다. `nomic-embed-text` 모델을 사용하며, 로컬 Ollama 서버가 필요합니다. Command Palette(`Cmd+K`)에서 입력한 쿼리와 의미적으로 유사한 북마크를 찾아줍니다.

### 요구사항

- [Ollama](https://ollama.com) 설치 (로컬 LLM 서버)
- `nomic-embed-text` 모델 설치

### 설치

```bash
# macOS/Linux
curl -fsSL https://ollama.com/install.sh | sh

# Windows
# https://ollama.com/download/windows 에서 다운로드

# 모델 설치
ollama pull nomic-embed-text
```

### CORS 설정 (웹 빌드 사용 시)

웹 빌드(`npm run dev:web`)를 사용할 경우 Ollama의 CORS 설정이 필요합니다.

```bash
# ~/.zshrc, ~/.bashrc, 또는 ~/.profile에 추가
export OLLAMA_ORIGINS="*"

# 또는 개발 서버 URL만 허용
export OLLAMA_ORIGINS="http://localhost:5173"
```

설정 후 터미널을 재시작하거나 `source ~/.zshrc`를 실행하세요.

### 상태 배지 및 문제 해결

Command Palette 상단의 상태 배지로 Ollama 연결 상태를 확인할 수 있습니다.

| 상태 | 의미 | 해결 방법 |
|------|------|-----------|
| 준비됨 | Ollama 연결 + 모델 정상 | 정상 |
| 모델 누락 | Ollama 연결 O, 모델 없음 | `ollama pull nomic-embed-text` 실행 |
| 미탐지 | Ollama 서버 미실행 | `ollama serve` 또는 앱 시작 |

**재시도**: 사이드바 설정 > RAG 검색 > 재시도 버튼으로 health check를 다시 실행할 수 있습니다.

**설정 조정**: 사이드바 설정 > RAG 검색에서 RAG 활성화 토글과 유사도 임계값(0.50~0.90)을 조정할 수 있습니다. 임계값이 낮을수록 더 많은 결과가 표시됩니다.

기술적 상세 내용은 `.moai/specs/SPEC-SEARCH-RAG-001/spec.md`를 참조하세요.

## 라이선스

Private

---

제작: ZeroJuneK
