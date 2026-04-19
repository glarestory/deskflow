// @MX:SPEC: SPEC-SEARCH-RAG-001
// ragStore 단위 테스트 — TDD RED-GREEN-REFACTOR (Phase 4)
// AC-001~AC-003, AC-019~AC-029, REQ-010~REQ-013, REQ-016, REQ-017

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── ollamaClient 모킹 ─────────────────────────────────────────────────────
const mockCheckHealth = vi.fn()
const mockListModels = vi.fn()
const mockEmbed = vi.fn()

vi.mock('../lib/ollamaClient', () => ({
  checkHealth: (...args: unknown[]) => mockCheckHealth(...args),
  listModels: (...args: unknown[]) => mockListModels(...args),
  embed: (...args: unknown[]) => mockEmbed(...args),
}))

// ── embeddingStore 모킹 ────────────────────────────────────────────────────
const mockGetEmbeddingState = vi.fn()

vi.mock('./embeddingStore', () => ({
  useEmbeddingStore: {
    getState: (...args: unknown[]) => mockGetEmbeddingState(...args),
  },
}))

// ── cosineSimilarity 모킹 ─────────────────────────────────────────────────
const mockCosine = vi.fn()

vi.mock('../lib/cosineSimilarity', () => ({
  cosine: (...args: unknown[]) => mockCosine(...args),
}))

// ── 헬퍼: 스토어 fresh import ──────────────────────────────────────────────
async function freshStore() {
  const mod = await import('./ragStore')
  return mod.useRagStore
}

// ─────────────────────────────────────────────────────────────────────────────
describe('ragStore — 초기 상태', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    mockGetEmbeddingState.mockReturnValue({ embeddings: new Map() })
  })

  // 테스트 1: 초기 상태
  it('초기 상태: ollamaAvailable=false, modelMissing=false, lastHealthCheck=null, enabled=true, similarityThreshold=0.70', async () => {
    const store = await freshStore()
    const state = store.getState()

    expect(state.ollamaAvailable).toBe(false)
    expect(state.modelMissing).toBe(false)
    expect(state.lastHealthCheck).toBeNull()
    expect(state.enabled).toBe(true)
    expect(state.similarityThreshold).toBe(0.70)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('ragStore — checkHealth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    mockGetEmbeddingState.mockReturnValue({ embeddings: new Map() })
  })

  // 테스트 2: Ollama 오프라인 시 ollamaAvailable=false
  it('Ollama 서버가 응답하지 않으면 ollamaAvailable=false, lastHealthCheck가 설정된다 (AC-002)', async () => {
    mockCheckHealth.mockResolvedValue(false)

    const store = await freshStore()
    await store.getState().checkHealth()
    const state = store.getState()

    expect(state.ollamaAvailable).toBe(false)
    expect(state.lastHealthCheck).not.toBeNull()
    expect(typeof state.lastHealthCheck).toBe('string')
    // ISO-8601 형식 확인
    expect(() => new Date(state.lastHealthCheck!).toISOString()).not.toThrow()
  })

  // 테스트 3: Ollama 온라인 + 모델 존재 시 ollamaAvailable=true, modelMissing=false
  it('Ollama 온라인 + nomic-embed-text 모델 있으면 ollamaAvailable=true, modelMissing=false (AC-001, AC-003)', async () => {
    mockCheckHealth.mockResolvedValue(true)
    mockListModels.mockResolvedValue(['nomic-embed-text', 'llama2'])

    const store = await freshStore()
    await store.getState().checkHealth()
    const state = store.getState()

    expect(state.ollamaAvailable).toBe(true)
    expect(state.modelMissing).toBe(false)
    expect(state.lastHealthCheck).not.toBeNull()
  })

  // 테스트 4: Ollama 온라인 + 모델 없음 시 modelMissing=true
  it('Ollama 온라인이지만 nomic-embed-text 모델 없으면 modelMissing=true (AC-003)', async () => {
    mockCheckHealth.mockResolvedValue(true)
    mockListModels.mockResolvedValue(['llama2', 'mistral'])

    const store = await freshStore()
    await store.getState().checkHealth()
    const state = store.getState()

    expect(state.ollamaAvailable).toBe(true)
    expect(state.modelMissing).toBe(true)
  })

  // 테스트 5: 모델 이름에 태그(:latest)가 붙어도 매칭
  it('nomic-embed-text:latest 태그가 붙은 모델명도 매칭된다 (modelMissing=false)', async () => {
    mockCheckHealth.mockResolvedValue(true)
    mockListModels.mockResolvedValue(['nomic-embed-text:latest', 'llama2'])

    const store = await freshStore()
    await store.getState().checkHealth()
    const state = store.getState()

    expect(state.ollamaAvailable).toBe(true)
    expect(state.modelMissing).toBe(false)
  })

  // 추가: listModels throws 시 modelMissing=true로 처리
  it('listModels가 에러를 던지면 modelMissing=true로 처리된다', async () => {
    mockCheckHealth.mockResolvedValue(true)
    mockListModels.mockRejectedValue(new Error('network error'))

    const store = await freshStore()
    await store.getState().checkHealth()
    const state = store.getState()

    expect(state.ollamaAvailable).toBe(true)
    expect(state.modelMissing).toBe(true)
    expect(state.lastHealthCheck).not.toBeNull()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('ragStore — 설정 액션', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    mockGetEmbeddingState.mockReturnValue({ embeddings: new Map() })
  })

  // 테스트 6: setEnabled(false)
  it('setEnabled(false) 호출 시 enabled=false로 변경된다 (REQ-016)', async () => {
    const store = await freshStore()
    store.getState().setEnabled(false)
    expect(store.getState().enabled).toBe(false)
  })

  // 테스트 7: setThreshold 정상 범위
  it('setThreshold(0.85) 호출 시 similarityThreshold=0.85로 변경된다 (REQ-017)', async () => {
    const store = await freshStore()
    store.getState().setThreshold(0.85)
    expect(store.getState().similarityThreshold).toBe(0.85)
  })

  // 테스트 8: setThreshold 하한 클램핑 (0.50 미만 → 0.50)
  it('setThreshold(0.3)은 최솟값 0.50으로 클램핑된다 (REQ-017)', async () => {
    const store = await freshStore()
    store.getState().setThreshold(0.3)
    expect(store.getState().similarityThreshold).toBe(0.50)
  })

  // 테스트 9: setThreshold 상한 클램핑 (0.90 초과 → 0.90)
  it('setThreshold(1.5)는 최댓값 0.90으로 클램핑된다 (REQ-017)', async () => {
    const store = await freshStore()
    store.getState().setThreshold(1.5)
    expect(store.getState().similarityThreshold).toBe(0.90)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('ragStore — search 얼리 리턴', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    mockGetEmbeddingState.mockReturnValue({ embeddings: new Map() })
  })

  // 테스트 10: 빈 쿼리 → []
  it('빈 쿼리는 빈 배열을 반환한다 (AC-019)', async () => {
    vi.useFakeTimers()
    const store = await freshStore()
    const resultPromise = store.getState().search('')
    await vi.advanceTimersByTimeAsync(500)
    const result = await resultPromise
    expect(result).toEqual([])
    vi.useRealTimers()
  })

  // 테스트 11: 3자 쿼리 → []
  it('3자 미만 쿼리는 빈 배열을 반환한다 (AC-019)', async () => {
    vi.useFakeTimers()
    const store = await freshStore()
    const resultPromise = store.getState().search('abc')
    await vi.advanceTimersByTimeAsync(500)
    const result = await resultPromise
    expect(result).toEqual([])
    vi.useRealTimers()
  })

  // 테스트 12: enabled=false → []
  it('enabled=false이면 빈 배열을 반환한다 (AC-029)', async () => {
    vi.useFakeTimers()
    const store = await freshStore()
    store.getState().setEnabled(false)
    const resultPromise = store.getState().search('long query')
    await vi.advanceTimersByTimeAsync(500)
    const result = await resultPromise
    expect(result).toEqual([])
    vi.useRealTimers()
  })

  // 테스트 13: ollamaAvailable=false → []
  it('ollamaAvailable=false이면 빈 배열을 반환한다 (AC-026)', async () => {
    vi.useFakeTimers()
    const store = await freshStore()
    // ollamaAvailable은 기본 false
    const resultPromise = store.getState().search('long query here')
    await vi.advanceTimersByTimeAsync(500)
    const result = await resultPromise
    expect(result).toEqual([])
    vi.useRealTimers()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('ragStore — search 정상 경로', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  // 테스트 14: 정상 검색 — threshold 이상만, 점수 DESC, ≤10개
  it('정상 검색: 유사도 threshold 이상만 반환, 점수 DESC 정렬, 최대 10개 (AC-021, AC-022)', async () => {
    vi.useFakeTimers()

    // 임베딩 Map 준비
    const embeddings = new Map()
    embeddings.set('link-1', { linkId: 'link-1', categoryId: 'cat-1', embedding: [1, 0, 0] })
    embeddings.set('link-2', { linkId: 'link-2', categoryId: 'cat-1', embedding: [0, 1, 0] })
    embeddings.set('link-3', { linkId: 'link-3', categoryId: 'cat-2', embedding: [0.9, 0.1, 0] })
    // 12개 임베딩 추가해 최대 10개 제한 테스트
    for (let i = 4; i <= 15; i++) {
      embeddings.set(`link-${i}`, { linkId: `link-${i}`, categoryId: 'cat-1', embedding: [0.8, 0, 0] })
    }

    mockGetEmbeddingState.mockReturnValue({ embeddings })
    mockEmbed.mockResolvedValue([1, 0, 0])

    // cosine 모킹: link-1 → 1.0, link-2 → 0.0, link-3 → 0.95, link-4~15 → 0.75
    mockCosine.mockImplementation((_a: number[], b: number[]) => {
      if (b[0] === 1 && b[1] === 0 && b[2] === 0) return 1.0   // link-1
      if (b[0] === 0 && b[1] === 1) return 0.0                  // link-2 (임계값 미만)
      if (b[0] === 0.9) return 0.95                             // link-3
      return 0.75                                                // link-4~15
    })

    const store = await freshStore()
    // ollamaAvailable = true, modelMissing = false 설정
    mockCheckHealth.mockResolvedValue(true)
    mockListModels.mockResolvedValue(['nomic-embed-text'])
    await store.getState().checkHealth()

    const resultPromise = store.getState().search('query text')
    await vi.advanceTimersByTimeAsync(400)
    const results = await resultPromise

    // threshold 0.70 이상 → link-2 제외
    expect(results.find((r) => r.linkId === 'link-2')).toBeUndefined()
    // 점수 DESC 정렬
    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score)
    }
    // 최대 10개
    expect(results.length).toBeLessThanOrEqual(10)
    // 결과 구조 확인
    expect(results[0]).toMatchObject({ linkId: expect.any(String), categoryId: expect.any(String), score: expect.any(Number) })

    vi.useRealTimers()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('ragStore — search 디바운스 & 에러 처리', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  // 테스트 15: 디바운스 — 빠른 연속 호출 시 이전 호출은 [] 반환
  it('디바운스: 연속 두 번 호출 시 이전 호출은 빈 배열, 마지막 호출만 결과를 반환한다 (AC-020, REQ-010)', async () => {
    vi.useFakeTimers()

    const embeddings = new Map()
    embeddings.set('link-a', { linkId: 'link-a', categoryId: 'cat-1', embedding: [1, 0] })
    mockGetEmbeddingState.mockReturnValue({ embeddings })
    mockEmbed.mockResolvedValue([1, 0])
    mockCosine.mockReturnValue(0.9)

    const store = await freshStore()
    mockCheckHealth.mockResolvedValue(true)
    mockListModels.mockResolvedValue(['nomic-embed-text'])
    await store.getState().checkHealth()

    // 첫 번째 호출
    const result1Promise = store.getState().search('first query')
    // 100ms 후 두 번째 호출 (아직 300ms 디바운스 전)
    await vi.advanceTimersByTimeAsync(100)
    const result2Promise = store.getState().search('second query')

    // 300ms 이상 진행해 두 번째 디바운스 완료
    await vi.advanceTimersByTimeAsync(400)

    const result1 = await result1Promise
    const result2 = await result2Promise

    // 첫 번째는 superseded → []
    expect(result1).toEqual([])
    // 두 번째는 실제 결과
    expect(result2.length).toBeGreaterThan(0)

    vi.useRealTimers()
  })

  // 테스트 16: embed 에러 시 [] 반환 (no throw)
  it('embed가 에러를 던지면 빈 배열을 반환하고 throw하지 않는다', async () => {
    vi.useFakeTimers()

    const embeddings = new Map()
    embeddings.set('link-a', { linkId: 'link-a', categoryId: 'cat-1', embedding: [1, 0] })
    mockGetEmbeddingState.mockReturnValue({ embeddings })
    mockEmbed.mockRejectedValue(new Error('ollama timeout'))

    const store = await freshStore()
    mockCheckHealth.mockResolvedValue(true)
    mockListModels.mockResolvedValue(['nomic-embed-text'])
    await store.getState().checkHealth()

    const resultPromise = store.getState().search('query text')
    await vi.advanceTimersByTimeAsync(400)

    await expect(resultPromise).resolves.toEqual([])

    vi.useRealTimers()
  })

  // 테스트 17: 차원 불일치 임베딩은 건너뜀 (no crash)
  it('저장된 임베딩과 쿼리 임베딩의 차원이 다르면 해당 항목을 건너뛴다 (EC-005)', async () => {
    vi.useFakeTimers()

    const embeddings = new Map()
    // 차원 불일치 — 쿼리는 [1,0,0] (3차원), 이 임베딩은 [0.5, 0.5] (2차원)
    embeddings.set('link-mismatch', { linkId: 'link-mismatch', categoryId: 'cat-1', embedding: [0.5, 0.5] })
    // 정상 임베딩
    embeddings.set('link-ok', { linkId: 'link-ok', categoryId: 'cat-1', embedding: [1, 0, 0] })
    mockGetEmbeddingState.mockReturnValue({ embeddings })
    mockEmbed.mockResolvedValue([1, 0, 0])

    // 차원 불일치 시 cosine은 에러를 throw → ragStore가 catch하고 건너뜀
    mockCosine.mockImplementation((_a: number[], b: number[]) => {
      if (b.length !== 3) throw new Error('벡터 길이 불일치')
      return 0.95
    })

    const store = await freshStore()
    mockCheckHealth.mockResolvedValue(true)
    mockListModels.mockResolvedValue(['nomic-embed-text'])
    await store.getState().checkHealth()

    const resultPromise = store.getState().search('query text here')
    await vi.advanceTimersByTimeAsync(400)
    const results = await resultPromise

    // link-mismatch 건너뜀 → 결과 없거나 link-ok만
    expect(results.find((r) => r.linkId === 'link-mismatch')).toBeUndefined()
    // link-ok는 포함될 수 있음 (threshold 0.70 이상)
    expect(results.find((r) => r.linkId === 'link-ok')).toBeDefined()

    vi.useRealTimers()
  })
})
