// @MX:ANCHOR: [AUTO] firebase — Firebase 앱 초기화 및 서비스 인스턴스 진입점
// @MX:REASON: [AUTO] authStore, firestoreStorage 등 다수 모듈이 의존하는 외부 시스템 통합 지점
// @MX:SPEC: SPEC-AUTH-001, SPEC-TEST-FIREBASE-ISOLATION-001

import {
  initializeApp,
  type FirebaseApp,
  type FirebaseOptions,
} from 'firebase/app'
import {
  getAuth,
  GoogleAuthProvider,
  GithubAuthProvider,
  type Auth,
} from 'firebase/auth'
import {
  initializeFirestore,
  persistentLocalCache,
  type Firestore,
} from 'firebase/firestore'

// @MX:NOTE: [AUTO] Firebase 비활성 환경 가드 — 두 가지 경우에 실제 SDK 호출을 건너뛰고
// 빈 stub 만 export 한다.
//   1. vitest 단위 테스트: MODE === 'test' (placeholder env 로 인한 invalid-api-key 회피)
//   2. Playwright E2E:    VITE_E2E_TEST_MODE === 'true' (authStore 가 mock user 주입,
//                          Firebase 호출 불필요)
// 두 가드 모두 정적 평가되므로 프로덕션 빌드(deploy:web)에서는 트리쉐이킹된다.
const isFirebaseDisabled = (): boolean =>
  import.meta.env.MODE === 'test' ||
  import.meta.env.VITE_E2E_TEST_MODE === 'true'

const firebaseConfig: FirebaseOptions = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

// 테스트 환경에서는 stub, 그 외에는 실제 SDK 호출
export const app: FirebaseApp = isFirebaseDisabled()
  ? ({} as FirebaseApp)
  : initializeApp(firebaseConfig)

export const auth: Auth = isFirebaseDisabled() ? ({} as Auth) : getAuth(app)

// persistentLocalCache: Firestore v10+에서 IndexedDB 기반 오프라인 지속성 설정
export const db: Firestore = isFirebaseDisabled()
  ? ({} as Firestore)
  : initializeFirestore(app, {
      cache: persistentLocalCache(),
    })

export const googleProvider = isFirebaseDisabled()
  ? ({} as GoogleAuthProvider)
  : new GoogleAuthProvider()

export const githubProvider = isFirebaseDisabled()
  ? ({} as GithubAuthProvider)
  : new GithubAuthProvider()
