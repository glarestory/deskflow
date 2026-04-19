// @MX:ANCHOR: [AUTO] embeddingStore — 북마크 벡터 저장/큐 관리 중심
// @MX:REASON: [AUTO] bookmarkStore, ragStore, App.tsx, migration 의존 (fan_in >= 3)
// @MX:SPEC: SPEC-SEARCH-RAG-001

import { create } from 'zustand'
import type { BookmarkEmbedding } from '../types/embedding'
import type { Link } from '../types'
import { storage } from '../lib/storage'
import { firestoreEmbeddingStorage } from '../lib/firestoreEmbeddingStorage'
import { useAuthStore } from './authStore'
import { embed } from '../lib/ollamaClient'
import { sha256 } from '../lib/contentHash'
import { useBookmarkStore } from './bookmarkStore'

// 로컬 스토리지 키 (미인증 상태)
const RAG_EMBEDDINGS_KEY = 'rag-embeddings'

// 배치당 처리 최대 linkId 수 (AC-010)
const BATCH_SIZE = 10

// ── 인터페이스 ──────────────────────────────────────────────────────────────

export interface EmbeddingState {
  // ── 상태 ──────────────────────────────────────────────────────────────
  /** linkId → BookmarkEmbedding 매핑 */
  embeddings: Map<string, BookmarkEmbedding>
  /** storage 로드 완료 여부 */
  loaded: boolean

  // ── Phase 3 ────────────────────────────────────────────────────────
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

  // ── Phase 3 액션 ────────────────────────────────────────────────────
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

// ── 내부 헬퍼: 링크를 소스 텍스트로 변환 (DEC-003) ─────────────────────────

/**
 * 북마크 Link를 임베딩 소스 텍스트로 변환한다.
 *
 * 포맷 (SPEC DEC-003):
 *   {name}
 *   URL: {url}
 *   태그: {tags.join(', ')}
 *   설명: {description ?? ''}
 */
export function buildSourceText(link: Link & { description?: string }): string {
  const tags = (link.tags ?? []).join(', ')
  const description = link.description ?? ''
  return `${link.name}\nURL: ${link.url}\n태그: ${tags}\n설명: ${description}`
}

// ── 내부 헬퍼: 북마크 스토어에서 링크 찾기 ────────────────────────────────

function findLinkById(linkId: string): (Link & { categoryId: string; description?: string }) | null {
  const { bookmarks } = useBookmarkStore.getState()
  for (const category of bookmarks) {
    for (const link of category.links) {
      if (link.id === linkId) {
        return { ...link, categoryId: category.id }
      }
    }
  }
  return null
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

  // ── Phase 3: enqueueIndex ────────────────────────────────────────────
  // @MX:NOTE: [AUTO] SPEC-SEARCH-RAG-001 REQ-004,006,007 — 인덱싱 큐 추가
  enqueueIndex: (linkIds: string[]): void => {
    const { indexingQueue, embeddings } = get()
    const queueSet = new Set(indexingQueue)
    const embeddingSet = new Set(embeddings.keys())

    // 큐와 임베딩 Map 중복 제거
    const newIds = linkIds.filter((id) => !queueSet.has(id) && !embeddingSet.has(id))
    if (newIds.length === 0) return

    set((state) => ({
      indexingQueue: [...state.indexingQueue, ...newIds],
    }))
  },

  // ── Phase 3: runIndexBatch ───────────────────────────────────────────
  // @MX:WARN: [AUTO] 동시성 가드 필요 — runIndexBatch 재진입 시 큐 double-process 방지
  // @MX:REASON: [AUTO] Promise.allSettled 중 외부에서 enqueueIndex 호출 가능
  runIndexBatch: async (): Promise<void> => {
    const { indexingInProgress, indexingQueue } = get()

    // 동시성 가드: 이미 진행 중이면 즉시 리턴
    if (indexingInProgress) return

    // 빈 큐 NO-OP
    if (indexingQueue.length === 0) return

    // 원자적으로 배치 추출 (최대 BATCH_SIZE개)
    const batch = indexingQueue.slice(0, BATCH_SIZE)
    const remaining = indexingQueue.slice(BATCH_SIZE)

    set({
      indexingInProgress: true,
      indexingQueue: remaining,
    })

    const total = batch.length
    let done = 0
    const failedIds: string[] = []

    try {
      // 각 linkId에 대해 embed 작업 준비
      const tasks = batch.map(async (linkId) => {
        const link = findLinkById(linkId)
        if (link === null) {
          // 링크가 존재하지 않으면 실패 처리
          throw new Error(`[embeddingStore] 링크를 찾을 수 없음: ${linkId}`)
        }

        const sourceText = buildSourceText(link)
        const contentHash = await sha256(sourceText)

        // AC-008: contentHash 동일하면 스킵
        const existing = get().embeddings.get(linkId)
        if (existing !== undefined && existing.contentHash === contentHash) {
          return { linkId, skipped: true as const }
        }

        const embeddingVector = await embed(sourceText)
        return {
          linkId,
          skipped: false as const,
          embedding: {
            linkId,
            categoryId: link.categoryId,
            contentHash,
            embedding: embeddingVector,
            dimension: embeddingVector.length,
            model: 'nomic-embed-text',
            embeddedAt: new Date().toISOString(),
          } satisfies BookmarkEmbedding,
        }
      })

      // Promise.allSettled로 부분 실패 허용 (AC-010, AC-011)
      const results = await Promise.allSettled(tasks)

      for (let i = 0; i < results.length; i++) {
        const result = results[i]
        const linkId = batch[i]

        if (result.status === 'fulfilled') {
          const value = result.value
          if (!value.skipped) {
            // 임베딩 저장
            await get().upsertEmbedding(value.embedding)
          }
          done++
        } else {
          // 실패한 linkId는 큐 맨 뒤에 다시 추가 (다음 배치에서 재시도)
          failedIds.push(linkId)
        }
      }

      // lastBatchProgress 업데이트 (AC-013)
      set((state) => ({
        lastBatchProgress: { done: done, total: total },
        // 실패한 항목은 큐 뒤에 추가
        indexingQueue: [...state.indexingQueue, ...failedIds],
      }))
    } finally {
      set({ indexingInProgress: false })
    }
  },
}))
