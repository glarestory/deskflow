# SPEC-AUTH-001: 구현 계획

## 기술 접근 방식

SPEC-WEB-001에서 도입한 Storage Abstraction Layer(`src/renderer/lib/storage.ts`)를 확장하여,
인증 상태에 따라 Firestore 어댑터로 자동 전환하는 방식으로 구현한다.
기존 스토어(bookmarkStore, todoStore, themeStore)와 NotesWidget은 이미 `storage.ts`를
사용하고 있으므로, storage 레이어 내부만 교체하면 상위 코드 변경이 최소화된다.

## 마일스톤

### M1: Firebase 인프라 설정 (Priority High)

- **T-001**: Firebase SDK 설치 및 초기화 모듈 생성
  - `firebase` 패키지 설치 (v10, modular)
  - `src/renderer/lib/firebase.ts` 생성: Firebase App 초기화, Auth/Firestore 인스턴스 export
  - `.env.example` 생성: `VITE_FIREBASE_*` 환경 변수 템플릿
  - 대상 파일: `package.json`, `src/renderer/lib/firebase.ts`, `.env.example`

### M2: 인증 상태 관리 (Priority High)

- **T-002**: authStore 생성
  - `src/renderer/stores/authStore.ts`: Zustand 스토어
  - `user: FirebaseUser | null`, `loading: boolean`, `error: string | null`
  - `onAuthStateChanged` 리스너로 인증 상태 자동 추적
  - `signInWithGoogle()`, `signInWithGithub()`, `signOut()` 액션
  - 대상 파일: `src/renderer/stores/authStore.ts`

### M3: 로그인 UI (Priority High)

- **T-003**: LoginScreen 컴포넌트 생성
  - `src/renderer/components/LoginScreen/LoginScreen.tsx`
  - 전체 화면 중앙 정렬 카드: Deskflow 로고, Google/GitHub 로그인 버튼
  - authStore와 연동하여 로그인 시도 및 에러 표시
  - 대상 파일: `src/renderer/components/LoginScreen/LoginScreen.tsx`

- **T-003-test**: LoginScreen 테스트
  - `src/renderer/components/LoginScreen/LoginScreen.test.tsx`
  - 버튼 렌더링, 클릭 시 OAuth 호출, 에러 표시 검증

### M4: Firestore 스토리지 어댑터 (Priority High)

- **T-004**: Firestore 스토리지 헬퍼 생성
  - `src/renderer/lib/firestoreStorage.ts`: `getDoc`/`setDoc` 래퍼
  - 스키마: `users/{uid}/data/{key}` 구조
  - 대상 파일: `src/renderer/lib/firestoreStorage.ts`

- **T-005**: storage.ts 확장 -- Firestore 어댑터 통합
  - 인증 상태 구독 (`authStore` 또는 `onAuthStateChanged`)
  - 인증됨: Firestore 경유, 미인증: localStorage 경유 (기존 동작)
  - `storage.setUser(uid)` / `storage.clearUser()` 메서드 추가
  - 대상 파일: `src/renderer/lib/storage.ts`

### M5: 앱 통합 (Priority High)

- **T-006**: App.tsx 인증 게이트 추가
  - `authStore.loading` 상태에 따른 로딩 화면 표시
  - `authStore.user` 유무에 따라 LoginScreen vs Hub 분기
  - 대상 파일: `src/renderer/App.tsx`

- **T-007**: 기존 스토어 storage 추상화 확인
  - bookmarkStore, todoStore, themeStore가 이미 `storage.ts`를 사용하는지 검증
  - SPEC-WEB-001에서 이미 완료되었으므로, 추가 변경이 필요한지만 확인
  - 대상 파일: 검증만 수행

### M6: 데이터 마이그레이션 (Priority Medium)

- **T-008**: 로컬 -> Firestore 마이그레이션 로직
  - 최초 로그인 감지 (Firestore에 사용자 데이터가 없는 경우)
  - localStorage의 `hub-bookmarks`, `hub-todos`, `hub-theme`, `hub-notes` 읽기
  - Firestore `users/{uid}/data/` 경로에 일괄 업로드
  - 대상 파일: `src/renderer/lib/migration.ts` (신규)

### M7: UI 마무리 (Priority Medium)

- **T-009**: TopBar에 로그아웃 버튼 추가
  - 인증 상태일 때 사용자 아바타 + 로그아웃 버튼 표시
  - `authStore.signOut()` 호출
  - 대상 파일: `src/renderer/App.tsx` (TopBar 영역)

## 리스크

| 리스크 | 영향 | 완화 전략 |
|--------|------|-----------|
| Firebase 팝업 인증이 Electron에서 차단될 수 있음 | OAuth 로그인 실패 | Electron 환경에서 popup 방식 테스트, 필요 시 redirect 폴백 검토 |
| Firestore 오프라인 캐시와 localStorage 데이터 불일치 | 데이터 손실 | 마이그레이션 시 Firestore 우선, 로컬 데이터 백업 |
| Firebase SDK 번들 크기 증가 | 웹 빌드 성능 저하 | Tree-shaking 활용 (modular SDK), 번들 분석 |
| 환경 변수 누락 시 런타임 오류 | 앱 미동작 | REQ-007에 따른 설정 오류 화면 표시 |

## 의존성

- SPEC-WEB-001: Storage Abstraction Layer (완료 전제)
- Firebase 프로젝트 설정: Google Cloud Console에서 프로젝트 생성 및 OAuth 프로바이더 활성화 필요
- 환경 변수: `.env` 파일에 Firebase 설정값 입력 필요
