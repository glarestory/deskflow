// @MX:SPEC: SPEC-SEARCH-RAG-001
// embeddingStore 단위 테스트 — RED-GREEN-REFACTOR (Phase 2)

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
const mockFsGetAll = vi.fn()
const mockFsUpsert = vi.fn()
const mockFsRemove = vi.fn()
const mockFsRemoveAll = vi.fn()

vi.mock('../lib/firestoreEmbeddingStorage', () => ({
  firestoreEmbeddingStorage: {
    getAll: (...args: unknown[]) => mockFsGetAll(...args),
    upsert: (...args: unknown[]) => mockFsUpsert(...args),
    remove: (...args: unknown[]) => mockFsRemove(...args),
    removeAll: (...args: unknown[]) => mockFsRemoveAll(...args),
  },
}))

// ── authStore 모킹 ────────────────────────────────────────────────────────
// 반환 타입을 명시해 { user: null } 리터럴로 좁혀지지 않게 한다 (auth 전환 테스트 대비).
type MockAuthState = { user: { uid: string } | null }
const mockGetAuthState = vi.fn<() => MockAuthState>(() => ({ user: null }))

vi.mock('./authStore', () => ({
  useAuthStore: {
    getState: () => mockGetAuthState(),
  },
}))

// ── 테스트용 임베딩 팩토리 ───────────────────────────────────────────────
const makeEmbedding = (linkId: string): BookmarkEmbedding => ({
  linkId,
  categoryId: 'cat-1',
  contentHash: 'hash-abc',
  embedding: [0.1, 0.2, 0.3],
  dimension: 3,
  model: 'nomic-embed-text',
  embeddedAt: '2026-04-19T00:00:00.000Z',
})

// ── 헬퍼: 스토어 fresh import ─────────────────────────────────────────────
async function freshStore() {
  const mod = await import('./embeddingStore')
  return mod.useEmbeddingStore
}

// ─────────────────────────────────────────────────────────────────────────────
describe('embeddingStore — Phase 2: 초기 상태', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    mockGet.mockResolvedValue({ value: null })
    mockSet.mockResolvedValue(undefined)
    mockFsGetAll.mockResolvedValue([])
    mockFsUpsert.mockResolvedValue(undefined)
    mockFsRemove.mockResolvedValue(undefined)
    mockFsRemoveAll.mockResolvedValue(undefined)
    mockGetAuthState.mockReturnValue({ user: null })
  })

  // 테스트 1: 초기 상태 확인
  it('초기 상태: embeddings는 빈 Map, loaded=false, indexingQueue=[], indexingInProgress=false', async () => {
    const store = await freshStore()
    const state = store.getState()

    expect(state.embeddings).toBeInstanceOf(Map)
    expect(state.embeddings.size).toBe(0)
    expect(state.loaded).toBe(false)
    expect(state.indexingQueue).toEqual([])
    expect(state.indexingInProgress).toBe(false)
    expect(state.lastBatchProgress).toBeNull()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('embeddingStore — Phase 2: loadEmbeddings (미인증)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    mockGet.mockResolvedValue({ value: null })
    mockSet.mockResolvedValue(undefined)
    mockFsGetAll.mockResolvedValue([])
    mockFsUpsert.mockResolvedValue(undefined)
    mockFsRemove.mockResolvedValue(undefined)
    mockFsRemoveAll.mockResolvedValue(undefined)
    mockGetAuthState.mockReturnValue({ user: null })
  })

  // 테스트 2: loadEmbeddings 미인증 — storage.get에서 복원
  it('loadEmbeddings() 미인증: storage.get("rag-embeddings")에서 Map으로 복원하고 loaded=true', async () => {
    const e1 = makeEmbedding('link-1')
    const e2 = makeEmbedding('link-2')
    mockGet.mockResolvedValue({ value: JSON.stringify([e1, e2]) })

    const store = await freshStore()
    await store.getState().loadEmbeddings()

    const state = store.getState()
    expect(state.loaded).toBe(true)
    expect(state.embeddings.size).toBe(2)
    expect(state.embeddings.get('link-1')).toEqual(e1)
    expect(state.embeddings.get('link-2')).toEqual(e2)
    expect(mockGet).toHaveBeenCalledWith('rag-embeddings')
  })

  // 테스트 3: loadEmbeddings — storage null 반환 시 빈 Map
  it('loadEmbeddings() storage null: 빈 Map 유지, loaded=true', async () => {
    mockGet.mockResolvedValue({ value: null })

    const store = await freshStore()
    await store.getState().loadEmbeddings()

    const state = store.getState()
    expect(state.loaded).toBe(true)
    expect(state.embeddings.size).toBe(0)
  })

  // 테스트 4: loadEmbeddings — 잘못된 JSON graceful fallback
  it('loadEmbeddings() 잘못된 JSON: 빈 Map으로 graceful fallback, loaded=true, throw 없음', async () => {
    mockGet.mockResolvedValue({ value: 'NOT_VALID_JSON{{{' })

    const store = await freshStore()
    await expect(store.getState().loadEmbeddings()).resolves.not.toThrow()

    const state = store.getState()
    expect(state.loaded).toBe(true)
    expect(state.embeddings.size).toBe(0)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('embeddingStore — Phase 2: loadEmbeddings (인증)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    mockGet.mockResolvedValue({ value: null })
    mockSet.mockResolvedValue(undefined)
    mockFsGetAll.mockResolvedValue([])
    mockFsUpsert.mockResolvedValue(undefined)
    mockFsRemove.mockResolvedValue(undefined)
    mockFsRemoveAll.mockResolvedValue(undefined)
    mockGetAuthState.mockReturnValue({ user: { uid: 'user-123' } })
  })

  // 테스트 5: loadEmbeddings 인증 — firestoreEmbeddingStorage.getAll 사용
  it('loadEmbeddings() 인증: firestoreEmbeddingStorage.getAll(uid)에서 Map으로 복원', async () => {
    const e1 = makeEmbedding('link-A')
    const e2 = makeEmbedding('link-B')
    mockFsGetAll.mockResolvedValue([e1, e2])

    const store = await freshStore()
    await store.getState().loadEmbeddings()

    const state = store.getState()
    expect(state.loaded).toBe(true)
    expect(state.embeddings.size).toBe(2)
    expect(state.embeddings.get('link-A')).toEqual(e1)
    expect(mockFsGetAll).toHaveBeenCalledWith('user-123')
    // storage.get은 호출되면 안 됨
    expect(mockGet).not.toHaveBeenCalled()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('embeddingStore — Phase 2: upsertEmbedding', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    mockGet.mockResolvedValue({ value: null })
    mockSet.mockResolvedValue(undefined)
    mockFsGetAll.mockResolvedValue([])
    mockFsUpsert.mockResolvedValue(undefined)
    mockFsRemove.mockResolvedValue(undefined)
    mockFsRemoveAll.mockResolvedValue(undefined)
  })

  // 테스트 6: upsertEmbedding 미인증 — Map 추가 + storage.set 호출
  it('upsertEmbedding() 미인증: Map에 추가 후 storage.set("rag-embeddings", ...) 호출', async () => {
    mockGetAuthState.mockReturnValue({ user: null })
    const store = await freshStore()
    // loaded=true로 세팅해야 persistOne이 동작
    store.setState({ loaded: true, embeddings: new Map() })

    const e = makeEmbedding('link-1')
    await store.getState().upsertEmbedding(e)

    const state = store.getState()
    expect(state.embeddings.get('link-1')).toEqual(e)
    expect(mockSet).toHaveBeenCalledWith('rag-embeddings', expect.any(String))
    const stored = JSON.parse(mockSet.mock.calls[0][1] as string) as BookmarkEmbedding[]
    expect(stored).toHaveLength(1)
    expect(stored[0].linkId).toBe('link-1')
  })

  // 테스트 7: upsertEmbedding 인증 — Map 추가 + firestoreEmbeddingStorage.upsert 호출
  it('upsertEmbedding() 인증: Map에 추가 후 firestoreEmbeddingStorage.upsert(uid, e) 호출', async () => {
    mockGetAuthState.mockReturnValue({ user: { uid: 'user-123' } })
    const store = await freshStore()
    store.setState({ loaded: true, embeddings: new Map() })

    const e = makeEmbedding('link-2')
    await store.getState().upsertEmbedding(e)

    expect(store.getState().embeddings.get('link-2')).toEqual(e)
    expect(mockFsUpsert).toHaveBeenCalledWith('user-123', e)
    expect(mockSet).not.toHaveBeenCalled()
  })

  // 테스트 8: upsertEmbedding — loaded=false 시 storage write 스킵
  it('upsertEmbedding() loaded=false: storage write 스킵 (capsuleStore persistXxx 가드 패턴)', async () => {
    mockGetAuthState.mockReturnValue({ user: null })
    const store = await freshStore()
    // loaded는 초기 false 상태 유지

    const e = makeEmbedding('link-3')
    await store.getState().upsertEmbedding(e)

    // Map에는 추가되어야 하나 storage.set은 호출되면 안 됨
    expect(mockSet).not.toHaveBeenCalled()
    expect(mockFsUpsert).not.toHaveBeenCalled()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('embeddingStore — Phase 2: removeEmbedding', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    mockGet.mockResolvedValue({ value: null })
    mockSet.mockResolvedValue(undefined)
    mockFsGetAll.mockResolvedValue([])
    mockFsUpsert.mockResolvedValue(undefined)
    mockFsRemove.mockResolvedValue(undefined)
    mockFsRemoveAll.mockResolvedValue(undefined)
  })

  // 테스트 9: removeEmbedding 미인증 — Map에서 삭제 + storage 갱신
  it('removeEmbedding() 미인증: Map에서 제거 후 storage.set("rag-embeddings", ...) 호출', async () => {
    mockGetAuthState.mockReturnValue({ user: null })
    const e1 = makeEmbedding('link-1')
    const e2 = makeEmbedding('link-2')
    const store = await freshStore()
    store.setState({
      loaded: true,
      embeddings: new Map([
        ['link-1', e1],
        ['link-2', e2],
      ]),
    })

    await store.getState().removeEmbedding('link-1')

    expect(store.getState().embeddings.has('link-1')).toBe(false)
    expect(store.getState().embeddings.has('link-2')).toBe(true)
    expect(mockSet).toHaveBeenCalledWith('rag-embeddings', expect.any(String))
    const stored = JSON.parse(mockSet.mock.calls[0][1] as string) as BookmarkEmbedding[]
    expect(stored).toHaveLength(1)
    expect(stored[0].linkId).toBe('link-2')
  })

  // 테스트 10: removeEmbedding 인증 — firestoreEmbeddingStorage.remove 호출
  it('removeEmbedding() 인증: firestoreEmbeddingStorage.remove(uid, linkId) 호출', async () => {
    mockGetAuthState.mockReturnValue({ user: { uid: 'user-123' } })
    const e = makeEmbedding('link-X')
    const store = await freshStore()
    store.setState({ loaded: true, embeddings: new Map([['link-X', e]]) })

    await store.getState().removeEmbedding('link-X')

    expect(mockFsRemove).toHaveBeenCalledWith('user-123', 'link-X')
    expect(mockSet).not.toHaveBeenCalled()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('embeddingStore — Phase 2: clearAll', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    mockGet.mockResolvedValue({ value: null })
    mockSet.mockResolvedValue(undefined)
    mockFsGetAll.mockResolvedValue([])
    mockFsUpsert.mockResolvedValue(undefined)
    mockFsRemove.mockResolvedValue(undefined)
    mockFsRemoveAll.mockResolvedValue(undefined)
  })

  // 테스트 11: clearAll 미인증 — Map 비우기 + storage.set('rag-embeddings', '[]')
  it('clearAll() 미인증: Map을 비우고 storage.set("rag-embeddings", "[]") 호출', async () => {
    mockGetAuthState.mockReturnValue({ user: null })
    const e = makeEmbedding('link-1')
    const store = await freshStore()
    store.setState({ loaded: true, embeddings: new Map([['link-1', e]]) })

    await store.getState().clearAll()

    expect(store.getState().embeddings.size).toBe(0)
    expect(mockSet).toHaveBeenCalledWith('rag-embeddings', '[]')
  })

  // 테스트 12: clearAll 인증 — firestoreEmbeddingStorage.removeAll 호출
  it('clearAll() 인증: firestoreEmbeddingStorage.removeAll(uid) 호출', async () => {
    mockGetAuthState.mockReturnValue({ user: { uid: 'user-123' } })
    const store = await freshStore()
    store.setState({ loaded: true, embeddings: new Map() })

    await store.getState().clearAll()

    expect(mockFsRemoveAll).toHaveBeenCalledWith('user-123')
    expect(mockSet).not.toHaveBeenCalled()
  })
})
