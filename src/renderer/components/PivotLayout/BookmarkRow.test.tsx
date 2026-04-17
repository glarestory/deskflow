// @MX:SPEC: SPEC-UX-003
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'

const mockRecordUsage = vi.fn()
const mockToggleFavorite = vi.fn()

vi.mock('../../stores/usageStore', () => ({
  useUsageStore: (selector?: (s: unknown) => unknown) => {
    const state = { recordUsage: mockRecordUsage }
    return selector ? selector(state) : state
  },
}))

vi.mock('../../stores/bookmarkStore', () => ({
  useBookmarkStore: (selector?: (s: unknown) => unknown) => {
    const state = { toggleFavorite: mockToggleFavorite }
    return selector ? selector(state) : state
  },
}))

vi.mock('../Favicon/Favicon', () => ({
  Favicon: ({ url }: { url: string }) => <img data-testid="favicon" alt={url} />,
}))

const testLink = {
  id: 'l1',
  name: 'GitHub',
  url: 'https://github.com',
  tags: ['dev', 'code', 'extra1', 'extra2'],
  favorite: false,
  createdAt: Date.now() - 86400000, // 1일 전
}

describe('BookmarkRow (SPEC-UX-003)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // window.open 모킹
    vi.stubGlobal('open', vi.fn())
  })

  it('북마크 이름을 표시한다', async () => {
    const { BookmarkRow } = await import('./BookmarkRow')
    render(
      <BookmarkRow
        link={testLink}
        style={{ height: 56 }}
        index={0}
      />,
    )

    expect(screen.getByText('GitHub')).toBeInTheDocument()
  })

  it('URL을 표시한다', async () => {
    const { BookmarkRow } = await import('./BookmarkRow')
    render(
      <BookmarkRow
        link={testLink}
        style={{ height: 56 }}
        index={0}
      />,
    )

    expect(screen.getByText('github.com')).toBeInTheDocument()
  })

  it('Favicon을 렌더링한다', async () => {
    const { BookmarkRow } = await import('./BookmarkRow')
    render(
      <BookmarkRow
        link={testLink}
        style={{ height: 56 }}
        index={0}
      />,
    )

    expect(screen.getByTestId('favicon')).toBeInTheDocument()
  })

  it('클릭 시 window.open을 호출하고 recordUsage를 기록한다', async () => {
    const { BookmarkRow } = await import('./BookmarkRow')
    render(
      <BookmarkRow
        link={testLink}
        style={{ height: 56 }}
        index={0}
      />,
    )

    fireEvent.click(screen.getByTestId('bookmark-row-l1'))
    expect(window.open).toHaveBeenCalledWith('https://github.com', '_blank')
    expect(mockRecordUsage).toHaveBeenCalledWith('bookmark', 'l1')
  })

  it('즐겨찾기 버튼 클릭 시 toggleFavorite를 호출한다', async () => {
    const { BookmarkRow } = await import('./BookmarkRow')
    render(
      <BookmarkRow
        link={testLink}
        style={{ height: 56 }}
        index={0}
      />,
    )

    fireEvent.click(screen.getByTestId('favorite-btn-l1'))
    expect(mockToggleFavorite).toHaveBeenCalledWith('l1')
  })

  it('태그 chip을 최대 3개까지 표시한다', async () => {
    const { BookmarkRow } = await import('./BookmarkRow')
    render(
      <BookmarkRow
        link={testLink}
        style={{ height: 56 }}
        index={0}
      />,
    )

    // 4개 태그 중 3개만 chip으로
    expect(screen.getByText('dev')).toBeInTheDocument()
    expect(screen.getByText('code')).toBeInTheDocument()
    expect(screen.getByText('extra1')).toBeInTheDocument()
    // 4번째는 +N으로 표시
    expect(screen.getByText('+1')).toBeInTheDocument()
  })

  it('즐겨찾기 상태에 따라 ⭐ 아이콘이 다르게 표시된다', async () => {
    const { BookmarkRow } = await import('./BookmarkRow')
    const favoriteLink = { ...testLink, favorite: true }
    render(
      <BookmarkRow
        link={favoriteLink}
        style={{ height: 56 }}
        index={0}
      />,
    )

    const favBtn = screen.getByTestId('favorite-btn-l1')
    expect(favBtn).toHaveAttribute('data-active', 'true')
  })
})
