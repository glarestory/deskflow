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

  it('importBookmarks with replace mode replaces all bookmarks', async () => {
    mockGet.mockResolvedValue({ value: null })
    const { useBookmarkStore } = await import('./bookmarkStore')
    await useBookmarkStore.getState().loadBookmarks()

    const newCategories = [
      { id: 'new-1', name: 'Imported', icon: '🔖', links: [{ id: 'nl1', name: 'Test', url: 'https://test.com' }] },
    ]
    useBookmarkStore.getState().importBookmarks(newCategories, 'replace')

    expect(useBookmarkStore.getState().bookmarks).toEqual(newCategories)
    expect(useBookmarkStore.getState().bookmarks.length).toBe(1)
  })

  it('importBookmarks with merge mode appends new categories', async () => {
    mockGet.mockResolvedValue({ value: null })
    const { useBookmarkStore } = await import('./bookmarkStore')
    await useBookmarkStore.getState().loadBookmarks()

    const before = useBookmarkStore.getState().bookmarks.length
    const newCategories = [
      { id: 'brand-new', name: '새 카테고리', icon: '📌', links: [{ id: 'nl1', name: 'Link', url: 'https://new.com' }] },
    ]
    useBookmarkStore.getState().importBookmarks(newCategories, 'merge')

    expect(useBookmarkStore.getState().bookmarks.length).toBe(before + 1)
    expect(useBookmarkStore.getState().bookmarks.find((b) => b.name === '새 카테고리')).toBeDefined()
  })

  it('importBookmarks with merge mode merges links into existing category (no duplicates)', async () => {
    mockGet.mockResolvedValue({ value: null })
    const { useBookmarkStore } = await import('./bookmarkStore')
    await useBookmarkStore.getState().loadBookmarks()

    // 기존에 있는 카테고리 이름을 사용
    const existingCat = useBookmarkStore.getState().bookmarks[0]
    const existingLinkCount = existingCat.links.length
    const existingUrl = existingCat.links[0].url

    const importedCategories = [
      {
        id: 'dup-cat',
        name: existingCat.name, // 동일 이름
        icon: '🔖',
        links: [
          { id: 'new-link', name: 'New Link', url: 'https://totally-new-url.com' },
          { id: 'dup-link', name: 'Dup Link', url: existingUrl }, // 중복 URL
        ],
      },
    ]
    useBookmarkStore.getState().importBookmarks(importedCategories, 'merge')

    const merged = useBookmarkStore.getState().bookmarks.find((b) => b.name === existingCat.name)
    expect(merged).toBeDefined()
    // 중복 URL은 제외하고 새 링크만 추가됨
    expect(merged?.links.length).toBe(existingLinkCount + 1)
  })
})
