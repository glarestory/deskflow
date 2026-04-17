// @MX:ANCHOR: [AUTO] feedStore — RSS 피드 CRUD 및 기사 가져오기 상태 관리 진입점
// @MX:REASON: [AUTO] FeedWidget 컴포넌트에서 의존하는 단일 상태 출처
// @MX:SPEC: SPEC-WIDGET-003
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

interface FeedState {
  feeds: Feed[]
  articles: Article[]
  /** 전체 로딩 상태 */
  loading: boolean

  /** URL로 피드 추가, 기사 자동 가져오기 (최대 5개 제한) */
  addFeed: (url: string) => Promise<void>
  /** 피드 및 해당 기사 제거 */
  removeFeed: (id: string) => void
  /** 등록된 모든 피드 기사 갱신 */
  refreshAll: () => Promise<void>
  /** 단일 피드 기사 가져오기 (RSS-to-JSON 프록시 사용) */
  fetchFeedArticles: (feed: Feed) => Promise<void>
  /** 앱 시작 시 저장된 피드 목록 불러오기 */
  loadFeeds: () => Promise<void>
}

// ─── 상수 ────────────────────────────────────────────────────────────────

/** 스토리지 키 (feeds 배열만 저장, articles는 에페메럴) */
const FEEDS_STORAGE_KEY = 'rss-feeds'

/** REQ-008: 최대 피드 등록 수 */
const MAX_FEEDS = 5

/** REQ-009: 피드당 최대 기사 수 */
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
  articles: [],
  loading: false,

  loadFeeds: async () => {
    try {
      const result = await storage.get(FEEDS_STORAGE_KEY)
      if (result.value !== null) {
        const feeds = JSON.parse(result.value) as Feed[]
        set({ feeds })
      }
    } catch {
      // 불러오기 실패 시 빈 상태 유지
    }
  },

  addFeed: async (url: string) => {
    const { feeds, fetchFeedArticles } = get()

    // REQ-008: 최대 5개 피드 제한
    if (feeds.length >= MAX_FEEDS) {
      return
    }

    const newFeed: Feed = { id: uid(), url, title: '' }
    set((state) => ({ feeds: [...state.feeds, newFeed] }))

    // 기사 가져오기
    await fetchFeedArticles(newFeed)

    // feeds 배열만 스토리지에 저장 (articles는 에페메럴)
    const updatedFeeds = get().feeds
    void storage.set(FEEDS_STORAGE_KEY, JSON.stringify(updatedFeeds))
  },

  removeFeed: (id: string) => {
    set((state) => ({
      feeds: state.feeds.filter((f) => f.id !== id),
      articles: state.articles.filter((a) => a.feedId !== id),
    }))
    const updatedFeeds = get().feeds
    void storage.set(FEEDS_STORAGE_KEY, JSON.stringify(updatedFeeds))
  },

  fetchFeedArticles: async (feed: Feed) => {
    set({ loading: true })

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

      // 해당 피드의 기존 기사 교체
      const newArticles: Article[] = data.items.map((item) => ({
        feedId: feed.id,
        title: item.title,
        link: item.link,
        pubDate: item.pubDate,
        source: data.feed.title,
      }))

      set((state) => ({
        articles: [
          ...state.articles.filter((a) => a.feedId !== feed.id),
          ...newArticles,
        ],
      }))
    } catch (err) {
      const message = err instanceof Error ? err.message : '알 수 없는 오류'
      // REQ-007: 피드 오류 상태 설정
      set((state) => ({
        feeds: state.feeds.map((f) =>
          f.id === feed.id ? { ...f, error: message } : f,
        ),
      }))
    } finally {
      set({ loading: false })
    }
  },

  refreshAll: async () => {
    const { feeds, fetchFeedArticles } = get()
    await Promise.all(feeds.map((feed) => fetchFeedArticles(feed)))
  },
}))
