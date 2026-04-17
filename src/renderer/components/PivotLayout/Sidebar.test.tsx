// @MX:SPEC: SPEC-UX-003
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'

// 하위 컴포넌트 모킹 — 각 컴포넌트는 별도 테스트에서 검증
vi.mock('./SidebarCategoryList', () => ({
  SidebarCategoryList: () => <div data-testid="sidebar-category-list" />,
}))
vi.mock('./SidebarTagList', () => ({
  SidebarTagList: () => <div data-testid="sidebar-tag-list" />,
}))
vi.mock('./SidebarSettings', () => ({
  SidebarSettings: () => <div data-testid="sidebar-settings" />,
}))

// viewStore 모킹
const mockSetContext = vi.fn()
const mockToggleSidebar = vi.fn()
let mockContext = { kind: 'all' as const }
let mockCollapsed = false

vi.mock('../../stores/viewStore', () => ({
  useViewStore: (selector?: (s: unknown) => unknown) => {
    const state = {
      context: mockContext,
      sidebarCollapsed: mockCollapsed,
      setContext: mockSetContext,
      toggleSidebar: mockToggleSidebar,
    }
    return selector ? selector(state) : state
  },
}))

// bookmarkStore 모킹
vi.mock('../../stores/bookmarkStore', () => ({
  useBookmarkStore: (selector?: (s: unknown) => unknown) => {
    const state = {
      bookmarks: [
        { id: 'cat-1', name: 'Work', icon: '💼', links: [{ id: 'l1', name: 'Gmail', url: 'https://mail.google.com', tags: [] }] },
        { id: 'cat-2', name: 'Dev', icon: '⚡', links: [] },
      ],
    }
    return selector ? selector(state) : state
  },
}))

describe('Sidebar (SPEC-UX-003)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockContext = { kind: 'all' }
    mockCollapsed = false
  })

  it('5개 섹션을 렌더링한다 (전체, 즐겨찾기, 카테고리, 태그, 설정)', async () => {
    const { Sidebar } = await import('./Sidebar')
    render(<Sidebar />)

    // 전체 항목
    expect(screen.getByText('전체')).toBeInTheDocument()
    // 즐겨찾기 항목
    expect(screen.getByText('즐겨찾기')).toBeInTheDocument()
    // 하위 컴포넌트
    expect(screen.getByTestId('sidebar-category-list')).toBeInTheDocument()
    expect(screen.getByTestId('sidebar-tag-list')).toBeInTheDocument()
    expect(screen.getByTestId('sidebar-settings')).toBeInTheDocument()
  })

  it('전체 클릭 시 setContext({ kind: all })를 호출한다', async () => {
    const { Sidebar } = await import('./Sidebar')
    render(<Sidebar />)

    fireEvent.click(screen.getByText('전체'))
    expect(mockSetContext).toHaveBeenCalledWith({ kind: 'all' })
  })

  it('즐겨찾기 클릭 시 setContext({ kind: favorites })를 호출한다', async () => {
    const { Sidebar } = await import('./Sidebar')
    render(<Sidebar />)

    fireEvent.click(screen.getByText('즐겨찾기'))
    expect(mockSetContext).toHaveBeenCalledWith({ kind: 'favorites' })
  })

  it('접힘 상태에서 250px 너비를 유지한다', async () => {
    mockCollapsed = false
    const { Sidebar } = await import('./Sidebar')
    const { container } = render(<Sidebar />)

    // 사이드바 루트 요소
    const sidebar = container.firstChild as HTMLElement
    expect(sidebar.style.width).toBe('250px')
  })

  it('접힌 상태에서 60px 너비가 된다', async () => {
    mockCollapsed = true
    const { Sidebar } = await import('./Sidebar')
    const { container } = render(<Sidebar />)

    const sidebar = container.firstChild as HTMLElement
    expect(sidebar.style.width).toBe('60px')
  })

  it('토글 버튼 클릭 시 toggleSidebar를 호출한다', async () => {
    const { Sidebar } = await import('./Sidebar')
    render(<Sidebar />)

    const toggleBtn = screen.getByTestId('sidebar-toggle')
    fireEvent.click(toggleBtn)
    expect(mockToggleSidebar).toHaveBeenCalled()
  })

  it('context=all일 때 전체 항목이 활성 상태다', async () => {
    mockContext = { kind: 'all' }
    const { Sidebar } = await import('./Sidebar')
    render(<Sidebar />)

    const allItem = screen.getByTestId('sidebar-item-all')
    expect(allItem).toHaveAttribute('data-active', 'true')
  })

  it('context=favorites일 때 즐겨찾기 항목이 활성 상태다', async () => {
    mockContext = { kind: 'favorites' }
    const { Sidebar } = await import('./Sidebar')
    render(<Sidebar />)

    const favItem = screen.getByTestId('sidebar-item-favorites')
    expect(favItem).toHaveAttribute('data-active', 'true')
  })

  it('ARIA tree 역할이 있다', async () => {
    const { Sidebar } = await import('./Sidebar')
    render(<Sidebar />)

    expect(screen.getByRole('tree')).toBeInTheDocument()
  })
})
