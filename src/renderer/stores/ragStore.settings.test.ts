// @MX:SPEC: SPEC-SEARCH-RAG-001
// ragStore 설정 영속화 테스트 — TDD RED-GREEN-REFACTOR (Phase 6A)
// AC-032: rag-settings 스토리지 키로 enabled, similarityThreshold 영속화

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── storage 모킹 ──────────────────────────────────────────────────────────────
const mockStorageGet = vi.fn()
const mockStorageSet = vi.fn()

vi.mock('../lib/storage', () => ({
  storage: {
    get: (...args: unknown[]) => mockStorageGet(...args),
    set: (...args: unknown[]) => mockStorageSet(...args),
  },
}))

// ── ollamaClient 모킹 ────────────────────────────────────────────────────────
vi.mock('../lib/ollamaClient', () => ({
  checkHealth: vi.fn().mockResolvedValue(false),
  listModels: vi.fn().mockResolvedValue([]),
  embed: vi.fn().mockResolvedValue([]),
}))

// ── embeddingStore 모킹 ──────────────────────────────────────────────────────
vi.mock('./embeddingStore', () => ({
  useEmbeddingStore: {
    getState: () => ({ embeddings: new Map() }),
  },
}))

// ── cosineSimilarity 모킹 ────────────────────────────────────────────────────
vi.mock('../lib/cosineSimilarity', () => ({
  cosine: vi.fn().mockReturnValue(0),
}))

// ── 헬퍼: 스토어 fresh import ─────────────────────────────────────────────────
async function freshStore() {
  const mod = await import('./ragStore')
  return mod.useRagStore
}

// ─────────────────────────────────────────────────────────────────────────────
describe('ragStore — 설정 영속화 (AC-032)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    // 기본적으로 storage.get은 null 반환 (설정 없음)
    mockStorageGet.mockResolvedValue({ value: null })
    mockStorageSet.mockResolvedValue(undefined)
  })

  // 테스트 1: loadSettings — 저장된 설정이 있으면 상태를 복원한다
  it('loadSettings(): 저장된 rag-settings가 있으면 enabled, similarityThreshold를 복원한다 (AC-032)', async () => {
    const stored = JSON.stringify({ enabled: false, similarityThreshold: 0.80 })
    mockStorageGet.mockResolvedValue({ value: stored })

    const store = await freshStore()
    await store.getState().loadSettings()
    const state = store.getState()

    expect(state.enabled).toBe(false)
    expect(state.similarityThreshold).toBe(0.80)
  })

  // 테스트 2: loadSettings — 저장된 설정이 없으면 기본값 유지
  it('loadSettings(): 저장된 설정이 없으면 기본값(enabled=true, threshold=0.70)을 유지한다', async () => {
    mockStorageGet.mockResolvedValue({ value: null })

    const store = await freshStore()
    await store.getState().loadSettings()
    const state = store.getState()

    expect(state.enabled).toBe(true)
    expect(state.similarityThreshold).toBe(0.70)
  })

  // 테스트 3: setEnabled — storage.set을 'rag-settings' 키로 호출한다
  it('setEnabled(false) 호출 시 storage.set("rag-settings", ...) 를 호출한다', async () => {
    mockStorageGet.mockResolvedValue({ value: null })

    const store = await freshStore()
    // loaded 상태 만들기 위해 loadSettings 먼저 호출
    await store.getState().loadSettings()

    store.getState().setEnabled(false)

    expect(mockStorageSet).toHaveBeenCalledWith(
      'rag-settings',
      expect.stringContaining('"enabled":false'),
    )
  })

  // 테스트 4: setThreshold — storage.set을 'rag-settings' 키로 호출한다
  it('setThreshold(0.85) 호출 시 storage.set("rag-settings", ...) 를 호출한다', async () => {
    mockStorageGet.mockResolvedValue({ value: null })

    const store = await freshStore()
    await store.getState().loadSettings()

    store.getState().setThreshold(0.85)

    expect(mockStorageSet).toHaveBeenCalledWith(
      'rag-settings',
      expect.stringContaining('"similarityThreshold":0.85'),
    )
  })

  // 테스트 5: loadSettings — JSON 파싱 실패 시 기본값 유지 (graceful fallback)
  it('loadSettings(): JSON 파싱 실패 시 기본값을 유지한다', async () => {
    mockStorageGet.mockResolvedValue({ value: 'invalid-json{{{' })

    const store = await freshStore()
    await store.getState().loadSettings()
    const state = store.getState()

    expect(state.enabled).toBe(true)
    expect(state.similarityThreshold).toBe(0.70)
  })

  // 테스트 6: setEnabled 호출 시 enabled 상태가 변경된다 (기존 동작 보호)
  it('setEnabled(true) 이후 setEnabled(false) 호출 시 enabled=false로 변경된다', async () => {
    mockStorageGet.mockResolvedValue({ value: null })

    const store = await freshStore()
    await store.getState().loadSettings()

    store.getState().setEnabled(true)
    expect(store.getState().enabled).toBe(true)

    store.getState().setEnabled(false)
    expect(store.getState().enabled).toBe(false)
  })
})
