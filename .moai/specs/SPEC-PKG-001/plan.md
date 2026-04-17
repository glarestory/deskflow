---
id: SPEC-PKG-001
type: plan
---

# SPEC-PKG-001: 구현 계획

## 기술 접근 방식

electron-vite의 빌드 산출물(`out/`)을 electron-builder가 패키징하는 2-stage 빌드 파이프라인을 구성한다. electron-builder는 이미 v25.1.8이 설치되어 있으므로 설정 파일과 스크립트 추가만 필요하다.

### 핵심 통합 포인트

1. **electron-vite 출력 구조**: `out/main/index.js`, `out/preload/index.js`, `out/renderer/index.html` — electron-builder의 `files` 설정에 반영
2. **package.json `main` 필드**: `out/main/index.js` — electron-builder가 엔트리 포인트로 사용
3. **빌드 산출물 분리**: `out/`(dev/build) vs `dist/`(packaging) 디렉터리 분리

## 마일스톤

### M1: electron-builder 설정 파일 생성 (Priority: High)

| 태스크 | 파일 | 설명 |
|--------|------|------|
| T1-1 | `electron-builder.yml` | 루트에 설정 파일 생성 (appId, productName, directories, files, 플랫폼별 타겟) |
| T1-2 | `resources/icon.png` | 512x512 플레이스홀더 아이콘 생성 |

### M2: npm 스크립트 추가 (Priority: High)

| 태스크 | 파일 | 설명 |
|--------|------|------|
| T2-1 | `package.json` | `dist`, `dist:mac`, `dist:win`, `dist:linux`, `dist:dir` 스크립트 추가 |

### M3: .gitignore 업데이트 (Priority: Medium)

| 태스크 | 파일 | 설명 |
|--------|------|------|
| T3-1 | `.gitignore` | electron-builder 관련 패턴 추가 확인 (`dist/`는 이미 포함) |

### M4: 빌드 검증 (Priority: High)

| 태스크 | 설명 |
|--------|------|
| T4-1 | `npm run build` 성공 확인 (electron-vite 프로덕션 빌드) |
| T4-2 | `npm run dist:dir` 실행하여 언패킹 빌드 검증 |
| T4-3 | `npm run dist` 실행하여 현재 플랫폼 인스톨러 생성 확인 |

## 리스크

| 리스크 | 영향도 | 완화 전략 |
|--------|--------|-----------|
| electron-builder v25.x와 Electron 35.x 호환성 | 높음 | 이미 설치된 v25.1.8로 먼저 테스트, 실패 시 버전 조정 |
| macOS 코드 서명 오류 | 중간 | `mac.identity: null` 설정으로 서명 비활성화 |
| electron-vite 출력 경로 불일치 | 중간 | `electron.vite.config.ts` 출력 경로와 `electron-builder.yml` `files` 설정 검증 |
| 아이콘 포맷 변환 실패 | 낮음 | electron-builder의 자동 변환 기능에 의존, 실패 시 수동 생성 |

## 의존성

- SPEC-DESKFLOW-001 (완료): 프로젝트 스캐폴딩, electron-vite 설정
- SPEC-UI-001 (완료): 위젯 시스템, Renderer 코드

## 전문가 상담 권장

- **expert-devops**: CI/CD 파이프라인 구성 시 (이 SPEC 범위 밖)
