// @MX:ANCHOR: [AUTO] feedStore — RSS 피드 CRUD 및 피드별 지연 로딩 상태 관리 진입점
// @MX:REASON: [AUTO] FeedWidget 에서 loadFeed/setActiveFeed/refreshActiveFeed/addFeed/removeFeed 다수 호출 (fan_in >= 5)
// @MX:SPEC: SPEC-WIDGET-003, SPEC-UX-013
import { create } from 'zustand'
import { storage } from '../lib/storage'

// ─── 타입 정의 ────────────────────────────────────────────────────────────

/** RSS 피드 등록 정보 */
export interface Feed {
  id: string
  url: string
  title: string
  /** 피드 가져오기 실패 시 오류 메시지 */
  error?: string
}

/** RSS 피드에서 가져온 기사 */
export interface Article {
  feedId: string
  title: string
  link: string
  pubDate: string
  source: string
}

/** 피드별 로딩/캐시 상태 (REQ-UX-013-007) */
export type FeedStatus = 'idle' | 'loading' | 'loaded' | 'error' | 'stale'

interface FeedState {
  feeds: Feed[]
  /** 피드별 기사 캐시 — feedId 키 (REQ-UX-013-007) */
  articlesByFeed: Record<string, Article[]>
  /** 피드별 상태 — feedId 키 (REQ-UX-013-007) */
  statusByFeed: Record<string, FeedStatus>
  /** 현재 활성 탭의 feedId (없으면 null) */
  activeFeedId: string | null

  /** URL로 피드 추가 (최대 5개 제한, 추가 즉시 fetch + 새 탭 활성 — D3) */
  addFeed: (url: string) => Promise<void>
  /** 피드 + 캐시 + 상태 제거 + 활성 탭 재선택 (REQ-UX-013-014) */
  removeFeed: (id: string) => void
  /** 활성 탭 설정 — idle/stale 이면 지연 로딩 트리거 (REQ-UX-013-009) */
  setActiveFeed: (id: string) => void
  /** 단일 피드 지연 로딩 — loaded 면 no-op(캐시), force 옵션 가능 (REQ-UX-013-009/010) */
  loadFeed: (id: string, opts?: { force?: boolean }) => Promise<void>
  /** 활성 탭 강제 재요청 + 나머지 stale (REQ-UX-013-012) */
  refreshActiveFeed: () => Promise<void>
  /** 앱 시작 시 저장된 피드 목록 불러오기 + 첫 탭만 로드 (REQ-UX-013-008) */
  loadFeeds: () => Promise<void>
  /** 단일 피드 기사 가져오기 (RSS-to-JSON 프록시 사용) — loadFeed 내부 헬퍼 (D4) */
  fetchFeedArticles: (feed: Feed) => Promise<void>
}

// ─── 상수 ────────────────────────────────────────────────────────────────

/** 스토리지 키 (feeds 배열만 저장, articles/status 는 에페메럴) */
const FEEDS_STORAGE_KEY = 'rss-feeds'

/** 활성 탭 영속화 키 (REQ-UX-013-022 Optional) */
const ACTIVE_FEED_STORAGE_KEY = 'feed-active-tab'

/** REQ-UX-013-001: 최대 피드 등록 수 */
const MAX_FEEDS = 5

/** 피드당 최대 기사 수 */
const MAX_ARTICLES_PER_FEED = 10

/** CORS-safe RSS 프록시 URL 생성기 */
const buildProxyUrl = (rssUrl: string): string =>
  `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}&count=${MAX_ARTICLES_PER_FEED}`

/** 고유 ID 생성 */
const uid = (): string => Math.random().toString(36).slice(2, 9)

// ─── rss2json 응답 타입 ───────────────────────────────────────────────────

interface Rss2JsonItem {
  title: string
  link: string
  pubDate: string
  [key: string]: unknown
}

interface Rss2JsonResponse {
  status: string
  feed: { title: string }
  items: Rss2JsonItem[]
}

// ─── 스토어 ───────────────────────────────────────────────────────────────

export const useFeedStore = create<FeedState>((set, get) => ({
  feeds: [],
  articlesByFeed: {},
  statusByFeed: {},
  activeFeedId: null,

  // @MX:WARN: [AUTO] loadFeeds — 비동기 상태 초기화, 영속화 id 유효성 검사 필수
  // @MX:REASON: [AUTO] 영속화된 activeFeedId 가 삭제된 피드를 가리킬 경우 첫 탭 fallback 처리 필요
  loadFeeds: async () => {
    try {
      const result = await storage.get(FEEDS_STORAGE_KEY)
      if (result.value !== null) {
        const feeds = JSON.parse(result.value) as Feed[]
        // 초기 상태: 모든 피드 idle
        const statusByFeed: Record<string, FeedStatus> = {}
        for (const f of feeds) {
          statusByFeed[f.id] = 'idle'
        }

        // REQ-UX-013-022 (Optional): 마지막 활성 탭 복원 시도
        let activeFeedId: string | null = null
        try {
          const activeResult = await storage.get(ACTIVE_FEED_STORAGE_KEY)
          if (activeResult.value !== null) {
            const savedId = activeResult.value
            // 현재 feeds 에 존재하면 복원, 없으면 첫 탭 fallback
            if (feeds.some((f) => f.id === savedId)) {
              activeFeedId = savedId
            }
          }
        } catch {
          // 영속화 복원 실패 시 첫 탭 fallback
        }

        // 활성 탭 id 미결정 시 첫 번째 탭 사용
        if (activeFeedId === null && feeds.length > 0) {
          activeFeedId = feeds[0].id
        }

        set({ feeds, statusByFeed, activeFeedId })

        // REQ-UX-013-008: 최초 로드 — 첫(또는 마지막 활성) 탭만 fetch, 나머지 idle 유지
        if (activeFeedId !== null) {
          await get().loadFeed(activeFeedId)
        }
      }
    } catch {
      // 불러오기 실패 시 빈 상태 유지
    }
  },

  // @MX:NOTE: [AUTO] loadFeed — 지연 로딩 가드 + 캐시 재사용 핵심 함수
  loadFeed: async (id: string, opts?: { force?: boolean }) => {
    const { statusByFeed, feeds } = get()
    const status = statusByFeed[id]

    // REQ-UX-013-010: 캐시 재사용 — loaded 면 강제 옵션 없이는 재요청 안 함
    if (status === 'loaded' && opts?.force !== true) return

    // loading 중인 피드는 중복 요청 방지 (EDGE-003)
    if (status === 'loading') return

    const feed = feeds.find((f) => f.id === id)
    if (!feed) return

    // status 를 loading 으로 전환
    set((s) => ({ statusByFeed: { ...s.statusByFeed, [id]: 'loading' } }))

    // 기존 fetchFeedArticles 로직 래핑 (D4: 재작성 안 함)
    await get().fetchFeedArticles(feed)
  },

  fetchFeedArticles: async (feed: Feed) => {
    try {
      const res = await fetch(buildProxyUrl(feed.url))
      const data = (await res.json()) as Rss2JsonResponse

      if (data.status !== 'ok') {
        throw new Error(`피드 응답 오류: ${data.status}`)
      }

      // 피드 제목 업데이트, 오류 초기화
      set((state) => ({
        feeds: state.feeds.map((f) =>
          f.id === feed.id ? { ...f, title: data.feed.title, error: undefined } : f,
        ),
      }))

      // 해당 피드의 기사 캐시 채움 (REQ-UX-013-007: articlesByFeed)
      const newArticles: Article[] = data.items.map((item) => ({
        feedId: feed.id,
        title: item.title,
        link: item.link,
        pubDate: item.pubDate,
        source: data.feed.title,
      }))

      set((state) => ({
        articlesByFeed: { ...state.articlesByFeed, [feed.id]: newArticles },
        statusByFeed: { ...state.statusByFeed, [feed.id]: 'loaded' },
      }))
    } catch (err) {
      const message = err instanceof Error ? err.message : '알 수 없는 오류'
      // REQ-UX-013-011: 피드 오류 상태 설정
      set((state) => ({
        feeds: state.feeds.map((f) =>
          f.id === feed.id ? { ...f, error: message } : f,
        ),
        statusByFeed: { ...state.statusByFeed, [feed.id]: 'error' },
      }))
    }
  },

  setActiveFeed: (id: string) => {
    set({ activeFeedId: id })
    // REQ-UX-013-009: idle/stale 탭 클릭 시 지연 로딩 트리거
    const { statusByFeed } = get()
    const status = statusByFeed[id]
    if (status === 'idle' || status === 'stale') {
      void get().loadFeed(id)
    }
    // REQ-UX-013-022 (Optional): 활성 탭 id 영속화
    void storage.set(ACTIVE_FEED_STORAGE_KEY, id)
  },

  // @MX:NOTE: [AUTO] refreshActiveFeed — 활성 탭 재요청 + 나머지 stale (REQ-UX-013-012 채택 시맨틱)
  refreshActiveFeed: async () => {
    const { activeFeedId, feeds } = get()
    if (activeFeedId === null) return

    // 활성 탭 강제 재요청
    await get().loadFeed(activeFeedId, { force: true })

    // 나머지 loaded 탭을 stale 로 표시 (idle/error 는 그대로)
    set((state) => {
      const next = { ...state.statusByFeed }
      for (const f of feeds) {
        if (f.id !== activeFeedId && next[f.id] === 'loaded') {
          next[f.id] = 'stale'
        }
      }
      return { statusByFeed: next }
    })
  },

  addFeed: async (url: string) => {
    const { feeds } = get()

    // REQ-UX-013-001/003: 최대 5개 피드 제한 — graceful no-op
    if (feeds.length >= MAX_FEEDS) {
      return
    }

    const newFeed: Feed = { id: uid(), url, title: '' }
    // 새 피드 초기 상태 idle 로 추가
    set((state) => ({
      feeds: [...state.feeds, newFeed],
      statusByFeed: { ...state.statusByFeed, [newFeed.id]: 'idle' },
    }))

    // D3: 추가 즉시 fetch + 새 탭 활성 (명시적 사용자 의도)
    set({ activeFeedId: newFeed.id })
    await get().loadFeed(newFeed.id, { force: true })

    // feeds 배열만 스토리지에 저장 (articles/status 는 에페메럴)
    const updatedFeeds = get().feeds
    void storage.set(FEEDS_STORAGE_KEY, JSON.stringify(updatedFeeds))
    // 활성 탭 영속화
    void storage.set(ACTIVE_FEED_STORAGE_KEY, newFeed.id)
  },

  removeFeed: (id: string) => {
    const { feeds, activeFeedId, articlesByFeed, statusByFeed } = get()

    // articlesByFeed, statusByFeed 에서 해당 피드 제거
    const nextArticles = { ...articlesByFeed }
    delete nextArticles[id]
    const nextStatus = { ...statusByFeed }
    delete nextStatus[id]

    const nextFeeds = feeds.filter((f) => f.id !== id)

    // 활성 탭 재선택: 삭제된 탭이 활성이었으면 남은 첫 번째 탭 활성
    let nextActive = activeFeedId
    if (activeFeedId === id) {
      nextActive = nextFeeds.length > 0 ? nextFeeds[0].id : null
    }

    set({
      feeds: nextFeeds,
      articlesByFeed: nextArticles,
      statusByFeed: nextStatus,
      activeFeedId: nextActive,
    })

    // 새 활성 탭이 idle/stale 이면 지연 로딩 (REQ-UX-013-014)
    if (nextActive !== null) {
      const newStatus = nextStatus[nextActive]
      if (newStatus === 'idle' || newStatus === 'stale') {
        void get().loadFeed(nextActive)
      }
    }

    const updatedFeeds = get().feeds
    void storage.set(FEEDS_STORAGE_KEY, JSON.stringify(updatedFeeds))
    // 활성 탭 영속화 갱신
    if (nextActive !== null) {
      void storage.set(ACTIVE_FEED_STORAGE_KEY, nextActive)
    }
  },
}))
