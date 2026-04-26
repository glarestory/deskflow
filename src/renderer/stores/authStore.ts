// @MX:ANCHOR: [AUTO] authStore — Firebase 인증 상태 관리 중심 진입점
// @MX:REASON: [AUTO] App.tsx, LoginScreen 등 다수 컴포넌트가 의존하는 인증 상태 소유자
// @MX:SPEC: SPEC-AUTH-001, SPEC-E2E-AUTH-BYPASS-001

import { create } from 'zustand'
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth'
import { auth, googleProvider, githubProvider } from '../lib/firebase'
import type { User } from 'firebase/auth'

// @MX:NOTE: [AUTO] E2E 테스트 모드 — VITE_E2E_TEST_MODE='true' 빌드에서만 활성화.
// 프로덕션 빌드(deploy:web)는 이 env 가 없으므로 분기는 항상 false 로 정적 평가되어
// Vite 트리쉐이킹 대상이 된다. 빌드 타임 결정이므로 런타임 URL 조작으로는 우회 불가.
const isE2ETestMode = (): boolean =>
  import.meta.env.VITE_E2E_TEST_MODE === 'true'

const E2E_MOCK_USER: User = {
  uid: 'e2e-test-uid',
  email: 'e2e@deskflow.test',
  displayName: 'E2E Test User',
  emailVerified: true,
  isAnonymous: false,
  metadata: {} as User['metadata'],
  providerData: [],
  refreshToken: '',
  tenantId: null,
  phoneNumber: null,
  photoURL: null,
  providerId: 'e2e',
  delete: async () => {},
  getIdToken: async () => 'e2e-mock-token',
  getIdTokenResult: async () => ({} as Awaited<ReturnType<User['getIdTokenResult']>>),
  reload: async () => {},
  toJSON: () => ({}),
}

interface AuthStore {
  user: User | null
  loading: boolean
  error: string | null
  signInWithGoogle: () => Promise<void>
  signInWithGithub: () => Promise<void>
  signOut: () => Promise<void>
  initAuth: () => () => void
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  loading: true,
  error: null,

  signInWithGoogle: async () => {
    set({ error: null })
    try {
      await signInWithPopup(auth, googleProvider)
    } catch (e) {
      set({ error: e instanceof Error ? e.message : '로그인 실패' })
    }
  },

  signInWithGithub: async () => {
    set({ error: null })
    try {
      await signInWithPopup(auth, githubProvider)
    } catch (e) {
      set({ error: e instanceof Error ? e.message : '로그인 실패' })
    }
  },

  signOut: async () => {
    if (isE2ETestMode()) {
      set({ user: null })
      return
    }
    await signOut(auth)
    set({ user: null })
  },

  initAuth: () => {
    // E2E 테스트 모드: Firebase 구독 우회 + mock user 즉시 주입
    if (isE2ETestMode()) {
      set({ user: E2E_MOCK_USER, loading: false })
      return () => {
        // no-op unsubscribe — 구독한 적 없음
      }
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      set({ user, loading: false })
    })
    return unsubscribe
  },
}))
