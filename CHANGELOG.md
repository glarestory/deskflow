# Changelog

모든 주요 변경 사항은 이 파일에 문서화됩니다.

형식은 [Keep a Changelog](https://keepachangelog.com/)를 따르고,
버전 관리는 [Semantic Versioning](https://semver.org/)을 따릅니다.

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
