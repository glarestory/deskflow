// @MX:ANCHOR: [AUTO] ragStore — RAG 검색 상태 및 health check 진입점
// @MX:REASON: [AUTO] App.tsx, CommandPalette, Settings, searchAll 다수 의존 (fan_in >= 3)
// @MX:SPEC: SPEC-SEARCH-RAG-001

import { create } from 'zustand'
import * as ollamaClient from '../lib/ollamaClient'
import { cosine } from '../lib/cosineSimilarity'
import { useEmbeddingStore } from './embeddingStore'

// ── 인터페이스 ────────────────────────────────────────────────────────────────

/** RAG 검색 결과 단일 항목 */
export interface RagResult {
  linkId: string
  categoryId: string
  score: number  // 0.0 ~ 1.0 코사인 유사도
}

/** ragStore 상태 및 액션 */
export interface RagState {
  // ── 상태 ──────────────────────────────────────────────────────────────
  /** Ollama 서버 연결 가능 여부 */
  ollamaAvailable: boolean
  /** nomic-embed-text 모델 설치 여부 (true = 모델 없음) */
  modelMissing: boolean
  /** 마지막 health check 시각 (ISO-8601) */
  lastHealthCheck: string | null
  /** 설정: RAG 기능 on/off (기본값 true) */
  enabled: boolean
  /** 설정: 유사도 임계값 (기본 0.70, 범위 [0.50, 0.90]) */
  similarityThreshold: number

  // ── 액션 ──────────────────────────────────────────────────────────────
  /** Ollama 서버 및 모델 존재 확인 */
  checkHealth: () => Promise<void>
  /** RAG 기능 활성화/비활성화 */
  setEnabled: (v: boolean) => void
  /** 유사도 임계값 설정 (클램핑: [0.50, 0.90]) */
  setThreshold: (v: number) => void
  /** 쿼리로 시맨틱 검색 수행 */
  search: (query: string) => Promise<RagResult[]>
}

// ── 디바운스 토큰 ──────────────────────────────────────────────────────────────
// @MX:NOTE: [AUTO] 디바운스 + stale 요청 무효화 — SPEC REQ-010
// 모듈 수준 변수로 마지막 search() 호출을 추적
let pendingToken = 0
const DEBOUNCE_MS = 300

// nomic-embed-text 모델 매칭 함수 (태그 포함)
function isNomicModel(name: string): boolean {
  return name === 'nomic-embed-text' || name.startsWith('nomic-embed-text:')
}

// ── 설정 범위 상수 ─────────────────────────────────────────────────────────────
const THRESHOLD_MIN = 0.50
const THRESHOLD_MAX = 0.90
const TOP_K = 10

// ── 스토어 ────────────────────────────────────────────────────────────────────
export const useRagStore = create<RagState>((set, get) => ({
  // 초기 상태
  ollamaAvailable: false,
  modelMissing: false,
  lastHealthCheck: null,
  enabled: true,
  similarityThreshold: 0.70,

  // ── checkHealth ─────────────────────────────────────────────────────────
  // AC-001: Ollama health check + 모델 존재 확인
  checkHealth: async (): Promise<void> => {
    const alive = await ollamaClient.checkHealth()

    if (!alive) {
      set({
        ollamaAvailable: false,
        lastHealthCheck: new Date().toISOString(),
      })
      return
    }

    // AC-002/AC-003: 모델 목록 확인
    let modelMissing = false
    try {
      const models = await ollamaClient.listModels()
      modelMissing = !models.some(isNomicModel)
    } catch {
      // listModels 실패 시 모델 누락으로 처리
      modelMissing = true
    }

    set({
      ollamaAvailable: true,
      modelMissing,
      lastHealthCheck: new Date().toISOString(),
    })
  },

  // ── setEnabled ──────────────────────────────────────────────────────────
  setEnabled: (v: boolean): void => {
    set({ enabled: v })
  },

  // ── setThreshold ────────────────────────────────────────────────────────
  // REQ-017: 범위 [0.50, 0.90] 클램핑
  setThreshold: (v: number): void => {
    const clamped = Math.min(THRESHOLD_MAX, Math.max(THRESHOLD_MIN, v))
    set({ similarityThreshold: clamped })
  },

  // ── search ──────────────────────────────────────────────────────────────
  // REQ-010~REQ-013: 디바운스 300ms + 코사인 유사도 계산 + Top K 반환
  search: async (query: string): Promise<RagResult[]> => {
    const { enabled, ollamaAvailable, modelMissing, similarityThreshold } = get()

    // AC-029: RAG 비활성화
    if (!enabled) return []
    // AC-019: 쿼리 4자 미만
    if (query.trim().length < 4) return []
    // AC-026: Ollama 미연결 또는 모델 없음
    if (!ollamaAvailable || modelMissing) return []

    // 디바운스 토큰 발급
    const myToken = ++pendingToken
    await new Promise<void>((resolve) => setTimeout(resolve, DEBOUNCE_MS))

    // stale 요청 무효화
    if (myToken !== pendingToken) return []

    try {
      const queryVec = await ollamaClient.embed(query)

      // stale 체크 (embed 중 새 요청이 들어온 경우)
      if (myToken !== pendingToken) return []

      const { embeddings } = useEmbeddingStore.getState()
      const results: RagResult[] = []

      for (const [linkId, emb] of embeddings) {
        try {
          const score = cosine(queryVec, emb.embedding)
          if (score >= similarityThreshold) {
            results.push({ linkId, categoryId: emb.categoryId, score })
          }
        } catch {
          // 차원 불일치 등 cosine 오류 → 해당 항목 건너뜀 (EC-005)
          continue
        }
      }

      // 점수 DESC 정렬 후 Top K 반환
      return results
        .sort((a, b) => b.score - a.score)
        .slice(0, TOP_K)
    } catch (err) {
      // embed 실패 등 — 빈 배열 반환 (no throw)
      console.warn('[ragStore] search 실패', err)
      return []
    }
  },
}))
