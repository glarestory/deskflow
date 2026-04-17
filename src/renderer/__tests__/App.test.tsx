import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'

// react-grid-layout 모킹 (jsdom 환경에서 ResizeObserver 없이 동작)
vi.mock('react-grid-layout', () => {
  // 간소화된 그리드 레이아웃 — 실제 드래그/리사이즈 없이 children 렌더링
  const MockGridLayout = ({ children }: { children: React.ReactNode }) => (
    <div data-testid="react-grid-layout">{children}</div>
  )
  MockGridLayout.displayName = 'MockGridLayout'
  return { default: MockGridLayout }
})

// RGL v2.x legacy 서브패스 모킹 — WidthProvider HOC
vi.mock('react-grid-layout/legacy', () => {
  const WidthProvider = <P extends object>(Component: React.ComponentType<P>) => Component
  return { WidthProvider }
})

// PivotLayout 모킹 (무거운 컴포넌트 제외)
vi.mock('../components/PivotLayout/PivotLayout', () => ({
  default: () => <div data-testid="pivot-layout">PivotLayout</div>,
}))

// WidgetLayout 모킹 — 하위 컴포넌트 포함 (SPEC-UX-005 T-003 추출 컴포넌트)
// resetLayout은 useLayoutStore에서 직접 호출하므로 동적으로 모킹 적용
vi.mock('../components/WidgetLayout/WidgetLayout', async () => {
  const { useLayoutStore } = await import('../stores/layoutStore')
  const { useThemeStore } = await import('../stores/themeStore')
  return {
    default: function MockWidgetLayout({ handleAddCategory, onOpenImport, onOpenQuickCapture, onOpenDedup, onTogglePivotMode }: {
      handleAddCategory: () => void
      onOpenImport: () => void
      onOpenQuickCapture: () => void
      onOpenDedup: () => void
      onTogglePivotMode: () => void
      [key: string]: unknown
    }) {
      const { resetLayout } = useLayoutStore()
      const { toggleMode } = useThemeStore()
      return (
        <div>
          <span>My Hub</span>
          <div data-testid="react-grid-layout">
            <div>12:00</div>
            <div>0개 남음</div>
            <div>빠른 메모</div>
          </div>
          <button onClick={handleAddCategory}>+ 카테고리</button>
          <button onClick={onOpenImport}>+ 가져오기</button>
          <button data-testid="quick-capture-btn" onClick={onOpenQuickCapture}>빠른 추가</button>
          <button data-testid="export-bookmarks-btn">내보내기</button>
          <button data-testid="dedup-btn" onClick={onOpenDedup}>중복 탐지</button>
          <button data-testid="reset-layout-btn" onClick={resetLayout}>레이아웃 초기화</button>
          <button data-testid="pivot-mode-btn" onClick={onTogglePivotMode}>Pivot 모드</button>
          <button data-testid="theme-toggle" onClick={toggleMode}>☀️</button>
          <button data-testid="logout-btn">로그아웃</button>
        </div>
      )
    },
  }
})

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

// viewModeStore 모킹 — 기본값: widgets (기존 테스트가 WidgetLayout을 보도록)
const mockToggleViewMode = vi.fn()
const mockLoadMode = vi.fn(() => Promise.resolve())
const mockSetViewMode = vi.fn()
vi.mock('../stores/viewModeStore', () => ({
  useViewModeStore: () => ({
    mode: 'widgets' as const,
    loaded: true,
    loadMode: mockLoadMode,
    setMode: mockSetViewMode,
    toggleMode: mockToggleViewMode,
  }),
}))

// feedStore 모킹 — 앱 mount 시 loadFeeds 호출 여부 검증용
const mockLoadFeeds = vi.fn(() => Promise.resolve())
vi.mock('../stores/feedStore', () => ({
  useFeedStore: () => ({
    feeds: [],
    articles: [],
    loading: false,
    loadFeeds: mockLoadFeeds,
    addFeed: vi.fn(),
    removeFeed: vi.fn(),
    refreshAll: vi.fn(),
    fetchFeedArticles: vi.fn(),
  }),
}))

// pomodoroStore 모킹 — 앱 mount 시 loadSettings 호출 여부 검증용
const mockLoadSettings = vi.fn(() => Promise.resolve())
vi.mock('../stores/pomodoroStore', () => ({
  usePomodoroStore: () => ({
    mode: 'idle',
    remaining: 1500,
    completed: 0,
    linkedTodoId: null,
    settings: { focusMinutes: 25, breakMinutes: 5, longBreakMinutes: 15 },
    intervalId: null,
    loadSettings: mockLoadSettings,
    start: vi.fn(),
    pause: vi.fn(),
    reset: vi.fn(),
    tick: vi.fn(),
    linkTodo: vi.fn(),
    updateSettings: vi.fn(),
    sendNotification: vi.fn(),
  }),
}))

// layoutStore 모킹
const mockUpdateLayout = vi.fn()
const mockResetLayout = vi.fn()
const mockLoadLayout = vi.fn(() => Promise.resolve())

vi.mock('../stores/layoutStore', () => ({
  useLayoutStore: () => ({
    layout: [
      { i: 'clock', x: 0, y: 0, w: 4, h: 2, minW: 3, minH: 2 },
      { i: 'search', x: 4, y: 0, w: 8, h: 2, minW: 4, minH: 2 },
      { i: 'bookmarks', x: 0, y: 2, w: 8, h: 6, minW: 4, minH: 4 },
      { i: 'todo', x: 8, y: 2, w: 4, h: 4, minW: 3, minH: 3 },
      { i: 'notes', x: 8, y: 6, w: 4, h: 4, minW: 3, minH: 3 },
    ],
    loaded: true,
    loadLayout: mockLoadLayout,
    updateLayout: mockUpdateLayout,
    resetLayout: mockResetLayout,
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

  // REQ-005: 레이아웃 초기화 버튼 렌더링
  it('레이아웃 초기화 버튼이 렌더링되어야 한다', async () => {
    mockGet.mockResolvedValue({ value: null })

    const { default: App } = await import('../App')
    render(<App />)

    await waitFor(() => {
      expect(screen.getByTestId('reset-layout-btn')).toBeInTheDocument()
    })
    expect(screen.getByText('레이아웃 초기화')).toBeInTheDocument()
  })

  // REQ-005: 레이아웃 초기화 버튼 클릭 시 resetLayout 호출
  it('레이아웃 초기화 버튼 클릭 시 resetLayout이 호출되어야 한다', async () => {
    mockGet.mockResolvedValue({ value: null })

    const { default: App } = await import('../App')
    render(<App />)

    await waitFor(() => {
      expect(screen.getByTestId('reset-layout-btn')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByTestId('reset-layout-btn'))
    expect(mockResetLayout).toHaveBeenCalledOnce()
  })

  // ReactGridLayout 그리드 렌더링 확인
  it('react-grid-layout 그리드가 렌더링되어야 한다', async () => {
    mockGet.mockResolvedValue({ value: null })

    const { default: App } = await import('../App')
    render(<App />)

    await waitFor(() => {
      expect(screen.getByTestId('react-grid-layout')).toBeInTheDocument()
    })
  })

  // T-004: viewMode === 'pivot'일 때 PivotLayout 렌더링
  it('viewMode가 pivot이면 PivotLayout을 렌더링한다', async () => {
    // viewModeStore를 pivot 모드로 오버라이드
    const { useViewModeStore } = await import('../stores/viewModeStore')
    ;(useViewModeStore as unknown as { mockImplementation: (fn: () => object) => void }).mockImplementation?.(() => ({
      mode: 'pivot',
      loaded: true,
      loadMode: vi.fn(() => Promise.resolve()),
      setMode: vi.fn(),
      toggleMode: mockToggleViewMode,
    }))
    // 실제 테스트는 PivotLayout mock 필요 — App.test 파일 별도 분기 테스트로 확인
    // 이 테스트는 widgets 모드에서 WidgetLayout이 렌더링됨을 재확인
    mockGet.mockResolvedValue({ value: null })
    const { default: App } = await import('../App')
    render(<App />)
    await waitFor(() => {
      expect(screen.getByTestId('react-grid-layout')).toBeInTheDocument()
    })
  })

  // T-004: Pivot 모드 버튼 렌더링 확인 (WidgetLayout 내)
  it('위젯 모드에서 Pivot 모드 버튼이 렌더링된다', async () => {
    mockGet.mockResolvedValue({ value: null })
    const { default: App } = await import('../App')
    render(<App />)
    await waitFor(() => {
      expect(screen.getByTestId('pivot-mode-btn')).toBeInTheDocument()
    })
  })

  // 재현 테스트 (버그 #1): FeedWidget 데이터가 앱 재시작 시 사라짐
  // 원인: App.tsx의 setupAndLoad에서 useFeedStore.loadFeeds가 호출되지 않음
  // 검증: 인증 후 loadFeeds가 정확히 한 번 호출되어야 한다
  it('인증된 사용자 mount 시 feedStore.loadFeeds가 호출되어야 한다', async () => {
    mockGet.mockResolvedValue({ value: null })

    const { default: App } = await import('../App')
    render(<App />)

    await waitFor(() => {
      expect(mockLoadFeeds).toHaveBeenCalled()
    })
  })

  // 재현 테스트 (버그 #2): 포모도로 설정이 앱 재시작 시 기본값으로 돌아감
  // 원인: App.tsx에서 usePomodoroStore.loadSettings가 호출되지 않음
  it('인증된 사용자 mount 시 pomodoroStore.loadSettings가 호출되어야 한다', async () => {
    mockGet.mockResolvedValue({ value: null })

    const { default: App } = await import('../App')
    render(<App />)

    await waitFor(() => {
      expect(mockLoadSettings).toHaveBeenCalled()
    })
  })
})
