// feedStore 테스트 — SPEC-UX-013 피드별 지연 로딩 + 탭 상태 모델 검증
import { describe, it, expect, vi, beforeEach } from 'vitest'

// window.storage 모킹 (bookmarkStore.test.ts 패턴 동일)
const mockGet = vi.fn()
const mockSet = vi.fn()
vi.stubGlobal('storage', { get: mockGet, set: mockSet })

// fetch 모킹
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

/** rss2json 응답 픽스처 */
const makeRss2JsonResponse = (
  feedTitle: string,
  items: { title: string; link: string; pubDate: string }[],
) => ({
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
    // 기본적으로 storage 는 빈 값 반환
    mockGet.mockResolvedValue({ value: null })
  })

  // ─── 기존 테스트 (마이그레이션) ──────────────────────────────────────

  // REQ-UX-013-013: 피드 추가 시 기사 가져오기
  it('addFeed 가 피드를 추가하고 기사를 fetch 한다', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve(
          makeRss2JsonResponse('Test Feed', [
            { title: '기사1', link: 'https://example.com/1', pubDate: '2026-04-10T00:00:00' },
          ]),
        ),
    })

    const { useFeedStore } = await import('./feedStore')
    await useFeedStore.getState().addFeed('https://example.com/rss')

    const { feeds, articlesByFeed, activeFeedId } = useFeedStore.getState()
    expect(feeds).toHaveLength(1)
    expect(feeds[0].url).toBe('https://example.com/rss')
    // articlesByFeed 로 마이그레이션 (기존 articles 단일 배열 → 피드별 map)
    expect(articlesByFeed[feeds[0].id]).toHaveLength(1)
    expect(articlesByFeed[feeds[0].id][0].title).toBe('기사1')
    // 추가 직후 새 탭 활성 (D3)
    expect(activeFeedId).toBe(feeds[0].id)
  })

  // REQ-UX-013-014: 피드 삭제 시 기사도 제거
  it('removeFeed 가 해당 피드와 기사/상태를 제거한다', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve(
          makeRss2JsonResponse('Feed A', [
            { title: '기사A', link: 'https://a.com/1', pubDate: '2026-04-10T00:00:00' },
          ]),
        ),
    })

    const { useFeedStore } = await import('./feedStore')
    await useFeedStore.getState().addFeed('https://a.com/rss')

    const feedId = useFeedStore.getState().feeds[0].id
    useFeedStore.getState().removeFeed(feedId)

    const { feeds, articlesByFeed, statusByFeed } = useFeedStore.getState()
    expect(feeds).toHaveLength(0)
    expect(articlesByFeed[feedId]).toBeUndefined()
    expect(statusByFeed[feedId]).toBeUndefined()
  })

  // fetchFeedArticles: 성공 시 articlesByFeed 채움
  it('fetchFeedArticles 가 성공하면 articlesByFeed 를 채운다', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve(
          makeRss2JsonResponse('My Feed', [
            { title: '제목1', link: 'https://b.com/1', pubDate: '2026-04-09T00:00:00' },
            { title: '제목2', link: 'https://b.com/2', pubDate: '2026-04-08T00:00:00' },
          ]),
        ),
    })

    const { useFeedStore } = await import('./feedStore')
    const feed = { id: 'feed-1', url: 'https://b.com/rss', title: '' }
    // 초기 상태 설정
    useFeedStore.setState((s) => ({
      feeds: [...s.feeds, feed],
      statusByFeed: { ...s.statusByFeed, 'feed-1': 'idle' as const },
    }))
    await useFeedStore.getState().fetchFeedArticles(feed)

    const { articlesByFeed } = useFeedStore.getState()
    expect(articlesByFeed['feed-1']).toHaveLength(2)
    expect(articlesByFeed['feed-1'][0].source).toBe('My Feed')
    expect(articlesByFeed['feed-1'][0].feedId).toBe('feed-1')
  })

  // REQ-UX-013-011: 파싱 실패 시 오류 상태 표시
  it('fetchFeedArticles 가 실패하면 feed.error 와 statusByFeed error 를 설정한다', async () => {
    mockFetch.mockRejectedValue(new Error('네트워크 오류'))

    const { useFeedStore } = await import('./feedStore')
    await useFeedStore.getState().addFeed('https://bad.com/rss')

    const { feeds, statusByFeed } = useFeedStore.getState()
    expect(feeds[0].error).toBeDefined()
    expect(typeof feeds[0].error).toBe('string')
    expect(statusByFeed[feeds[0].id]).toBe('error')
  })

  // ─── REQ-UX-013-001/003: 최대 5개 피드 제한 ─────────────────────────

  it('최대 5개 피드 제한을 초과하면 6번째 추가를 거부한다 (AC-001/003)', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(makeRss2JsonResponse('Feed', [])),
    })

    const { useFeedStore } = await import('./feedStore')
    for (let i = 0; i < 5; i++) {
      await useFeedStore.getState().addFeed(`https://example${i}.com/rss`)
    }

    // 6번째 추가 시도 — no-op (에러 미발생)
    await expect(useFeedStore.getState().addFeed('https://example5.com/rss')).resolves.toBeUndefined()

    const { feeds } = useFeedStore.getState()
    expect(feeds).toHaveLength(5)
  })

  // ─── 스토리지 지속성: feeds 배열만 저장됨 ────────────────────────────

  it('addFeed 후 feeds 배열을 스토리지에 저장한다 (AC-023)', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(makeRss2JsonResponse('Saved Feed', [])),
    })

    const { useFeedStore } = await import('./feedStore')
    await useFeedStore.getState().addFeed('https://persist.com/rss')

    expect(mockSet).toHaveBeenCalledWith('rss-feeds', expect.any(String))
    // articlesByFeed 는 영속화 안 됨 (에페메럴)
    const feedsCall = mockSet.mock.calls.find((c) => c[0] === 'rss-feeds')
    expect(feedsCall).toBeDefined()
  })

  // REQ-UX-013-008: loadFeeds 복원 + 첫 탭만 fetch
  it('loadFeeds 가 storage 의 저장된 feeds 를 state 로 복원한다', async () => {
    const savedFeeds = [
      { id: 'f-saved-1', url: 'https://saved.com/rss', title: 'Saved Feed' },
      { id: 'f-saved-2', url: 'https://another.com/rss', title: 'Another Feed' },
    ]
    mockGet.mockResolvedValue({ value: JSON.stringify(savedFeeds) })

    const { useFeedStore } = await import('./feedStore')
    expect(useFeedStore.getState().feeds).toHaveLength(0)

    await useFeedStore.getState().loadFeeds()

    const { feeds } = useFeedStore.getState()
    expect(feeds).toHaveLength(2)
    expect(feeds[0].id).toBe('f-saved-1')
    expect(feeds[1].id).toBe('f-saved-2')
  })

  it('loadFeeds 가 storage 에 저장된 값이 없으면 빈 배열 유지', async () => {
    mockGet.mockResolvedValue({ value: null })

    const { useFeedStore } = await import('./feedStore')
    await useFeedStore.getState().loadFeeds()

    expect(useFeedStore.getState().feeds).toHaveLength(0)
  })

  // ─── 신규: SPEC-UX-013 지연 로딩 / 캐시 / 상태 테스트 ───────────────

  // AC-007: 최초 로드 = 첫 탭만 fetch, 나머지 idle
  it('loadFeeds 는 첫 번째 피드만 fetch 한다 (AC-007, REQ-UX-013-008)', async () => {
    const savedFeeds = [
      { id: 'f-a', url: 'https://a.com/rss', title: 'Feed A' },
      { id: 'f-b', url: 'https://b.com/rss', title: 'Feed B' },
      { id: 'f-c', url: 'https://c.com/rss', title: 'Feed C' },
    ]
    mockGet.mockResolvedValue({ value: JSON.stringify(savedFeeds) })
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(makeRss2JsonResponse('Feed A', [])),
    })

    const { useFeedStore } = await import('./feedStore')
    await useFeedStore.getState().loadFeeds()

    // fetch 는 첫 번째 피드에 대해서만 1회 발생
    expect(mockFetch).toHaveBeenCalledTimes(1)
    // 나머지 피드는 idle 상태 유지
    const { statusByFeed, activeFeedId } = useFeedStore.getState()
    expect(statusByFeed['f-b']).toBe('idle')
    expect(statusByFeed['f-c']).toBe('idle')
    expect(activeFeedId).toBe('f-a')
  })

  // AC-008: 비활성 탭 최초 클릭 시 지연 로딩
  it('setActiveFeed(idle) 는 해당 피드를 1회 fetch 한다 (AC-008, REQ-UX-013-009)', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(makeRss2JsonResponse('Feed B', [])),
    })

    const { useFeedStore } = await import('./feedStore')
    const feedA = { id: 'f-a', url: 'https://a.com/rss', title: 'Feed A' }
    const feedB = { id: 'f-b', url: 'https://b.com/rss', title: 'Feed B' }
    useFeedStore.setState({
      feeds: [feedA, feedB],
      statusByFeed: { 'f-a': 'loaded', 'f-b': 'idle' },
      articlesByFeed: { 'f-a': [] },
      activeFeedId: 'f-a',
    })

    const callsBefore = mockFetch.mock.calls.length
    useFeedStore.getState().setActiveFeed('f-b')
    // setActiveFeed 는 동기 + 비동기 loadFeed 를 트리거
    await new Promise((r) => setTimeout(r, 10))

    expect(mockFetch.mock.calls.length - callsBefore).toBe(1)
    const { statusByFeed } = useFeedStore.getState()
    expect(statusByFeed['f-b']).toBe('loaded')
  })

  // AC-009: 캐시 재사용 — loaded 탭 재클릭 시 fetch 0회
  it('setActiveFeed(loaded) 는 fetch 를 트리거하지 않는다 (AC-009, REQ-UX-013-010)', async () => {
    const { useFeedStore } = await import('./feedStore')
    useFeedStore.setState({
      feeds: [
        { id: 'f-a', url: 'https://a.com/rss', title: 'Feed A' },
        { id: 'f-b', url: 'https://b.com/rss', title: 'Feed B' },
      ],
      statusByFeed: { 'f-a': 'loaded', 'f-b': 'loaded' },
      articlesByFeed: { 'f-a': [], 'f-b': [] },
      activeFeedId: 'f-a',
    })

    const callsBefore = mockFetch.mock.calls.length
    useFeedStore.getState().setActiveFeed('f-b')
    await new Promise((r) => setTimeout(r, 10))

    expect(mockFetch.mock.calls.length - callsBefore).toBe(0)
  })

  // loadFeed force: loaded 여도 재요청
  it('loadFeed(id, { force: true }) 는 loaded 상태여도 재요청한다', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(makeRss2JsonResponse('Feed A', [])),
    })

    const { useFeedStore } = await import('./feedStore')
    const feedA = { id: 'f-a', url: 'https://a.com/rss', title: 'Feed A' }
    useFeedStore.setState({
      feeds: [feedA],
      statusByFeed: { 'f-a': 'loaded' },
      articlesByFeed: { 'f-a': [] },
      activeFeedId: 'f-a',
    })

    const callsBefore = mockFetch.mock.calls.length
    await useFeedStore.getState().loadFeed('f-a', { force: true })

    expect(mockFetch.mock.calls.length - callsBefore).toBe(1)
  })

  // AC-012: 새로고침 = 활성 탭 재요청 + 나머지 stale
  it('refreshActiveFeed 는 활성 탭만 fetch 하고 나머지를 stale 로 표시한다 (AC-012, REQ-UX-013-012)', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(makeRss2JsonResponse('Feed A', [])),
    })

    const { useFeedStore } = await import('./feedStore')
    useFeedStore.setState({
      feeds: [
        { id: 'f-a', url: 'https://a.com/rss', title: 'Feed A' },
        { id: 'f-b', url: 'https://b.com/rss', title: 'Feed B' },
        { id: 'f-c', url: 'https://c.com/rss', title: 'Feed C' },
      ],
      statusByFeed: { 'f-a': 'loaded', 'f-b': 'loaded', 'f-c': 'loaded' },
      articlesByFeed: { 'f-a': [], 'f-b': [], 'f-c': [] },
      activeFeedId: 'f-a',
    })

    const callsBefore = mockFetch.mock.calls.length
    await useFeedStore.getState().refreshActiveFeed()

    // 활성 탭(f-a)만 1회 fetch
    expect(mockFetch.mock.calls.length - callsBefore).toBe(1)
    const { statusByFeed } = useFeedStore.getState()
    // f-a 는 loaded (강제 재요청 성공)
    expect(statusByFeed['f-a']).toBe('loaded')
    // 나머지는 stale
    expect(statusByFeed['f-b']).toBe('stale')
    expect(statusByFeed['f-c']).toBe('stale')
  })

  // AC-013: stale 탭 다음 방문 시 재로드
  it('setActiveFeed(stale) 는 해당 피드를 재로드한다 (AC-013)', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(makeRss2JsonResponse('Feed B', [])),
    })

    const { useFeedStore } = await import('./feedStore')
    useFeedStore.setState({
      feeds: [
        { id: 'f-a', url: 'https://a.com/rss', title: 'Feed A' },
        { id: 'f-b', url: 'https://b.com/rss', title: 'Feed B' },
      ],
      statusByFeed: { 'f-a': 'loaded', 'f-b': 'stale' },
      articlesByFeed: { 'f-a': [], 'f-b': [] },
      activeFeedId: 'f-a',
    })

    const callsBefore = mockFetch.mock.calls.length
    useFeedStore.getState().setActiveFeed('f-b')
    await new Promise((r) => setTimeout(r, 10))

    expect(mockFetch.mock.calls.length - callsBefore).toBe(1)
    const { statusByFeed } = useFeedStore.getState()
    expect(statusByFeed['f-b']).toBe('loaded')
  })

  // AC-014: 피드 추가 시 즉시 fetch + 새 탭 활성
  it('addFeed 성공 시 새 피드가 즉시 loaded 되고 activeFeedId 가 갱신된다 (AC-014)', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(makeRss2JsonResponse('New Feed', [])),
    })

    const { useFeedStore } = await import('./feedStore')
    useFeedStore.setState({
      feeds: [{ id: 'f-a', url: 'https://a.com/rss', title: 'Feed A' }],
      statusByFeed: { 'f-a': 'loaded' },
      articlesByFeed: { 'f-a': [] },
      activeFeedId: 'f-a',
    })

    await useFeedStore.getState().addFeed('https://new.com/rss')

    const { feeds, statusByFeed, activeFeedId } = useFeedStore.getState()
    const newFeed = feeds.find((f) => f.url === 'https://new.com/rss')!
    expect(newFeed).toBeDefined()
    expect(statusByFeed[newFeed.id]).toBe('loaded')
    expect(activeFeedId).toBe(newFeed.id)
  })

  // AC-015: 피드 삭제 시 활성 탭 재선택
  it('활성 피드 삭제 시 남은 첫 번째 탭이 활성화된다 (AC-015)', async () => {
    const { useFeedStore } = await import('./feedStore')
    useFeedStore.setState({
      feeds: [
        { id: 'f-a', url: 'https://a.com/rss', title: 'Feed A' },
        { id: 'f-b', url: 'https://b.com/rss', title: 'Feed B' },
        { id: 'f-c', url: 'https://c.com/rss', title: 'Feed C' },
      ],
      statusByFeed: { 'f-a': 'loaded', 'f-b': 'loaded', 'f-c': 'loaded' },
      articlesByFeed: { 'f-a': [], 'f-b': [], 'f-c': [] },
      activeFeedId: 'f-a',
    })

    useFeedStore.getState().removeFeed('f-a')

    const { activeFeedId, feeds } = useFeedStore.getState()
    // 남은 첫 번째 탭(f-b)이 활성화
    expect(activeFeedId).toBe('f-b')
    expect(feeds).toHaveLength(2)
  })

  // AC-017: 마지막 피드 삭제 시 activeFeedId null
  it('마지막 피드 삭제 시 activeFeedId 가 null 이 된다 (AC-017)', async () => {
    const { useFeedStore } = await import('./feedStore')
    useFeedStore.setState({
      feeds: [{ id: 'f-a', url: 'https://a.com/rss', title: 'Feed A' }],
      statusByFeed: { 'f-a': 'loaded' },
      articlesByFeed: { 'f-a': [] },
      activeFeedId: 'f-a',
    })

    useFeedStore.getState().removeFeed('f-a')

    const { activeFeedId, feeds } = useFeedStore.getState()
    expect(activeFeedId).toBeNull()
    expect(feeds).toHaveLength(0)
  })

  // EDGE-003: loading 가드 — 중복 fetch 방지
  it('loadFeed 는 이미 loading 중인 피드에 대해 중복 fetch 를 발생시키지 않는다 (EDGE-003)', async () => {
    let resolveFirst: () => void
    const firstFetchPromise = new Promise<void>((res) => { resolveFirst = res })
    let fetchCallCount = 0
    mockFetch.mockImplementation(() => {
      fetchCallCount++
      return firstFetchPromise.then(() => ({
        ok: true,
        json: () => Promise.resolve(makeRss2JsonResponse('Feed B', [])),
      }))
    })

    const { useFeedStore } = await import('./feedStore')
    const feedB = { id: 'f-b', url: 'https://b.com/rss', title: 'Feed B' }
    useFeedStore.setState({
      feeds: [feedB],
      statusByFeed: { 'f-b': 'idle' },
      articlesByFeed: {},
      activeFeedId: 'f-b',
    })

    // 첫 번째 loadFeed 시작 (완료 안 됨)
    const p1 = useFeedStore.getState().loadFeed('f-b')
    // 두 번째 loadFeed — loading 가드로 중복 방지
    const p2 = useFeedStore.getState().loadFeed('f-b')

    resolveFirst!()
    await Promise.all([p1, p2])

    // fetch 는 1회만 발생
    expect(fetchCallCount).toBe(1)
  })

  // EDGE-002: 첫 탭 fetch 실패 시 나머지 idle 유지
  it('첫 탭 fetch 실패 시 나머지 피드는 idle 상태를 유지한다 (EDGE-002)', async () => {
    const savedFeeds = [
      { id: 'f-a', url: 'https://a.com/rss', title: 'Feed A' },
      { id: 'f-b', url: 'https://b.com/rss', title: 'Feed B' },
    ]
    mockGet.mockResolvedValue({ value: JSON.stringify(savedFeeds) })
    mockFetch.mockRejectedValue(new Error('네트워크 오류'))

    const { useFeedStore } = await import('./feedStore')
    await useFeedStore.getState().loadFeeds()

    const { statusByFeed } = useFeedStore.getState()
    expect(statusByFeed['f-a']).toBe('error')
    expect(statusByFeed['f-b']).toBe('idle')
  })

  // EDGE-004: 새로고침 시 idle 인 탭은 그대로
  it('refreshActiveFeed 는 idle/error 탭을 stale 로 변경하지 않는다 (EDGE-004)', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(makeRss2JsonResponse('Feed A', [])),
    })

    const { useFeedStore } = await import('./feedStore')
    useFeedStore.setState({
      feeds: [
        { id: 'f-a', url: 'https://a.com/rss', title: 'Feed A' },
        { id: 'f-b', url: 'https://b.com/rss', title: 'Feed B' },
        { id: 'f-c', url: 'https://c.com/rss', title: 'Feed C' },
      ],
      statusByFeed: { 'f-a': 'loaded', 'f-b': 'idle', 'f-c': 'error' },
      articlesByFeed: { 'f-a': [], 'f-b': [], 'f-c': [] },
      activeFeedId: 'f-a',
    })

    await useFeedStore.getState().refreshActiveFeed()

    const { statusByFeed } = useFeedStore.getState()
    // idle, error 는 그대로
    expect(statusByFeed['f-b']).toBe('idle')
    expect(statusByFeed['f-c']).toBe('error')
  })

  // EDGE-005: 마지막 피드 삭제 후 refreshActiveFeed graceful no-op
  it('activeFeedId null 상태에서 refreshActiveFeed 는 graceful no-op 한다 (EDGE-005)', async () => {
    const { useFeedStore } = await import('./feedStore')
    useFeedStore.setState({
      feeds: [],
      statusByFeed: {},
      articlesByFeed: {},
      activeFeedId: null,
    })

    await expect(useFeedStore.getState().refreshActiveFeed()).resolves.toBeUndefined()
    expect(mockFetch).not.toHaveBeenCalled()
  })

  // REQ-UX-013-019: idle 탭 네트워크 0회 (loadFeeds 이후 미방문)
  it('비방문 idle 탭은 fetch 를 발생시키지 않는다 (REQ-UX-013-019)', async () => {
    const savedFeeds = [
      { id: 'f-a', url: 'https://a.com/rss', title: 'Feed A' },
      { id: 'f-b', url: 'https://b.com/rss', title: 'Feed B' },
    ]
    mockGet.mockResolvedValue({ value: JSON.stringify(savedFeeds) })
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(makeRss2JsonResponse('Feed A', [])),
    })

    const { useFeedStore } = await import('./feedStore')
    await useFeedStore.getState().loadFeeds()

    // loadFeeds 이후 fetch 는 첫 탭(f-a)에 대해 1회만
    expect(mockFetch).toHaveBeenCalledTimes(1)
    // f-b 는 여전히 idle
    expect(useFeedStore.getState().statusByFeed['f-b']).toBe('idle')
  })

  // AC-023: 영속화 스키마 보존 — articlesByFeed 는 영속화 안 됨
  it('articlesByFeed/statusByFeed 는 storage 에 저장되지 않는다 (AC-023)', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(makeRss2JsonResponse('Feed', [])),
    })

    const { useFeedStore } = await import('./feedStore')
    await useFeedStore.getState().addFeed('https://test.com/rss')

    // storage.set 의 'rss-feeds' 호출에서 articles/status 가 직렬화되지 않아야 함
    const feedsCall = mockSet.mock.calls.find((c) => c[0] === 'rss-feeds')
    if (feedsCall) {
      const parsed = JSON.parse(feedsCall[1] as string) as unknown[]
      expect(Array.isArray(parsed)).toBe(true)
      // 배열 요소에 articlesByFeed 나 statusByFeed 필드가 없어야 함
      const first = parsed[0] as Record<string, unknown>
      expect(first.articlesByFeed).toBeUndefined()
      expect(first.statusByFeed).toBeUndefined()
    }
  })
})
