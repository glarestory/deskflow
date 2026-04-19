# Changelog

모든 주요 변경 사항은 이 파일에 문서화됩니다.

형식은 [Keep a Changelog](https://keepachangelog.com/)를 따르고,
버전 관리는 [Semantic Versioning](https://semver.org/)을 따릅니다.

## [0.8.0] - 2026-04-20

### Added

- SPEC-SEARCH-RAG-001: Local RAG 검색 — Ollama nomic-embed-text 기반 시맨틱 북마크 검색
  - `src/renderer/lib/ollamaClient.ts`: Ollama HTTP 클라이언트 (health check, embed, listModels)
  - `src/renderer/lib/cosineSimilarity.ts`: 코사인 유사도 계산 (벡터 정규화 포함)
  - `src/renderer/lib/contentHash.ts`: SHA-256 contentHash (변경 감지)
  - `src/renderer/types/embedding.ts`, `src/renderer/stores/embeddingStore.ts`: 벡터 저장/큐 관리 (CRUD + 영속화 + 인덱싱 배치)
  - `src/renderer/lib/firestoreEmbeddingStorage.ts`: Firestore 서브컬렉션 임베딩 저장소
  - `src/renderer/stores/ragStore.ts`: RAG 상태 관리 (checkHealth, search, setEnabled, setThreshold, loadSettings)
  - `src/renderer/lib/searchAll.ts`: ragResults 통합 (Command Palette 검색 결과 병합)
  - `src/renderer/components/CommandPalette/`: health-check effect + RAG 검색 effect 추가
  - `src/renderer/components/CommandPalette/RagStatusBadge.tsx`: Ollama 상태 배지 (준비됨/모델 누락/미탐지)
  - `src/renderer/components/CommandPalette/ResultItem.tsx`: RAG 결과 variant 렌더링
  - `src/renderer/components/ProgressToast/ProgressToast.tsx`: 인덱싱 진행률 Toast (AC-013, AC-014)
  - `src/renderer/components/PivotLayout/SidebarSettings.tsx`: RAG 설정 섹션 (토글 + 임계값 슬라이더 + 재시도 버튼)
  - `src/renderer/lib/migration.ts`: rag-embeddings 로컬 → Firestore 마이그레이션 (AC-018)
  - App.tsx: 로그인 직후 임베딩 복원 + 누락 링크 자동 인덱싱 (AC-012)

### Changed

- `src/renderer/stores/ragStore.ts`: loadSettings() 추가 — `rag-settings` 스토리지 키로 enabled/similarityThreshold 영속화 (AC-032)
- `src/renderer/stores/bookmarkStore.ts`: 북마크 저장/삭제 시 embeddingStore 연동 (enqueueIndex, removeEmbedding)

## [0.7.0] - 2026-04-19

### Added

- SPEC-CAPSULE-001: Context Capsule — 개발자 작업 맥락 스냅샷
  - `src/renderer/types/capsule.ts`: Capsule 엔티티 + PomodoroPreset + CapsuleMetrics 타입
  - `src/renderer/stores/capsuleStore.ts`: Zustand 기반 캡슐 상태 관리 (CRUD + 활성화 + 복원 + 메트릭)
  - `src/renderer/stores/capsuleStore.test.ts`, `.integration.test.ts`: 84개 테스트 (엔티티, 영속화, 복원 체인, 고아 처리, 자동 추가)
  - `src/renderer/components/CapsuleSwitcher/`: 캡슐 전환 UI (드롭다운 & 반응형 바텀시트 @640px)
  - `src/renderer/components/CapsuleEditModal/`: 캡슐 편집 모달 (이름/이모지/색상/설명/태그)
  - `src/renderer/components/CapsuleListPanel/`: 캡슐 목록 패널 (검색/정렬/보관 탭)
  - `src/renderer/lib/capsuleMigration.ts`: 로컬 → Firestore 마이그레이션 (Firestore 동기화 REQ-004)
  - `src/renderer/lib/colorAdjust.ts`: OKLCH lightness 자동 보정 (DEC-002, 테마별 대비 WCAG AA 보장)
  - Command Palette 캡슐 액션: "캡슐: 새로 만들기", "캡슐: 모든 캡슐 보기", "캡슐: 활성 캡슐 편집", "캡슐: 해제", 캡슐별 "활성화" 및 "보관/복원" 동적 액션
  - 키보드 단축키: `Ctrl/Cmd + Shift + N` (신규 캡슐 생성, 입력 포커스 중 비활성)
  - activeCapsuleId + autoAddToActive=true 상태에서 신규 북마크/Todo 생성 시 활성 캡슐에 자동 추가 (REQ-011)

### Changed

- `bookmarkStore.ts`, `todoStore.ts`: removeBookmark/removeTodo 시 `capsuleStore.purgeOrphan` 호출 (REQ-017)
- `bookmarkStore.ts`, `todoStore.ts`: addBookmark/addTodo 시 활성 캡슐 + `autoAddToActive=true`이면 자동 추가 (REQ-011)
- `pomodoroStore.ts`: 세션 완료 시 `capsuleStore.incrementMetric('focusMinutes', minutes)` 호출
- `App.tsx`: `loadCapsules()` 호출 + CapsuleSwitcher/CapsuleEditModal/CapsuleListPanel 마운트 + 활성화 복원 체인
- `CommandPalette.tsx`: 캡슐 액션 5개 + 동적 주입 패턴으로 리팩토링
- `styles/themes.ts`: `--capsule-*` CSS 변수 토큰 추가 (OKLCH 색상)
- `lib/migration.ts`: 캡슐 데이터 포함해 Firestore 마이그레이션

### Technical

- 테스트 증가: 618개 → 729개 (+111, 캡슐 store/component/integration/hooks 추가)
- 신규 파일: 13개 (types, stores, components, lib)
- 수정 파일: 10개 (App, Command Palette, Widgets, Stores, Migration, Themes)
- TypeScript: 0 오류 유지 (strict mode)
- ESLint: 0 오류 유지 (flat config)
- 코드 커버리지: 85% 이상 달성
- 설계 결정: DEC-001~DEC-004 확정 (autoAddToActive=true, OKLCH 보정, Firestore 배열 필드, CSS 미디어 쿼리)
- Firestore 스키마: `/users/{uid}/capsules/{capsuleId}` (배열 필드 MVP, 향후 서브컬렉션으로 확장 가능)
- 성능: CapsuleSwitcher 오픈 < 50ms, 활성화 반영 < 200ms (NFR-002)

---

## [0.6.0] - 2026-04-11

### Added

- SPEC-IMPORT-001: Chrome 북마크 가져오기
  - `src/renderer/lib/bookmarkParser.ts`: Chrome Netscape Bookmark HTML 파서 (DOMParser 기반, 외부 의존성 없음)
  - `src/renderer/components/ImportModal/ImportModal.tsx`: 3단계 임포트 모달 (파일 선택 → 미리보기 → 병합/교체)
  - `importBookmarks(categories, mode)` 액션: bookmarkStore 확장 (병합/전체 교체)
  - `getEmojiForCategory(name)`: 카테고리 이름 키워드 기반 이모지 자동 매핑
  - App.tsx: TopBar "+ 가져오기" 버튼 추가

### Changed

- `bookmarkStore.ts`: `importBookmarks` 액션 추가 (merge 모드: URL 중복 제거, replace 모드: 전체 교체)
- `App.tsx`: ImportModal 상태 관리 및 렌더링 추가

### Technical

- 파서 동작: 빈 폴더 자동 제외, 병합 모드에서 동일 이름 카테고리에 링크 추가
- 테스트: 104개 통과 / 17개 테스트 파일 (기존 81개 + 신규 23개)
- 외부 의존성 없음: 브라우저 내장 DOMParser 활용 (jsdom 환경에서도 동작)

---

## [0.5.0] - 2026-04-12

### Added

- SPEC-AUTH-001: Firebase OAuth 로그인 + Firestore 동기화
  - Google/GitHub 소셜 로그인 (Firebase Auth 12.x)
  - 로그인 화면(LoginScreen): 다크 테마, 두 OAuth 버튼
  - Firestore 데이터 동기화: bookmarks/todos/theme/notes → `users/{uid}/data/`
  - 로컬 데이터 마이그레이션: 첫 로그인 시 localStorage → Firestore 자동 이관
  - `setUserStorage(uid)`: 로그인/로그아웃 시 저장소 자동 전환
  - `.env.example` 환경변수 템플릿 추가

### Changed

- `storage.ts`: Firestore 동적 라우팅 지원 (`setUserStorage`, `createUserStorage`)
- `App.tsx`: 인증 게이트 추가 (미로그인 → LoginScreen, 로그인 → Hub)

---

## [0.4.0] - 2026-04-12

### Added

- SPEC-WEB-001: 웹 배포 지원
  - `src/renderer/lib/storage.ts`: Electron IPC / localStorage 자동 감지 어댑터
  - `vite.web.config.ts`: 브라우저 전용 Vite 빌드 설정
  - npm scripts: `dev:web` (개발 서버), `build:web` (정적 빌드 → web-dist/)
  - Electron 앱과 웹 브라우저 동시 지원

### Changed

- `bookmarkStore`, `todoStore`, `themeStore`, `NotesWidget`: window.storage 직접 호출 → storage 어댑터 사용

---

## [0.3.0] - 2026-04-11

### Added

- SPEC-PKG-001: electron-builder 패키징 설정
  - `electron-builder.yml`: macOS(DMG), Windows(NSIS), Linux(deb/AppImage) 멀티 플랫폼 설정
  - npm scripts: `dist`, `dist:mac`, `dist:win`, `dist:linux`, `dist:dir`
  - `resources/icon.png`: 플레이스홀더 앱 아이콘
  - `npm run dist:dir` 검증 완료 (linux-unpacked 생성)

---

## [0.2.0] - 2026-04-11

### Added

- SPEC-UI-001: Deskflow 위젯 시스템 구현
  - Clock 위젯: 1초 갱신 시계, 한국어 날짜, 시간대별 인사말
  - SearchBar 위젯: Google 검색, 빈 검색어 무시
  - BookmarkCard 위젯: 카테고리별 2열 링크 그리드, 편집 모달
  - TodoWidget: 할 일 추가/토글/삭제, 미완료 수 표시
  - NotesWidget: 600ms 디바운스 자동 저장
  - electron-store IPC 스토리지 브릿지 (storage:get / storage:set)
  - Zustand 5.x 상태 관리 (bookmarkStore, todoStore, themeStore)
  - CSS 변수 테마 시스템 (다크: #0f1117, 라이트 모드)

### Quality Gates

- `npm test --run`: 62 tests PASS
- `npm run typecheck`: 0 errors PASS
- `npm run lint`: 0 errors PASS
- Code coverage: 85%+ achieved

---

## [0.1.0] - 2026-04-11

### Added

- Electron + React 19 + TypeScript 프로젝트 스캐폴드 (SPEC-DESKFLOW-001)
- electron-vite 5.0.0 빌드 시스템 (3-프로세스 아키텍처: main/preload/renderer)
- TypeScript 5.7 strict 모드 + Project References
- Vitest 3.x + @testing-library/react 스모크 테스트 스위트
- ESLint 9 flat config + Prettier 코드 품질 도구
- BrowserWindow 보안 설정 (contextIsolation:true, nodeIntegration:false)
- 개발 서버 HMR(Hot Module Replacement) 지원
- 타입 체크 (`pnpm typecheck`), 린트 (`pnpm lint`), 포매팅 (`pnpm format`) 스크립트

### Technical Notes

- **electron-vite 버전**: 원계획 ^3.0.0 → 실제 ^5.0.0 (Vite 7.x 호환성)
- **빌드 출력**: `dist/` → `out/` (electron-vite 5.0.0 기본값)
- **인수 기준**: S3(typecheck), S4(test), S5(lint), S6(build) 모두 통과
- **Project Structure**: src/main/, src/preload/, src/renderer/ 3계층 격리

### Quality Gates

- TypeScript: 0 errors (strict mode)
- ESLint: 0 errors
- Vitest: All smoke tests passing
- Build: `pnpm build` → `out/main`, `out/preload`, `out/renderer` 생성 확인

---

**제작**: ZeroJuneK
**프로젝트**: Deskflow (개인 생산성 데스크톱 허브)
