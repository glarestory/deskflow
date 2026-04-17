# SPEC-AUTH-001: 인수 조건

## 시나리오

### AC-001: 미인증 사용자 로그인 화면 표시

**Given** 사용자가 인증되지 않은 상태이고
**When** 앱이 로드되면
**Then** LoginScreen이 표시되어야 한다
**And** "Sign in with Google" 버튼이 보여야 한다
**And** "Sign in with GitHub" 버튼이 보여야 한다
**And** 메인 Hub 콘텐츠는 보이지 않아야 한다

### AC-002: Google OAuth 로그인 성공

**Given** LoginScreen이 표시된 상태에서
**When** 사용자가 "Sign in with Google" 버튼을 클릭하고 OAuth 인증을 완료하면
**Then** LoginScreen이 사라져야 한다
**And** 메인 Hub 화면이 표시되어야 한다
**And** authStore에 Firebase User 객체가 저장되어야 한다

### AC-003: GitHub OAuth 로그인 성공

**Given** LoginScreen이 표시된 상태에서
**When** 사용자가 "Sign in with GitHub" 버튼을 클릭하고 OAuth 인증을 완료하면
**Then** LoginScreen이 사라져야 한다
**And** 메인 Hub 화면이 표시되어야 한다
**And** authStore에 Firebase User 객체가 저장되어야 한다

### AC-004: OAuth 로그인 실패 처리

**Given** LoginScreen이 표시된 상태에서
**When** OAuth 인증 중 오류가 발생하면 (팝업 닫기, 네트워크 오류 등)
**Then** LoginScreen이 유지되어야 한다
**And** 오류 메시지가 표시되어야 한다

### AC-005: 인증 상태 로딩 표시

**Given** 앱이 시작될 때
**When** Firebase Auth가 인증 상태를 확인하는 동안
**Then** 로딩 인디케이터가 표시되어야 한다
**And** LoginScreen도 Hub도 표시되지 않아야 한다

### AC-006: 인증 상태에서 Firestore 데이터 저장

**Given** 사용자가 인증된 상태에서
**When** 북마크를 추가/수정/삭제하면
**Then** 변경된 데이터가 Firestore `users/{uid}/data/bookmarks`에 저장되어야 한다
**And** localStorage에는 저장되지 않아야 한다

### AC-007: 인증 상태에서 Firestore 데이터 로딩

**Given** 사용자가 인증된 상태에서 Firestore에 저장된 데이터가 있을 때
**When** 앱이 로드되면
**Then** Firestore에서 bookmarks, todos, theme, notes 데이터를 로드해야 한다

### AC-008: 최초 로그인 시 로컬 데이터 마이그레이션

**Given** 사용자가 처음 로그인하고 Firestore에 데이터가 없을 때
**When** 로그인이 완료되면
**Then** localStorage의 `hub-bookmarks`, `hub-todos`, `hub-theme`, `hub-notes` 데이터가 Firestore로 업로드되어야 한다

### AC-009: 로그아웃

**Given** 사용자가 인증된 상태에서
**When** 로그아웃 버튼을 클릭하면
**Then** Firebase 인증 세션이 해제되어야 한다
**And** LoginScreen이 다시 표시되어야 한다
**And** Firestore의 데이터는 삭제되지 않아야 한다

### AC-010: 페이지 새로고침 후 인증 유지

**Given** 사용자가 인증된 상태에서
**When** 브라우저를 새로고침하면
**Then** 재로그인 없이 인증 상태가 유지되어야 한다
**And** 메인 Hub가 바로 표시되어야 한다

### AC-011: Firebase 설정 오류 처리

**Given** `VITE_FIREBASE_*` 환경 변수가 누락되었을 때
**When** 앱이 로드되면
**Then** 설정 오류 메시지가 표시되어야 한다
**And** OAuth 로그인 버튼이 비활성화되어야 한다

## 엣지 케이스

### EDGE-001: 팝업 차단 환경

**Given** 브라우저가 팝업을 차단한 상태에서
**When** OAuth 로그인을 시도하면
**Then** 적절한 에러 메시지가 표시되어야 한다

### EDGE-002: 네트워크 오프라인 상태

**Given** 사용자가 인증된 상태에서 네트워크가 끊긴 경우
**When** 데이터를 변경하면
**Then** Firestore 오프라인 캐시에 저장되어야 한다
**And** 네트워크 복구 시 자동 동기화되어야 한다

### EDGE-003: 마이그레이션 중 로컬 데이터 없음

**Given** 최초 로그인 시 localStorage에 저장된 데이터가 없을 때
**When** 마이그레이션이 실행되면
**Then** 오류 없이 빈 상태로 Firestore 문서가 생성되어야 한다

### EDGE-004: Firestore에 이미 데이터가 있는 재로그인

**Given** 이전에 로그인하여 Firestore에 데이터가 있는 사용자가
**When** 다시 로그인하면
**Then** Firestore의 기존 데이터를 로드해야 한다 (로컬 데이터로 덮어쓰지 않음)

## 품질 게이트

- [ ] TypeScript strict mode 통과 (`tsc --noEmit` 오류 0건)
- [ ] ESLint 오류 0건
- [ ] 신규 파일 테스트 커버리지 85% 이상
- [ ] Firebase SDK vi.mock 기반 테스트 통과
- [ ] 기존 테스트 스위트 전체 통과 (하위 호환성)
- [ ] `any` 타입 사용 없음

## Definition of Done

- [ ] 모든 요구사항(REQ-001 ~ REQ-010) 구현 완료
- [ ] 모든 인수 조건(AC-001 ~ AC-011) 통과
- [ ] 엣지 케이스(EDGE-001 ~ EDGE-004) 처리 확인
- [ ] 품질 게이트 전체 통과
- [ ] `.env.example`에 Firebase 환경 변수 문서화
- [ ] 기존 Electron/웹 빌드 정상 동작 확인
