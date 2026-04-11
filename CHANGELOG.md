# Changelog

모든 주요 변경 사항은 이 파일에 문서화됩니다.

형식은 [Keep a Changelog](https://keepachangelog.com/)를 따르고,
버전 관리는 [Semantic Versioning](https://semver.org/)을 따릅니다.

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
