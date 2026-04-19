// @MX:SPEC: SPEC-UX-003
import { describe, it, expect, vi, beforeEach } from 'vitest'

// window.storage 모킹
const mockGet = vi.fn()
const mockSet = vi.fn()
vi.stubGlobal('storage', { get: mockGet, set: mockSet })

// capsuleStore 모킹 (bookmarkStore 의존)
vi.mock('./capsuleStore', () => ({
  useCapsuleStore: {
    getState: vi.fn(() => ({
      autoAddToActive: false,
      activeCapsuleId: null,
      addBookmarkToCapsule: vi.fn(),
      purgeOrphan: vi.fn(),
    })),
  },
}))

// embeddingStore 모킹 (Phase 3 훅 의존)
vi.mock('./embeddingStore', () => ({
  useEmbeddingStore: {
    getState: vi.fn(() => ({
      enqueueIndex: vi.fn(),
      removeEmbedding: vi.fn(),
    })),
  },
}))

describe('bookmarkStore — toggleFavorite (SPEC-UX-003)', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    vi.resetModules()
    vi.stubGlobal('storage', { get: mockGet, set: mockSet })
  })

  it('toggleFavorite — 즐겨찾기를 true로 설정한다', async () => {
    mockGet.mockResolvedValue({ value: null })
    const { useBookmarkStore } = await import('./bookmarkStore')
    await useBookmarkStore.getState().loadBookmarks()

    const bookmarks = useBookmarkStore.getState().bookmarks
    const firstLink = bookmarks[0].links[0]

    useBookmarkStore.getState().toggleFavorite(firstLink.id)

    const updated = useBookmarkStore.getState().bookmarks
    const updatedLink = updated.flatMap((b) => b.links).find((l) => l.id === firstLink.id)
    expect(updatedLink?.favorite).toBe(true)
  })

  it('toggleFavorite — 즐겨찾기를 false로 토글한다', async () => {
    mockGet.mockResolvedValue({ value: null })
    const { useBookmarkStore } = await import('./bookmarkStore')
    await useBookmarkStore.getState().loadBookmarks()

    const bookmarks = useBookmarkStore.getState().bookmarks
    const firstLink = bookmarks[0].links[0]

    useBookmarkStore.getState().toggleFavorite(firstLink.id)
    useBookmarkStore.getState().toggleFavorite(firstLink.id)

    const updated = useBookmarkStore.getState().bookmarks
    const updatedLink = updated.flatMap((b) => b.links).find((l) => l.id === firstLink.id)
    expect(updatedLink?.favorite).toBe(false)
  })

  it('toggleFavorite — 존재하지 않는 링크는 무시한다', async () => {
    mockGet.mockResolvedValue({ value: null })
    const { useBookmarkStore } = await import('./bookmarkStore')
    await useBookmarkStore.getState().loadBookmarks()

    const before = useBookmarkStore.getState().bookmarks
    // 존재하지 않는 id로 호출 — 상태 변화 없어야 함
    useBookmarkStore.getState().toggleFavorite('nonexistent-id')
    const after = useBookmarkStore.getState().bookmarks

    expect(JSON.stringify(after)).toBe(JSON.stringify(before))
  })

  it('toggleFavorite 후 스토리지에 저장된다', async () => {
    mockGet.mockResolvedValue({ value: null })
    const { useBookmarkStore } = await import('./bookmarkStore')
    await useBookmarkStore.getState().loadBookmarks()

    const bookmarks = useBookmarkStore.getState().bookmarks
    const firstLink = bookmarks[0].links[0]

    useBookmarkStore.getState().toggleFavorite(firstLink.id)

    // storage.set이 호출되었는지 확인
    expect(mockSet).toHaveBeenCalled()
  })
})

describe('migration — backfillMissingCreatedAt (SPEC-UX-003)', () => {
  it('createdAt이 없는 링크에 현재 시각을 부여한다', async () => {
    const { backfillMissingCreatedAt } = await import('../lib/migration')
    const bookmarks = [
      {
        id: 'cat-1',
        name: 'Work',
        icon: '💼',
        links: [
          { id: 'l1', name: 'Gmail', url: 'https://mail.google.com', tags: [] },
        ],
      },
    ]

    const before = Date.now()
    const result = backfillMissingCreatedAt(bookmarks)
    const after = Date.now()

    const link = result[0].links[0]
    expect(link.createdAt).toBeDefined()
    expect(link.createdAt).toBeGreaterThanOrEqual(before)
    expect(link.createdAt).toBeLessThanOrEqual(after)
  })

  it('이미 createdAt이 있는 링크는 값을 변경하지 않는다 (idempotent)', async () => {
    const { backfillMissingCreatedAt } = await import('../lib/migration')
    const existingTs = 1700000000000
    const bookmarks = [
      {
        id: 'cat-1',
        name: 'Work',
        icon: '💼',
        links: [
          { id: 'l1', name: 'Gmail', url: 'https://mail.google.com', tags: [], createdAt: existingTs },
        ],
      },
    ]

    const result = backfillMissingCreatedAt(bookmarks)
    expect(result[0].links[0].createdAt).toBe(existingTs)
  })

  it('여러 번 실행해도 동일한 결과 (idempotent)', async () => {
    const { backfillMissingCreatedAt } = await import('../lib/migration')
    const bookmarks = [
      {
        id: 'cat-1',
        name: 'Work',
        icon: '💼',
        links: [
          { id: 'l1', name: 'Gmail', url: 'https://mail.google.com', tags: [] },
        ],
      },
    ]

    const first = backfillMissingCreatedAt(bookmarks)
    const second = backfillMissingCreatedAt(first)

    expect(second[0].links[0].createdAt).toBe(first[0].links[0].createdAt)
  })
})
