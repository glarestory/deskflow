// @MX:SPEC: SPEC-BOOKMARK-003
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Bookmark } from '../types'

// firestoreStorage mock
vi.mock('./firestoreStorage', () => ({
  firestoreStorage: {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue(undefined),
  },
}))

describe('backfillMissingTags', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  // AC-010: 기존 데이터 마이그레이션
  it('tags 필드가 없는 링크에 자동 태그를 채워야 한다', async () => {
    const { backfillMissingTags } = await import('./migration')

    // tags 필드가 없는 링크 (타입 단언으로 시뮬레이션)
    const bookmarks: Bookmark[] = [
      {
        id: 'b1',
        name: 'Dev',
        icon: '⚡',
        links: [
          // @ts-expect-error -- tags 없는 기존 데이터 시뮬레이션
          { id: 'l1', name: 'GitHub', url: 'https://github.com' },
          // @ts-expect-error -- tags 없는 기존 데이터 시뮬레이션
          { id: 'l2', name: 'YouTube', url: 'https://youtube.com' },
        ],
      },
    ]

    const result = backfillMissingTags(bookmarks)
    const ghLink = result[0].links.find((l) => l.id === 'l1')
    const ytLink = result[0].links.find((l) => l.id === 'l2')

    expect(ghLink?.tags).toContain('dev')
    expect(ghLink?.tags).toContain('code')
    expect(ytLink?.tags).toContain('video')
  })

  it('tags 필드가 이미 있는 링크는 유지해야 한다', async () => {
    const { backfillMissingTags } = await import('./migration')

    const bookmarks: Bookmark[] = [
      {
        id: 'b1',
        name: 'Dev',
        icon: '⚡',
        links: [
          { id: 'l1', name: 'GitHub', url: 'https://github.com', tags: ['custom'] },
        ],
      },
    ]

    const result = backfillMissingTags(bookmarks)
    // 기존 태그 유지
    expect(result[0].links[0].tags).toContain('custom')
  })

  it('tags가 빈 배열인 링크는 자동 태그로 채워야 한다', async () => {
    const { backfillMissingTags } = await import('./migration')

    const bookmarks: Bookmark[] = [
      {
        id: 'b1',
        name: 'Dev',
        icon: '⚡',
        links: [
          { id: 'l1', name: 'GitHub', url: 'https://github.com', tags: [] },
        ],
      },
    ]

    const result = backfillMissingTags(bookmarks)
    // 빈 배열도 자동 태그로 채움
    expect(result[0].links[0].tags.length).toBeGreaterThan(0)
  })

  it('매칭 없는 URL은 빈 배열을 유지해야 한다', async () => {
    const { backfillMissingTags } = await import('./migration')

    const bookmarks: Bookmark[] = [
      {
        id: 'b1',
        name: 'Private',
        icon: '🔒',
        links: [
          // @ts-expect-error -- tags 없는 기존 데이터 시뮬레이션
          { id: 'l1', name: 'Private', url: 'https://my-private.internal' },
        ],
      },
    ]

    const result = backfillMissingTags(bookmarks)
    expect(result[0].links[0].tags).toEqual([])
  })

  it('idempotent: 이미 마이그레이션된 데이터에 재실행해도 중복이 없어야 한다', async () => {
    const { backfillMissingTags } = await import('./migration')

    const bookmarks: Bookmark[] = [
      {
        id: 'b1',
        name: 'Dev',
        icon: '⚡',
        links: [
          { id: 'l1', name: 'GitHub', url: 'https://github.com', tags: ['dev', 'code'] },
        ],
      },
    ]

    const first = backfillMissingTags(bookmarks)
    const second = backfillMissingTags(first)

    // 재실행 후에도 dev 태그가 하나만 있어야 함
    const devCount = second[0].links[0].tags.filter((t) => t === 'dev').length
    expect(devCount).toBe(1)
  })

  it('빈 북마크 배열을 처리해야 한다', async () => {
    const { backfillMissingTags } = await import('./migration')
    expect(backfillMissingTags([])).toEqual([])
  })
})
