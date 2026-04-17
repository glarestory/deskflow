// @MX:SPEC: SPEC-UX-003
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'

const mockSetContext = vi.fn()
let mockContext = { kind: 'all' as const }

vi.mock('../../stores/viewStore', () => ({
  useViewStore: () => ({
    context: mockContext,
    setContext: mockSetContext,
  }),
}))

const mockBookmarks = [
  { id: 'cat-1', name: 'Work', icon: '💼', links: [{ id: 'l1', name: 'Gmail', url: 'https://mail.google.com', tags: [] }] },
  { id: 'cat-2', name: 'Dev', icon: '⚡', links: [] },
  { id: 'cat-3', name: 'Long Category Name'.repeat(5), icon: '📌', links: [{ id: 'l2', name: 'X', url: 'https://x.com', tags: [] }, { id: 'l3', name: 'Y', url: 'https://y.com', tags: [] }] },
]

vi.mock('../../stores/bookmarkStore', () => ({
  useBookmarkStore: (selector?: (s: unknown) => unknown) => {
    const state = { bookmarks: mockBookmarks }
    return selector ? selector(state) : state
  },
}))

describe('SidebarCategoryList (SPEC-UX-003)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockContext = { kind: 'all' }
  })

  it('카테고리 목록을 렌더링한다', async () => {
    const { SidebarCategoryList } = await import('./SidebarCategoryList')
    render(<SidebarCategoryList />)

    expect(screen.getByText('Work')).toBeInTheDocument()
    expect(screen.getByText('Dev')).toBeInTheDocument()
  })

  it('카테고리 클릭 시 setContext를 호출한다', async () => {
    const { SidebarCategoryList } = await import('./SidebarCategoryList')
    render(<SidebarCategoryList />)

    fireEvent.click(screen.getByText('Work'))
    expect(mockSetContext).toHaveBeenCalledWith({ kind: 'category', categoryId: 'cat-1' })
  })

  it('북마크 수 chip을 표시한다', async () => {
    const { SidebarCategoryList } = await import('./SidebarCategoryList')
    render(<SidebarCategoryList />)

    // Work 카테고리: 1개
    expect(screen.getByText('1')).toBeInTheDocument()
    // Dev 카테고리: 0개
    expect(screen.getByText('0')).toBeInTheDocument()
  })

  it('활성 카테고리가 강조된다', async () => {
    mockContext = { kind: 'category', categoryId: 'cat-1' }
    const { SidebarCategoryList } = await import('./SidebarCategoryList')
    render(<SidebarCategoryList />)

    const activeBtn = screen.getByTestId('sidebar-category-cat-1')
    expect(activeBtn).toHaveAttribute('data-active', 'true')
  })

  it('접힌 상태에서 아이콘만 표시한다', async () => {
    const { SidebarCategoryList } = await import('./SidebarCategoryList')
    render(<SidebarCategoryList collapsed={true} />)

    // 카테고리 이름이 없어야 함
    expect(screen.queryByText('Work')).not.toBeInTheDocument()
    // 아이콘은 표시됨
    expect(screen.getByText('💼')).toBeInTheDocument()
  })
})
