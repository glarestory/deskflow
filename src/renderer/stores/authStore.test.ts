// @MX:TEST: SPEC-AUTH-001
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('firebase/auth', () => ({
  signInWithPopup: vi.fn(),
  signOut: vi.fn(),
  onAuthStateChanged: vi.fn((_auth: unknown, cb: (user: null) => void) => {
    cb(null)
    return vi.fn()
  }),
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

import { useAuthStore } from './authStore'

describe('authStore', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, loading: true, error: null })
    vi.clearAllMocks()
  })

  it('초기 상태: user null, loading true, error null', () => {
    const state = useAuthStore.getState()
    expect(state.user).toBeNull()
    expect(state.loading).toBe(true)
    expect(state.error).toBeNull()
  })

  it('initAuth 호출 시 loading이 false로 변경되고 user가 null로 설정된다', () => {
    const { initAuth } = useAuthStore.getState()
    const unsubscribe = initAuth()
    const state = useAuthStore.getState()
    expect(state.loading).toBe(false)
    expect(state.user).toBeNull()
    expect(typeof unsubscribe).toBe('function')
  })

  it('initAuth는 unsubscribe 함수를 반환한다', () => {
    const { initAuth } = useAuthStore.getState()
    const unsubscribe = initAuth()
    expect(typeof unsubscribe).toBe('function')
  })

  it('signOut 후 user가 null로 설정된다', async () => {
    const { signOut: storeSignOut } = useAuthStore.getState()
    useAuthStore.setState({ user: { uid: 'test-uid' } as import('firebase/auth').User })
    await storeSignOut()
    const state = useAuthStore.getState()
    expect(state.user).toBeNull()
  })

  it('signInWithGoogle 실패 시 error 메시지가 설정된다', async () => {
    const { signInWithPopup } = await import('firebase/auth')
    vi.mocked(signInWithPopup).mockRejectedValueOnce(new Error('팝업 차단됨'))
    const { signInWithGoogle } = useAuthStore.getState()
    await signInWithGoogle()
    const state = useAuthStore.getState()
    expect(state.error).toBe('팝업 차단됨')
  })

  it('signInWithGithub 실패 시 error 메시지가 설정된다', async () => {
    const { signInWithPopup } = await import('firebase/auth')
    vi.mocked(signInWithPopup).mockRejectedValueOnce(new Error('GitHub 오류'))
    const { signInWithGithub } = useAuthStore.getState()
    await signInWithGithub()
    const state = useAuthStore.getState()
    expect(state.error).toBe('GitHub 오류')
  })
})
