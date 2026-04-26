// @MX:TEST: SPEC-E2E-AUTH-BYPASS-001 — VITE_E2E_TEST_MODE 분기 검증.
// 목적: 프로덕션 빌드에 이 분기가 절대 활성화되지 않음을 보장하고, 활성화 시 mock
// user 가 정확히 주입되는지 검증한다.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const onAuthStateChangedMock = vi.fn()
const signOutMock = vi.fn().mockResolvedValue(undefined)

vi.mock('firebase/auth', () => ({
  signInWithPopup: vi.fn(),
  signOut: (...args: unknown[]) => signOutMock(...args),
  onAuthStateChanged: (...args: unknown[]) => onAuthStateChangedMock(...args),
  getAuth: vi.fn(() => ({})),
  GoogleAuthProvider: vi.fn(),
  GithubAuthProvider: vi.fn(),
}))

vi.mock('firebase/firestore', () => ({
  initializeFirestore: vi.fn(() => ({})),
  persistentLocalCache: vi.fn(() => ({})),
  doc: vi.fn(),
  getDoc: vi.fn(),
  setDoc: vi.fn(),
}))

vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(() => ({})),
}))

vi.mock('../lib/firebase', () => ({
  auth: {},
  googleProvider: {},
  githubProvider: {},
  db: {},
}))

describe('authStore — VITE_E2E_TEST_MODE 분기 (SPEC-E2E-AUTH-BYPASS-001)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    vi.unstubAllEnvs()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  describe('VITE_E2E_TEST_MODE !== "true" (프로덕션/일반 dev)', () => {
    it('initAuth 는 onAuthStateChanged 를 구독해 user 콜백을 위임한다', async () => {
      vi.stubEnv('VITE_E2E_TEST_MODE', '')
      onAuthStateChangedMock.mockImplementation((_auth, cb) => {
        cb(null)
        return vi.fn()
      })

      const { useAuthStore } = await import('./authStore')
      const unsubscribe = useAuthStore.getState().initAuth()

      expect(onAuthStateChangedMock).toHaveBeenCalledTimes(1)
      const state = useAuthStore.getState()
      expect(state.user).toBeNull()
      expect(state.loading).toBe(false)
      expect(typeof unsubscribe).toBe('function')
    })

    it('env 가 정확히 "true" 가 아닌 truthy 문자열이면 우회되지 않는다 ("1", "yes")', async () => {
      vi.stubEnv('VITE_E2E_TEST_MODE', '1')
      onAuthStateChangedMock.mockImplementation((_auth, cb) => {
        cb(null)
        return vi.fn()
      })

      const { useAuthStore } = await import('./authStore')
      useAuthStore.getState().initAuth()

      // "1" 은 활성화 키워드가 아니므로 onAuthStateChanged 를 통과해야 한다
      expect(onAuthStateChangedMock).toHaveBeenCalledTimes(1)
    })

    it('signOut 은 firebase signOut 을 호출한다', async () => {
      vi.stubEnv('VITE_E2E_TEST_MODE', '')
      const { useAuthStore } = await import('./authStore')
      await useAuthStore.getState().signOut()

      expect(signOutMock).toHaveBeenCalledTimes(1)
      expect(useAuthStore.getState().user).toBeNull()
    })
  })

  describe('VITE_E2E_TEST_MODE === "true" (E2E 빌드)', () => {
    it('initAuth 는 Firebase 구독 없이 mock user 를 즉시 주입한다', async () => {
      vi.stubEnv('VITE_E2E_TEST_MODE', 'true')

      const { useAuthStore } = await import('./authStore')
      const unsubscribe = useAuthStore.getState().initAuth()

      expect(onAuthStateChangedMock).not.toHaveBeenCalled()

      const state = useAuthStore.getState()
      expect(state.user).not.toBeNull()
      expect(state.user?.uid).toBe('e2e-test-uid')
      expect(state.user?.email).toBe('e2e@deskflow.test')
      expect(state.loading).toBe(false)
      expect(typeof unsubscribe).toBe('function')
    })

    it('mock user 는 firebase User 인터페이스의 핵심 프로퍼티를 가진다', async () => {
      vi.stubEnv('VITE_E2E_TEST_MODE', 'true')

      const { useAuthStore } = await import('./authStore')
      useAuthStore.getState().initAuth()

      const user = useAuthStore.getState().user
      expect(user?.displayName).toBe('E2E Test User')
      expect(user?.providerId).toBe('e2e')
      expect(user?.isAnonymous).toBe(false)
      expect(typeof user?.getIdToken).toBe('function')
      await expect(user?.getIdToken()).resolves.toBe('e2e-mock-token')
    })

    it('initAuth 가 반환한 unsubscribe 는 no-op (구독한 적 없음)', async () => {
      vi.stubEnv('VITE_E2E_TEST_MODE', 'true')

      const { useAuthStore } = await import('./authStore')
      const unsubscribe = useAuthStore.getState().initAuth()

      expect(() => unsubscribe()).not.toThrow()
    })

    it('signOut 은 firebase signOut 을 호출하지 않고 user=null 만 설정한다', async () => {
      vi.stubEnv('VITE_E2E_TEST_MODE', 'true')

      const { useAuthStore } = await import('./authStore')
      useAuthStore.getState().initAuth()
      expect(useAuthStore.getState().user).not.toBeNull()

      await useAuthStore.getState().signOut()

      expect(signOutMock).not.toHaveBeenCalled()
      expect(useAuthStore.getState().user).toBeNull()
    })
  })
})
