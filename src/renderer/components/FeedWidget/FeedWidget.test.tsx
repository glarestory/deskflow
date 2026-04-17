// @MX:TODO: [AUTO] FeedWidget 컴포넌트 테스트 — GREEN 완료 후 제거
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'

const mockGet = vi.fn()
const mockSet = vi.fn()
vi.stubGlobal('storage', { get: mockGet, set: mockSet })

// window.open 모킹 (기사 클릭 시 브라우저 열기)
const mockWindowOpen = vi.fn()
vi.stubGlobal('open', mockWindowOpen)

describe('FeedWidget', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    vi.resetModules()
    vi.stubGlobal('storage', { get: mockGet, set: mockSet })
    vi.stubGlobal('open', mockWindowOpen)
    mockGet.mockResolvedValue({ value: null })
  })

  // ─── 기사 목록 렌더링 ────────────────────────────────────────────────
  it('기사 목록을 렌더링한다', async () => {
    // feedStore를 먼저 import하여 초기 상태 설정
    const { useFeedStore } = await import('../../stores/feedStore')
    // 기사 직접 주입
    useFeedStore.setState({
      feeds: [{ id: 'f1', url: 'https://test.com/rss', title: '테스트 피드' }],
      articles: [
        {
          feedId: 'f1',
          title: '테스트 기사 제목',
          link: 'https://test.com/article/1',
          pubDate: new Date().toISOString(),
          source: '테스트 피드',
        },
      ],
      loading: false,
    })

    const { default: FeedWidget } = await import('./FeedWidget')
    render(<FeedWidget />)

    expect(screen.getByText('테스트 기사 제목')).toBeInTheDocument()
  })

  // ─── 빈 상태 표시 ────────────────────────────────────────────────────
  it('피드가 없을 때 빈 상태 메시지를 표시한다', async () => {
    const { useFeedStore } = await import('../../stores/feedStore')
    useFeedStore.setState({ feeds: [], articles: [], loading: false })

    const { default: FeedWidget } = await import('./FeedWidget')
    render(<FeedWidget />)

    expect(screen.getByText('피드를 추가해주세요')).toBeInTheDocument()
  })

  // ─── 피드 추가 폼 표시 ───────────────────────────────────────────────
  it('추가 버튼 클릭 시 피드 URL 입력 폼이 나타난다', async () => {
    const { useFeedStore } = await import('../../stores/feedStore')
    useFeedStore.setState({ feeds: [], articles: [], loading: false })

    const { default: FeedWidget } = await import('./FeedWidget')
    render(<FeedWidget />)

    const addButton = screen.getByTestId('add-feed-btn')
    fireEvent.click(addButton)

    expect(screen.getByPlaceholderText(/RSS URL/)).toBeInTheDocument()
  })

  // ─── REQ-003: 기사 클릭 시 브라우저 열기 ─────────────────────────────
  it('기사 클릭 시 해당 링크를 새 창으로 열린다', async () => {
    const { useFeedStore } = await import('../../stores/feedStore')
    useFeedStore.setState({
      feeds: [{ id: 'f1', url: 'https://test.com/rss', title: '테스트 피드' }],
      articles: [
        {
          feedId: 'f1',
          title: '클릭할 기사',
          link: 'https://test.com/article/click',
          pubDate: new Date().toISOString(),
          source: '테스트 피드',
        },
      ],
      loading: false,
    })

    const { default: FeedWidget } = await import('./FeedWidget')
    render(<FeedWidget />)

    const articleEl = screen.getByText('클릭할 기사')
    fireEvent.click(articleEl)

    expect(mockWindowOpen).toHaveBeenCalledWith('https://test.com/article/click', '_blank')
  })

  // ─── REQ-007: 오류 피드에 오류 배지 표시 ──────────────────────────────
  it('오류가 있는 피드에 오류 배지를 표시한다', async () => {
    const { useFeedStore } = await import('../../stores/feedStore')
    useFeedStore.setState({
      feeds: [{ id: 'f2', url: 'https://bad.com/rss', title: '오류 피드', error: '네트워크 오류' }],
      articles: [],
      loading: false,
    })

    const { default: FeedWidget } = await import('./FeedWidget')
    render(<FeedWidget />)

    expect(screen.getByTestId('feed-error-f2')).toBeInTheDocument()
  })

  // ─── REQ-004: 새로고침 버튼이 refreshAll을 호출 ───────────────────────
  it('새로고침 버튼 클릭 시 refreshAll을 호출한다', async () => {
    const mockRefreshAll = vi.fn().mockResolvedValue(undefined)

    const { useFeedStore } = await import('../../stores/feedStore')
    useFeedStore.setState({
      feeds: [{ id: 'f1', url: 'https://test.com/rss', title: '테스트 피드' }],
      articles: [],
      loading: false,
    })
    // refreshAll 메서드를 모킹
    useFeedStore.setState({ refreshAll: mockRefreshAll } as unknown as Parameters<typeof useFeedStore.setState>[0])

    const { default: FeedWidget } = await import('./FeedWidget')
    render(<FeedWidget />)

    const refreshBtn = screen.getByTestId('refresh-feeds-btn')
    fireEvent.click(refreshBtn)

    await waitFor(() => {
      expect(mockRefreshAll).toHaveBeenCalledOnce()
    })
  })
})
