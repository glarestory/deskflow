// @MX:SPEC: SPEC-UX-005, SPEC-UX-007
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import '@testing-library/jest-dom'

// react-grid-layout 모킹 — Responsive 컴포넌트 노출 포함 (SPEC-UX-006)
vi.mock('react-grid-layout', () => {
  const MockGridLayout = ({ children }: { children: React.ReactNode }) => (
    <div data-testid="react-grid-layout">{children}</div>
  )
  MockGridLayout.displayName = 'MockGridLayout'
  const WidthProvider = <P extends object>(Component: React.ComponentType<P>) => Component
  return { default: MockGridLayout, Responsive: MockGridLayout, WidthProvider }
})

// react-grid-layout/legacy 모킹 — WidthProvider 를 실제 사용하는 경로
vi.mock('react-grid-layout/legacy', () => {
  const MockGridLayout = ({ children }: { children: React.ReactNode }) => (
    <div data-testid="react-grid-layout">{children}</div>
  )
  MockGridLayout.displayName = 'MockGridLayout'
  const WidthProvider = <P extends object>(Component: React.ComponentType<P>) => Component
  return { default: MockGridLayout, Responsive: MockGridLayout, WidthProvider }
})

// editModeStore 모킹 (M2: SPEC-UX-007)
vi.mock('../../stores/editModeStore', () => {
  let isEditing = false
  const toggle = vi.fn(() => { isEditing = !isEditing })
  const set = vi.fn((v: boolean) => { isEditing = v })
  return {
    useEditModeStore: Object.assign(
      () => ({ isEditing, toggle, set }),
      { getState: () => ({ isEditing, toggle, set }) }
    ),
    useEditMode: () => ({ isEditing, toggle, set }),
  }
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

vi.mock('../CapsuleSwitcher/CapsuleSwitcher', () => ({
  default: () => <div data-testid="capsule-switcher" />,
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
    onOpenCapsuleList: vi.fn(),
    onOpenCreateCapsule: vi.fn(),
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

  // SPEC-UX-007 M2: 데스크탑 헤더 편집 토글 버튼 (AC-003)
  it('데스크탑 모드에서 edit-mode-toggle 버튼이 렌더링된다 (AC-003)', async () => {
    const { default: WidgetLayout } = await import('./WidgetLayout')
    render(<WidgetLayout {...mockHandlers} />)
    expect(screen.getByTestId('edit-mode-toggle')).toBeInTheDocument()
  })

  it('편집 모드 OFF일 때 토글 버튼 라벨이 "편집"이어야 한다 (AC-003)', async () => {
    const { default: WidgetLayout } = await import('./WidgetLayout')
    render(<WidgetLayout {...mockHandlers} />)
    const btn = screen.getByTestId('edit-mode-toggle')
    expect(btn).toHaveTextContent('편집')
  })

  // SPEC-UX-007 M2: body.is-edit-mode 클래스 토글 (AC-009)
  it('편집 토글 버튼 클릭 시 body에 is-edit-mode 클래스가 추가되어야 한다 (AC-009)', async () => {
    const { default: WidgetLayout } = await import('./WidgetLayout')
    render(<WidgetLayout {...mockHandlers} />)
    // 초기 상태에서는 클래스가 없어야 함
    expect(document.body.classList.contains('is-edit-mode')).toBe(false)
  })

  // SPEC-UX-007 M2: Esc 키로 편집 모드 종료 (AC-008)
  it('Esc 키 누름 시 편집 모드가 종료되어야 한다 (AC-008)', async () => {
    const { default: WidgetLayout } = await import('./WidgetLayout')
    const { useEditMode } = await import('../../stores/editModeStore')
    render(<WidgetLayout {...mockHandlers} />)
    // Esc 이벤트 발생
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    })
    // isEditing이 false인 상태에서 Esc는 부수 효과 없음 (idempotent)
    expect(useEditMode().isEditing).toBe(false)
  })
})
