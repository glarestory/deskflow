# SPEC-AUTH-001 구현 진행 상황

상태: COMPLETED
완료일: 2026-04-11

## 생성된 파일 목록

### 설정 파일
- `.env.example` — Firebase 환경변수 템플릿
- `.env` — 데모 플레이스홀더 값 (앱 시작 가능)

### 신규 소스 파일
- `src/renderer/lib/firebase.ts` — Firebase 앱 초기화 (initializeFirestore + persistentLocalCache)
- `src/renderer/lib/firestoreStorage.ts` — Firestore users/{uid}/data/{key} 읽기/쓰기
- `src/renderer/lib/migration.ts` — 최초 로그인 시 localStorage → Firestore 마이그레이션
- `src/renderer/types/auth.ts` — AuthState 타입 정의
- `src/renderer/stores/authStore.ts` — Firebase 인증 Zustand 스토어 (Google/GitHub OAuth)
- `src/renderer/components/LoginScreen/LoginScreen.tsx` — OAuth 로그인 화면

### 신규 테스트 파일
- `src/renderer/stores/authStore.test.ts` — authStore 단위 테스트 (6개)
- `src/renderer/lib/firestoreStorage.test.ts` — firestoreStorage 단위 테스트 (4개)
- `src/renderer/components/LoginScreen/LoginScreen.test.tsx` — LoginScreen 컴포넌트 테스트 (6개)

### 수정된 파일
- `src/renderer/lib/storage.ts` — createUserStorage, setUserStorage 추가 (lazy import로 충돌 방지)
- `src/renderer/App.tsx` — 인증 게이트, 저장소 전환, 로그아웃 버튼 추가
- `src/renderer/__tests__/App.test.tsx` — Firebase/authStore 모킹 추가

## 품질 게이트 결과

- npm test:run: 81/81 통과
- npm run typecheck: 통과 (오류 없음)
- npm run build:web: 빌드 성공 (607KB, Firebase 포함)

## 아키텍처 결정 사항

1. **Lazy Import 패턴**: storage.ts에서 firestoreStorage를 static import 대신 dynamic import로 처리하여 기존 테스트의 vi.resetModules() 충돌 방지
2. **Firebase v12**: initializeFirestore + persistentLocalCache 사용 (enableIndexedDbPersistence deprecated)
3. **마이그레이션 플래그**: localStorage의 'hub-migrated' 키로 중복 마이그레이션 방지
4. **하위 호환성**: storage export API 유지, setUserStorage로 저장소 전환
