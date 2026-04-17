// @MX:ANCHOR: [AUTO] usageStore — 사용 빈도/최근 사용 기록 및 점수 계산 스토어
// @MX:REASON: [AUTO] CommandPalette의 추천 ranking 기능이 의존하는 공개 API
// @MX:SPEC: SPEC-UX-002
import { create } from 'zustand'

/** 사용 기록 항목 타입 */
export type EntryType = 'bookmark' | 'category' | 'tag' | 'action'

/** 사용 기록 항목 */
export interface UsageEntry {
  type: EntryType
  id: string
  /** 최근 사용 시각 (밀리초), 최대 50개 슬라이딩 윈도우 */
  timestamps: number[]
}

export interface UsageState {
  /** key 형식: "type:id" */
  entries: Map<string, UsageEntry>
  /**
   * 항목 사용 기록 추가.
   * - 슬라이딩 윈도우: 항목당 최대 50개 timestamp
   * - 전체 entries 최대 200개
   */
  recordUsage: (type: EntryType, id: string) => void
  /**
   * 사용 점수 반환.
   * score = Σ exp(-Δt / τ) (τ = 7일)
   * Δt = 현재 시각 - 사용 시각 (밀리초)
   */
  getScore: (type: EntryType, id: string) => number
}

// τ = 7일 (밀리초)
const TAU_MS = 7 * 24 * 60 * 60 * 1000
// 항목당 최대 timestamp 수
const MAX_TIMESTAMPS = 50
// 전체 entries 최대 수
const MAX_ENTRIES = 200

/** key 생성 헬퍼 */
function makeKey(type: EntryType, id: string): string {
  return `${type}:${id}`
}

/**
 * localStorage에 usage 데이터를 persist.
 * Map은 JSON으로 직렬화 불가이므로 배열로 변환.
 */
const STORAGE_KEY = 'deskflow-usage-store'

function loadFromStorage(): Map<string, UsageEntry> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return new Map()
    const entries = JSON.parse(raw) as [string, UsageEntry][]
    return new Map(entries)
  } catch {
    // EDGE-002: 손상된 데이터 처리 — 빈 상태로 초기화
    console.error('[usageStore] usage 데이터 로드 실패, 빈 상태로 초기화')
    return new Map()
  }
}

function saveToStorage(entries: Map<string, UsageEntry>): void {
  try {
    const serializable = Array.from(entries.entries())
    localStorage.setItem(STORAGE_KEY, JSON.stringify(serializable))
  } catch {
    console.error('[usageStore] usage 데이터 저장 실패')
  }
}

export const useUsageStore = create<UsageState>((set, get) => ({
  entries: loadFromStorage(),

  recordUsage: (type: EntryType, id: string) => {
    const now = Date.now()
    const key = makeKey(type, id)
    const currentEntries = get().entries
    const newEntries = new Map(currentEntries)

    const existing = newEntries.get(key)
    if (existing !== undefined) {
      // 기존 항목에 timestamp 추가 (최대 50개 슬라이딩 윈도우)
      const timestamps = [...existing.timestamps, now].slice(-MAX_TIMESTAMPS)
      newEntries.set(key, { ...existing, timestamps })
    } else {
      // 신규 항목 생성
      // entries 최대 200개 제한 — 가장 오래된 항목(마지막 사용이 가장 오래된 것) 제거
      if (newEntries.size >= MAX_ENTRIES) {
        // 가장 오래된 항목 찾기 (마지막 timestamp가 가장 오래된 것)
        let oldestKey = ''
        let oldestTime = Infinity
        for (const [k, entry] of newEntries) {
          const lastUsed = entry.timestamps.at(-1) ?? 0
          if (lastUsed < oldestTime) {
            oldestTime = lastUsed
            oldestKey = k
          }
        }
        if (oldestKey) newEntries.delete(oldestKey)
      }
      newEntries.set(key, { type, id, timestamps: [now] })
    }

    set({ entries: newEntries })
    saveToStorage(newEntries)
  },

  getScore: (type: EntryType, id: string): number => {
    const key = makeKey(type, id)
    const entry = get().entries.get(key)
    if (entry === undefined || entry.timestamps.length === 0) return 0

    const now = Date.now()
    // 각 timestamp에 대해 지수 감쇠 계산 후 합산
    // score = Σ exp(-Δt / τ)
    let score = 0
    for (const ts of entry.timestamps) {
      const deltaMs = now - ts
      score += Math.exp(-deltaMs / TAU_MS)
    }
    return score
  },
}))
