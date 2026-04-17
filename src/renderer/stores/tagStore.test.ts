// @MX:SPEC: SPEC-BOOKMARK-003
import { describe, it, expect, beforeEach, vi } from 'vitest'

// storage mock
vi.mock('../lib/storage', () => ({
  storage: {
    get: vi.fn().mockResolvedValue({ value: null }),
    set: vi.fn().mockResolvedValue(undefined),
  },
}))

describe('tagStore', () => {
  beforeEach(async () => {
    vi.resetModules()
  })

  // AC-006: 태그 집계 정확성
  it('recomputeAllTags는 북마크에서 태그를 집계해야 한다', async () => {
    const { useTagStore } = await import('./tagStore')
    const bookmarks = [
      { id: 'b1', name: 'A', icon: '1', links: [
        { id: 'l1', name: 'L1', url: 'u1', tags: ['dev', 'ai'] },
        { id: 'l2', name: 'L2', url: 'u2', tags: ['dev'] },
      ]},
      { id: 'b2', name: 'B', icon: '2', links: [
        { id: 'l3', name: 'L3', url: 'u3', tags: ['ai', 'video'] },
        { id: 'l4', name: 'L4', url: 'u4', tags: ['dev', 'design'] },
        { id: 'l5', name: 'L5', url: 'u5', tags: ['ai'] },
      ]},
    ]
    useTagStore.getState().recomputeAllTags(bookmarks)
    const allTags = useTagStore.getState().allTags

    // dev: 3, ai: 3, video: 1, design: 1
    const devTag = allTags.find((t) => t.tag === 'dev')
    const aiTag = allTags.find((t) => t.tag === 'ai')
    expect(devTag?.count).toBe(3)
    expect(aiTag?.count).toBe(3)
  })

  it('recomputeAllTags 결과는 count 내림차순으로 정렬되어야 한다', async () => {
    const { useTagStore } = await import('./tagStore')
    const bookmarks = [
      { id: 'b1', name: 'A', icon: '1', links: [
        { id: 'l1', name: 'L1', url: 'u1', tags: ['dev', 'ai', 'design'] },
        { id: 'l2', name: 'L2', url: 'u2', tags: ['dev'] },
        { id: 'l3', name: 'L3', url: 'u3', tags: ['ai', 'video'] },
        { id: 'l4', name: 'L4', url: 'u4', tags: ['dev', 'design'] },
        { id: 'l5', name: 'L5', url: 'u5', tags: ['ai'] },
      ]},
    ]
    useTagStore.getState().recomputeAllTags(bookmarks)
    const allTags = useTagStore.getState().allTags

    // count 내림차순 확인
    for (let i = 0; i < allTags.length - 1; i++) {
      expect(allTags[i].count).toBeGreaterThanOrEqual(allTags[i + 1].count)
    }
  })

  it('recomputeAllTags는 빈 링크 배열을 처리해야 한다', async () => {
    const { useTagStore } = await import('./tagStore')
    useTagStore.getState().recomputeAllTags([])
    expect(useTagStore.getState().allTags).toEqual([])
  })

  // AC-007: 단일 태그 필터
  it('selectTag는 selectedTags에 태그를 추가해야 한다', async () => {
    const { useTagStore } = await import('./tagStore')
    useTagStore.getState().selectTag('dev')
    expect(useTagStore.getState().selectedTags).toContain('dev')
  })

  it('selectTag는 중복 태그를 추가하지 않아야 한다 (EDGE-003)', async () => {
    const { useTagStore } = await import('./tagStore')
    useTagStore.getState().selectTag('dev')
    useTagStore.getState().selectTag('dev')
    const devCount = useTagStore.getState().selectedTags.filter((t) => t === 'dev').length
    expect(devCount).toBe(1)
  })

  // AC-008: 다중 태그 AND 필터
  it('여러 태그를 selectTag로 추가하면 selectedTags에 모두 포함되어야 한다', async () => {
    const { useTagStore } = await import('./tagStore')
    useTagStore.getState().selectTag('dev')
    useTagStore.getState().selectTag('ai')
    expect(useTagStore.getState().selectedTags).toContain('dev')
    expect(useTagStore.getState().selectedTags).toContain('ai')
  })

  it('deselectTag는 selectedTags에서 태그를 제거해야 한다', async () => {
    const { useTagStore } = await import('./tagStore')
    useTagStore.getState().selectTag('dev')
    useTagStore.getState().selectTag('ai')
    useTagStore.getState().deselectTag('dev')
    expect(useTagStore.getState().selectedTags).not.toContain('dev')
    expect(useTagStore.getState().selectedTags).toContain('ai')
  })

  it('clearTags는 selectedTags를 비워야 한다', async () => {
    const { useTagStore } = await import('./tagStore')
    useTagStore.getState().selectTag('dev')
    useTagStore.getState().selectTag('ai')
    useTagStore.getState().clearTags()
    expect(useTagStore.getState().selectedTags).toEqual([])
  })

  // REQ-006/REQ-007: 필터링 셀렉터
  it('filterBookmarksByTags는 selectedTags 기준으로 북마크를 필터링해야 한다', async () => {
    const { useTagStore } = await import('./tagStore')
    const bookmarks = [
      { id: 'b1', name: 'A', icon: '1', links: [
        { id: 'l1', name: 'L1', url: 'u1', tags: ['dev'] },
      ]},
      { id: 'b2', name: 'B', icon: '2', links: [
        { id: 'l2', name: 'L2', url: 'u2', tags: ['ai'] },
      ]},
      { id: 'b3', name: 'C', icon: '3', links: [
        { id: 'l3', name: 'L3', url: 'u3', tags: ['dev', 'ai'] },
      ]},
    ]
    useTagStore.getState().recomputeAllTags(bookmarks)
    useTagStore.getState().clearTags()
    useTagStore.getState().selectTag('dev')

    const filtered = useTagStore.getState().filterBookmarksByTags(bookmarks)
    // dev 태그가 있는 링크만 포함된 북마크
    const allLinks = filtered.flatMap((b) => b.links)
    expect(allLinks.every((l) => l.tags.includes('dev'))).toBe(true)
  })

  it('AND 필터: 두 태그 모두 가진 링크만 반환해야 한다 (AC-008)', async () => {
    const { useTagStore } = await import('./tagStore')
    const bookmarks = [
      { id: 'b1', name: 'A', icon: '1', links: [
        { id: 'l1', name: 'L1', url: 'u1', tags: ['dev'] },
        { id: 'l2', name: 'L2', url: 'u2', tags: ['dev', 'ai'] },
        { id: 'l3', name: 'L3', url: 'u3', tags: ['ai'] },
      ]},
    ]
    useTagStore.getState().recomputeAllTags(bookmarks)
    useTagStore.getState().clearTags()
    useTagStore.getState().selectTag('dev')
    useTagStore.getState().selectTag('ai')

    const filtered = useTagStore.getState().filterBookmarksByTags(bookmarks)
    const allLinks = filtered.flatMap((b) => b.links)
    // dev AND ai 모두 포함해야 함
    expect(allLinks.every((l) => l.tags.includes('dev') && l.tags.includes('ai'))).toBe(true)
    expect(allLinks.length).toBe(1)
  })

  it('selectedTags가 비어 있으면 모든 북마크를 반환해야 한다', async () => {
    const { useTagStore } = await import('./tagStore')
    const bookmarks = [
      { id: 'b1', name: 'A', icon: '1', links: [{ id: 'l1', name: 'L1', url: 'u1', tags: ['dev'] }] },
      { id: 'b2', name: 'B', icon: '2', links: [{ id: 'l2', name: 'L2', url: 'u2', tags: [] }] },
    ]
    useTagStore.getState().clearTags()

    const filtered = useTagStore.getState().filterBookmarksByTags(bookmarks)
    expect(filtered.length).toBe(2)
  })
})
