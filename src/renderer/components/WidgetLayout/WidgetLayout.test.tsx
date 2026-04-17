// @MX:SPEC: SPEC-UX-005
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'

// react-grid-layout 모킹
vi.mock('react-grid-layout', () => {
  const MockGridLayout = ({ children }: { children: React.ReactNode }) => (
    <div data-testid="react-grid-layout">{children}</div>
  )
  MockGridLayout.displayName = 'MockGridLayout'
  return { default: MockGridLayout }
})

vi.mock('react-grid-layout/legacy', () => {
  const WidthProvider = <P extends object>(Component: React.ComponentType<P>) => Component
  return { WidthProvider }
})

// 스토어 모킹
vi.mock('../../stores/bookmarkStore', () => ({
  useBookmarkStore: () => ({
    bookmarks: [],
    loaded: true,
    loadBookmarks: vi.fn(),
    addBookmark: vi.fn(),
    updateBookmark: vi.fn(),
    removeBookmark: vi.fn(),
    exportBookmarks: vi.fn(),
  }),
}))

vi.mock('../../stores/todoStore', () => ({
  useTodoStore: () => ({
    loaded: true,
    loadTodos: vi.fn(),
  }),
}))

vi.mock('../../stores/themeStore', () => ({
  useThemeStore: () => ({
    mode: 'dark' as const,
    loaded: true,
    loadTheme: vi.fn(),
    toggleMode: vi.fn(),
  }),
}))

vi.mock('../../stores/layoutStore', () => ({
  useLayoutStore: () => ({
    layout: [
      { i: 'clock', x: 0, y: 0, w: 4, h: 2, minW: 3, minH: 2 },
      { i: 'search', x: 4, y: 0, w: 8, h: 2, minW: 4, minH: 2 },
      { i: 'bookmarks', x: 0, y: 2, w: 8, h: 6, minW: 4, minH: 4 },
      { i: 'todo', x: 8, y: 2, w: 4, h: 4, minW: 3, minH: 3 },
      { i: 'notes', x: 8, y: 6, w: 4, h: 4, minW: 3, minH: 3 },
    ],
    loaded: true,
    loadLayout: vi.fn(),
    updateLayout: vi.fn(),
    resetLayout: vi.fn(),
  }),
}))

vi.mock('../../stores/authStore', () => ({
  useAuthStore: () => ({
    user: {
      uid: 'test-uid',
      displayName: 'Test User',
      email: 'test@test.com',
      photoURL: null,
    },
    loading: false,
    signOut: vi.fn(),
  }),
}))

vi.mock('../../stores/viewModeStore', () => ({
  useViewModeStore: () => ({
    mode: 'widgets' as const,
    loaded: true,
    toggleMode: vi.fn(),
  }),
}))

// 하위 위젯 모킹
vi.mock('../Clock/Clock', () => ({
  default: () => <div>12:00</div>,
}))
vi.mock('../SearchBar/SearchBar', () => ({
  default: () => <div>SearchBar</div>,
}))
vi.mock('../BookmarkCard/BookmarkCard', () => ({
  default: () => <div>BookmarkCard</div>,
}))
vi.mock('../TodoWidget/TodoWidget', () => ({
  default: () => <div>0개 남음</div>,
}))
vi.mock('../NotesWidget/NotesWidget', () => ({
  default: () => <div>빠른 메모</div>,
}))
vi.mock('../FeedWidget/FeedWidget', () => ({
  default: () => <div>FeedWidget</div>,
}))

describe('WidgetLayout (SPEC-UX-005)', () => {
  const mockHandlers = {
    handleAddCategory: vi.fn(),
    handleLayoutChange: vi.fn(),
    onOpenImport: vi.fn(),
    onOpenQuickCapture: vi.fn(),
    onOpenDedup: vi.fn(),
    onSetEditingCategory: vi.fn(),
    onTogglePivotMode: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  // T-003: WidgetLayout이 렌더링된다
  it('WidgetLayout이 렌더링된다', async () => {
    const { default: WidgetLayout } = await import('./WidgetLayout')
    render(<WidgetLayout {...mockHandlers} />)
    expect(screen.getByText('My Hub')).toBeInTheDocument()
  })

  // react-grid-layout이 렌더링된다
  it('react-grid-layout이 렌더링된다', async () => {
    const { default: WidgetLayout } = await import('./WidgetLayout')
    render(<WidgetLayout {...mockHandlers} />)
    expect(screen.getByTestId('react-grid-layout')).toBeInTheDocument()
  })

  // 카테고리 추가 버튼이 있다
  it('+ 카테고리 버튼이 렌더링된다', async () => {
    const { default: WidgetLayout } = await import('./WidgetLayout')
    render(<WidgetLayout {...mockHandlers} />)
    expect(screen.getByText('+ 카테고리')).toBeInTheDocument()
  })

  // 카테고리 추가 버튼 클릭 시 handleAddCategory 호출
  it('+ 카테고리 버튼 클릭 시 handleAddCategory가 호출된다', async () => {
    const { default: WidgetLayout } = await import('./WidgetLayout')
    render(<WidgetLayout {...mockHandlers} />)
    fireEvent.click(screen.getByText('+ 카테고리'))
    expect(mockHandlers.handleAddCategory).toHaveBeenCalledOnce()
  })

  // 레이아웃 초기화 버튼이 있다
  it('레이아웃 초기화 버튼이 렌더링된다', async () => {
    const { default: WidgetLayout } = await import('./WidgetLayout')
    render(<WidgetLayout {...mockHandlers} />)
    expect(screen.getByTestId('reset-layout-btn')).toBeInTheDocument()
  })

  // 테마 토글 버튼이 있다
  it('테마 토글 버튼이 렌더링된다', async () => {
    const { default: WidgetLayout } = await import('./WidgetLayout')
    render(<WidgetLayout {...mockHandlers} />)
    expect(screen.getByTestId('theme-toggle')).toBeInTheDocument()
  })

  // T-005: Pivot 모드 버튼이 있다
  it('Pivot 모드 버튼이 TopBar에 렌더링된다', async () => {
    const { default: WidgetLayout } = await import('./WidgetLayout')
    render(<WidgetLayout {...mockHandlers} />)
    expect(screen.getByTestId('pivot-mode-btn')).toBeInTheDocument()
    expect(screen.getByText('Pivot 모드')).toBeInTheDocument()
  })

  // T-005: Pivot 모드 버튼 클릭 시 onTogglePivotMode 호출
  it('Pivot 모드 버튼 클릭 시 onTogglePivotMode가 호출된다', async () => {
    const { default: WidgetLayout } = await import('./WidgetLayout')
    render(<WidgetLayout {...mockHandlers} />)
    fireEvent.click(screen.getByTestId('pivot-mode-btn'))
    expect(mockHandlers.onTogglePivotMode).toHaveBeenCalledOnce()
  })

  // TodoWidget 렌더링
  it('TodoWidget이 렌더링된다', async () => {
    const { default: WidgetLayout } = await import('./WidgetLayout')
    render(<WidgetLayout {...mockHandlers} />)
    expect(screen.getByText('0개 남음')).toBeInTheDocument()
  })

  // NotesWidget 렌더링
  it('NotesWidget이 렌더링된다', async () => {
    const { default: WidgetLayout } = await import('./WidgetLayout')
    render(<WidgetLayout {...mockHandlers} />)
    expect(screen.getByText('빠른 메모')).toBeInTheDocument()
  })

  // 로그아웃 버튼이 있다
  it('로그아웃 버튼이 렌더링된다', async () => {
    const { default: WidgetLayout } = await import('./WidgetLayout')
    render(<WidgetLayout {...mockHandlers} />)
    expect(screen.getByTestId('logout-btn')).toBeInTheDocument()
  })

  // 빠른 추가 버튼이 있다
  it('빠른 추가 버튼이 렌더링된다', async () => {
    const { default: WidgetLayout } = await import('./WidgetLayout')
    render(<WidgetLayout {...mockHandlers} />)
    expect(screen.getByTestId('quick-capture-btn')).toBeInTheDocument()
  })

  // 내보내기 버튼이 있다
  it('내보내기 버튼이 렌더링된다', async () => {
    const { default: WidgetLayout } = await import('./WidgetLayout')
    render(<WidgetLayout {...mockHandlers} />)
    expect(screen.getByTestId('export-bookmarks-btn')).toBeInTheDocument()
  })

  // 중복 탐지 버튼이 있다
  it('중복 탐지 버튼이 렌더링된다', async () => {
    const { default: WidgetLayout } = await import('./WidgetLayout')
    render(<WidgetLayout {...mockHandlers} />)
    expect(screen.getByTestId('dedup-btn')).toBeInTheDocument()
  })
})
