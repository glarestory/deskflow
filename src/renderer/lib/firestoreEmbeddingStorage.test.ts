// @MX:SPEC: SPEC-SEARCH-RAG-001
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { BookmarkEmbedding } from '../types/embedding'

// firebase/firestore 모킹 (firestoreStorage.test.ts 패턴 참조)
const mockQuerySnap = {
  docs: [] as Array<{ data: () => BookmarkEmbedding }>,
}

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(() => 'mock-collection-ref'),
  doc: vi.fn(() => 'mock-doc-ref'),
  getDocs: vi.fn(() => Promise.resolve(mockQuerySnap)),
  setDoc: vi.fn(() => Promise.resolve()),
  deleteDoc: vi.fn(() => Promise.resolve()),
}))

vi.mock('./firebase', () => ({
  db: {},
}))

import { firestoreEmbeddingStorage } from './firestoreEmbeddingStorage'

const makeEmbedding = (linkId: string): BookmarkEmbedding => ({
  linkId,
  categoryId: 'cat-1',
  contentHash: 'abc123',
  embedding: [0.1, 0.2, 0.3],
  dimension: 3,
  model: 'nomic-embed-text',
  embeddedAt: '2026-04-19T00:00:00.000Z',
})

describe('firestoreEmbeddingStorage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockQuerySnap.docs = []
  })

  // 테스트 1: getAll — 3개 문서 반환
  it('getAll: 컬렉션 docs를 배열로 반환한다 (3개)', async () => {
    const e1 = makeEmbedding('link-1')
    const e2 = makeEmbedding('link-2')
    const e3 = makeEmbedding('link-3')
    mockQuerySnap.docs = [
      { data: () => e1 },
      { data: () => e2 },
      { data: () => e3 },
    ]

    const result = await firestoreEmbeddingStorage.getAll('user-123')

    expect(result).toHaveLength(3)
    expect(result[0].linkId).toBe('link-1')
    expect(result[1].linkId).toBe('link-2')
    expect(result[2].linkId).toBe('link-3')
  })

  // 테스트 2: getAll — 빈 컬렉션
  it('getAll: 빈 컬렉션이면 빈 배열을 반환한다', async () => {
    mockQuerySnap.docs = []

    const result = await firestoreEmbeddingStorage.getAll('user-123')

    expect(result).toEqual([])
  })

  // 테스트 3: upsert — setDoc 호출 경로 확인
  it('upsert: 올바른 경로로 setDoc을 호출한다', async () => {
    const { setDoc, doc } = await import('firebase/firestore')
    const e = makeEmbedding('link-99')

    await firestoreEmbeddingStorage.upsert('user-123', e)

    expect(doc).toHaveBeenCalledWith({}, 'users', 'user-123', 'embeddings', 'link-99')
    expect(setDoc).toHaveBeenCalledWith('mock-doc-ref', e)
  })

  // 테스트 4: remove — deleteDoc 호출 경로 확인
  it('remove: 올바른 경로로 deleteDoc을 호출한다', async () => {
    const { deleteDoc, doc } = await import('firebase/firestore')

    await firestoreEmbeddingStorage.remove('user-123', 'link-42')

    expect(doc).toHaveBeenCalledWith({}, 'users', 'user-123', 'embeddings', 'link-42')
    expect(deleteDoc).toHaveBeenCalledWith('mock-doc-ref')
  })

  // 테스트 5: removeAll — 컬렉션 내 모든 docs를 deleteDoc으로 삭제
  it('removeAll: 컬렉션 내 N개 문서를 각각 deleteDoc으로 삭제한다', async () => {
    const e1 = makeEmbedding('link-1')
    const e2 = makeEmbedding('link-2')
    mockQuerySnap.docs = [{ data: () => e1 }, { data: () => e2 }]

    const { deleteDoc } = await import('firebase/firestore')

    await firestoreEmbeddingStorage.removeAll('user-123')

    // 2개 문서 → deleteDoc 2번 호출
    expect(deleteDoc).toHaveBeenCalledTimes(2)
  })
})
