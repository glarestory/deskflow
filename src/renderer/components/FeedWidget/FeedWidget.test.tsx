// FeedWidget 컴포넌트 테스트 — SPEC-UX-013 탭 UI + 지연 로딩 + cap UX + ARIA 검증
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'

const mockGet = vi.fn()
const mockSet = vi.fn()
vi.stubGlobal('storage', { get: mockGet, set: mockSet })

// window.open 모킹 (기사 클릭 시 브라우저 열기)
const mockWindowOpen = vi.fn()
vi.stubGlobal('open', mockWindowOpen)

// ─── 테스트 픽스처 ──────────────────────────────────────────────────────

const feedA = { id: 'f-a', url: 'https://a.com/rss', title: 'Feed A' }
const feedB = { id: 'f-b', url: 'https://b.com/rss', title: 'Feed B' }
const feedC = { id: 'f-c', url: 'https://c.com/rss', title: 'Feed C' }

const articleA = {
  feedId: 'f-a',
  title: '기사 A1',
  link: 'https://a.com/1',
  pubDate: new Date().toISOString(),
  source: 'Feed A',
}

describe('FeedWidget', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    vi.resetModules()
    vi.stubGlobal('storage', { get: mockGet, set: mockSet })
    vi.stubGlobal('open', mockWindowOpen)
    mockGet.mockResolvedValue({ value: null })
  })

  // ─── 빈 상태 표시 ────────────────────────────────────────────────────

  // AC-016: 피드 0개 시 빈 상태 안내
  it('피드가 없을 때 빈 상태 메시지를 표시한다 (AC-016)', async () => {
    const { useFeedStore } = await import('../../stores/feedStore')
    useFeedStore.setState({
      feeds: [],
      articlesByFeed: {},
      statusByFeed: {},
      activeFeedId: null,
    })

    const { default: FeedWidget } = await import('./FeedWidget')
    render(<FeedWidget />)

    expect(screen.getByText('피드를 추가해주세요')).toBeInTheDocument()
    // tablist 미렌더
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument()
  })

  // ─── 탭 바 렌더 ─────────────────────────────────────────────────────

  // AC-004: 피드 N개 → role="tab" N개, role="tablist" 1개
  it('피드 3개 → tablist 1개 + tab 3개가 렌더된다 (AC-004)', async () => {
    const { useFeedStore } = await import('../../stores/feedStore')
    useFeedStore.setState({
      feeds: [feedA, feedB, feedC],
      articlesByFeed: { 'f-a': [], 'f-b': [], 'f-c': [] },
      statusByFeed: { 'f-a': 'loaded', 'f-b': 'idle', 'f-c': 'idle' },
      activeFeedId: 'f-a',
    })

    const { default: FeedWidget } = await import('./FeedWidget')
    render(<FeedWidget />)

    expect(screen.getByRole('tablist')).toBeInTheDocument()
    const tabs = screen.getAllByRole('tab')
    expect(tabs).toHaveLength(3)
    // 탭 라벨은 feed.title
    expect(tabs[0]).toHaveTextContent('Feed A')
    expect(tabs[1]).toHaveTextContent('Feed B')
  })

  // AC-006: 활성 탭 aria-selected=true, 비활성 false
  it('활성 탭은 aria-selected=true, 비활성은 false 이다 (AC-006)', async () => {
    const { useFeedStore } = await import('../../stores/feedStore')
    useFeedStore.setState({
      feeds: [feedA, feedB, feedC],
      articlesByFeed: { 'f-a': [], 'f-b': [], 'f-c': [] },
      statusByFeed: { 'f-a': 'loaded', 'f-b': 'idle', 'f-c': 'idle' },
      activeFeedId: 'f-a',
    })

    const { default: FeedWidget } = await import('./FeedWidget')
    render(<FeedWidget />)

    const tabs = screen.getAllByRole('tab')
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true')
    expect(tabs[1]).toHaveAttribute('aria-selected', 'false')
    expect(tabs[2]).toHaveAttribute('aria-selected', 'false')
  })

  // ─── tabpanel ──────────────────────────────────────────────────────

  // AC-005: tabpanel 에 활성 탭 기사만 표시
  it('tabpanel 에 활성 탭 기사만 표시된다 (AC-005)', async () => {
    const { useFeedStore } = await import('../../stores/feedStore')
    useFeedStore.setState({
      feeds: [feedA, feedB],
      articlesByFeed: {
        'f-a': [articleA],
        'f-b': [{ feedId: 'f-b', title: '기사 B1', link: 'https://b.com/1', pubDate: new Date().toISOString(), source: 'Feed B' }],
      },
      statusByFeed: { 'f-a': 'loaded', 'f-b': 'loaded' },
      activeFeedId: 'f-a',
    })

    const { default: FeedWidget } = await import('./FeedWidget')
    render(<FeedWidget />)

    // A 기사 표시
    expect(screen.getByText('기사 A1')).toBeInTheDocument()
    // B 기사 미표시
    expect(screen.queryByText('기사 B1')).not.toBeInTheDocument()
  })

  // AC-018: ARIA tablist 패턴 — aria-controls, aria-labelledby
  it('탭은 aria-controls 로 tabpanel 과 연결된다 (AC-018)', async () => {
    const { useFeedStore } = await import('../../stores/feedStore')
    useFeedStore.setState({
      feeds: [feedA, feedB],
      articlesByFeed: { 'f-a': [], 'f-b': [] },
      statusByFeed: { 'f-a': 'loaded', 'f-b': 'idle' },
      activeFeedId: 'f-a',
    })

    const { default: FeedWidget } = await import('./FeedWidget')
    render(<FeedWidget />)

    const tabA = screen.getAllByRole('tab')[0]
    expect(tabA).toHaveAttribute('aria-controls', 'feed-panel-f-a')
    const panel = screen.getByRole('tabpanel')
    expect(panel).toHaveAttribute('id', 'feed-panel-f-a')
    expect(panel).toHaveAttribute('aria-labelledby', 'feed-tab-f-a')
  })

  // ─── cap UX ──────────────────────────────────────────────────────

  // AC-002: 5개 cap 도달 시 추가 버튼 disabled + 안내
  it('피드 5개 시 추가 버튼이 disabled 되고 안내 메시지가 표시된다 (AC-002)', async () => {
    const { useFeedStore } = await import('../../stores/feedStore')
    const fiveFeeds = Array.from({ length: 5 }, (_, i) => ({
      id: `f-${i}`,
      url: `https://feed${i}.com/rss`,
      title: `Feed ${i}`,
    }))
    const statusByFeed: Record<string, 'loaded'> = {}
    const articlesByFeed: Record<string, []> = {}
    for (const f of fiveFeeds) {
      statusByFeed[f.id] = 'loaded'
      articlesByFeed[f.id] = []
    }
    useFeedStore.setState({
      feeds: fiveFeeds,
      articlesByFeed,
      statusByFeed,
      activeFeedId: fiveFeeds[0].id,
    })

    const { default: FeedWidget } = await import('./FeedWidget')
    render(<FeedWidget />)

    const addBtn = screen.getByTestId('add-feed-btn')
    expect(addBtn).toBeDisabled()
    expect(screen.getByText('피드는 최대 5개까지 추가할 수 있습니다')).toBeInTheDocument()
  })

  // ─── 로딩/오류 상태 ─────────────────────────────────────────────────

  // AC-010: loading 상태 → "불러오는 중..." 표시
  it('활성 탭이 loading 상태이면 불러오는 중 텍스트가 표시된다 (AC-010)', async () => {
    const { useFeedStore } = await import('../../stores/feedStore')
    useFeedStore.setState({
      feeds: [feedA],
      articlesByFeed: { 'f-a': [] },
      statusByFeed: { 'f-a': 'loading' },
      activeFeedId: 'f-a',
    })

    const { default: FeedWidget } = await import('./FeedWidget')
    render(<FeedWidget />)

    expect(screen.getByText('불러오는 중...')).toBeInTheDocument()
  })

  // AC-011: error 상태 → 오류 안내 표시
  it('활성 탭이 error 상태이면 오류 안내가 표시된다 (AC-011)', async () => {
    const { useFeedStore } = await import('../../stores/feedStore')
    useFeedStore.setState({
      feeds: [{ ...feedA, error: '네트워크 오류' }],
      articlesByFeed: { 'f-a': [] },
      statusByFeed: { 'f-a': 'error' },
      activeFeedId: 'f-a',
    })

    const { default: FeedWidget } = await import('./FeedWidget')
    render(<FeedWidget />)

    expect(screen.getByText(/오류:/)).toBeInTheDocument()
  })

  // ─── 탭 클릭 → setActiveFeed ─────────────────────────────────────────

  it('탭 클릭 시 setActiveFeed 가 호출된다', async () => {
    const mockSetActiveFeed = vi.fn()
    const { useFeedStore } = await import('../../stores/feedStore')
    useFeedStore.setState({
      feeds: [feedA, feedB],
      articlesByFeed: { 'f-a': [articleA], 'f-b': [] },
      statusByFeed: { 'f-a': 'loaded', 'f-b': 'idle' },
      activeFeedId: 'f-a',
    })
    useFeedStore.setState({ setActiveFeed: mockSetActiveFeed } as unknown as Parameters<typeof useFeedStore.setState>[0])

    const { default: FeedWidget } = await import('./FeedWidget')
    render(<FeedWidget />)

    const tabs = screen.getAllByRole('tab')
    fireEvent.click(tabs[1])

    expect(mockSetActiveFeed).toHaveBeenCalledWith('f-b')
  })

  // ─── 새로고침 버튼 → refreshActiveFeed ──────────────────────────────

  it('새로고침 버튼 클릭 시 refreshActiveFeed 를 호출한다', async () => {
    const mockRefreshActiveFeed = vi.fn().mockResolvedValue(undefined)

    const { useFeedStore } = await import('../../stores/feedStore')
    useFeedStore.setState({
      feeds: [feedA],
      articlesByFeed: { 'f-a': [articleA] },
      statusByFeed: { 'f-a': 'loaded' },
      activeFeedId: 'f-a',
    })
    useFeedStore.setState({ refreshActiveFeed: mockRefreshActiveFeed } as unknown as Parameters<typeof useFeedStore.setState>[0])

    const { default: FeedWidget } = await import('./FeedWidget')
    render(<FeedWidget />)

    const refreshBtn = screen.getByTestId('refresh-feeds-btn')
    fireEvent.click(refreshBtn)

    await waitFor(() => {
      expect(mockRefreshActiveFeed).toHaveBeenCalledOnce()
    })
  })

  // ─── 기사 클릭 → 브라우저 열기 ────────────────────────────────────────

  it('기사 클릭 시 해당 링크를 새 창으로 열린다', async () => {
    const { useFeedStore } = await import('../../stores/feedStore')
    useFeedStore.setState({
      feeds: [feedA],
      articlesByFeed: { 'f-a': [{ ...articleA, link: 'https://a.com/article' }] },
      statusByFeed: { 'f-a': 'loaded' },
      activeFeedId: 'f-a',
    })

    const { default: FeedWidget } = await import('./FeedWidget')
    render(<FeedWidget />)

    const articleEl = screen.getByText('기사 A1')
    fireEvent.click(articleEl)

    expect(mockWindowOpen).toHaveBeenCalledWith('https://a.com/article', '_blank')
  })

  // ─── 위젯 드래그 핸들 보존 (AC-021) ────────────────────────────────────

  it('widget-drag-handle 영역이 존재한다 (AC-021)', async () => {
    const { useFeedStore } = await import('../../stores/feedStore')
    useFeedStore.setState({
      feeds: [],
      articlesByFeed: {},
      statusByFeed: {},
      activeFeedId: null,
    })

    const { default: FeedWidget } = await import('./FeedWidget')
    const { container } = render(<FeedWidget />)

    const dragHandle = container.querySelector('.widget-drag-handle')
    expect(dragHandle).toBeInTheDocument()
  })

  // ─── 화살표 키 탭 내비게이션 (AC-019) ──────────────────────────────────

  it('ArrowRight 키로 다음 탭으로 이동한다 (AC-019)', async () => {
    const mockSetActiveFeed = vi.fn()
    const { useFeedStore } = await import('../../stores/feedStore')
    useFeedStore.setState({
      feeds: [feedA, feedB, feedC],
      articlesByFeed: { 'f-a': [], 'f-b': [], 'f-c': [] },
      statusByFeed: { 'f-a': 'loaded', 'f-b': 'idle', 'f-c': 'idle' },
      activeFeedId: 'f-a',
    })
    useFeedStore.setState({ setActiveFeed: mockSetActiveFeed } as unknown as Parameters<typeof useFeedStore.setState>[0])

    const { default: FeedWidget } = await import('./FeedWidget')
    render(<FeedWidget />)

    const firstTab = screen.getAllByRole('tab')[0]
    fireEvent.keyDown(firstTab, { key: 'ArrowRight' })

    expect(mockSetActiveFeed).toHaveBeenCalledWith('f-b')
  })

  it('ArrowLeft 키로 이전 탭으로 이동한다 (AC-019)', async () => {
    const mockSetActiveFeed = vi.fn()
    const { useFeedStore } = await import('../../stores/feedStore')
    useFeedStore.setState({
      feeds: [feedA, feedB, feedC],
      articlesByFeed: { 'f-a': [], 'f-b': [], 'f-c': [] },
      statusByFeed: { 'f-a': 'loaded', 'f-b': 'loaded', 'f-c': 'idle' },
      activeFeedId: 'f-b',
    })
    useFeedStore.setState({ setActiveFeed: mockSetActiveFeed } as unknown as Parameters<typeof useFeedStore.setState>[0])

    const { default: FeedWidget } = await import('./FeedWidget')
    render(<FeedWidget />)

    const secondTab = screen.getAllByRole('tab')[1]
    fireEvent.keyDown(secondTab, { key: 'ArrowLeft' })

    expect(mockSetActiveFeed).toHaveBeenCalledWith('f-a')
  })

  // ─── roving tabindex (AC-019) ──────────────────────────────────────────

  it('활성 탭만 tabIndex=0, 나머지는 -1 이다 (AC-019 roving tabindex)', async () => {
    const { useFeedStore } = await import('../../stores/feedStore')
    useFeedStore.setState({
      feeds: [feedA, feedB, feedC],
      articlesByFeed: { 'f-a': [], 'f-b': [], 'f-c': [] },
      statusByFeed: { 'f-a': 'loaded', 'f-b': 'idle', 'f-c': 'idle' },
      activeFeedId: 'f-a',
    })

    const { default: FeedWidget } = await import('./FeedWidget')
    render(<FeedWidget />)

    const tabs = screen.getAllByRole('tab')
    expect(tabs[0]).toHaveAttribute('tabIndex', '0')
    expect(tabs[1]).toHaveAttribute('tabIndex', '-1')
    expect(tabs[2]).toHaveAttribute('tabIndex', '-1')
  })

  // ─── 피드 추가 폼 표시 (cap 미도달) ────────────────────────────────────

  it('추가 버튼 클릭 시 피드 URL 입력 폼이 나타난다', async () => {
    const { useFeedStore } = await import('../../stores/feedStore')
    useFeedStore.setState({
      feeds: [],
      articlesByFeed: {},
      statusByFeed: {},
      activeFeedId: null,
    })

    const { default: FeedWidget } = await import('./FeedWidget')
    render(<FeedWidget />)

    const addButton = screen.getByTestId('add-feed-btn')
    fireEvent.click(addButton)

    expect(screen.getByPlaceholderText(/RSS URL/)).toBeInTheDocument()
  })

  // ─── N/5 표시 유지 ──────────────────────────────────────────────────

  it('등록된 피드 수가 N/5 형식으로 표시된다', async () => {
    const { useFeedStore } = await import('../../stores/feedStore')
    useFeedStore.setState({
      feeds: [feedA, feedB],
      articlesByFeed: { 'f-a': [], 'f-b': [] },
      statusByFeed: { 'f-a': 'loaded', 'f-b': 'idle' },
      activeFeedId: 'f-a',
    })

    const { default: FeedWidget } = await import('./FeedWidget')
    render(<FeedWidget />)

    expect(screen.getByText('등록된 피드 (2/5)')).toBeInTheDocument()
  })
})
