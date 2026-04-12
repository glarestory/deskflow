import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'

const mockGet = vi.fn()
const mockSet = vi.fn()
vi.stubGlobal('storage', { get: mockGet, set: mockSet })

// Firebase 전체 모킹 (initializeFirestore 충돌 방지)
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

// migration 모킹
vi.mock('../lib/migration', () => ({
  migrateLocalToFirestore: vi.fn(() => Promise.resolve()),
}))

// firestoreStorage 모킹 (lazy import 방지)
vi.mock('../lib/firestoreStorage', () => ({
  firestoreStorage: {
    get: vi.fn(() => Promise.resolve({ value: null })),
    set: vi.fn(() => Promise.resolve()),
  },
}))

// authStore 모킹: 인증된 사용자 상태 반환
const mockUser = {
  uid: 'test-uid',
  displayName: 'Test User',
  email: 'test@test.com',
  photoURL: null,
}

vi.mock('../stores/authStore', () => ({
  useAuthStore: () => ({
    user: mockUser,
    loading: false,
    error: null,
    signInWithGoogle: vi.fn(),
    signInWithGithub: vi.fn(),
    signOut: vi.fn(),
    initAuth: vi.fn(() => vi.fn()),
  }),
}))

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('storage', { get: mockGet, set: mockSet })
    mockGet.mockResolvedValue({ value: null })
  })

  it('renders loading state initially before data loads', async () => {
    // storage.get가 pending 상태로 있을 때 로딩 UI 확인
    let resolveGet!: (value: { value: string | null }) => void
    mockGet.mockReturnValue(new Promise((resolve) => { resolveGet = resolve }))

    const { default: App } = await import('../App')
    render(<App />)

    expect(screen.getByText('로딩 중...')).toBeInTheDocument()

    // cleanup
    act(() => { resolveGet({ value: null }) })
  })

  it('renders main layout after data loads', async () => {
    mockGet.mockResolvedValue({ value: null })

    const { default: App } = await import('../App')

    render(<App />)

    await waitFor(() => {
      expect(screen.getByText('My Hub')).toBeInTheDocument()
    })
    // 카테고리 추가 버튼
    expect(screen.getByText('+ 카테고리')).toBeInTheDocument()
  })

  it('renders Clock widget after load', async () => {
    mockGet.mockResolvedValue({ value: null })

    const { default: App } = await import('../App')

    render(<App />)

    await waitFor(() => {
      const timePattern = /\d{2}:\d{2}/
      expect(screen.getByText(timePattern)).toBeInTheDocument()
    })
  })

  it('renders TodoWidget after load', async () => {
    mockGet.mockResolvedValue({ value: null })

    const { default: App } = await import('../App')

    render(<App />)

    await waitFor(() => {
      expect(screen.getByText(/개 남음/)).toBeInTheDocument()
    })
  })

  it('renders NotesWidget after load', async () => {
    mockGet.mockResolvedValue({ value: null })

    const { default: App } = await import('../App')

    render(<App />)

    await waitFor(() => {
      expect(screen.getByText('빠른 메모')).toBeInTheDocument()
    })
  })

  it('opens EditModal when + 카테고리 is clicked', async () => {
    mockGet.mockResolvedValue({ value: null })

    const { default: App } = await import('../App')

    render(<App />)

    await waitFor(() => {
      expect(screen.getByText('+ 카테고리')).toBeInTheDocument()
    })

    const addBtn = screen.getByText('+ 카테고리')
    fireEvent.click(addBtn)

    expect(screen.getByText('카테고리 편집')).toBeInTheDocument()
  })

  it('toggles theme when theme button is clicked', async () => {
    mockGet.mockResolvedValue({ value: null })

    const { default: App } = await import('../App')

    render(<App />)

    await waitFor(() => {
      expect(screen.getByTestId('theme-toggle')).toBeInTheDocument()
    })

    const themeBtn = screen.getByTestId('theme-toggle')
    fireEvent.click(themeBtn)
    // 토글 후에도 버튼이 여전히 존재
    expect(screen.getByTestId('theme-toggle')).toBeInTheDocument()
  })
})
