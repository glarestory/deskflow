// @MX:ANCHOR: [AUTO] bookmarkStore — 북마크 CRUD 상태 관리 중심 진입점
// @MX:REASON: [AUTO] Clock, TodoWidget, NotesWidget, BookmarkCard, EditModal, App 등 다수 컴포넌트가 의존
// @MX:SPEC: SPEC-UI-001, SPEC-BOOKMARK-002, SPEC-CAPSULE-001
import { create } from 'zustand'
import type { Bookmark, Link } from '../types'
import { storage } from '../lib/storage'
import { generateNetscapeHTML, downloadBookmarks, getExportFilename } from '../lib/bookmarkExporter'
import { findDuplicates } from '../lib/bookmarkDedup'
import { extractTags } from '../lib/extractTags'
import { useCapsuleStore } from './capsuleStore'
import { useEmbeddingStore } from './embeddingStore'

/**
 * 링크에 자동 태그를 병합한다.
 * 자동 태그와 수동 태그를 합치고 중복을 제거한다 (EDGE-004).
 */
function mergeAutoTags(link: Link): Link {
  const autoTags = extractTags(link.url)
  // @MX:NOTE: [AUTO] 기존 link.tags 누락(undefined) 방어
  const existing = link.tags ?? []
  const merged = [...new Set([...existing, ...autoTags])]
  return { ...link, tags: merged }
}

export const DEFAULT_BOOKMARKS: Bookmark[] = [
  {
    id: 'cat-1',
    name: 'Work',
    icon: '💼',
    links: [
      { id: 'l1', name: 'Gmail', url: 'https://mail.google.com', tags: ['email'] },
      { id: 'l2', name: 'Google Drive', url: 'https://drive.google.com', tags: ['docs'] },
      { id: 'l3', name: 'Notion', url: 'https://notion.so', tags: ['notes'] },
      { id: 'l4', name: 'Slack', url: 'https://slack.com', tags: ['chat'] },
    ],
  },
  {
    id: 'cat-2',
    name: 'Dev',
    icon: '⚡',
    links: [
      { id: 'l5', name: 'GitHub', url: 'https://github.com', tags: ['dev', 'code'] },
      { id: 'l6', name: 'Stack Overflow', url: 'https://stackoverflow.com', tags: ['dev', 'learn'] },
      { id: 'l7', name: 'CodePen', url: 'https://codepen.io', tags: ['dev', 'code'] },
      { id: 'l8', name: 'MDN Docs', url: 'https://developer.mozilla.org', tags: ['dev', 'docs'] },
    ],
  },
  {
    id: 'cat-3',
    name: 'Media',
    icon: '🎧',
    links: [
      { id: 'l9', name: 'YouTube', url: 'https://youtube.com', tags: ['video'] },
      { id: 'l10', name: 'Spotify', url: 'https://open.spotify.com', tags: ['music'] },
      { id: 'l11', name: 'Netflix', url: 'https://netflix.com', tags: ['video'] },
      { id: 'l12', name: 'Reddit', url: 'https://reddit.com', tags: ['social'] },
    ],
  },
  {
    id: 'cat-4',
    name: 'Tools',
    icon: '🛠️',
    links: [
      { id: 'l13', name: 'ChatGPT', url: 'https://chat.openai.com', tags: ['ai'] },
      { id: 'l14', name: 'Claude', url: 'https://claude.ai', tags: ['ai'] },
      { id: 'l15', name: 'Figma', url: 'https://figma.com', tags: ['design'] },
      { id: 'l16', name: 'Canva', url: 'https://canva.com', tags: ['design'] },
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
  /** 특정 카테고리에 링크 추가 (빠른 추가 기능) */
  addLink: (categoryId: string, link: Link) => void
  /** 모든 북마크를 Netscape HTML 파일로 내보내기 */
  exportBookmarks: () => void
  /** 중복 그룹에서 keepLinkIds에 없는 링크 제거 */
  removeDuplicates: (keepLinkIds: string[]) => void
  /**
   * SPEC-UX-003: 특정 링크의 favorite 플래그를 토글한다.
   * 없으면 true로, true이면 false로 전환.
   */
  toggleFavorite: (linkId: string) => void
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
    // REQ-011: autoAddToActive=true이고 활성 캡슐이 있으면 북마크 카테고리 id를 캡슐에 자동 추가
    // @MX:NOTE: [AUTO] capsuleStore.addBookmarkToCapsule 훅 — SPEC-CAPSULE-001 REQ-011
    const capsuleState = useCapsuleStore.getState()
    if (capsuleState.autoAddToActive && capsuleState.activeCapsuleId !== null) {
      // 북마크 카테고리 id를 캡슐에 추가 (중복 무시)
      try {
        capsuleState.addBookmarkToCapsule(capsuleState.activeCapsuleId, bookmark.id)
      } catch {
        // DEC-003: > 1000 초과 시 에러 — 무시하고 진행
      }
    }
    // @MX:NOTE: [AUTO] SPEC-SEARCH-RAG-001 REQ-004,006 — 신규 카테고리의 링크 임베딩 큐 등록
    if (bookmark.links.length > 0) {
      const linkIds = bookmark.links.map((l) => l.id)
      useEmbeddingStore.getState().enqueueIndex(linkIds)
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
    // @MX:NOTE: [AUTO] SPEC-SEARCH-RAG-001 REQ-004,007 — 카테고리 업데이트 시 링크 재인덱싱
    // runIndexBatch에서 contentHash 비교로 실제 변경된 링크만 embed 호출
    if (updated.links.length > 0) {
      const linkIds = updated.links.map((l) => l.id)
      useEmbeddingStore.getState().enqueueIndex(linkIds)
    }
  },

  removeBookmark: (id) => {
    // 삭제 전 링크 ID 목록 수집 (state 업데이트 전)
    const toDeleteLinks = get().bookmarks.find((b) => b.id === id)?.links ?? []

    set((state) => ({
      bookmarks: state.bookmarks.filter((b) => b.id !== id),
    }))
    const { loaded, bookmarks } = get()
    if (loaded) {
      void storage.set('hub-bookmarks', JSON.stringify(bookmarks))
    }
    // REQ-017: 고아 참조 제거 — 삭제된 북마크 id를 모든 캡슐에서 제거
    // @MX:NOTE: [AUTO] capsuleStore.purgeOrphan 훅 — SPEC-CAPSULE-001 REQ-017
    useCapsuleStore.getState().purgeOrphan('bookmark', id)
    // @MX:NOTE: [AUTO] SPEC-SEARCH-RAG-001 REQ-004,009 — 카테고리 삭제 시 링크 임베딩 제거
    const embeddingState = useEmbeddingStore.getState()
    for (const link of toDeleteLinks) {
      embeddingState.removeEmbedding(link.id)
    }
  },

  addLink: (categoryId, link) => {
    // 자동 태그를 병합한 링크를 저장
    const linkWithAutoTags = mergeAutoTags(link)
    set((state) => ({
      bookmarks: state.bookmarks.map((b) =>
        b.id === categoryId ? { ...b, links: [...b.links, linkWithAutoTags] } : b,
      ),
    }))
    const { loaded, bookmarks } = get()
    if (loaded) {
      void storage.set('hub-bookmarks', JSON.stringify(bookmarks))
    }
    // @MX:NOTE: [AUTO] SPEC-SEARCH-RAG-001 REQ-004,006 — 신규 링크 임베딩 큐 등록
    useEmbeddingStore.getState().enqueueIndex([link.id])
  },

  exportBookmarks: () => {
    const { bookmarks } = get()
    const html = generateNetscapeHTML(bookmarks)
    const filename = getExportFilename()
    downloadBookmarks(html, filename)
  },

  removeDuplicates: (keepLinkIds) => {
    const { bookmarks } = get()
    // 중복 그룹에서 제거 대상 linkId 집합 계산
    const duplicateGroups = findDuplicates(bookmarks)
    const toRemove = new Set<string>()

    for (const group of duplicateGroups) {
      for (const item of group.items) {
        if (!keepLinkIds.includes(item.linkId)) {
          toRemove.add(item.linkId)
        }
      }
    }

    set((state) => ({
      bookmarks: state.bookmarks.map((b) => ({
        ...b,
        links: b.links.filter((l) => !toRemove.has(l.id)),
      })),
    }))

    const { loaded, bookmarks: updated } = get()
    if (loaded) {
      void storage.set('hub-bookmarks', JSON.stringify(updated))
    }
  },

  toggleFavorite: (linkId) => {
    set((state) => ({
      bookmarks: state.bookmarks.map((b) => ({
        ...b,
        links: b.links.map((l) =>
          l.id === linkId ? { ...l, favorite: !(l.favorite ?? false) } : l,
        ),
      })),
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
