---
id: SPEC-PKG-001
type: acceptance
---

# SPEC-PKG-001: 인수 기준

## 시나리오

### AC-001: electron-builder 설정 파일 존재

**Given** Deskflow 프로젝트가 초기화되어 있을 때
**When** 프로젝트 루트 디렉터리를 확인하면
**Then** `electron-builder.yml` 파일이 존재하고
**And** `appId`가 `com.deskflow.app`으로 설정되어 있고
**And** `productName`이 `Deskflow`로 설정되어 있고
**And** `directories.output`이 `dist`로 설정되어 있고
**And** `files` 필드가 `out/**/*`를 포함한다

### AC-002: macOS 빌드 설정

**Given** `electron-builder.yml`이 존재할 때
**When** mac 섹션을 확인하면
**Then** `target`에 `dmg`이 포함되어 있고
**And** `category`가 `public.app-category.productivity`이고
**And** `identity`가 `null`로 설정되어 서명 없이 빌드 가능하다

### AC-003: Windows 빌드 설정

**Given** `electron-builder.yml`이 존재할 때
**When** win 섹션을 확인하면
**Then** `target`에 `nsis`가 포함되어 있고
**And** `nsis.oneClick`이 `false`이고
**And** `nsis.allowToChangeInstallationDirectory`가 `true`이다

### AC-004: Linux 빌드 설정

**Given** `electron-builder.yml`이 존재할 때
**When** linux 섹션을 확인하면
**Then** `target`에 `deb`와 `AppImage`가 포함되어 있고
**And** `category`가 `Utility`이다

### AC-005: dist 스크립트 실행

**Given** electron-vite 프로덕션 빌드가 성공하는 환경에서
**When** `npm run dist`를 실행하면
**Then** electron-vite 빌드가 `out/` 디렉터리에 산출물을 생성하고
**And** electron-builder가 `dist/` 디렉터리에 현재 플랫폼용 인스톨러를 생성하고
**And** 프로세스가 오류 없이 완료된다

### AC-006: 플랫폼별 스크립트 존재

**Given** `package.json`의 scripts 섹션을 확인할 때
**When** 패키징 관련 스크립트를 조회하면
**Then** `dist`, `dist:mac`, `dist:win`, `dist:linux`, `dist:dir` 5개 스크립트가 모두 존재한다

### AC-007: 빌드 리소스 디렉터리

**Given** 프로젝트 루트에서
**When** `resources/` 디렉터리를 확인하면
**Then** `icon.png` 파일이 존재한다

### AC-008: 코드 서명 없이 빌드 성공

**Given** 코드 서명 인증서가 없는 환경에서
**When** `npm run dist:dir`을 실행하면
**Then** 빌드가 서명 관련 오류 없이 완료되고
**And** `dist/` 디렉터리에 언패킹된 앱 번들이 생성된다

### AC-009: .gitignore 패턴

**Given** `.gitignore` 파일을 확인할 때
**When** electron-builder 관련 패턴을 조회하면
**Then** `dist/` 디렉터리가 무시 대상에 포함되어 있다

## 엣지 케이스

- EC-001: `out/` 디렉터리가 비어있거나 없을 때 `npm run dist` 실행 시 electron-vite 빌드가 먼저 실행되어 `out/`을 생성해야 한다
- EC-002: `dist/` 디렉터리가 이미 존재할 때 이전 빌드 결과를 덮어쓰거나 정리 후 새로 생성해야 한다
- EC-003: `resources/icon.png`가 없을 때 electron-builder가 기본 아이콘으로 빌드를 완료해야 한다

## 품질 게이트

- [ ] `electron-builder.yml` 파일 존재 및 올바른 YAML 문법
- [ ] `npm run dist:dir` 오류 없이 완료
- [ ] `dist/` 디렉터리에 빌드 산출물 존재
- [ ] TypeScript 0 오류 (`npm run typecheck`)
- [ ] ESLint 0 오류 (`npm run lint`)

## Definition of Done

1. `electron-builder.yml` 파일이 3-platform 타겟과 함께 생성됨
2. 5개 npm 스크립트 (`dist`, `dist:mac`, `dist:win`, `dist:linux`, `dist:dir`)가 추가됨
3. `resources/` 디렉터리에 플레이스홀더 아이콘이 존재함
4. `.gitignore`에 `dist/` 패턴이 포함됨
5. 현재 플랫폼에서 `npm run dist:dir` 빌드가 성공함
6. 코드 서명 없이 빌드 오류가 발생하지 않음
