// @MX:SPEC: SPEC-BOOKMARK-003
// T-009: 통합 테스트 — 북마크 추가 → 자동 태그 → tagStore 집계 플로우
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../lib/storage', () => ({
  storage: {
    get: vi.fn().mockResolvedValue({ value: null }),
    set: vi.fn().mockResolvedValue(undefined),
  },
}))

// capsuleStore 모킹
vi.mock('../stores/capsuleStore', () => ({
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
vi.mock('../stores/embeddingStore', () => ({
  useEmbeddingStore: {
    getState: vi.fn(() => ({
      enqueueIndex: vi.fn(),
      removeEmbedding: vi.fn(),
    })),
  },
}))

describe('SPEC-BOOKMARK-003 통합 테스트', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  // AC-001: 새 북마크 추가 시 자동 태그 부여
  it('github URL 북마크 추가 시 dev, code 태그가 자동으로 부여되어야 한다', async () => {
    const { useBookmarkStore } = await import('../stores/bookmarkStore')
    const catId = useBookmarkStore.getState().bookmarks[0].id

    useBookmarkStore.getState().addLink(catId, {
      id: 'test-link',
      name: 'GitHub',
      url: 'https://github.com/anthropics/claude',
      tags: [],
    })

    const cat = useBookmarkStore.getState().bookmarks.find((b) => b.id === catId)
    const link = cat?.links.find((l) => l.id === 'test-link')
    expect(link?.tags).toContain('dev')
    expect(link?.tags).toContain('code')
  })

  // AC-006: tagStore 집계 정확성
  it('bookmarkStore 변경 후 tagStore 재집계가 올바르게 동작해야 한다', async () => {
    const { useBookmarkStore } = await import('../stores/bookmarkStore')
    const { useTagStore } = await import('../stores/tagStore')

    const bookmarks = useBookmarkStore.getState().bookmarks
    useTagStore.getState().recomputeAllTags(bookmarks)

    const allTags = useTagStore.getState().allTags
    // DEFAULT_BOOKMARKS에 dev, video, ai, design 태그가 있어야 함
    const tagNames = allTags.map((t) => t.tag)
    expect(tagNames).toContain('dev')
    expect(tagNames).toContain('video')
    expect(tagNames).toContain('ai')
    expect(tagNames).toContain('design')
  })

  // AC-007/AC-008: 필터링
  it('selectedTags로 북마크를 필터링할 수 있어야 한다', async () => {
    const { useTagStore } = await import('../stores/tagStore')
    const { useBookmarkStore } = await import('../stores/bookmarkStore')

    const bookmarks = useBookmarkStore.getState().bookmarks
    useTagStore.getState().clearTags()
    useTagStore.getState().selectTag('ai')

    const filtered = useTagStore.getState().filterBookmarksByTags(bookmarks)
    // ai 태그 링크만 있어야 함
    filtered.forEach((b) => {
      b.links.forEach((l) => {
        expect(l.tags).toContain('ai')
      })
    })
  })

  // AC-011: Firestore 직렬화 호환 (JSON 직렬화/역직렬화)
  it('tags 필드가 JSON 직렬화 후 동일하게 복원되어야 한다 (AC-011)', async () => {
    const { useBookmarkStore } = await import('../stores/bookmarkStore')
    const bookmarks = useBookmarkStore.getState().bookmarks

    // JSON 직렬화 → 역직렬화
    const serialized = JSON.stringify(bookmarks)
    const deserialized = JSON.parse(serialized) as typeof bookmarks

    // 각 링크의 tags 배열이 동일해야 함
    bookmarks.forEach((b, bi) => {
      b.links.forEach((l, li) => {
        expect(deserialized[bi].links[li].tags).toEqual(l.tags)
      })
    })
  })

  // AC-010: 마이그레이션 통합
  it('backfillMissingTags가 bookmarks에서 tags 없는 링크를 마이그레이션해야 한다', async () => {
    const { backfillMissingTags } = await import('../lib/migration')
    const { Bookmark: _B } = await import('../types').catch(() => ({ Bookmark: null }))

    const legacyBookmarks = [
      {
        id: 'b1', name: 'Dev', icon: '⚡',
        links: [
          // @ts-expect-error -- legacy data without tags
          { id: 'l1', name: 'GitHub', url: 'https://github.com' },
          // @ts-expect-error -- legacy data without tags
          { id: 'l2', name: 'Custom', url: 'https://my-private.internal' },
        ],
      },
    ]

    const migrated = backfillMissingTags(legacyBookmarks)
    expect(migrated[0].links[0].tags).toContain('dev')
    expect(migrated[0].links[1].tags).toEqual([]) // 매칭 없는 URL
  })

  // EDGE-004: 자동+수동 태그 중복 없음
  it('자동 태그와 수동 태그가 중복되면 단일로 유지해야 한다', async () => {
    const { useBookmarkStore } = await import('../stores/bookmarkStore')
    const catId = useBookmarkStore.getState().bookmarks[0].id

    useBookmarkStore.getState().addLink(catId, {
      id: 'dup-test',
      name: 'GitHub',
      url: 'https://github.com',
      tags: ['dev'], // 수동 dev 태그 (자동으로도 dev 부여됨)
    })

    const cat = useBookmarkStore.getState().bookmarks.find((b) => b.id === catId)
    const link = cat?.links.find((l) => l.id === 'dup-test')
    const devCount = link?.tags.filter((t) => t === 'dev').length
    expect(devCount).toBe(1)
  })
})
