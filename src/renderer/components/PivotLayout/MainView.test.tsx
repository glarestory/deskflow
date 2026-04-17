// @MX:SPEC: SPEC-UX-003
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'

// 하위 컴포넌트 모킹
vi.mock('./ContextHeader', () => ({
  ContextHeader: () => <div data-testid="context-header" />,
}))
vi.mock('./SearchInput', () => ({
  SearchInput: () => <input data-testid="search-input" />,
}))
vi.mock('./ToolbarRight', () => ({
  ToolbarRight: () => <div data-testid="toolbar-right" />,
}))
vi.mock('./TopSection', () => ({
  TopSection: () => <div data-testid="top-section" />,
}))
vi.mock('./BookmarkList', () => ({
  BookmarkList: () => <div data-testid="bookmark-list" />,
}))

let mockContext = { kind: 'all' as const }
let mockSearchQuery = ''
let mockViewMode = 'list' as const

vi.mock('../../stores/viewStore', () => ({
  useViewStore: () => ({
    context: mockContext,
    searchQuery: mockSearchQuery,
    viewMode: mockViewMode,
    density: 'comfortable' as const,
  }),
}))

vi.mock('../../stores/bookmarkStore', () => ({
  useBookmarkStore: (selector?: (s: unknown) => unknown) => {
    const state = {
      bookmarks: [
        { id: 'cat-1', name: 'Work', icon: '💼', links: [
          { id: 'l1', name: 'Gmail', url: 'https://mail.google.com', tags: ['email'] },
        ]},
      ],
    }
    return selector ? selector(state) : state
  },
}))

describe('MainView (SPEC-UX-003)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockContext = { kind: 'all' }
    mockSearchQuery = ''
    mockViewMode = 'list'
  })

  it('ContextHeader, SearchInput, ToolbarRight, BookmarkList를 렌더링한다', async () => {
    const { MainView } = await import('./MainView')
    render(<MainView />)

    expect(screen.getByTestId('context-header')).toBeInTheDocument()
    expect(screen.getByTestId('search-input')).toBeInTheDocument()
    expect(screen.getByTestId('toolbar-right')).toBeInTheDocument()
    expect(screen.getByTestId('bookmark-list')).toBeInTheDocument()
  })

  it('context=all일 때 TopSection을 렌더링한다', async () => {
    mockContext = { kind: 'all' }
    const { MainView } = await import('./MainView')
    render(<MainView />)

    expect(screen.getByTestId('top-section')).toBeInTheDocument()
  })

  it('context=category일 때 TopSection을 렌더링하지 않는다', async () => {
    mockContext = { kind: 'category', categoryId: 'cat-1' }
    const { MainView } = await import('./MainView')
    render(<MainView />)

    expect(screen.queryByTestId('top-section')).not.toBeInTheDocument()
  })
})
