# Deskflow — 프로젝트 구조

## 현재 상태

SPEC-DESKFLOW-001 기본 구현 완료. SPEC-SEARCH-RAG-001 (RAG 검색 기능) 구현 완료.
아래 구조는 현재 프로젝트 상태를 반영합니다.

## 목표 디렉터리 구조

```
Deskflow/
├── electron.vite.config.ts          # electron-vite 빌드 설정
├── package.json                     # 프로젝트 메타데이터 및 스크립트
├── tsconfig.json                    # TypeScript 루트 설정
├── tsconfig.node.json               # Main/Preload TypeScript 설정
├── tsconfig.web.json                # Renderer TypeScript 설정
├── .eslintrc.cjs                    # ESLint 설정
├── .prettierrc                      # Prettier 설정
│
├── src/
│   ├── main/                        # Electron Main Process (Node.js 환경)
│   │   ├── index.ts                 # BrowserWindow 생성, 앱 생명주기
│   │   └── ipc/
│   │       └── storage.ts           # electron-store IPC 핸들러
│   │
│   ├── preload/                     # Preload Bridge (격리된 컨텍스트)
│   │   ├── index.ts                 # contextBridge 등록
│   │   └── api.ts                   # window.storage API 타입 정의
│   │
│   └── renderer/                    # React Renderer (브라우저 환경)
│       ├── index.html               # HTML 진입점
│       ├── main.tsx                 # React 마운트
│       ├── App.tsx                  # 루트 컴포넌트 (ProductivityHub)
│       │
│       ├── components/              # 재사용 가능한 UI 컴포넌트
│       │   ├── Clock/
│       │   │   ├── Clock.tsx        # 실시간 시계 + 날짜
│       │   │   └── Clock.test.tsx
│       │   ├── SearchBar/
│       │   │   ├── SearchBar.tsx    # Google 검색바
│       │   │   └── SearchBar.test.tsx
│       │   ├── BookmarkCard/
│       │   │   ├── BookmarkCard.tsx # 카테고리 + 링크 그리드
│       │   │   └── BookmarkCard.test.tsx
│       │   ├── TodoWidget/
│       │   │   ├── TodoWidget.tsx   # 할 일 목록
│       │   │   └── TodoWidget.test.tsx
│       │   ├── NotesWidget/
│       │   │   ├── NotesWidget.tsx  # 빠른 메모
│       │   │   └── NotesWidget.test.tsx
│       │   ├── EditModal/
│       │   │   ├── EditModal.tsx    # 북마크 편집 모달
│       │   │   └── EditModal.test.tsx
│       │   ├── TopBar/
│       │   │   ├── TopBar.tsx       # 상단 네비게이션 바
│       │   │   └── TopBar.test.tsx
│       │   ├── CommandPalette/      # Command Palette UI (SPEC-UX-002, SPEC-SEARCH-RAG-001)
│       │   │   ├── CommandPalette.tsx
│       │   │   ├── RagStatusBadge.tsx + .test.tsx
│       │   │   └── CommandPalette.test.tsx
│       │   └── ProgressToast/       # 진행률 Toast (SPEC-SEARCH-RAG-001)
│       │       ├── ProgressToast.tsx
│       │       └── ProgressToast.test.tsx
│       │
│       ├── hooks/                   # 커스텀 훅
│       │   ├── useStorage.ts        # window.storage IPC 래퍼
│       │   ├── useTheme.ts          # 다크/라이트 테마 관리
│       │   └── useClock.ts          # 시간 상태 관리
│       │
│       ├── stores/                  # Zustand 상태 관리
│       │   ├── bookmarkStore.ts     # 북마크 CRUD 상태
│       │   ├── todoStore.ts         # 할 일 목록 상태
│       │   ├── themeStore.ts        # 테마 상태
│       │   ├── embeddingStore.ts    # 북마크 임베딩 저장소 (SPEC-SEARCH-RAG-001)
│       │   └── ragStore.ts          # RAG 검색 상태 + health check (SPEC-SEARCH-RAG-001)
│       │
│       ├── lib/                     # 유틸리티 함수
│       │   ├── ollamaClient.ts + .test.ts # Ollama HTTP 클라이언트 (SPEC-SEARCH-RAG-001)
│       │   ├── cosineSimilarity.ts + .test.ts # 벡터 유사도 계산 (SPEC-SEARCH-RAG-001)
│       │   ├── contentHash.ts + .test.ts # SHA-256 해시 (SPEC-SEARCH-RAG-001)
│       │   ├── firestoreEmbeddingStorage.ts + .test.ts # Firestore 서브컬렉션 I/O (SPEC-SEARCH-RAG-001)
│       │   └── searchAll.ts          # 검색 통합 (fuzzy + RAG)
│       │
│       ├── styles/                  # 전역 스타일
│       │   ├── globals.css          # CSS 변수 정의, 리셋
│       │   └── themes.ts            # 다크/라이트 테마 토큰
│       │
│       └── types/                   # TypeScript 타입 정의
│           ├── index.ts             # 공유 타입 (Bookmark, Todo, Theme 등)
│           └── embedding.ts         # BookmarkEmbedding 타입 (SPEC-SEARCH-RAG-001)
│
├── resources/                       # 앱 아이콘 및 정적 에셋
│   └── icon.png
│
├── tests/                           # E2E 테스트 (Playwright)
│   └── e2e/
│       └── app.spec.ts
│
└── .moai/                           # MoAI 프로젝트 설정
    ├── project/                     # 프로젝트 문서
    └── specs/                       # SPEC 문서
```

## Electron 아키텍처

### Main/Preload/Renderer 분리 원칙

```
[Main Process] (Node.js 전체 권한)
  ├── BrowserWindow 관리
  ├── electron-store 직접 접근
  └── IPC 핸들러 등록 (ipcMain)
        ↕ IPC 통신
[Preload Script] (격리된 브릿지)
  ├── contextBridge.exposeInMainWorld('storage', ...)
  └── window.storage API 노출
        ↕ window.storage
[Renderer Process] (브라우저 환경, Node.js 접근 불가)
  ├── React 컴포넌트 트리
  └── window.storage로만 데이터 영속화
```

### 보안 설정
- `contextIsolation: true` (필수)
- `nodeIntegration: false` (필수)
- `webSecurity: true` (기본값 유지)

---
생성: 2026-04-11
