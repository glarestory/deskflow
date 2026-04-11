# SPEC-WEB-001 Progress

## Status: COMPLETE

## Tasks

| Task | Description | Status |
|------|-------------|--------|
| T-001 | `src/renderer/lib/storage.ts` 생성 | DONE |
| T-001 | `src/renderer/lib/storage.test.ts` 생성 (3 tests) | DONE |
| T-002 | `bookmarkStore.ts` — `window.storage` → `storage` 교체 | DONE |
| T-003 | `todoStore.ts` — `window.storage` → `storage` 교체 | DONE |
| T-004 | `themeStore.ts` — `window.storage` → `storage` 교체 | DONE |
| T-005 | `NotesWidget.tsx` — `window.storage` → `storage` 교체 | DONE |
| T-006 | `vite.web.config.ts` 생성 | DONE |
| T-007 | `package.json` scripts 추가 (`dev:web`, `build:web`) | DONE |
| T-008 | 빌드 검증 (`npm run build:web`) | DONE |

## Test Results

- Total tests: 65 passed (12 test files)
- New tests: 3 (storage.test.ts)
- Regressions: 0
- TypeScript: 0 errors

## Build Results

```
vite v7.3.2 building client environment for production...
✓ 42 modules transformed.
web-dist/index.html                  0.32 kB │ gzip:  0.24 kB
web-dist/assets/index-DzmrbAWI.js  209.84 kB │ gzip: 65.53 kB
✓ built in 562ms
```

## Architecture Decision

- Option B (vi.stubGlobal) 채택: 기존 스토어 테스트 변경 없이 호환
- `storage.ts`의 `isElectron()` 함수가 `window.storage` 유무를 감지
- 테스트에서 `vi.stubGlobal('storage', mockStorage)` → `isElectron()` true 반환 → mock 경로 사용
