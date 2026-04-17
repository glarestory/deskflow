# SPEC-DESKFLOW-001: 인수 기준

## 시나리오 1: 개발 서버 정상 시작

**Given** SPEC-DESKFLOW-001이 구현 완료되고 `pnpm install`이 성공한 상태에서,
**When** 개발자가 `pnpm dev`를 실행하면,
**Then** electron-vite 개발 서버가 시작되고, Electron 윈도우가 열리며, "Deskflow" 텍스트가 화면에 표시된다.

### 검증 기준
- electron-vite dev 명령이 에러 없이 실행됨
- BrowserWindow가 생성되어 Renderer 콘텐츠를 로드함
- 콘솔에 빌드 에러가 출력되지 않음

## 시나리오 2: HMR 동작 확인

**Given** `pnpm dev`로 개발 서버가 실행 중인 상태에서,
**When** 개발자가 `src/renderer/App.tsx`의 텍스트를 변경하면,
**Then** Electron 앱을 재시작하지 않아도 변경된 내용이 화면에 반영된다.

### 검증 기준
- Renderer 파일 변경 시 HMR이 트리거됨
- 전체 페이지 새로고침 없이 컴포넌트가 업데이트됨

## 시나리오 3: TypeScript 컴파일 오류 없음

**Given** 모든 스텁 파일이 작성된 상태에서,
**When** 개발자가 `pnpm typecheck`를 실행하면,
**Then** TypeScript 컴파일러가 0건의 오류를 보고한다.

### 검증 기준
- `tsc --noEmit` 명령이 exit code 0으로 종료
- Main, Preload, Renderer 각 영역의 타입이 올바르게 해석됨
- strict 모드에서 any 타입 사용 없음

## 시나리오 4: Vitest 스모크 테스트 통과

**Given** `vitest.config.ts`와 스모크 테스트 파일이 존재하는 상태에서,
**When** 개발자가 `pnpm test`를 실행하면,
**Then** Vitest가 스모크 테스트를 탐지하고, 모든 테스트가 PASS한다.

### 검증 기준
- `vitest` 명령이 최소 1개 테스트 파일을 탐지
- App 컴포넌트 렌더링 테스트가 통과
- "Deskflow" 텍스트가 렌더링됨을 확인
- exit code 0으로 종료

## 시나리오 5: ESLint 오류 0건

**Given** 모든 스텁 파일이 작성된 상태에서,
**When** 개발자가 `pnpm lint`를 실행하면,
**Then** ESLint가 0건의 오류를 보고한다.

### 검증 기준
- `eslint .` 명령이 exit code 0으로 종료
- 모든 `.ts`, `.tsx` 파일이 lint 검사를 통과
- Warning은 허용하되, Error는 0건

## 시나리오 6: 프로덕션 빌드 성공

**Given** 모든 설정 파일과 스텁이 작성된 상태에서,
**When** 개발자가 `pnpm build`를 실행하면,
**Then** `out/` 디렉터리에 Main, Preload, Renderer 빌드 결과물이 생성된다.

### 검증 기준
- `electron-vite build` 명령이 exit code 0으로 종료
- `out/main/index.js` 파일이 존재
- `out/preload/index.js` 파일이 존재
- `out/renderer/index.html` 파일이 존재
- 빌드 결과물에 TypeScript 에러가 없음

## 엣지 케이스

### EC-001: package.json 의존성 누락
**If** 필수 의존성이 누락되면,
**Then** `pnpm install` 단계에서 명확한 오류 메시지가 출력되어야 한다.

### EC-002: Node.js 버전 불일치
**If** Node.js 버전이 요구사항(>=18)을 충족하지 않으면,
**Then** electron-vite가 명확한 호환성 오류를 출력해야 한다.

### EC-003: 빈 Renderer 컨텐츠
**If** `src/renderer/App.tsx`가 빈 컴포넌트를 반환하면,
**Then** 빌드는 성공하되, 빈 화면이 표시되어야 한다 (런타임 에러 없음).

## 품질 게이트 기준

| 항목 | 기준 | 유형 |
|------|------|------|
| TypeScript 오류 | 0건 | Must-pass |
| ESLint 오류 | 0건 | Must-pass |
| Vitest 테스트 | 전체 통과 | Must-pass |
| 프로덕션 빌드 | 성공 | Must-pass |
| HMR 동작 | 파일 변경 시 반영 | Should-pass |
| Prettier 포맷팅 | 모든 파일 일관됨 | Nice-to-have |

## 완료 정의 (Definition of Done)

- [ ] `pnpm install` 성공
- [ ] `pnpm dev`로 Electron 앱 실행 확인
- [ ] `pnpm typecheck` 오류 0건
- [ ] `pnpm test` 스모크 테스트 통과
- [ ] `pnpm lint` 오류 0건
- [ ] `pnpm build`로 out/ 결과물 생성 확인
- [ ] src/main/, src/preload/, src/renderer/ 디렉터리 구조 확인
- [ ] contextIsolation: true, nodeIntegration: false 설정 확인
