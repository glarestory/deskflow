// @MX:SPEC: SPEC-UX-003
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'

// usageStore mock
vi.mock('../../stores/usageStore', () => ({
  useUsageStore: (selector?: (s: unknown) => unknown) => {
    const getScore = (type: string, id: string): number => {
      // l1, l2, l3, l4, l5, l6, l7, l8에 점수 부여
      const scores: Record<string, number> = {
        'l1': 10, 'l2': 9, 'l3': 8, 'l4': 7,
        'l5': 6, 'l6': 5, 'l7': 4, 'l8': 3,
      }
      return scores[id] ?? 0
    }
    const state = { getScore }
    return selector ? selector(state) : state
  },
}))

const testBookmarks = Array.from({ length: 3 }, (_, catIdx) => ({
  id: `cat-${catIdx + 1}`,
  name: `Category ${catIdx + 1}`,
  icon: '📌',
  links: Array.from({ length: 4 }, (_, linkIdx) => ({
    id: `l${catIdx * 4 + linkIdx + 1}`,
    name: `Link ${catIdx * 4 + linkIdx + 1}`,
    url: `https://example${catIdx * 4 + linkIdx + 1}.com`,
    tags: [],
  })),
}))

vi.mock('../../stores/bookmarkStore', () => ({
  useBookmarkStore: (selector?: (s: unknown) => unknown) => {
    const state = { bookmarks: testBookmarks }
    return selector ? selector(state) : state
  },
}))

describe('TopSection (SPEC-UX-003)', () => {
  beforeEach(() => vi.clearAllMocks())

  it('"자주 쓰는 것" 헤더를 렌더링한다', async () => {
    const { TopSection } = await import('./TopSection')
    render(<TopSection />)

    expect(screen.getByText('자주 쓰는 것')).toBeInTheDocument()
  })

  it('상위 8개 북마크를 표시한다', async () => {
    const { TopSection } = await import('./TopSection')
    render(<TopSection />)

    // data-testid로 확인
    const items = screen.getAllByTestId(/top-section-item/)
    expect(items).toHaveLength(8)
  })

  it('data-testid="top-section"이 있다', async () => {
    const { TopSection } = await import('./TopSection')
    render(<TopSection />)

    expect(screen.getByTestId('top-section')).toBeInTheDocument()
  })
})
