---
id: SPEC-PKG-001
version: "1.0.0"
status: draft
created: "2026-04-11"
updated: "2026-04-11"
author: ZeroJuneK
priority: high
issue_number: 0
---

# SPEC-PKG-001: electron-builder 패키징 설정

## HISTORY

| 버전 | 날짜 | 작성자 | 변경 내용 |
|------|------|--------|-----------|
| 1.0.0 | 2026-04-11 | ZeroJuneK | 초기 SPEC 작성 |

## 개요

Deskflow 프로젝트에 electron-builder를 설정하여 macOS(.dmg), Windows(.exe NSIS), Linux(.deb, .AppImage) 플랫폼별 배포 가능한 인스톨러를 생성한다. electron-vite 빌드 산출물(`out/`)을 기반으로 electron-builder가 패키징하여 `dist/` 디렉터리에 인스톨러를 출력하는 파이프라인을 구성한다.

현재 상태: electron-builder v25.1.8이 devDependencies에 설치되어 있으나, 빌드 설정 파일(`electron-builder.yml`)과 배포용 npm scripts가 없는 상태.

## 요구사항

### REQ-001: electron-builder 설정 파일

**[Ubiquitous]** Deskflow 시스템은 프로젝트 루트에 `electron-builder.yml` 설정 파일을 포함**해야 한다(shall)**.

- REQ-001-1: 설정 파일은 `appId`를 `com.deskflow.app` 형식으로 지정**해야 한다(shall)**.
- REQ-001-2: `productName`은 `Deskflow`로 설정**되어야 한다(shall)**.
- REQ-001-3: `directories.output`은 `dist`로 설정하여 electron-vite 빌드 디렉터리(`out/`)와 분리**해야 한다(shall)**.
- REQ-001-4: `directories.buildResources`는 `resources`로 설정**해야 한다(shall)**.
- REQ-001-5: `files` 필드는 electron-vite가 출력하는 `out/**/*` 경로를 포함**해야 한다(shall)**.

### REQ-002: macOS 빌드 타겟

**[State-Driven]** **While** 빌드 플랫폼이 macOS일 때, electron-builder는 `.dmg` 디스크 이미지를 생성**해야 한다(shall)**.

- REQ-002-1: `mac.target`은 `dmg`을 포함**해야 한다(shall)**.
- REQ-002-2: `mac.category`는 `public.app-category.productivity`로 설정**되어야 한다(shall)**.
- REQ-002-3: **While** 코드 서명 인증서가 없는 환경에서, `mac.identity`를 `null`로 설정하여 서명 없이 빌드가 완료**되어야 한다(shall)**.

### REQ-003: Windows 빌드 타겟

**[State-Driven]** **While** 빌드 플랫폼이 Windows일 때, electron-builder는 NSIS 인스톨러(`.exe`)를 생성**해야 한다(shall)**.

- REQ-003-1: `win.target`은 `nsis`를 포함**해야 한다(shall)**.
- REQ-003-2: `nsis.oneClick`은 `false`로 설정하여 사용자가 설치 경로를 선택할 수 있게 **해야 한다(shall)**.
- REQ-003-3: `nsis.allowToChangeInstallationDirectory`는 `true`로 설정**되어야 한다(shall)**.

### REQ-004: Linux 빌드 타겟

**[State-Driven]** **While** 빌드 플랫폼이 Linux일 때, electron-builder는 `.deb`와 `.AppImage` 포맷을 생성**해야 한다(shall)**.

- REQ-004-1: `linux.target`은 `deb`와 `AppImage`를 포함**해야 한다(shall)**.
- REQ-004-2: `linux.category`는 `Utility`로 설정**되어야 한다(shall)**.

### REQ-005: npm 스크립트

**[Event-Driven]** **When** 개발자가 `npm run dist` 명령을 실행하면, electron-vite 프로덕션 빌드 후 electron-builder 패키징이 순차적으로 실행**되어야 한다(shall)**.

- REQ-005-1: `dist` 스크립트는 `electron-vite build && electron-builder` 명령을 실행**해야 한다(shall)**.
- REQ-005-2: `dist:mac` 스크립트는 `electron-vite build && electron-builder --mac` 명령을 실행**해야 한다(shall)**.
- REQ-005-3: `dist:win` 스크립트는 `electron-vite build && electron-builder --win` 명령을 실행**해야 한다(shall)**.
- REQ-005-4: `dist:linux` 스크립트는 `electron-vite build && electron-builder --linux` 명령을 실행**해야 한다(shall)**.
- REQ-005-5: `dist:dir` 스크립트는 `electron-vite build && electron-builder --dir` 명령을 실행하여 압축 없는 디렉터리 출력을 지원**해야 한다(shall)**.

### REQ-006: 빌드 리소스

**[Ubiquitous]** 프로젝트는 `resources/` 디렉터리에 앱 아이콘 플레이스홀더를 포함**해야 한다(shall)**.

- REQ-006-1: `resources/icon.png` 파일이 존재**해야 한다(shall)** (최소 512x512px 플레이스홀더).
- REQ-006-2: **Where** macOS 빌드가 필요한 경우, `resources/icon.icns` 파일이 제공**되어야 한다(shall)** (v1에서는 electron-builder 자동 변환에 의존 가능).
- REQ-006-3: **Where** Windows 빌드가 필요한 경우, `resources/icon.ico` 파일이 제공**되어야 한다(shall)** (v1에서는 electron-builder 자동 변환에 의존 가능).

### REQ-007: .gitignore 업데이트

**[Ubiquitous]** `.gitignore` 파일은 electron-builder 패키징 산출물을 제외**해야 한다(shall)**.

- REQ-007-1: `dist/` 디렉터리가 `.gitignore`에 포함**되어야 한다(shall)** (이미 포함 확인됨).
- REQ-007-2: electron-builder 임시 파일 패턴이 `.gitignore`에 포함**되어야 한다(shall)**.

### REQ-008: electron-vite + electron-builder 통합

**[Complex]** **While** 프로덕션 빌드 파이프라인에서, **When** `npm run dist`가 실행되면, electron-vite가 `out/` 디렉터리에 Main/Preload/Renderer 번들을 생성하고 electron-builder가 이 산출물을 패키징하여 `dist/`에 인스톨러를 출력**해야 한다(shall)**.

- REQ-008-1: electron-builder의 `files` 설정이 electron-vite의 출력 구조(`out/main`, `out/preload`, `out/renderer`)와 정합**해야 한다(shall)**.
- REQ-008-2: `package.json`의 `main` 필드(`out/main/index.js`)가 electron-builder의 엔트리 포인트로 사용**되어야 한다(shall)**.

## 비기능 요구사항

- NFR-001: **[Unwanted]** 코드 서명 인증서가 없는 환경에서 빌드가 서명 오류로 실패**해서는 안 된다(shall not)**.
- NFR-002: `npm run dist` 실행 후 현재 플랫폼에 대한 동작하는 인스톨러가 `dist/` 디렉터리에 생성**되어야 한다(shall)**.
- NFR-003: electron-builder 버전은 Electron 35.x와 호환되는 최신 버전(현재 설치된 v25.1.8)을 사용**해야 한다(shall)**.

## 제약사항

- 패키지 매니저: npm (pnpm 사용 불가)
- electron-vite 빌드 출력: `out/` 디렉터리
- electron-builder 패키징 출력: `dist/` 디렉터리
- 현재 설치된 electron-builder: v25.1.8

## 제외사항 (Exclusions - What NOT to Build)

- **코드 서명 (Code Signing)**: macOS 공증(notarization), Windows Authenticode 서명은 이 SPEC 범위 밖. `mac.identity: null` 설정으로 서명을 비활성화한다.
- **자동 업데이터 (Auto-Updater)**: `electron-updater` 설정 및 업데이트 서버 구성은 별도 SPEC에서 진행한다.
- **CI/CD 파이프라인**: GitHub Actions 등에서의 크로스 플랫폼 자동 빌드는 별도 SPEC에서 진행한다.
- **커스텀 아이콘 디자인**: v1에서는 플레이스홀더 아이콘만 포함. 최종 앱 아이콘 디자인은 별도 진행.
- **DMG 커스텀 배경**: DMG 설치 화면의 배경 이미지, 아이콘 위치 커스터마이징은 이 SPEC 범위 밖.
- **Snap/Flatpak 패키징**: Linux의 Snap, Flatpak 포맷은 이 SPEC 범위 밖.
