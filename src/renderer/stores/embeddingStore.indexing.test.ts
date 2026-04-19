// @MX:SPEC: SPEC-SEARCH-RAG-001
// embeddingStore 인덱싱 단위 테스트 — RED-GREEN-REFACTOR (Phase 3)

import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { BookmarkEmbedding } from '../types/embedding'

// ── storage 모킹 ──────────────────────────────────────────────────────────
const mockGet = vi.fn()
const mockSet = vi.fn()

vi.mock('../lib/storage', () => ({
  storage: {
    get: (...args: unknown[]) => mockGet(...args),
    set: (...args: unknown[]) => mockSet(...args),
  },
}))

// ── firestoreEmbeddingStorage 모킹 ────────────────────────────────────────
vi.mock('../lib/firestoreEmbeddingStorage', () => ({
  firestoreEmbeddingStorage: {
    getAll: vi.fn().mockResolvedValue([]),
    upsert: vi.fn().mockResolvedValue(undefined),
    remove: vi.fn().mockResolvedValue(undefined),
    removeAll: vi.fn().mockResolvedValue(undefined),
  },
}))

// ── authStore 모킹 ────────────────────────────────────────────────────────
vi.mock('./authStore', () => ({
  useAuthStore: {
    getState: vi.fn(() => ({ user: null })),
  },
}))

// ── ollamaClient 모킹 ────────────────────────────────────────────────────
const mockEmbed = vi.fn()

vi.mock('../lib/ollamaClient', () => ({
  embed: (...args: unknown[]) => mockEmbed(...args),
}))

// ── bookmarkStore 모킹 ────────────────────────────────────────────────────
const mockGetBookmarkState = vi.fn()

vi.mock('./bookmarkStore', () => ({
  useBookmarkStore: {
    getState: (...args: unknown[]) => mockGetBookmarkState(...args),
  },
}))

// ── contentHash 모킹 ─────────────────────────────────────────────────────
const mockSha256 = vi.fn()

vi.mock('../lib/contentHash', () => ({
  sha256: (...args: unknown[]) => mockSha256(...args),
}))

// ── 테스트용 팩토리 ──────────────────────────────────────────────────────
const makeEmbedding = (linkId: string, contentHash = 'hash-abc'): BookmarkEmbedding => ({
  linkId,
  categoryId: 'cat-1',
  contentHash,
  embedding: [0.1, 0.2, 0.3],
  dimension: 3,
  model: 'nomic-embed-text',
  embeddedAt: '2026-04-19T00:00:00.000Z',
})

const makeLink = (id: string, overrides: Partial<{ name: string; url: string; tags: string[]; description?: string }> = {}) => ({
  id,
  name: overrides.name ?? `Link ${id}`,
  url: overrides.url ?? `https://example.com/${id}`,
  tags: overrides.tags ?? [],
  description: overrides.description,
})

// ── 헬퍼: bookmarkStore 기본 상태 ────────────────────────────────────────
const makeBookmarkState = (links: ReturnType<typeof makeLink>[], categoryId = 'cat-1') => ({
  categories: [
    { id: categoryId, links },
  ],
  bookmarks: [
    { id: categoryId, name: 'Test Cat', icon: '📌', links },
  ],
})

// ── 헬퍼: 스토어 fresh import ─────────────────────────────────────────────
async function freshStore() {
  const mod = await import('./embeddingStore')
  return mod.useEmbeddingStore
}

// ─────────────────────────────────────────────────────────────────────────────
describe('embeddingStore — Phase 3: enqueueIndex', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    mockGet.mockResolvedValue({ value: null })
    mockSet.mockResolvedValue(undefined)
    mockSha256.mockImplementation(async (text: string) => 'hash-' + text.length)
    mockEmbed.mockResolvedValue([0.1, 0.2, 0.3])
    mockGetBookmarkState.mockReturnValue(makeBookmarkState([makeLink('link-1')]))
  })

  // 테스트 1: 새 linkId를 큐에 추가
  it('enqueueIndex: 새 linkId를 indexingQueue에 추가한다', async () => {
    const store = await freshStore()
    store.setState({ indexingQueue: [], embeddings: new Map() })

    store.getState().enqueueIndex(['link-1', 'link-2'])

    const { indexingQueue } = store.getState()
    expect(indexingQueue).toContain('link-1')
    expect(indexingQueue).toContain('link-2')
    expect(indexingQueue).toHaveLength(2)
  })

  // 테스트 2: 큐 내 중복 linkId 제거
  it('enqueueIndex: 이미 큐에 있는 linkId는 중복으로 추가하지 않는다', async () => {
    const store = await freshStore()
    store.setState({ indexingQueue: ['link-1'], embeddings: new Map() })

    store.getState().enqueueIndex(['link-1', 'link-2'])

    const { indexingQueue } = store.getState()
    expect(indexingQueue.filter((id) => id === 'link-1')).toHaveLength(1)
    expect(indexingQueue).toContain('link-2')
    expect(indexingQueue).toHaveLength(2)
  })

  // 테스트 3: 이미 임베딩된 linkId 스킵
  it('enqueueIndex: 이미 embeddings Map에 있는 linkId는 큐에 추가하지 않는다', async () => {
    const store = await freshStore()
    store.setState({
      indexingQueue: [],
      embeddings: new Map([['link-1', makeEmbedding('link-1')]]),
    })

    store.getState().enqueueIndex(['link-1', 'link-2'])

    const { indexingQueue } = store.getState()
    expect(indexingQueue).not.toContain('link-1')
    expect(indexingQueue).toContain('link-2')
    expect(indexingQueue).toHaveLength(1)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('embeddingStore — Phase 3: runIndexBatch', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    mockGet.mockResolvedValue({ value: null })
    mockSet.mockResolvedValue(undefined)
    mockSha256.mockImplementation(async (text: string) => 'hash-' + text.length)
    mockEmbed.mockResolvedValue([0.1, 0.2, 0.3])
  })

  // 테스트 4: 빈 큐는 NO-OP
  it('runIndexBatch: indexingQueue가 비어있으면 embed를 호출하지 않는다', async () => {
    mockGetBookmarkState.mockReturnValue(makeBookmarkState([]))

    const store = await freshStore()
    store.setState({ indexingQueue: [], embeddings: new Map() })

    await store.getState().runIndexBatch()

    expect(mockEmbed).not.toHaveBeenCalled()
    expect(store.getState().lastBatchProgress).toBeNull()
  })

  // 테스트 5: 큐에서 최대 10개만 처리
  it('runIndexBatch: 큐가 10개 초과이면 처음 10개만 처리하고 나머지는 큐에 남긴다', async () => {
    const links = Array.from({ length: 15 }, (_, i) => makeLink(`link-${i + 1}`))
    mockGetBookmarkState.mockReturnValue(makeBookmarkState(links))
    mockSha256.mockResolvedValue('new-hash')

    const store = await freshStore()
    const queue = links.map((l) => l.id)
    store.setState({ indexingQueue: queue, embeddings: new Map() })

    await store.getState().runIndexBatch()

    // 10개 호출
    expect(mockEmbed).toHaveBeenCalledTimes(10)
    // 나머지 5개는 큐에 남아야 함
    expect(store.getState().indexingQueue).toHaveLength(5)
  })

  // 테스트 6: embed 결과를 upsertEmbedding으로 저장
  it('runIndexBatch: embed 성공 시 BookmarkEmbedding을 embeddings Map에 저장한다', async () => {
    const link = makeLink('link-1')
    mockGetBookmarkState.mockReturnValue(makeBookmarkState([link]))
    mockSha256.mockResolvedValue('new-hash-123')
    mockEmbed.mockResolvedValue([0.5, 0.6, 0.7])

    const store = await freshStore()
    store.setState({ indexingQueue: ['link-1'], embeddings: new Map(), loaded: true })

    await store.getState().runIndexBatch()

    const embedding = store.getState().embeddings.get('link-1')
    expect(embedding).toBeDefined()
    expect(embedding?.contentHash).toBe('new-hash-123')
    expect(embedding?.embedding).toEqual([0.5, 0.6, 0.7])
    expect(embedding?.linkId).toBe('link-1')
  })

  // 테스트 7: 부분 실패 — 실패한 linkId는 큐에 남긴다 (AC-011)
  it('runIndexBatch: embed 실패한 linkId는 큐에 그대로 남기고 성공한 것만 저장한다', async () => {
    const links = [makeLink('link-ok'), makeLink('link-fail')]
    mockGetBookmarkState.mockReturnValue(makeBookmarkState(links))
    mockSha256.mockResolvedValue('new-hash')

    mockEmbed.mockImplementation(async (text: string) => {
      if (text.includes('link-fail') || text.includes('Link link-fail')) {
        throw new Error('embed 실패')
      }
      return [0.1, 0.2, 0.3]
    })

    const store = await freshStore()
    store.setState({ indexingQueue: ['link-ok', 'link-fail'], embeddings: new Map(), loaded: true })

    await store.getState().runIndexBatch()

    // link-ok는 저장됨
    expect(store.getState().embeddings.has('link-ok')).toBe(true)
    // link-fail은 저장 안 됨, 큐에 남아야 함
    expect(store.getState().embeddings.has('link-fail')).toBe(false)
    expect(store.getState().indexingQueue).toContain('link-fail')
  })

  // 테스트 8: contentHash 동일하면 embed 스킵 (AC-008)
  it('runIndexBatch: 기존 contentHash와 동일하면 embed를 호출하지 않는다 (AC-008)', async () => {
    const link = makeLink('link-1')
    mockGetBookmarkState.mockReturnValue(makeBookmarkState([link]))
    // sha256이 기존 hash와 동일한 값 반환
    mockSha256.mockResolvedValue('same-hash')

    const existingEmbedding = makeEmbedding('link-1', 'same-hash')
    const store = await freshStore()
    store.setState({
      indexingQueue: ['link-1'],
      embeddings: new Map([['link-1', existingEmbedding]]),
      loaded: true,
    })

    await store.getState().runIndexBatch()

    // contentHash 동일 → embed 호출 없음
    expect(mockEmbed).not.toHaveBeenCalled()
    // 큐에서 제거됨 (처리 완료)
    expect(store.getState().indexingQueue).not.toContain('link-1')
  })

  // 테스트 9: lastBatchProgress 업데이트 (AC-013)
  it('runIndexBatch: lastBatchProgress를 { done, total }로 업데이트한다', async () => {
    const links = [makeLink('link-1'), makeLink('link-2')]
    mockGetBookmarkState.mockReturnValue(makeBookmarkState(links))
    mockSha256.mockResolvedValue('new-hash')
    mockEmbed.mockResolvedValue([0.1, 0.2, 0.3])

    const store = await freshStore()
    store.setState({ indexingQueue: ['link-1', 'link-2'], embeddings: new Map(), loaded: true })

    await store.getState().runIndexBatch()

    const progress = store.getState().lastBatchProgress
    expect(progress).not.toBeNull()
    expect(progress?.done).toBe(2)
    expect(progress?.total).toBe(2)
  })

  // 테스트 10: 동시 호출 시 double-process 방지
  it('runIndexBatch: 이미 진행 중이면 두 번째 호출은 즉시 리턴한다 (동시성 가드)', async () => {
    const link = makeLink('link-1')
    mockGetBookmarkState.mockReturnValue(makeBookmarkState([link]))
    mockSha256.mockResolvedValue('new-hash')

    // embed가 느리게 처리되는 상황 시뮬레이션
    let resolveEmbed!: (val: number[]) => void
    mockEmbed.mockImplementation(() => new Promise<number[]>((res) => { resolveEmbed = res }))

    const store = await freshStore()
    store.setState({ indexingQueue: ['link-1'], embeddings: new Map(), loaded: true })

    // 첫 번째 호출 시작 (비동기)
    const first = store.getState().runIndexBatch()

    // indexingInProgress가 true인 상태에서 두 번째 호출
    const second = store.getState().runIndexBatch()

    // 두 번째는 즉시 리턴 (embed 추가 호출 없음)
    await second

    // embed는 한 번만 호출되어야 함 (첫 번째 호출에서)
    expect(mockEmbed).toHaveBeenCalledTimes(1)

    // 첫 번째 완료
    resolveEmbed([0.1, 0.2])
    await first
  })

  // 테스트 11: 큐 처리 후 indexingQueue에서 처리된 항목 제거 (processed items removed)
  it('runIndexBatch: 처리된 linkId는 indexingQueue에서 제거된다', async () => {
    const links = [makeLink('link-1'), makeLink('link-2'), makeLink('link-3')]
    mockGetBookmarkState.mockReturnValue(makeBookmarkState(links))
    mockSha256.mockResolvedValue('new-hash')
    mockEmbed.mockResolvedValue([0.1, 0.2, 0.3])

    const store = await freshStore()
    store.setState({ indexingQueue: ['link-1', 'link-2', 'link-3'], embeddings: new Map(), loaded: true })

    await store.getState().runIndexBatch()

    // 모두 처리됨 — 큐 비어야 함
    expect(store.getState().indexingQueue).toHaveLength(0)
  })

  // 테스트 12: 배치 처리 중 indexingInProgress=true, 완료 후 false
  it('runIndexBatch: 실행 중 indexingInProgress=true, 완료 후 false가 된다', async () => {
    const link = makeLink('link-1')
    mockGetBookmarkState.mockReturnValue(makeBookmarkState([link]))
    mockSha256.mockResolvedValue('new-hash')

    // embed를 지연 처리로 설정하여 inProgress 상태를 관찰
    let resolveEmbed: ((val: number[]) => void) | null = null
    mockEmbed.mockImplementation(() => new Promise<number[]>((res) => {
      resolveEmbed = res
    }))

    const store = await freshStore()
    store.setState({ indexingQueue: ['link-1'], embeddings: new Map(), loaded: true })

    // runIndexBatch 시작 (embed 호출 전까지 동기적으로 진행됨)
    const runPromise = store.getState().runIndexBatch()

    // microtask 큐를 비워서 embed가 호출되도록 함
    await Promise.resolve()
    await Promise.resolve()

    // embed가 pending인 동안 inProgress 확인
    const inProgressDuring = store.getState().indexingInProgress

    // embed 완료
    if (resolveEmbed !== null) {
      ;(resolveEmbed as (val: number[]) => void)([0.5, 0.5])
    }
    await runPromise

    // 실행 중에는 true
    expect(inProgressDuring).toBe(true)
    // 완료 후에는 false
    expect(store.getState().indexingInProgress).toBe(false)
  })
})
