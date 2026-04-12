// @MX:ANCHOR: [AUTO] firebase — Firebase 앱 초기화 및 서비스 인스턴스 진입점
// @MX:REASON: [AUTO] authStore, firestoreStorage 등 다수 모듈이 의존하는 외부 시스템 통합 지점
// @MX:SPEC: SPEC-AUTH-001

import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider, GithubAuthProvider } from 'firebase/auth'
import { initializeFirestore, persistentLocalCache } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

export const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)

// persistentLocalCache: Firestore v10+에서 IndexedDB 기반 오프라인 지속성 설정
export const db = initializeFirestore(app, {
  cache: persistentLocalCache(),
})

export const googleProvider = new GoogleAuthProvider()
export const githubProvider = new GithubAuthProvider()
