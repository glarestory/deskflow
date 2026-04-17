# SPEC-AUTH-001 Compact

## 한 줄 요약

Firebase OAuth(Google/GitHub) 로그인 + Firestore 데이터 동기화

## 핵심 요구사항

| ID | 패턴 | 요약 |
|----|------|------|
| REQ-001 | Ubiquitous | 미인증 시 LoginScreen 표시 |
| REQ-002 | Event-Driven | Google/GitHub OAuth 버튼 클릭 시 signInWithPopup 실행 |
| REQ-003 | Event-Driven | OAuth 성공 시 authStore에 user 저장, Hub 표시 |
| REQ-004 | Event-Driven | 최초 로그인 시 로컬 데이터를 Firestore로 마이그레이션 |
| REQ-005 | State-Driven | 인증 상태에서 모든 데이터 경로를 Firestore로 전환 |
| REQ-006 | Event-Driven | 로그아웃 시 세션 해제, LoginScreen 표시 |
| REQ-007 | State-Driven | Firebase 설정 오류 시 에러 메시지 표시 |
| REQ-008 | Ubiquitous | VITE_FIREBASE_* 환경 변수에서 설정 로드 |
| REQ-009 | Event-Driven | 앱 시작 시 인증 확인 중 로딩 표시 |
| REQ-010 | Ubiquitous | Google + GitHub 두 프로바이더 지원 |

## 신규/변경 파일

| 파일 | 작업 |
|------|------|
| `src/renderer/lib/firebase.ts` | 신규 -- Firebase 초기화 |
| `src/renderer/lib/firestoreStorage.ts` | 신규 -- Firestore 읽기/쓰기 헬퍼 |
| `src/renderer/lib/migration.ts` | 신규 -- 로컬 -> Firestore 마이그레이션 |
| `src/renderer/lib/storage.ts` | 변경 -- Firestore 어댑터 통합 |
| `src/renderer/stores/authStore.ts` | 신규 -- 인증 상태 관리 |
| `src/renderer/components/LoginScreen/LoginScreen.tsx` | 신규 -- 로그인 UI |
| `src/renderer/App.tsx` | 변경 -- 인증 게이트, 로그아웃 버튼 |
| `.env.example` | 신규 -- Firebase 환경 변수 템플릿 |
| `package.json` | 변경 -- firebase 의존성 추가 |

## Exclusions

- Email/Password 인증
- 멀티 프로필 / 팀
- 충돌 해결 (다중 디바이스 동시 편집)
- Electron 네이티브 OAuth
- 푸시 알림, 결제/구독
