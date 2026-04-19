// @MX:ANCHOR: [AUTO] capsuleStore — Context Capsule 상태 관리 중심 진입점
// @MX:REASON: [AUTO] App.tsx, CapsuleSwitcher, CapsuleEditModal, CapsuleListPanel, bookmarkStore, todoStore 다수 의존 (fan_in >= 3)
// @MX:SPEC: SPEC-CAPSULE-001
import { create } from 'zustand'
import type { Capsule, CapsuleMetrics, PomodoroPreset } from '../types/capsule'
import { storage } from '../lib/storage'
import { useViewModeStore } from './viewModeStore'
import { useViewStore } from './viewStore'
import { usePomodoroStore } from './pomodoroStore'

// 스토리지 키 상수
const CAPSULES_KEY = 'capsules'
const ACTIVE_CAPSULE_ID_KEY = 'active-capsule-id'
const CAPSULE_SETTINGS_KEY = 'capsule-settings'

// DEC-003: bookmarkIds 크기 제한
const BOOKMARK_IDS_WARN_LIMIT = 500
const BOOKMARK_IDS_MAX_LIMIT = 1000

/**
 * UUID-like id 생성기.
 * App.tsx와 동일한 패턴 사용. crypto.randomUUID를 우선 시도한다.
 */
const generateId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID().replace(/-/g, '').slice(0, 7)
  }
  return Math.random().toString(36).slice(2, 9)
}

// 현재 ISO-8601 시각 반환
const now = (): string => new Date().toISOString()

// 기본 메트릭
const defaultMetrics = (): CapsuleMetrics => ({
  focusMinutes: 0,
  completedTodos: 0,
  activationCount: 0,
})

/**
 * capsuleStore 상태 인터페이스.
 * REQ-001, REQ-005: 캡슐 목록 + 활성 캡슐 + 설정 상태
 */
interface CapsuleState {
  capsules: Capsule[]
  activeCapsuleId: string | null
  /** DEC-001: 기본값 true — 활성 캡슐에 신규 항목 자동 추가 */
  autoAddToActive: boolean
  /** 활성 캡슐 기반 필터 모드 */
  filterByCapsule: boolean
  /** storage 로드 완료 여부 */
  loaded: boolean

  // ── 로드 ──────────────────────────────────────────────────────────────
  loadCapsules: () => Promise<void>

  // ── CRUD ──────────────────────────────────────────────────────────────
  createCapsule: (input: Partial<Capsule>) => Capsule
  updateCapsule: (id: string, patch: Partial<Capsule>) => void
  deleteCapsule: (id: string) => void
  archiveCapsule: (id: string, archived: boolean) => void

  // ── 활성화 ────────────────────────────────────────────────────────────
  // @MX:WARN: [AUTO] 다중 스토어 연쇄 호출 — 순서 변경 시 복원 동작 깨짐
  // @MX:REASON: [AUTO] REQ-006 순서 보장 필요 (viewMode → pivotContext → pomodoro → metrics)
  activateCapsule: (id: string | null) => Promise<void>

  // ── 아이템 관리 ───────────────────────────────────────────────────────
  addBookmarkToCapsule: (capsuleId: string, bookmarkId: string) => void
  addTodoToCapsule: (capsuleId: string, todoId: string) => void
  addNoteToCapsule: (capsuleId: string, noteId: string) => void
  removeItemFromCapsule: (capsuleId: string, kind: 'bookmark' | 'todo' | 'note', itemId: string) => void

  // ── 일관성 ────────────────────────────────────────────────────────────
  purgeOrphan: (kind: 'bookmark' | 'todo' | 'note', itemId: string) => void

  // ── 메트릭 ────────────────────────────────────────────────────────────
  incrementMetric: (capsuleId: string, key: keyof CapsuleMetrics, delta: number) => void

  // ── 설정 토글 ─────────────────────────────────────────────────────────
  toggleAutoAdd: () => void
  toggleFilterByCapsule: () => void
}

// 스토리지 저장 헬퍼 (loaded 가드 포함)
const persistCapsules = (capsules: Capsule[], loaded: boolean): void => {
  if (loaded) {
    void storage.set(CAPSULES_KEY, JSON.stringify(capsules))
  }
}

const persistActiveCapsuleId = (id: string | null): void => {
  void storage.set(ACTIVE_CAPSULE_ID_KEY, JSON.stringify(id))
}

const persistSettings = (autoAddToActive: boolean, filterByCapsule: boolean): void => {
  void storage.set(CAPSULE_SETTINGS_KEY, JSON.stringify({ autoAddToActive, filterByCapsule }))
}

export const useCapsuleStore = create<CapsuleState>((set, get) => ({
  capsules: [],
  activeCapsuleId: null,
  autoAddToActive: true, // DEC-001
  filterByCapsule: false,
  loaded: false,

  // ── REQ-003: 앱 시작 시 캡슐 복원 ───────────────────────────────────
  loadCapsules: async (): Promise<void> => {
    try {
      const [capsulesResult, activeIdResult, settingsResult] = await Promise.all([
        storage.get(CAPSULES_KEY),
        storage.get(ACTIVE_CAPSULE_ID_KEY),
        storage.get(CAPSULE_SETTINGS_KEY),
      ])

      const capsules: Capsule[] =
        capsulesResult.value !== null ? (JSON.parse(capsulesResult.value) as Capsule[]) : []

      const activeCapsuleId: string | null =
        activeIdResult.value !== null ? (JSON.parse(activeIdResult.value) as string | null) : null

      let autoAddToActive = true // DEC-001 기본값
      let filterByCapsule = false

      if (settingsResult.value !== null) {
        const settings = JSON.parse(settingsResult.value) as {
          autoAddToActive: boolean
          filterByCapsule: boolean
        }
        autoAddToActive = settings.autoAddToActive
        filterByCapsule = settings.filterByCapsule
      }

      set({ capsules, activeCapsuleId, autoAddToActive, filterByCapsule, loaded: true })
    } catch {
      // 로드 실패 시 빈 상태로 복구
      set({ capsules: [], activeCapsuleId: null, loaded: true })
    }
  },

  // ── REQ-001: 캡슐 생성 ───────────────────────────────────────────────
  createCapsule: (input: Partial<Capsule>): Capsule => {
    const timestamp = now()
    const capsule: Capsule = {
      id: generateId(),
      name: input.name ?? '새 캡슐',
      emoji: input.emoji ?? '📦', // EC-005 기본값
      description: input.description,
      color: input.color,
      bookmarkIds: input.bookmarkIds ?? [],
      todoIds: input.todoIds ?? [],
      noteIds: input.noteIds ?? [],
      tags: input.tags ?? [],
      pivotContext: input.pivotContext ?? null,
      viewMode: input.viewMode ?? null,
      pomodoroPreset: input.pomodoroPreset ?? null,
      createdAt: timestamp,
      updatedAt: timestamp,
      lastActivatedAt: input.lastActivatedAt ?? null,
      archived: input.archived ?? false,
      metrics: input.metrics ?? defaultMetrics(),
    }

    set((state) => {
      const capsules = [...state.capsules, capsule]
      persistCapsules(capsules, state.loaded)
      return { capsules }
    })

    return capsule
  },

  // ── REQ-002 (수정 시 updatedAt 갱신) ────────────────────────────────
  updateCapsule: (id: string, patch: Partial<Capsule>): void => {
    set((state) => {
      const capsules = state.capsules.map((c) =>
        c.id === id ? { ...c, ...patch, updatedAt: now() } : c,
      )
      persistCapsules(capsules, state.loaded)
      return { capsules }
    })
  },

  // ── REQ-018: 캡슐 삭제 (참조만 해제, 아이템 유지) ────────────────────
  deleteCapsule: (id: string): void => {
    set((state) => {
      const capsules = state.capsules.filter((c) => c.id !== id)
      // REQ-019: 활성 캡슐 삭제 시 activeCapsuleId 해제
      const activeCapsuleId = state.activeCapsuleId === id ? null : state.activeCapsuleId
      persistCapsules(capsules, state.loaded)
      if (state.activeCapsuleId === id) {
        persistActiveCapsuleId(null)
      }
      return { capsules, activeCapsuleId }
    })
  },

  archiveCapsule: (id: string, archived: boolean): void => {
    get().updateCapsule(id, { archived })
  },

  // ── REQ-006: 캡슐 활성화 복원 체인 ──────────────────────────────────
  // @MX:WARN: [AUTO] 다중 스토어 연쇄 호출 — 순서 변경 시 복원 동작 깨짐
  // @MX:REASON: [AUTO] REQ-006 순서 보장 필요 (viewMode → pivotContext → pomodoro → metrics)
  activateCapsule: async (id: string | null): Promise<void> => {
    if (id === null) {
      // REQ-008: 캡슐 해제 — activeCapsuleId만 null로 설정, 다른 스토어는 그대로
      set({ activeCapsuleId: null })
      persistActiveCapsuleId(null)
      return
    }

    const capsule = get().capsules.find((c) => c.id === id)
    if (capsule === undefined) return

    // 1. activeCapsuleId 설정
    set({ activeCapsuleId: id })

    // 2. viewMode 복원 (REQ-006.2)
    if (capsule.viewMode !== null) {
      useViewModeStore.getState().setMode(capsule.viewMode)
    }

    // 3. pivotContext 복원 (REQ-006.3)
    if (capsule.pivotContext !== null) {
      useViewStore.getState().setContext(capsule.pivotContext)
    }

    // 4. pomodoroPreset 복원 (REQ-006.4)
    if (capsule.pomodoroPreset !== null) {
      const preset: PomodoroPreset = capsule.pomodoroPreset
      usePomodoroStore.getState().updateSettings({
        focusMinutes: preset.focusMinutes,
        breakMinutes: preset.breakMinutes,
        longBreakMinutes: preset.longBreakMinutes,
      })
    }

    // 5. lastActivatedAt 갱신 + 6. activationCount 증가 (REQ-006.5,6)
    const updatedMetrics: CapsuleMetrics = {
      ...capsule.metrics,
      activationCount: capsule.metrics.activationCount + 1,
    }
    get().updateCapsule(id, {
      lastActivatedAt: now(),
      metrics: updatedMetrics,
    })

    persistActiveCapsuleId(id)
  },

  // ── REQ-010: 북마크 → 캡슐 추가 ─────────────────────────────────────
  addBookmarkToCapsule: (capsuleId: string, bookmarkId: string): void => {
    const capsule = get().capsules.find((c) => c.id === capsuleId)
    if (capsule === undefined) return

    // DEC-003: > 1000이면 저장 거부
    if (capsule.bookmarkIds.length >= BOOKMARK_IDS_MAX_LIMIT) {
      throw new Error(
        `캡슐 "${capsule.name}"의 북마크 수가 ${BOOKMARK_IDS_MAX_LIMIT}개 한계를 초과합니다. 캡슐을 분할해주세요.`,
      )
    }

    // DEC-003: > 500이면 경고 (콘솔)
    if (capsule.bookmarkIds.length >= BOOKMARK_IDS_WARN_LIMIT) {
      console.warn(`[CAPSULE] 캡슐 "${capsule.name}"의 북마크 수가 ${BOOKMARK_IDS_WARN_LIMIT}개를 초과했습니다.`)
    }

    // AC-017: 중복 무시
    if (capsule.bookmarkIds.includes(bookmarkId)) return

    get().updateCapsule(capsuleId, {
      bookmarkIds: [...capsule.bookmarkIds, bookmarkId],
    })
  },

  addTodoToCapsule: (capsuleId: string, todoId: string): void => {
    const capsule = get().capsules.find((c) => c.id === capsuleId)
    if (capsule === undefined) return

    if (capsule.todoIds.includes(todoId)) return

    get().updateCapsule(capsuleId, {
      todoIds: [...capsule.todoIds, todoId],
    })
  },

  addNoteToCapsule: (capsuleId: string, noteId: string): void => {
    const capsule = get().capsules.find((c) => c.id === capsuleId)
    if (capsule === undefined) return

    if (capsule.noteIds.includes(noteId)) return

    get().updateCapsule(capsuleId, {
      noteIds: [...capsule.noteIds, noteId],
    })
  },

  // ── REQ-010: 아이템 → 캡슐 제거 ─────────────────────────────────────
  removeItemFromCapsule: (
    capsuleId: string,
    kind: 'bookmark' | 'todo' | 'note',
    itemId: string,
  ): void => {
    const capsule = get().capsules.find((c) => c.id === capsuleId)
    if (capsule === undefined) return

    if (kind === 'bookmark') {
      get().updateCapsule(capsuleId, {
        bookmarkIds: capsule.bookmarkIds.filter((id) => id !== itemId),
      })
    } else if (kind === 'todo') {
      get().updateCapsule(capsuleId, {
        todoIds: capsule.todoIds.filter((id) => id !== itemId),
      })
    } else {
      get().updateCapsule(capsuleId, {
        noteIds: capsule.noteIds.filter((id) => id !== itemId),
      })
    }
  },

  // ── REQ-017: 고아 참조 제거 ───────────────────────────────────────────
  purgeOrphan: (kind: 'bookmark' | 'todo' | 'note', itemId: string): void => {
    set((state) => {
      const capsules = state.capsules.map((c) => {
        if (kind === 'bookmark') {
          return { ...c, bookmarkIds: c.bookmarkIds.filter((id) => id !== itemId), updatedAt: now() }
        } else if (kind === 'todo') {
          return { ...c, todoIds: c.todoIds.filter((id) => id !== itemId), updatedAt: now() }
        } else {
          return { ...c, noteIds: c.noteIds.filter((id) => id !== itemId), updatedAt: now() }
        }
      })
      persistCapsules(capsules, state.loaded)
      return { capsules }
    })
  },

  // ── REQ-020: 메트릭 누적 ─────────────────────────────────────────────
  incrementMetric: (capsuleId: string, key: keyof CapsuleMetrics, delta: number): void => {
    const capsule = get().capsules.find((c) => c.id === capsuleId)
    if (capsule === undefined) return

    const updatedMetrics: CapsuleMetrics = {
      ...capsule.metrics,
      [key]: capsule.metrics[key] + delta,
    }

    get().updateCapsule(capsuleId, { metrics: updatedMetrics })
  },

  // ── 설정 토글 ──────────────────────────────────────────────────────────
  toggleAutoAdd: (): void => {
    set((state) => {
      const autoAddToActive = !state.autoAddToActive
      persistSettings(autoAddToActive, state.filterByCapsule)
      return { autoAddToActive }
    })
  },

  toggleFilterByCapsule: (): void => {
    set((state) => {
      const filterByCapsule = !state.filterByCapsule
      persistSettings(state.autoAddToActive, filterByCapsule)
      return { filterByCapsule }
    })
  },
}))
