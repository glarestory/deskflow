// @MX:ANCHOR: [AUTO] authStore — Firebase 인증 상태 관리 중심 진입점
// @MX:REASON: [AUTO] App.tsx, LoginScreen 등 다수 컴포넌트가 의존하는 인증 상태 소유자
// @MX:SPEC: SPEC-AUTH-001

import { create } from 'zustand'
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth'
import { auth, googleProvider, githubProvider } from '../lib/firebase'
import type { User } from 'firebase/auth'

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
    await signOut(auth)
    set({ user: null })
  },

  initAuth: () => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      set({ user, loading: false })
    })
    return unsubscribe
  },
}))
