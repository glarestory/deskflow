// @MX:ANCHOR: [AUTO] bookmarkStore — 북마크 CRUD 상태 관리 중심 진입점
// @MX:REASON: [AUTO] Clock, TodoWidget, NotesWidget, BookmarkCard, EditModal, App 등 다수 컴포넌트가 의존
// @MX:SPEC: SPEC-UI-001
import { create } from 'zustand'
import type { Bookmark } from '../types'
import { storage } from '../lib/storage'

export const DEFAULT_BOOKMARKS: Bookmark[] = [
  {
    id: 'cat-1',
    name: 'Work',
    icon: '💼',
    links: [
      { id: 'l1', name: 'Gmail', url: 'https://mail.google.com' },
      { id: 'l2', name: 'Google Drive', url: 'https://drive.google.com' },
      { id: 'l3', name: 'Notion', url: 'https://notion.so' },
      { id: 'l4', name: 'Slack', url: 'https://slack.com' },
    ],
  },
  {
    id: 'cat-2',
    name: 'Dev',
    icon: '⚡',
    links: [
      { id: 'l5', name: 'GitHub', url: 'https://github.com' },
      { id: 'l6', name: 'Stack Overflow', url: 'https://stackoverflow.com' },
      { id: 'l7', name: 'CodePen', url: 'https://codepen.io' },
      { id: 'l8', name: 'MDN Docs', url: 'https://developer.mozilla.org' },
    ],
  },
  {
    id: 'cat-3',
    name: 'Media',
    icon: '🎧',
    links: [
      { id: 'l9', name: 'YouTube', url: 'https://youtube.com' },
      { id: 'l10', name: 'Spotify', url: 'https://open.spotify.com' },
      { id: 'l11', name: 'Netflix', url: 'https://netflix.com' },
      { id: 'l12', name: 'Reddit', url: 'https://reddit.com' },
    ],
  },
  {
    id: 'cat-4',
    name: 'Tools',
    icon: '🛠️',
    links: [
      { id: 'l13', name: 'ChatGPT', url: 'https://chat.openai.com' },
      { id: 'l14', name: 'Claude', url: 'https://claude.ai' },
      { id: 'l15', name: 'Figma', url: 'https://figma.com' },
      { id: 'l16', name: 'Canva', url: 'https://canva.com' },
    ],
  },
]

interface BookmarkState {
  bookmarks: Bookmark[]
  loaded: boolean
  loadBookmarks: () => Promise<void>
  addBookmark: (bookmark: Bookmark) => void
  updateBookmark: (bookmark: Bookmark) => void
  removeBookmark: (id: string) => void
  importBookmarks: (categories: Bookmark[], mode: 'merge' | 'replace') => void
}

export const useBookmarkStore = create<BookmarkState>((set, get) => ({
  bookmarks: DEFAULT_BOOKMARKS,
  loaded: false,

  loadBookmarks: async () => {
    try {
      const result = await storage.get('hub-bookmarks')
      const bookmarks = result.value ? (JSON.parse(result.value) as Bookmark[]) : DEFAULT_BOOKMARKS
      set({ bookmarks, loaded: true })
    } catch {
      set({ bookmarks: DEFAULT_BOOKMARKS, loaded: true })
    }
  },

  addBookmark: (bookmark) => {
    set((state) => ({ bookmarks: [...state.bookmarks, bookmark] }))
    const { loaded, bookmarks } = get()
    if (loaded) {
      void storage.set('hub-bookmarks', JSON.stringify(bookmarks))
    }
  },

  updateBookmark: (updated) => {
    set((state) => ({
      bookmarks: state.bookmarks.map((b) => (b.id === updated.id ? updated : b)),
    }))
    const { loaded, bookmarks } = get()
    if (loaded) {
      void storage.set('hub-bookmarks', JSON.stringify(bookmarks))
    }
  },

  removeBookmark: (id) => {
    set((state) => ({
      bookmarks: state.bookmarks.filter((b) => b.id !== id),
    }))
    const { loaded, bookmarks } = get()
    if (loaded) {
      void storage.set('hub-bookmarks', JSON.stringify(bookmarks))
    }
  },

  importBookmarks: (categories, mode) => {
    if (mode === 'replace') {
      set({ bookmarks: categories })
    } else {
      // 병합: 동일 이름 카테고리가 있으면 링크를 추가, 없으면 새 카테고리 추가 (중복 URL 제거)
      set((state) => {
        const existingMap = new Map(state.bookmarks.map((b) => [b.name, b]))

        for (const imported of categories) {
          const existing = existingMap.get(imported.name)
          if (existing !== undefined) {
            const existingUrls = new Set(existing.links.map((l) => l.url))
            const newLinks = imported.links.filter((l) => !existingUrls.has(l.url))
            existingMap.set(imported.name, { ...existing, links: [...existing.links, ...newLinks] })
          } else {
            existingMap.set(imported.name, imported)
          }
        }

        // 기존 순서 유지 + 새 카테고리 뒤에 추가
        const existingNames = new Set(state.bookmarks.map((b) => b.name))
        const updated = state.bookmarks.map((b) => existingMap.get(b.name) ?? b)
        const appended = categories.filter((c) => !existingNames.has(c.name))
        return { bookmarks: [...updated, ...appended] }
      })
    }
    const { loaded, bookmarks } = get()
    if (loaded) {
      void storage.set('hub-bookmarks', JSON.stringify(bookmarks))
    }
  },
}))
