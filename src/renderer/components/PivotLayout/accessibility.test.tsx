// @MX:SPEC: SPEC-UX-003
// @MX:NOTE: [AUTO] ARIA 접근성 검증 — AC-018, NFR-003
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'

// 하위 컴포넌트 모킹
vi.mock('./SidebarCategoryList', () => ({
  SidebarCategoryList: () => <div data-testid="sidebar-category-list" />,
}))
vi.mock('./SidebarTagList', () => ({
  SidebarTagList: () => <div data-testid="sidebar-tag-list" />,
}))
vi.mock('./SidebarSettings', () => ({
  SidebarSettings: () => <div data-testid="sidebar-settings" />,
}))

vi.mock('../../stores/viewStore', () => ({
  useViewStore: () => ({
    context: { kind: 'all' },
    sidebarCollapsed: false,
    setContext: vi.fn(),
    toggleSidebar: vi.fn(),
  }),
  DENSITY_ITEM_SIZE: { compact: 40, comfortable: 56, spacious: 72 },
}))

vi.mock('../../stores/bookmarkStore', () => ({
  useBookmarkStore: (selector?: (s: unknown) => unknown) => {
    const state = { bookmarks: [] }
    return selector ? selector(state) : state
  },
}))

describe('접근성 검증 (SPEC-UX-003 AC-018)', () => {
  it('Sidebar에 ARIA tree role이 있다', async () => {
    const { Sidebar } = await import('./Sidebar')
    render(<Sidebar />)

    expect(screen.getByRole('tree')).toBeInTheDocument()
  })

  it('Sidebar tree에 aria-label이 있다', async () => {
    const { Sidebar } = await import('./Sidebar')
    render(<Sidebar />)

    const tree = screen.getByRole('tree')
    expect(tree).toHaveAttribute('aria-label')
  })

  it('Sidebar 항목들에 treeitem role이 있다', async () => {
    const { Sidebar } = await import('./Sidebar')
    render(<Sidebar />)

    const treeItems = screen.getAllByRole('treeitem')
    expect(treeItems.length).toBeGreaterThan(0)
  })

  it('treeitem에 aria-selected 속성이 있다', async () => {
    const { Sidebar } = await import('./Sidebar')
    render(<Sidebar />)

    const treeItems = screen.getAllByRole('treeitem')
    treeItems.forEach((item) => {
      expect(item).toHaveAttribute('aria-selected')
    })
  })
})

vi.mock('react-window', () => ({
  FixedSizeList: ({
    itemCount,
    children: ChildRenderer,
    itemData,
  }: {
    itemCount: number
    children: React.ComponentType<{ index: number; style: React.CSSProperties; data: unknown }>
    itemData: unknown
    itemSize: number
    height: number
    width: string | number
  }) => (
    <div data-testid="fixed-size-list">
      {Array.from({ length: Math.min(itemCount, 3) }, (_, i) => (
        <ChildRenderer key={i} index={i} style={{ height: 56 }} data={itemData} />
      ))}
    </div>
  ),
}))

vi.mock('./BookmarkRow', () => ({
  BookmarkRow: () => <div role="option" aria-selected={false} />,
}))

describe('BookmarkList ARIA listbox (SPEC-UX-003)', () => {
  it('listbox role이 있다', async () => {
    const { BookmarkList } = await import('./BookmarkList')
    render(
      <BookmarkList
        links={[{ id: 'l1', name: 'Test', url: 'https://test.com', tags: [] }]}
        density="comfortable"
        viewMode="list"
      />,
    )

    expect(screen.getByRole('listbox')).toBeInTheDocument()
  })

  it('listbox에 aria-label이 있다', async () => {
    const { BookmarkList } = await import('./BookmarkList')
    render(
      <BookmarkList
        links={[{ id: 'l1', name: 'Test', url: 'https://test.com', tags: [] }]}
        density="comfortable"
        viewMode="list"
      />,
    )

    expect(screen.getByRole('listbox')).toHaveAttribute('aria-label')
  })
})
