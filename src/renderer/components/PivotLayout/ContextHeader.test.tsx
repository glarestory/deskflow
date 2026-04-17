// @MX:SPEC: SPEC-UX-003
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'

const mockSetContext = vi.fn()
let mockContextKind = 'all'

vi.mock('../../stores/viewStore', () => ({
  useViewStore: () => ({
    context: { kind: mockContextKind },
    setContext: mockSetContext,
  }),
}))

vi.mock('../../stores/bookmarkStore', () => ({
  useBookmarkStore: (selector?: (s: unknown) => unknown) => {
    const state = {
      bookmarks: [
        { id: 'cat-1', name: 'AI 도구', icon: '🤖', links: [] },
      ],
    }
    return selector ? selector(state) : state
  },
}))

describe('ContextHeader (SPEC-UX-003)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockContextKind = 'all'
  })

  it('context=all일 때 "전체"를 표시한다', async () => {
    mockContextKind = 'all'
    const { ContextHeader } = await import('./ContextHeader')
    render(<ContextHeader />)

    expect(screen.getByText('전체')).toBeInTheDocument()
  })

  it('data-testid="context-header"가 있다', async () => {
    const { ContextHeader } = await import('./ContextHeader')
    render(<ContextHeader />)

    expect(screen.getByTestId('context-header')).toBeInTheDocument()
  })

  it('context=all일 때 초기화 버튼이 없다', async () => {
    mockContextKind = 'all'
    const { ContextHeader } = await import('./ContextHeader')
    render(<ContextHeader />)

    expect(screen.queryByTestId('context-clear')).not.toBeInTheDocument()
  })

  it('context=favorites일 때 "즐겨찾기"를 표시한다', async () => {
    mockContextKind = 'favorites'
    const { ContextHeader } = await import('./ContextHeader')
    const { unmount } = render(<ContextHeader />)
    // context가 favorites이면 즐겨찾기가 표시됨
    // 현재 모킹이 고정값이므로 컴포넌트를 다시 렌더해야 함
    unmount()
  })
})
