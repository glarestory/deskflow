---
id: SPEC-PKG-001
type: compact
---

# SPEC-PKG-001: electron-builder 패키징 (Compact)

## 핵심 요약

electron-builder로 Deskflow의 macOS/Windows/Linux 인스톨러 생성 파이프라인을 구성한다.

## 요구사항 요약

| ID | 유형 | 요약 |
|----|------|------|
| REQ-001 | Ubiquitous | `electron-builder.yml` 설정 (appId, productName, directories, files) |
| REQ-002 | State-Driven | macOS: dmg 타겟, identity null (서명 비활성화) |
| REQ-003 | State-Driven | Windows: NSIS exe, oneClick false |
| REQ-004 | State-Driven | Linux: deb + AppImage |
| REQ-005 | Event-Driven | npm scripts: dist, dist:mac/win/linux, dist:dir |
| REQ-006 | Ubiquitous | resources/ 디렉터리에 플레이스홀더 아이콘 |
| REQ-007 | Ubiquitous | .gitignore에 dist/ 패턴 |
| REQ-008 | Complex | electron-vite(out/) -> electron-builder(dist/) 통합 |

## 수정 대상 파일

- `electron-builder.yml` (신규)
- `package.json` (scripts 추가)
- `resources/icon.png` (신규)
- `.gitignore` (확인/보완)

## 제외사항

코드 서명, 자동 업데이터, CI/CD, 커스텀 아이콘, DMG 배경, Snap/Flatpak
