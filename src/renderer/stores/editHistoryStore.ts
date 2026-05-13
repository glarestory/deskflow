// 편집 히스토리 스토어 — SPEC-UX-010 M1 (REQ-UX-010-001, 002, 019)
// 세션 단위 휘발성 LIFO 히스토리 스택 (영속화 없음)
import { create } from 'zustand'
import type { Bookmark } from '../types'
import type { WidgetLayout } from './layoutStore'

/** 히스토리 스냅샷 타입 분기 */
export type HistorySnapshot =
  | { type: 'bookmarks'; bookmarks: Bookmark[] }
  | { type: 'layout'; layout: WidgetLayout[] }
  | { type: 'composite'; bookmarks: Bookmark[]; layout: WidgetLayout[] }

interface EditHistoryState {
  /** 최근 N개의 직전 상태 스냅샷 (LIFO 스택, 최대 10) */
  past: HistorySnapshot[]
  /** undo 후 재실행 가능한 redo 스택 (LIFO, 최대 10) */
  future: HistorySnapshot[]
  /** 새 변경 발생 시 직전 상태를 past에 push */
  push: (snapshot: HistorySnapshot) => void
  /** past 의 마지막 스냅샷을 꺼내 반환 — future 에 현재 snapshot push */
  undo: () => HistorySnapshot | null
  /** future 의 마지막 스냅샷을 꺼내 반환 — past 에 현재 snapshot push */
  redo: () => HistorySnapshot | null
  /** past/future 모두 비움 (편집 모드 종료 시 호출) */
  clear: () => void
}

// 히스토리 최대 깊이 — REQ-UX-010-002
const MAX_HISTORY_DEPTH = 10

// @MX:ANCHOR: [AUTO] useEditHistoryStore — 편집 히스토리 LIFO 스택 단일 진입점
// @MX:REASON: [AUTO] bookmarkStore, layoutStore, WidgetLayout 등 다수 컴포넌트가 의존
// @MX:SPEC: SPEC-UX-010
export const useEditHistoryStore = create<EditHistoryState>((set, get) => ({
  past: [],
  future: [],

  // REQ-UX-010-003: 새 변경 발생 시 직전 상태를 past에 push
  // 11번째 push 시 가장 오래된 항목 제거 (FIFO 만료)
  push: (snapshot) => {
    const { past } = get()
    const next = [...past, snapshot]
    if (next.length > MAX_HISTORY_DEPTH) next.shift()
    // 새 변경은 redo 가능성 무효화 — future 비움
    set({ past: next, future: [] })
  },

  // undo: past의 마지막 snapshot을 반환하고 future로 이동
  undo: () => {
    const { past, future } = get()
    if (past.length === 0) return null
    const snapshot = past[past.length - 1]
    set({
      past: past.slice(0, -1),
      future: [...future, snapshot],
    })
    return snapshot
  },

  // redo: future의 마지막 snapshot을 반환하고 past로 이동
  redo: () => {
    const { past, future } = get()
    if (future.length === 0) return null
    const snapshot = future[future.length - 1]
    set({
      future: future.slice(0, -1),
      past: [...past, snapshot],
    })
    return snapshot
  },

  // REQ-UX-010-019: 편집 모드 종료 시 past/future 모두 비움
  clear: () => set({ past: [], future: [] }),
}))
