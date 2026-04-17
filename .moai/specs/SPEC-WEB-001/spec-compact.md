---
id: SPEC-WEB-001
type: compact
version: 1.0.0
---

# SPEC-WEB-001: Deskflow 웹 배포 전환 (Compact)

## 한줄 요약

Electron IPC 스토리지를 추상화하고 Vite 웹 빌드를 추가하여 브라우저에서 실행 가능한 정적 웹앱으로 배포한다.

## 변경 대상 파일

| # | 파일 | 작업 |
|---|------|------|
| 1 | `src/renderer/lib/storage.ts` | 신규 -- Storage Adapter (Electron IPC / localStorage) |
| 2 | `src/renderer/stores/bookmarkStore.ts` | 수정 -- window.storage -> storage.ts |
| 3 | `src/renderer/stores/todoStore.ts` | 수정 -- window.storage -> storage.ts |
| 4 | `src/renderer/stores/themeStore.ts` | 수정 -- window.storage -> storage.ts |
| 5 | `src/renderer/components/NotesWidget/NotesWidget.tsx` | 수정 -- window.storage -> storage.ts |
| 6 | `vite.web.config.ts` | 신규 -- 웹 전용 Vite 빌드 설정 |
| 7 | `package.json` | 수정 -- dev:web, build:web 스크립트 추가 |

## 핵심 요구사항 (8개)

- **REQ-001**: storage.ts -- get/set 함수 + 런타임 환경 감지 (Electron vs 웹)
- **REQ-002**: 웹 환경에서 localStorage 래핑 (Promise 반환, JSON 직렬화 안 함)
- **REQ-003**: 3개 스토어(bookmark, todo, theme) window.storage -> storage.ts 마이그레이션
- **REQ-004**: NotesWidget window.storage -> storage.ts 마이그레이션 (디바운스 보존)
- **REQ-005**: `npm run build:web` -- vite.web.config.ts로 web-dist/ 출력
- **REQ-006**: `npm run dev:web` -- Vite 개발 서버 + HMR
- **REQ-007**: web-dist/ 정적 파일 배포 호환 (GitHub Pages/Netlify/Vercel)
- **REQ-008**: 웹 빌드에서 electron.d.ts 없이도 TS 오류 없음

## 감지 로직

```
typeof window.storage !== 'undefined' ? Electron IPC : localStorage
```

## 제외 항목

PWA, 멀티유저/백엔드, 인증, CI/CD, SSR, 데이터 마이그레이션, IndexedDB
