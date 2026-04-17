// @MX:TODO: [AUTO] feedStore 테스트 — GREEN 완료 후 제거
import { describe, it, expect, vi, beforeEach } from 'vitest'

// window.storage 모킹 (bookmarkStore.test.ts 패턴 동일)
const mockGet = vi.fn()
const mockSet = vi.fn()
vi.stubGlobal('storage', { get: mockGet, set: mockSet })

// fetch 모킹
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

/** rss2json 응답 픽스처 */
const makeRss2JsonResponse = (feedTitle: string, items: { title: string; link: string; pubDate: string }[]) => ({
  status: 'ok',
  feed: { title: feedTitle },
  items: items.map((item) => ({ ...item })),
})

describe('feedStore', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    vi.resetModules()
    vi.stubGlobal('storage', { get: mockGet, set: mockSet })
    vi.stubGlobal('fetch', mockFetch)
    // 기본적으로 storage는 빈 값 반환
    mockGet.mockResolvedValue({ value: null })
  })

  // ─── REQ-001: 피드 추가 시 기사 가져오기 ───────────────────────────────
  it('addFeed가 피드를 추가하고 fetchFeedArticles를 호출한다', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve(makeRss2JsonResponse('Test Feed', [
          { title: '기사1', link: 'https://example.com/1', pubDate: '2026-04-10T00:00:00' },
        ])),
    })

    const { useFeedStore } = await import('./feedStore')
    await useFeedStore.getState().addFeed('https://example.com/rss')

    const { feeds, articles } = useFeedStore.getState()
    expect(feeds).toHaveLength(1)
    expect(feeds[0].url).toBe('https://example.com/rss')
    expect(articles).toHaveLength(1)
    expect(articles[0].title).toBe('기사1')
  })

  // ─── REQ-006: 피드 삭제 시 기사도 제거 ────────────────────────────────
  it('removeFeed가 해당 피드와 기사를 제거한다', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve(makeRss2JsonResponse('Feed A', [
          { title: '기사A', link: 'https://a.com/1', pubDate: '2026-04-10T00:00:00' },
        ])),
    })

    const { useFeedStore } = await import('./feedStore')
    await useFeedStore.getState().addFeed('https://a.com/rss')

    const feedId = useFeedStore.getState().feeds[0].id
    useFeedStore.getState().removeFeed(feedId)

    const { feeds, articles } = useFeedStore.getState()
    expect(feeds).toHaveLength(0)
    expect(articles).toHaveLength(0)
  })

  // ─── fetchFeedArticles: 성공 시 articles 채움 ─────────────────────────
  it('fetchFeedArticles가 성공하면 articles를 채운다', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve(makeRss2JsonResponse('My Feed', [
          { title: '제목1', link: 'https://b.com/1', pubDate: '2026-04-09T00:00:00' },
          { title: '제목2', link: 'https://b.com/2', pubDate: '2026-04-08T00:00:00' },
        ])),
    })

    const { useFeedStore } = await import('./feedStore')
    const feed = { id: 'feed-1', url: 'https://b.com/rss', title: '' }
    await useFeedStore.getState().fetchFeedArticles(feed)

    const { articles } = useFeedStore.getState()
    expect(articles).toHaveLength(2)
    expect(articles[0].source).toBe('My Feed')
    expect(articles[0].feedId).toBe('feed-1')
  })

  // ─── REQ-007: 파싱 실패 시 오류 상태 표시 ────────────────────────────
  it('fetchFeedArticles가 실패하면 feed.error를 설정한다', async () => {
    mockFetch.mockRejectedValue(new Error('네트워크 오류'))

    const { useFeedStore } = await import('./feedStore')
    await useFeedStore.getState().addFeed('https://bad.com/rss')

    const { feeds } = useFeedStore.getState()
    expect(feeds[0].error).toBeDefined()
    expect(typeof feeds[0].error).toBe('string')
  })

  // ─── REQ-008: 최대 5개 피드 제한 ─────────────────────────────────────
  it('최대 5개 피드 제한을 초과하면 6번째 추가를 거부한다', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(makeRss2JsonResponse('Feed', [])),
    })

    const { useFeedStore } = await import('./feedStore')
    for (let i = 0; i < 5; i++) {
      await useFeedStore.getState().addFeed(`https://example${i}.com/rss`)
    }

    // 6번째 추가 시도
    await useFeedStore.getState().addFeed('https://example5.com/rss')

    const { feeds } = useFeedStore.getState()
    expect(feeds).toHaveLength(5)
  })

  // ─── REQ-004: 새로고침 시 모든 피드 갱신 ─────────────────────────────
  it('refreshAll이 모든 피드에 대해 fetchFeedArticles를 호출한다', async () => {
    // 첫 번째 addFeed들을 위한 응답
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(makeRss2JsonResponse('Feed', [])),
    })

    const { useFeedStore } = await import('./feedStore')
    await useFeedStore.getState().addFeed('https://feed1.com/rss')
    await useFeedStore.getState().addFeed('https://feed2.com/rss')

    const callCountBeforeRefresh = mockFetch.mock.calls.length

    await useFeedStore.getState().refreshAll()

    // refreshAll은 feeds 수만큼 추가 fetch 호출이 있어야 한다
    const additionalCalls = mockFetch.mock.calls.length - callCountBeforeRefresh
    expect(additionalCalls).toBe(2)
  })

  // ─── 스토리지 지속성: feeds 배열만 저장됨 ────────────────────────────
  it('addFeed 후 feeds 배열을 스토리지에 저장한다', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(makeRss2JsonResponse('Saved Feed', [])),
    })

    const { useFeedStore } = await import('./feedStore')
    await useFeedStore.getState().addFeed('https://persist.com/rss')

    expect(mockSet).toHaveBeenCalledWith('rss-feeds', expect.any(String))
  })

  // ─── 재현 테스트 (버그 #1): loadFeeds 복원 ───────────────────────────
  // 증상: 앱 종료 후 재오픈 시 피드 데이터가 사라짐.
  // 원인 후보: loadFeeds가 storage에서 복원하지 않거나 호출되지 않음.
  it('loadFeeds가 storage의 저장된 feeds를 state로 복원한다', async () => {
    const savedFeeds = [
      { id: 'f-saved-1', url: 'https://saved.com/rss', title: 'Saved Feed' },
      { id: 'f-saved-2', url: 'https://another.com/rss', title: 'Another Feed' },
    ]
    mockGet.mockResolvedValue({ value: JSON.stringify(savedFeeds) })

    const { useFeedStore } = await import('./feedStore')
    // 초기 state는 빈 배열
    expect(useFeedStore.getState().feeds).toHaveLength(0)

    await useFeedStore.getState().loadFeeds()

    const { feeds } = useFeedStore.getState()
    expect(feeds).toHaveLength(2)
    expect(feeds[0].id).toBe('f-saved-1')
    expect(feeds[0].url).toBe('https://saved.com/rss')
    expect(feeds[0].title).toBe('Saved Feed')
    expect(feeds[1].id).toBe('f-saved-2')
  })

  it('loadFeeds가 storage에 저장된 값이 없으면 빈 배열 유지', async () => {
    mockGet.mockResolvedValue({ value: null })

    const { useFeedStore } = await import('./feedStore')
    await useFeedStore.getState().loadFeeds()

    expect(useFeedStore.getState().feeds).toHaveLength(0)
  })
})
