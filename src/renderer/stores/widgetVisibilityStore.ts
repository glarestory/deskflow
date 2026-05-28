// @MX:ANCHOR: [AUTO] widgetVisibilityStore — 6개 위젯의 표시/숨김 상태 관리
// @MX:REASON: [AUTO] WidgetLayout, HeaderMoreMenu 등이 의존하며 layoutStore 와 직교
// @MX:SPEC: SPEC-WIDGET-TOGGLE-001
import { create } from 'zustand'
import { storage } from '../lib/storage'

const STORAGE_KEY = 'widget-visibility'

/**
 * 토글 가능한 위젯 키 목록.
 * WidgetLayout 의 그리드 아이템 key 와 1:1 대응한다.
 */
export const WIDGET_KEYS = ['clock', 'search', 'bookmarks', 'todo', 'notes', 'feed'] as const
export type WidgetKey = (typeof WIDGET_KEYS)[number]

export const WIDGET_LABELS: Record<WidgetKey, string> = {
  clock: '시계',
  search: '검색',
  bookmarks: '북마크',
  todo: '할 일',
  notes: '메모',
  feed: '피드',
}

interface WidgetVisibilityState {
  /** 숨긴 위젯 키 Set */
  hiddenWidgets: Set<WidgetKey>
  /** 로드 완료 여부 */
  loaded: boolean
  /** 저장소에서 visibility 복원 */
  loadVisibility: () => Promise<void>
  /** 특정 위젯의 표시/숨김 토글 */
  toggleWidget: (key: WidgetKey) => void
  /** 특정 위젯을 명시적으로 숨김 */
  hideWidget: (key: WidgetKey) => void
  /** 특정 위젯을 명시적으로 표시 */
  showWidget: (key: WidgetKey) => void
  /** 모든 위젯 표시 (초기화) */
  showAllWidgets: () => void
}

const isWidgetKey = (key: string): key is WidgetKey =>
  (WIDGET_KEYS as readonly string[]).includes(key)

const persist = (hidden: Set<WidgetKey>): void => {
  void storage.set(STORAGE_KEY, JSON.stringify(Array.from(hidden)))
}

export const useWidgetVisibilityStore = create<WidgetVisibilityState>((set, get) => ({
  hiddenWidgets: new Set<WidgetKey>(),
  loaded: false,

  loadVisibility: async () => {
    try {
      const result = await storage.get(STORAGE_KEY)
      if (result.value === null || result.value === undefined) {
        set({ hiddenWidgets: new Set(), loaded: true })
        return
      }
      const parsed = JSON.parse(result.value) as unknown
      if (!Array.isArray(parsed)) {
        set({ hiddenWidgets: new Set(), loaded: true })
        return
      }
      const valid = parsed.filter((k): k is WidgetKey => typeof k === 'string' && isWidgetKey(k))
      set({ hiddenWidgets: new Set(valid), loaded: true })
    } catch {
      set({ hiddenWidgets: new Set(), loaded: true })
    }
  },

  toggleWidget: (key) => {
    const next = new Set(get().hiddenWidgets)
    if (next.has(key)) {
      next.delete(key)
    } else {
      next.add(key)
    }
    set({ hiddenWidgets: next })
    persist(next)
  },

  hideWidget: (key) => {
    const next = new Set(get().hiddenWidgets)
    next.add(key)
    set({ hiddenWidgets: next })
    persist(next)
  },

  showWidget: (key) => {
    const next = new Set(get().hiddenWidgets)
    next.delete(key)
    set({ hiddenWidgets: next })
    persist(next)
  },

  showAllWidgets: () => {
    const next = new Set<WidgetKey>()
    set({ hiddenWidgets: next })
    persist(next)
  },
}))

/** 편의 훅 — store 전체를 반환 */
export const useWidgetVisibility = (): WidgetVisibilityState => useWidgetVisibilityStore()
