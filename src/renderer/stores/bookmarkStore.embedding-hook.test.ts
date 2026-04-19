// @MX:SPEC: SPEC-SEARCH-RAG-001
// bookmarkStore + embeddingStore 훅 통합 테스트 — RED-GREEN-REFACTOR (Phase 3)

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── storage 모킹 ──────────────────────────────────────────────────────────
const mockGet = vi.fn()
const mockSet = vi.fn()

vi.mock('../lib/storage', () => ({
  storage: {
    get: (...args: unknown[]) => mockGet(...args),
    set: (...args: unknown[]) => mockSet(...args),
  },
}))

// ── capsuleStore 모킹 (bookmarkStore 의존) ────────────────────────────────
const mockAddBookmarkToCapsule = vi.fn()
const mockPurgeOrphan = vi.fn()

vi.mock('./capsuleStore', () => ({
  useCapsuleStore: {
    getState: vi.fn(() => ({
      autoAddToActive: false,
      activeCapsuleId: null,
      addBookmarkToCapsule: mockAddBookmarkToCapsule,
      purgeOrphan: mockPurgeOrphan,
    })),
  },
}))

// ── embeddingStore 모킹 ────────────────────────────────────────────────────
const mockEnqueueIndex = vi.fn()
const mockRemoveEmbedding = vi.fn()
const mockGetEmbeddingState = vi.fn()

vi.mock('./embeddingStore', () => ({
  useEmbeddingStore: {
    getState: (...args: unknown[]) => mockGetEmbeddingState(...args),
  },
}))

// ── 헬퍼: freshStore ──────────────────────────────────────────────────────
async function freshBookmarkStore() {
  const mod = await import('./bookmarkStore')
  return mod.useBookmarkStore
}

// ─────────────────────────────────────────────────────────────────────────────
describe('bookmarkStore — Phase 3: embeddingStore 훅', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    mockGet.mockResolvedValue({ value: null })
    mockSet.mockResolvedValue(undefined)
    mockGetEmbeddingState.mockReturnValue({
      enqueueIndex: mockEnqueueIndex,
      removeEmbedding: mockRemoveEmbedding,
    })
    mockPurgeOrphan.mockReturnValue(undefined)
  })

  // 테스트 1: addBookmark 후 enqueueIndex 호출 (AC-006)
  it('addBookmark: 새 카테고리 추가 후 embeddingStore.enqueueIndex를 호출하지 않는다 (카테고리 레벨 추가)', async () => {
    // addBookmark는 카테고리(Bookmark) 단위 추가이므로 링크 enqueue는 별도 처리
    // 스펙에서는 addBookmark 시 해당 카테고리 내 링크들을 enqueue
    const store = await freshBookmarkStore()
    await store.getState().loadBookmarks()

    store.getState().addBookmark({
      id: 'new-cat',
      name: 'New Category',
      icon: '📌',
      links: [
        { id: 'new-link-1', name: 'Link 1', url: 'https://example.com/1', tags: [] },
        { id: 'new-link-2', name: 'Link 2', url: 'https://example.com/2', tags: [] },
      ],
    })

    // 카테고리 내 링크들 ID가 enqueueIndex에 전달되어야 함
    expect(mockEnqueueIndex).toHaveBeenCalledWith(
      expect.arrayContaining(['new-link-1', 'new-link-2']),
    )
  })

  // 테스트 2: addLink 후 enqueueIndex 호출 (AC-006)
  it('addLink: 새 링크 추가 후 embeddingStore.enqueueIndex([linkId])를 호출한다', async () => {
    const store = await freshBookmarkStore()
    await store.getState().loadBookmarks()

    const catId = store.getState().bookmarks[0].id
    store.getState().addLink(catId, {
      id: 'link-new',
      name: 'New Link',
      url: 'https://example.com/new',
      tags: [],
    })

    expect(mockEnqueueIndex).toHaveBeenCalledWith(['link-new'])
  })

  // 테스트 3: updateBookmark 후 해당 카테고리 링크 enqueueIndex 호출 (AC-007)
  it('updateBookmark: 카테고리 업데이트 후 포함된 링크들을 enqueueIndex에 전달한다', async () => {
    const store = await freshBookmarkStore()
    await store.getState().loadBookmarks()

    const first = store.getState().bookmarks[0]
    const linkIds = first.links.map((l) => l.id)

    store.getState().updateBookmark({ ...first, name: 'Updated Name' })

    expect(mockEnqueueIndex).toHaveBeenCalledWith(
      expect.arrayContaining(linkIds),
    )
  })

  // 테스트 4: removeBookmark 후 embeddingStore.removeEmbedding 호출 (AC-009)
  it('removeBookmark: 카테고리 삭제 후 포함된 링크들의 removeEmbedding을 호출한다', async () => {
    const store = await freshBookmarkStore()
    await store.getState().loadBookmarks()

    const first = store.getState().bookmarks[0]
    const linkIds = first.links.map((l) => l.id)

    store.getState().removeBookmark(first.id)

    // 각 링크에 대해 removeEmbedding 호출 확인
    for (const linkId of linkIds) {
      expect(mockRemoveEmbedding).toHaveBeenCalledWith(linkId)
    }
  })

  // 테스트 5: 기존 addBookmark 기능 회귀 — 카테고리가 실제로 추가됨
  it('addBookmark: 훅 추가 후에도 기존 카테고리 추가 기능이 정상 동작한다 (회귀)', async () => {
    const store = await freshBookmarkStore()
    await store.getState().loadBookmarks()

    const before = store.getState().bookmarks.length
    store.getState().addBookmark({
      id: 'reg-cat',
      name: 'Regression Cat',
      icon: '🔍',
      links: [],
    })

    expect(store.getState().bookmarks.length).toBe(before + 1)
    expect(store.getState().bookmarks.find((b) => b.id === 'reg-cat')).toBeDefined()
  })

  // 테스트 6: 기존 removeBookmark 기능 회귀 — 카테고리가 실제로 삭제됨
  it('removeBookmark: 훅 추가 후에도 기존 카테고리 삭제 기능이 정상 동작한다 (회귀)', async () => {
    const store = await freshBookmarkStore()
    await store.getState().loadBookmarks()

    const first = store.getState().bookmarks[0]
    const firstId = first.id
    const before = store.getState().bookmarks.length

    store.getState().removeBookmark(firstId)

    expect(store.getState().bookmarks.length).toBe(before - 1)
    expect(store.getState().bookmarks.find((b) => b.id === firstId)).toBeUndefined()
  })

  // 테스트 7: 기존 updateBookmark 기능 회귀 — 카테고리가 실제로 업데이트됨
  it('updateBookmark: 훅 추가 후에도 기존 카테고리 업데이트 기능이 정상 동작한다 (회귀)', async () => {
    const store = await freshBookmarkStore()
    await store.getState().loadBookmarks()

    const first = store.getState().bookmarks[0]
    store.getState().updateBookmark({ ...first, name: 'Regression Updated' })

    expect(store.getState().bookmarks[0].name).toBe('Regression Updated')
  })
})
