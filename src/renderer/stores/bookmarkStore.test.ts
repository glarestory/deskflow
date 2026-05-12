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

  // SPEC-BOOKMARK-003: addLink 시 자동 태그 추출
  it('addLink는 github URL에 자동으로 dev, code 태그를 부여해야 한다 (AC-001)', async () => {
    mockGet.mockResolvedValue({ value: null })
    const { useBookmarkStore } = await import('./bookmarkStore')
    await useBookmarkStore.getState().loadBookmarks()

    const catId = useBookmarkStore.getState().bookmarks[0].id
    useBookmarkStore.getState().addLink(catId, {
      id: 'new-link',
      name: 'GitHub',
      url: 'https://github.com/anthropics/claude',
      tags: [],
    })

    const updatedCat = useBookmarkStore.getState().bookmarks.find((b) => b.id === catId)
    const newLink = updatedCat?.links.find((l) => l.id === 'new-link')
    expect(newLink?.tags).toContain('dev')
    expect(newLink?.tags).toContain('code')
  })

  it('addLink는 매칭 없는 URL이면 수동 태그를 유지해야 한다 (AC-002)', async () => {
    mockGet.mockResolvedValue({ value: null })
    const { useBookmarkStore } = await import('./bookmarkStore')
    await useBookmarkStore.getState().loadBookmarks()

    const catId = useBookmarkStore.getState().bookmarks[0].id
    useBookmarkStore.getState().addLink(catId, {
      id: 'private-link',
      name: 'Private',
      url: 'https://my-private-site.internal',
      tags: ['manual'],
    })

    const updatedCat = useBookmarkStore.getState().bookmarks.find((b) => b.id === catId)
    const newLink = updatedCat?.links.find((l) => l.id === 'private-link')
    // 자동 태그 없음, 수동 태그만 유지
    expect(newLink?.tags).toContain('manual')
  })

  it('addLink는 자동+수동 태그 중복을 제거해야 한다 (EDGE-004)', async () => {
    mockGet.mockResolvedValue({ value: null })
    const { useBookmarkStore } = await import('./bookmarkStore')
    await useBookmarkStore.getState().loadBookmarks()

    const catId = useBookmarkStore.getState().bookmarks[0].id
    // 수동으로 dev 추가했는데 github이라 자동으로도 dev 부여
    useBookmarkStore.getState().addLink(catId, {
      id: 'gh-link',
      name: 'GitHub',
      url: 'https://github.com',
      tags: ['dev'],
    })

    const updatedCat = useBookmarkStore.getState().bookmarks.find((b) => b.id === catId)
    const newLink = updatedCat?.links.find((l) => l.id === 'gh-link')
    const devCount = newLink?.tags.filter((t) => t === 'dev').length
    expect(devCount).toBe(1) // 중복 없이 단일 dev
  })

  // SPEC-UX-008: moveLinkBetweenGroups API (REQ-UX-008-008)
  describe('moveLinkBetweenGroups', () => {
    // 각 테스트에서 공통으로 사용할 초기 상태 설정 헬퍼
    async function setupStore(
      cat1Links = [
        { id: 'l1', name: 'Gmail', url: 'https://mail.google.com', tags: ['email'], favorite: true },
        { id: 'l2', name: 'Drive', url: 'https://drive.google.com', tags: ['docs'] },
      ],
      cat2Links = [
        { id: 'l5', name: 'GitHub', url: 'https://github.com', tags: ['dev'] },
        { id: 'l6', name: 'Stack Overflow', url: 'https://stackoverflow.com', tags: ['dev'] },
      ],
    ) {
      mockGet.mockResolvedValue({ value: null })
      const { useBookmarkStore } = await import('./bookmarkStore')
      useBookmarkStore.setState({
        bookmarks: [
          { id: 'cat-1', name: 'Work', icon: '💼', links: cat1Links },
          { id: 'cat-2', name: 'Dev', icon: '⚡', links: cat2Links },
        ],
        loaded: true,
      })
      return useBookmarkStore
    }

    // T-003-a: 카테고리 A의 링크를 카테고리 B의 인덱스 0으로 이동 (AC-001)
    it('다른 카테고리 인덱스 0으로 이동한다 (AC-001)', async () => {
      const store = await setupStore()
      store.getState().moveLinkBetweenGroups('l1', 'cat-1', 'cat-2', 0)

      const state = store.getState()
      const cat1 = state.bookmarks.find((b) => b.id === 'cat-1')
      const cat2 = state.bookmarks.find((b) => b.id === 'cat-2')

      // cat-1에서 l1 제거됨
      expect(cat1?.links.map((l) => l.id)).toEqual(['l2'])
      // cat-2에 l1이 인덱스 0에 삽입됨
      expect(cat2?.links.map((l) => l.id)).toEqual(['l1', 'l5', 'l6'])
      // storage.set 1회 호출 (REQ-UX-008-013)
      expect(mockSet).toHaveBeenCalledOnce()
    })

    // T-003-b: 중간 인덱스로 이동 (AC-002)
    it('카테고리 B의 중간 인덱스로 이동한다 (AC-002)', async () => {
      const store = await setupStore(
        [{ id: 'l1', name: 'Gmail', url: 'https://mail.google.com', tags: [] }],
        [
          { id: 'l5', name: 'GitHub', url: 'https://github.com', tags: [] },
          { id: 'l6', name: 'SO', url: 'https://stackoverflow.com', tags: [] },
          { id: 'l7', name: 'CodePen', url: 'https://codepen.io', tags: [] },
          { id: 'l8', name: 'MDN', url: 'https://developer.mozilla.org', tags: [] },
        ],
      )
      store.getState().moveLinkBetweenGroups('l1', 'cat-1', 'cat-2', 2)

      const cat2 = store.getState().bookmarks.find((b) => b.id === 'cat-2')
      expect(cat2?.links.map((l) => l.id)).toEqual(['l5', 'l6', 'l1', 'l7', 'l8'])
    })

    // T-003-c: 끝 인덱스로 이동 (AC-002)
    it('toIndex가 links.length와 같으면 끝에 삽입한다 (AC-002)', async () => {
      const store = await setupStore()
      store.getState().moveLinkBetweenGroups('l1', 'cat-1', 'cat-2', 2)

      const cat2 = store.getState().bookmarks.find((b) => b.id === 'cat-2')
      expect(cat2?.links.map((l) => l.id)).toEqual(['l5', 'l6', 'l1'])
    })

    // T-003-d: 빈 카테고리로 이동 (AC-003)
    it('빈 카테고리로 이동한다 (AC-003)', async () => {
      const store = await setupStore(
        [{ id: 'l1', name: 'Gmail', url: 'https://mail.google.com', tags: [] }],
        [], // 빈 cat-2
      )
      store.getState().moveLinkBetweenGroups('l1', 'cat-1', 'cat-2', 0)

      const cat1 = store.getState().bookmarks.find((b) => b.id === 'cat-1')
      const cat2 = store.getState().bookmarks.find((b) => b.id === 'cat-2')
      expect(cat1?.links).toHaveLength(0)
      expect(cat2?.links.map((l) => l.id)).toEqual(['l1'])
    })

    // T-003-e: fromCategoryId === toCategoryId → no-op (AC-004)
    it('from === to이면 no-op이다 (AC-004)', async () => {
      const store = await setupStore()
      const before = store.getState().bookmarks
      store.getState().moveLinkBetweenGroups('l1', 'cat-1', 'cat-1', 0)

      expect(store.getState().bookmarks).toEqual(before)
      expect(mockSet).not.toHaveBeenCalled()
    })

    // T-003-f: 부가 메타데이터 보존 (AC-001, AC-014)
    it('favorite, tags 등 부가 메타데이터가 보존된다 (AC-014)', async () => {
      const store = await setupStore()
      store.getState().moveLinkBetweenGroups('l1', 'cat-1', 'cat-2', 0)

      const cat2 = store.getState().bookmarks.find((b) => b.id === 'cat-2')
      const movedLink = cat2?.links[0]
      expect(movedLink?.id).toBe('l1')
      expect(movedLink?.favorite).toBe(true)
      expect(movedLink?.tags).toEqual(['email'])
    })

    // T-003-g: toIndex clamp 동작 (AC-002)
    it('toIndex가 범위 초과이면 끝에, 음수이면 맨 앞에 삽입한다 (AC-002)', async () => {
      const store1 = await setupStore()
      store1.getState().moveLinkBetweenGroups('l1', 'cat-1', 'cat-2', 999)
      const cat2a = store1.getState().bookmarks.find((b) => b.id === 'cat-2')
      // 끝에 삽입
      expect(cat2a?.links[cat2a.links.length - 1].id).toBe('l1')

      // 음수 인덱스 테스트를 위해 별도 store 초기화
      vi.resetModules()
      vi.stubGlobal('storage', { get: mockGet, set: mockSet })
      const store2 = await setupStore()
      store2.getState().moveLinkBetweenGroups('l1', 'cat-1', 'cat-2', -5)
      const cat2b = store2.getState().bookmarks.find((b) => b.id === 'cat-2')
      // 맨 앞에 삽입
      expect(cat2b?.links[0].id).toBe('l1')
    })

    // T-003-h: 존재하지 않는 linkId / categoryId → no-op (AC-004)
    it('존재하지 않는 linkId 또는 categoryId이면 no-op이다 (AC-004)', async () => {
      const store = await setupStore()
      const before = JSON.stringify(store.getState().bookmarks)

      store.getState().moveLinkBetweenGroups('non-existent', 'cat-1', 'cat-2', 0)
      expect(JSON.stringify(store.getState().bookmarks)).toEqual(before)

      store.getState().moveLinkBetweenGroups('l1', 'cat-1', 'non-existent-cat', 0)
      expect(JSON.stringify(store.getState().bookmarks)).toEqual(before)

      store.getState().moveLinkBetweenGroups('l1', 'non-existent-cat', 'cat-2', 0)
      expect(JSON.stringify(store.getState().bookmarks)).toEqual(before)

      expect(mockSet).not.toHaveBeenCalled()
    })
  })

  // SPEC-UX-007: reorderCategories API (REQ-UX-007-014, AC-014)
  describe('reorderCategories', () => {
    it('orderedIds 순서대로 bookmarks를 재정렬해야 한다 (AC-014)', async () => {
      mockGet.mockResolvedValue({ value: null })
      const { useBookmarkStore } = await import('./bookmarkStore')
      // [A, B, C, D] 초기 상태 설정
      useBookmarkStore.setState({
        bookmarks: [
          { id: 'A', name: 'A', icon: '📌', links: [] },
          { id: 'B', name: 'B', icon: '📌', links: [] },
          { id: 'C', name: 'C', icon: '📌', links: [] },
          { id: 'D', name: 'D', icon: '📌', links: [] },
        ],
        loaded: true,
      })

      useBookmarkStore.getState().reorderCategories(['C', 'A', 'B'])

      const ids = useBookmarkStore.getState().bookmarks.map((b) => b.id)
      // D는 orderedIds에 없으므로 끝에 보존 → [C, A, B, D]
      expect(ids).toEqual(['C', 'A', 'B', 'D'])
    })

    it('일부 id만 지정하면 나머지는 끝에 보존된다 (AC-014)', async () => {
      mockGet.mockResolvedValue({ value: null })
      const { useBookmarkStore } = await import('./bookmarkStore')
      useBookmarkStore.setState({
        bookmarks: [
          { id: 'A', name: 'A', icon: '📌', links: [] },
          { id: 'B', name: 'B', icon: '📌', links: [] },
          { id: 'C', name: 'C', icon: '📌', links: [] },
          { id: 'D', name: 'D', icon: '📌', links: [] },
        ],
        loaded: true,
      })

      useBookmarkStore.getState().reorderCategories(['B', 'A'])

      const ids = useBookmarkStore.getState().bookmarks.map((b) => b.id)
      // C, D 보존 → [B, A, C, D]
      expect(ids).toEqual(['B', 'A', 'C', 'D'])
    })

    it('존재하지 않는 id는 무시하고 매칭된 것만 앞으로 이동한다 (AC-014)', async () => {
      mockGet.mockResolvedValue({ value: null })
      const { useBookmarkStore } = await import('./bookmarkStore')
      useBookmarkStore.setState({
        bookmarks: [
          { id: 'A', name: 'A', icon: '📌', links: [] },
          { id: 'B', name: 'B', icon: '📌', links: [] },
          { id: 'C', name: 'C', icon: '📌', links: [] },
          { id: 'D', name: 'D', icon: '📌', links: [] },
        ],
        loaded: true,
      })

      useBookmarkStore.getState().reorderCategories(['unknown', 'A', 'X'])

      const ids = useBookmarkStore.getState().bookmarks.map((b) => b.id)
      // unknown, X는 무시 → A만 앞으로, B C D 뒤에 → [A, B, C, D]
      expect(ids).toEqual(['A', 'B', 'C', 'D'])
    })

    it('단일 카테고리만 있을 때 no-op이어야 한다 (EDGE-004)', async () => {
      mockGet.mockResolvedValue({ value: null })
      const { useBookmarkStore } = await import('./bookmarkStore')
      useBookmarkStore.setState({
        bookmarks: [{ id: 'solo', name: 'Solo', icon: '📌', links: [] }],
        loaded: true,
      })

      useBookmarkStore.getState().reorderCategories(['solo'])

      const ids = useBookmarkStore.getState().bookmarks.map((b) => b.id)
      expect(ids).toEqual(['solo'])
    })
  })
})
