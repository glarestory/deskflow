// @MX:TEST: SPEC-TEST-FIREBASE-ISOLATION-001 — vitest MODE 격리 가드 검증.
// 목적: 테스트 환경에서 placeholder env 로 인한 auth/invalid-api-key 에러를 방지하면서도
// 프로덕션 빌드에는 영향을 주지 않음을 보장한다.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const initializeAppMock = vi.fn(() => ({ name: 'real-app' }))
const getAuthMock = vi.fn(() => ({ name: 'real-auth' }))
const initializeFirestoreMock = vi.fn(() => ({ name: 'real-firestore' }))
const persistentLocalCacheMock = vi.fn(() => ({}))
const GoogleAuthProviderMock = vi.fn(() => ({ name: 'real-google' }))
const GithubAuthProviderMock = vi.fn(() => ({ name: 'real-github' }))

vi.mock('firebase/app', () => ({
  initializeApp: (...args: unknown[]) => initializeAppMock(...args),
}))

vi.mock('firebase/auth', () => ({
  getAuth: (...args: unknown[]) => getAuthMock(...args),
  GoogleAuthProvider: GoogleAuthProviderMock,
  GithubAuthProvider: GithubAuthProviderMock,
}))

vi.mock('firebase/firestore', () => ({
  initializeFirestore: (...args: unknown[]) => initializeFirestoreMock(...args),
  persistentLocalCache: (...args: unknown[]) => persistentLocalCacheMock(...args),
}))

describe('firebase 모듈 — vitest 환경 격리 (SPEC-TEST-FIREBASE-ISOLATION-001)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    vi.unstubAllEnvs()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('MODE === "test" 일 때 initializeApp / getAuth / initializeFirestore 가 호출되지 않는다', async () => {
    vi.stubEnv('MODE', 'test')

    await import('./firebase')

    expect(initializeAppMock).not.toHaveBeenCalled()
    expect(getAuthMock).not.toHaveBeenCalled()
    expect(initializeFirestoreMock).not.toHaveBeenCalled()
    expect(persistentLocalCacheMock).not.toHaveBeenCalled()
    expect(GoogleAuthProviderMock).not.toHaveBeenCalled()
    expect(GithubAuthProviderMock).not.toHaveBeenCalled()
  })

  it('MODE === "test" 일 때 export 는 빈 객체 stub 으로 노출된다', async () => {
    vi.stubEnv('MODE', 'test')

    const { app, auth, db, googleProvider, githubProvider } = await import('./firebase')

    // 빈 객체 stub — 실제 SDK 인스턴스가 아님
    expect(app).toEqual({})
    expect(auth).toEqual({})
    expect(db).toEqual({})
    expect(googleProvider).toEqual({})
    expect(githubProvider).toEqual({})
  })

  it('MODE === "production" 일 때 실제 Firebase SDK 가 호출된다', async () => {
    vi.stubEnv('MODE', 'production')
    vi.stubEnv('VITE_FIREBASE_API_KEY', 'real-key')
    vi.stubEnv('VITE_FIREBASE_PROJECT_ID', 'real-project')

    await import('./firebase')

    expect(initializeAppMock).toHaveBeenCalledTimes(1)
    expect(getAuthMock).toHaveBeenCalledTimes(1)
    expect(initializeFirestoreMock).toHaveBeenCalledTimes(1)
    expect(GoogleAuthProviderMock).toHaveBeenCalledTimes(1)
    expect(GithubAuthProviderMock).toHaveBeenCalledTimes(1)
  })

  it('MODE === "development" 일 때도 실제 Firebase SDK 가 호출된다 (dev 서버에서 정상 동작 보장)', async () => {
    vi.stubEnv('MODE', 'development')
    vi.stubEnv('VITE_E2E_TEST_MODE', '')

    await import('./firebase')

    expect(initializeAppMock).toHaveBeenCalledTimes(1)
    expect(getAuthMock).toHaveBeenCalledTimes(1)
  })

  it('MODE !== "test" 이지만 VITE_E2E_TEST_MODE === "true" 인 경우 stub 으로 우회된다 (Playwright E2E)', async () => {
    vi.stubEnv('MODE', 'development')
    vi.stubEnv('VITE_E2E_TEST_MODE', 'true')

    const { app, auth, db } = await import('./firebase')

    expect(initializeAppMock).not.toHaveBeenCalled()
    expect(getAuthMock).not.toHaveBeenCalled()
    expect(initializeFirestoreMock).not.toHaveBeenCalled()
    expect(app).toEqual({})
    expect(auth).toEqual({})
    expect(db).toEqual({})
  })

  it('initializeApp 은 VITE_FIREBASE_* env 로 구성된 config 로 호출된다', async () => {
    vi.stubEnv('MODE', 'production')
    vi.stubEnv('VITE_FIREBASE_API_KEY', 'k')
    vi.stubEnv('VITE_FIREBASE_AUTH_DOMAIN', 'd')
    vi.stubEnv('VITE_FIREBASE_PROJECT_ID', 'p')
    vi.stubEnv('VITE_FIREBASE_STORAGE_BUCKET', 's')
    vi.stubEnv('VITE_FIREBASE_MESSAGING_SENDER_ID', 'm')
    vi.stubEnv('VITE_FIREBASE_APP_ID', 'a')

    await import('./firebase')

    expect(initializeAppMock).toHaveBeenCalledWith({
      apiKey: 'k',
      authDomain: 'd',
      projectId: 'p',
      storageBucket: 's',
      messagingSenderId: 'm',
      appId: 'a',
    })
  })

  it('initializeFirestore 는 persistentLocalCache 옵션으로 호출된다 (오프라인 지속성 보장)', async () => {
    vi.stubEnv('MODE', 'production')

    await import('./firebase')

    expect(persistentLocalCacheMock).toHaveBeenCalledTimes(1)
    expect(initializeFirestoreMock).toHaveBeenCalledWith(
      expect.anything(),
      { cache: expect.anything() },
    )
  })
})
