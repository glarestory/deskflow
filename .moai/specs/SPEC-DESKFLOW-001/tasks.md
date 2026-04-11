# Task Decomposition
SPEC: SPEC-DESKFLOW-001

| Task ID | Description | Requirement | Dependencies | Planned Files | Status |
|---------|-------------|-------------|--------------|---------------|--------|
| T-001 | package.json 생성 - 모든 deps/scripts/main 필드 정의 | REQ-001~006 | - | package.json | completed |
| T-002 | TypeScript 설정 3개 파일 - Project References | REQ-003 | T-001 | tsconfig.json, tsconfig.node.json, tsconfig.web.json | completed |
| T-003 | electron-vite 빌드 설정 - 3-entry 설정 | REQ-002 | T-001 | electron.vite.config.ts | completed |
| T-004 | Vitest 설정 + 스모크 테스트 작성 (RED) | REQ-004 | T-001, T-002 | vitest.config.ts, src/renderer/__tests__/App.test.tsx | completed |
| T-005 | Renderer 소스 파일 - App/main/html (GREEN) | REQ-006 | T-004 | src/renderer/App.tsx, src/renderer/main.tsx, src/renderer/index.html | completed |
| T-006 | Main + Preload 스텁 (GREEN) | REQ-001, REQ-006 | T-002, T-003 | src/main/index.ts, src/preload/index.ts | completed |
| T-007 | ESLint 9 flat config (REFACTOR) | REQ-005 | T-005, T-006 | eslint.config.mjs | completed |
| T-008 | Prettier 설정 (REFACTOR) | REQ-005 | T-007 | .prettierrc | completed |
| T-009 | 전체 수락 기준 검증 S1~S6 | 전체 | T-001~T-008 | - | completed |
