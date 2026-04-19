// @MX:ANCHOR: [AUTO] embeddingStore — 북마크 벡터 저장/큐 관리 중심
// @MX:REASON: [AUTO] bookmarkStore, ragStore, App.tsx, migration 의존 (fan_in >= 3)
// @MX:SPEC: SPEC-SEARCH-RAG-001

import { create } from 'zustand'
import type { BookmarkEmbedding } from '../types/embedding'
import { storage } from '../lib/storage'
import { firestoreEmbeddingStorage } from '../lib/firestoreEmbeddingStorage'
import { useAuthStore } from './authStore'

// 로컬 스토리지 키 (미인증 상태)
const RAG_EMBEDDINGS_KEY = 'rag-embeddings'

// ── 인터페이스 ──────────────────────────────────────────────────────────────

export interface EmbeddingState {
  // ── 상태 ──────────────────────────────────────────────────────────────
  /** linkId → BookmarkEmbedding 매핑 */
  embeddings: Map<string, BookmarkEmbedding>
  /** storage 로드 완료 여부 */
  loaded: boolean

  // ── Phase 3 플레이스홀더 (스텁 — 로직 미구현) ──────────────────────
  /** 인덱싱 대기 linkId 큐 */
  indexingQueue: string[]
  /** 배치 인덱싱 진행 중 여부 */
  indexingInProgress: boolean
  /** 마지막 배치 진행률 */
  lastBatchProgress: { done: number; total: number } | null

  // ── Phase 2 액션 ──────────────────────────────────────────────────────
  loadEmbeddings: () => Promise<void>
  upsertEmbedding: (e: BookmarkEmbedding) => Promise<void>
  removeEmbedding: (linkId: string) => Promise<void>
  clearAll: () => Promise<void>

  // ── Phase 3 스텁 (no-op + console.warn) ────────────────────────────
  enqueueIndex: (linkIds: string[]) => void
  runIndexBatch: () => Promise<void>
}

// ── 내부 헬퍼: 인증 상태 확인 ───────────────────────────────────────────────

const getUid = (): string | null => useAuthStore.getState().user?.uid ?? null

// ── 내부 헬퍼: 저장 (loaded 가드 포함) ─────────────────────────────────────

const persistOne = async (e: BookmarkEmbedding, embeddings: Map<string, BookmarkEmbedding>, loaded: boolean): Promise<void> => {
  if (!loaded) return
  const uid = getUid()
  if (uid !== null) {
    await firestoreEmbeddingStorage.upsert(uid, e)
  } else {
    const arr = Array.from(embeddings.values())
    await storage.set(RAG_EMBEDDINGS_KEY, JSON.stringify(arr))
  }
}

const deleteOne = async (linkId: string, embeddings: Map<string, BookmarkEmbedding>, loaded: boolean): Promise<void> => {
  if (!loaded) return
  const uid = getUid()
  if (uid !== null) {
    await firestoreEmbeddingStorage.remove(uid, linkId)
  } else {
    const arr = Array.from(embeddings.values())
    await storage.set(RAG_EMBEDDINGS_KEY, JSON.stringify(arr))
  }
}

const loadAll = async (): Promise<BookmarkEmbedding[]> => {
  const uid = getUid()
  if (uid !== null) {
    return firestoreEmbeddingStorage.getAll(uid)
  }
  const result = await storage.get(RAG_EMBEDDINGS_KEY)
  if (result.value === null) return []
  try {
    return JSON.parse(result.value) as BookmarkEmbedding[]
  } catch {
    // JSON 파싱 실패 시 graceful fallback
    console.warn('[embeddingStore] rag-embeddings 파싱 실패, 빈 배열로 초기화')
    return []
  }
}

// ── 스토어 ──────────────────────────────────────────────────────────────────

export const useEmbeddingStore = create<EmbeddingState>((set, get) => ({
  embeddings: new Map(),
  loaded: false,
  indexingQueue: [],
  indexingInProgress: false,
  lastBatchProgress: null,

  // ── AC-015/AC-016/AC-017: 임베딩 복원 ──────────────────────────────
  loadEmbeddings: async (): Promise<void> => {
    try {
      const list = await loadAll()
      const embeddings = new Map(list.map((e) => [e.linkId, e]))
      set({ embeddings, loaded: true })
    } catch {
      // 로드 실패 시 빈 상태로 복구
      set({ embeddings: new Map(), loaded: true })
    }
  },

  // ── AC-015/AC-016: 임베딩 생성/갱신 ────────────────────────────────
  upsertEmbedding: async (e: BookmarkEmbedding): Promise<void> => {
    const { loaded } = get()
    set((state) => {
      const next = new Map(state.embeddings)
      next.set(e.linkId, e)
      return { embeddings: next }
    })
    const next = get().embeddings
    await persistOne(e, next, loaded)
  },

  // ── AC-009: 임베딩 삭제 ─────────────────────────────────────────────
  removeEmbedding: async (linkId: string): Promise<void> => {
    const { loaded } = get()
    set((state) => {
      const next = new Map(state.embeddings)
      next.delete(linkId)
      return { embeddings: next }
    })
    const next = get().embeddings
    await deleteOne(linkId, next, loaded)
  },

  // ── clearAll: 전체 삭제 ─────────────────────────────────────────────
  clearAll: async (): Promise<void> => {
    set({ embeddings: new Map() })
    const uid = getUid()
    if (uid !== null) {
      await firestoreEmbeddingStorage.removeAll(uid)
    } else {
      await storage.set(RAG_EMBEDDINGS_KEY, '[]')
    }
  },

  // ── Phase 3 스텁 ────────────────────────────────────────────────────
  enqueueIndex: (linkIds: string[]): void => {
    console.warn('[embeddingStore] enqueueIndex: Phase 3에서 구현 예정', linkIds)
  },

  runIndexBatch: async (): Promise<void> => {
    console.warn('[embeddingStore] runIndexBatch: Phase 3에서 구현 예정')
  },
}))
