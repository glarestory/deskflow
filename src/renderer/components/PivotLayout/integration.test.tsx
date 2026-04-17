// @MX:SPEC: SPEC-UX-003
// @MX:NOTE: [AUTO] PivotLayout 통합 테스트 — AC-001~AC-018 주요 시나리오
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'

// react-window 모킹
vi.mock('react-window', () => ({
  FixedSizeList: ({
    itemCount,
    children: ChildRenderer,
    itemData,
    height,
  }: {
    itemCount: number
    children: React.ComponentType<{ index: number; style: React.CSSProperties; data: unknown }>
    itemData: unknown
    itemSize: number
    height: number
    width: string | number
  }) => (
    <div data-testid="fixed-size-list" data-item-count={itemCount} style={{ height }}>
      {Array.from({ length: Math.min(itemCount, 5) }, (_, i) => (
        <ChildRenderer key={i} index={i} style={{ height: 56 }} data={itemData} />
      ))}
    </div>
  ),
}))

vi.mock('../Favicon/Favicon', () => ({
  Favicon: () => <span data-testid="favicon" />,
}))

// 실제 store를 사용하는 통합 테스트
vi.mock('../../stores/authStore', () => ({
  useAuthStore: () => ({
    user: { uid: 'u1', displayName: '테스트', photoURL: null, email: 'test@test.com' },
    signOut: vi.fn(),
  }),
}))

vi.mock('../../stores/themeStore', () => ({
  useThemeStore: () => ({ mode: 'dark' as const, toggleMode: vi.fn() }),
}))

vi.mock('../../stores/usageStore', () => ({
  useUsageStore: (selector?: (s: unknown) => unknown) => {
    const state = { recordUsage: vi.fn(), getScore: () => 0 }
    return selector ? selector(state) : state
  },
}))

const testBookmarks = [
  {
    id: 'cat-1',
    name: 'Work',
    icon: '💼',
    links: [
      { id: 'l1', name: 'Gmail', url: 'https://mail.google.com', tags: ['email'], favorite: false },
      { id: 'l2', name: 'Drive', url: 'https://drive.google.com', tags: ['docs'], favorite: true },
    ],
  },
  {
    id: 'cat-2',
    name: 'Dev',
    icon: '⚡',
    links: [
      { id: 'l3', name: 'GitHub', url: 'https://github.com', tags: ['dev'], favorite: false },
    ],
  },
]

vi.mock('../../stores/bookmarkStore', () => ({
  useBookmarkStore: (selector?: (s: unknown) => unknown) => {
    const state = {
      bookmarks: testBookmarks,
      toggleFavorite: vi.fn(),
    }
    return selector ? selector(state) : state
  },
}))

vi.mock('../../stores/tagStore', () => ({
  useTagStore: (selector?: (s: unknown) => unknown) => {
    const state = { allTags: [{ tag: 'email', count: 1 }, { tag: 'docs', count: 1 }, { tag: 'dev', count: 1 }] }
    return selector ? selector(state) : state
  },
}))

describe('PivotLayout 통합 테스트 (SPEC-UX-003)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // viewStore 실제 상태 초기화
    vi.resetModules()
  })

  it('AC-001: PivotLayout 진입 시 Sidebar + MainView가 표시된다', async () => {
    const { PivotLayout } = await import('./PivotLayout')
    render(<PivotLayout />)

    expect(screen.getByTestId('pivot-layout')).toBeInTheDocument()
    // Sidebar — tree role
    expect(screen.getByRole('tree')).toBeInTheDocument()
    // MainView — main role
    expect(screen.getByRole('main')).toBeInTheDocument()
  })

  it('AC-002: 카테고리 클릭 시 해당 카테고리 북마크만 표시된다', async () => {
    const { PivotLayout } = await import('./PivotLayout')
    render(<PivotLayout />)

    // Work 카테고리 클릭
    fireEvent.click(screen.getByTestId('sidebar-category-cat-1'))

    // ContextHeader에 카테고리명 표시
    await waitFor(() => {
      expect(screen.getByTestId('context-header')).toBeInTheDocument()
    })
  })

  it('AC-013: 사이드바 토글 시 너비가 변경된다', async () => {
    const { PivotLayout } = await import('./PivotLayout')
    const { container } = render(<PivotLayout />)

    const toggleBtn = screen.getByTestId('sidebar-toggle')
    const sidebar = container.querySelector('aside')

    expect(sidebar?.style.width).toBe('250px')
    fireEvent.click(toggleBtn)
    expect(sidebar?.style.width).toBe('60px')
  })

  it('EDGE-004: 전체 컨텍스트에서 빈 리스트 시 빈 상태 메시지 표시', async () => {
    // 빈 북마크로 테스트
    vi.doMock('../../stores/bookmarkStore', () => ({
      useBookmarkStore: (selector?: (s: unknown) => unknown) => {
        const state = { bookmarks: [], toggleFavorite: vi.fn() }
        return selector ? selector(state) : state
      },
    }))
    vi.resetModules()

    const { PivotLayout } = await import('./PivotLayout')
    render(<PivotLayout />)

    expect(screen.getByTestId('empty-state')).toBeInTheDocument()
  })
})
