import { describe, it, expect, vi, beforeEach } from 'vitest'

// window.storage 모킹
const mockGet = vi.fn()
const mockSet = vi.fn()
vi.stubGlobal('storage', { get: mockGet, set: mockSet })

describe('bookmarkStore', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    // 스토어 상태 초기화를 위해 모듈 재설정
    vi.resetModules()
    vi.stubGlobal('storage', { get: mockGet, set: mockSet })
  })

  it('has default bookmarks initially', async () => {
    mockGet.mockResolvedValue({ value: null })
    const { useBookmarkStore } = await import('./bookmarkStore')
    const state = useBookmarkStore.getState()
    expect(state.bookmarks).toBeDefined()
    expect(state.bookmarks.length).toBeGreaterThan(0)
  })

  it('loadBookmarks loads from storage when data exists', async () => {
    const savedData = [{ id: 'test-1', name: 'Test', icon: '🔖', links: [] }]
    mockGet.mockResolvedValue({ value: JSON.stringify(savedData) })

    const { useBookmarkStore } = await import('./bookmarkStore')
    await useBookmarkStore.getState().loadBookmarks()

    expect(useBookmarkStore.getState().bookmarks).toEqual(savedData)
    expect(useBookmarkStore.getState().loaded).toBe(true)
  })

  it('loadBookmarks uses DEFAULT_BOOKMARKS when storage is empty', async () => {
    mockGet.mockResolvedValue({ value: null })

    const { useBookmarkStore, DEFAULT_BOOKMARKS } = await import('./bookmarkStore')
    await useBookmarkStore.getState().loadBookmarks()

    expect(useBookmarkStore.getState().bookmarks).toEqual(DEFAULT_BOOKMARKS)
    expect(useBookmarkStore.getState().loaded).toBe(true)
  })

  it('addBookmark adds a new category', async () => {
    mockGet.mockResolvedValue({ value: null })
    const { useBookmarkStore } = await import('./bookmarkStore')
    await useBookmarkStore.getState().loadBookmarks()

    const before = useBookmarkStore.getState().bookmarks.length
    useBookmarkStore.getState().addBookmark({ id: 'new-1', name: 'New', icon: '📌', links: [] })
    expect(useBookmarkStore.getState().bookmarks.length).toBe(before + 1)
  })

  it('updateBookmark updates an existing category', async () => {
    mockGet.mockResolvedValue({ value: null })
    const { useBookmarkStore } = await import('./bookmarkStore')
    await useBookmarkStore.getState().loadBookmarks()

    const first = useBookmarkStore.getState().bookmarks[0]
    useBookmarkStore
      .getState()
      .updateBookmark({ ...first, name: 'Updated Name' })
    expect(useBookmarkStore.getState().bookmarks[0].name).toBe('Updated Name')
  })

  it('removeBookmark removes a category by id', async () => {
    mockGet.mockResolvedValue({ value: null })
    const { useBookmarkStore } = await import('./bookmarkStore')
    await useBookmarkStore.getState().loadBookmarks()

    const first = useBookmarkStore.getState().bookmarks[0]
    const before = useBookmarkStore.getState().bookmarks.length
    useBookmarkStore.getState().removeBookmark(first.id)
    expect(useBookmarkStore.getState().bookmarks.length).toBe(before - 1)
    expect(useBookmarkStore.getState().bookmarks.find((b) => b.id === first.id)).toBeUndefined()
  })
})
