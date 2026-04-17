// @MX:ANCHOR: [AUTO] viewModeStore — Pivot / Widget 뷰 모드 상태 관리
// @MX:REASON: [AUTO] App.tsx, WidgetLayout, SidebarSettings, CommandPalette에서 참조 (fan_in >= 3)
// @MX:SPEC: SPEC-UX-005
import { create } from 'zustand'
import { storage } from '../lib/storage'

/** 앱의 두 가지 뷰 모드 */
export type ViewMode = 'pivot' | 'widgets'

// 유효한 ViewMode 값 집합
const VALID_MODES: ReadonlySet<string> = new Set<ViewMode>(['pivot', 'widgets'])

/** 저장소 키 */
const STORAGE_KEY = 'view-mode'

interface ViewModeState {
  /** 현재 뷰 모드 */
  mode: ViewMode
  /** storage 로드 완료 여부 — 로드 전 깜빡임 방지용 */
  loaded: boolean
  /** storage에서 viewMode를 비동기로 복원 */
  loadMode: () => Promise<void>
  /** 명시적으로 mode를 설정하고 storage에 저장 */
  setMode: (mode: ViewMode) => void
  /** 현재 mode를 토글 (pivot ↔ widgets) */
  toggleMode: () => void
}

// @MX:NOTE: [AUTO] themeStore 패턴을 복제하여 일관성 유지
// @MX:SPEC: SPEC-UX-005
export const useViewModeStore = create<ViewModeState>((set, get) => ({
  // REQ-002: 기본값은 'pivot'
  mode: 'pivot',
  loaded: false,

  // REQ-004: 앱 시작 시 storage에서 viewMode 복원
  loadMode: async (): Promise<void> => {
    try {
      const result = await storage.get(STORAGE_KEY)
      if (result.value !== null) {
        const parsed: unknown = JSON.parse(result.value)
        // EDGE-001: 잘못된 값이면 기본값 'pivot'으로 복구
        const mode: ViewMode = typeof parsed === 'string' && VALID_MODES.has(parsed)
          ? (parsed as ViewMode)
          : 'pivot'
        set({ mode, loaded: true })
      } else {
        set({ loaded: true })
      }
    } catch {
      // storage 오류 시 기본값 유지
      set({ loaded: true })
    }
  },

  // REQ-003: mode 변경 시 즉시 storage에 저장
  setMode: (mode: ViewMode): void => {
    set({ mode })
    void storage.set(STORAGE_KEY, JSON.stringify(mode))
  },

  // REQ-006: 토글로 pivot ↔ widgets 즉시 전환
  toggleMode: (): void => {
    const newMode: ViewMode = get().mode === 'pivot' ? 'widgets' : 'pivot'
    get().setMode(newMode)
  },
}))
