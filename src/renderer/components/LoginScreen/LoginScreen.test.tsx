// @MX:TEST: SPEC-AUTH-001
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'

vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(() => ({})),
}))

vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => ({})),
  GoogleAuthProvider: vi.fn(),
  GithubAuthProvider: vi.fn(),
  signInWithPopup: vi.fn(),
  signOut: vi.fn(),
  onAuthStateChanged: vi.fn((_auth: unknown, cb: (user: null) => void) => {
    cb(null)
    return vi.fn()
  }),
}))

vi.mock('firebase/firestore', () => ({
  initializeFirestore: vi.fn(() => ({})),
  persistentLocalCache: vi.fn(() => ({})),
  doc: vi.fn(),
  getDoc: vi.fn(),
  setDoc: vi.fn(),
}))

vi.mock('../../stores/authStore', () => ({
  useAuthStore: vi.fn(),
}))

import LoginScreen from './LoginScreen'
import { useAuthStore } from '../../stores/authStore'

describe('LoginScreen', () => {
  const mockSignInWithGoogle = vi.fn()
  const mockSignInWithGithub = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useAuthStore).mockReturnValue({
      signInWithGoogle: mockSignInWithGoogle,
      signInWithGithub: mockSignInWithGithub,
      error: null,
      loading: false,
      user: null,
      signOut: vi.fn(),
      initAuth: vi.fn(() => vi.fn()),
    })
  })

  it('Google/GitHub 로그인 버튼이 렌더링된다', () => {
    render(<LoginScreen />)
    expect(screen.getByTestId('google-login-btn')).toBeInTheDocument()
    expect(screen.getByTestId('github-login-btn')).toBeInTheDocument()
  })

  it('Google 버튼 클릭 시 signInWithGoogle이 호출된다', () => {
    render(<LoginScreen />)
    fireEvent.click(screen.getByTestId('google-login-btn'))
    expect(mockSignInWithGoogle).toHaveBeenCalledTimes(1)
  })

  it('GitHub 버튼 클릭 시 signInWithGithub이 호출된다', () => {
    render(<LoginScreen />)
    fireEvent.click(screen.getByTestId('github-login-btn'))
    expect(mockSignInWithGithub).toHaveBeenCalledTimes(1)
  })

  it('error가 있으면 에러 메시지가 표시된다', () => {
    vi.mocked(useAuthStore).mockReturnValue({
      signInWithGoogle: mockSignInWithGoogle,
      signInWithGithub: mockSignInWithGithub,
      error: '로그인 실패',
      loading: false,
      user: null,
      signOut: vi.fn(),
      initAuth: vi.fn(() => vi.fn()),
    })
    render(<LoginScreen />)
    expect(screen.getByTestId('auth-error')).toHaveTextContent('로그인 실패')
  })

  it('loading 중일 때 버튼이 비활성화된다', () => {
    vi.mocked(useAuthStore).mockReturnValue({
      signInWithGoogle: mockSignInWithGoogle,
      signInWithGithub: mockSignInWithGithub,
      error: null,
      loading: true,
      user: null,
      signOut: vi.fn(),
      initAuth: vi.fn(() => vi.fn()),
    })
    render(<LoginScreen />)
    expect(screen.getByTestId('google-login-btn')).toBeDisabled()
    expect(screen.getByTestId('github-login-btn')).toBeDisabled()
  })

  it('error가 null이면 에러 메시지가 표시되지 않는다', () => {
    render(<LoginScreen />)
    expect(screen.queryByTestId('auth-error')).not.toBeInTheDocument()
  })
})
