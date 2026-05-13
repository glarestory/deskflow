// 전역 편집 모드(Global Edit Mode) 상태를 관리하는 zustand 스토어 (SPEC-UX-007, SPEC-UX-010)
import { create } from 'zustand'

/**
 * 전역 편집 모드 상태 인터페이스
 * REQ-UX-007-001, REQ-UX-010-008, REQ-UX-010-011
 */
interface EditModeState {
  /** 현재 편집 모드 활성 여부 */
  isEditing: boolean
  /** 자동 종료 활성 여부 (default: true) — REQ-UX-010-008 */
  autoExitEnabled: boolean
  /** 빈 카테고리 숨김 여부 (default: false) — REQ-UX-010-011 */
  hideEmptyCategories: boolean
  /** isEditing 값을 반전 */
  toggle: () => void
  /** isEditing 값을 직접 설정 */
  set: (value: boolean) => void
  /** 자동 종료 활성 여부 설정 — localStorage 영속화 */
  setAutoExitEnabled: (enabled: boolean) => void
  /** 빈 카테고리 숨김 설정 — localStorage 영속화 */
  setHideEmptyCategories: (hide: boolean) => void
}

// 영속화 키
const AUTO_EXIT_KEY = 'edit-mode-auto-exit'
const HIDE_EMPTY_KEY = 'hide-empty-categories'

/** localStorage에서 boolean 값을 읽는 헬퍼 */
function readBool(key: string, defaultValue: boolean): boolean {
  try {
    const val = localStorage.getItem(key)
    if (val === null) return defaultValue
    return val === 'true'
  } catch {
    return defaultValue
  }
}

// @MX:ANCHOR: [AUTO] useEditModeStore — 전역 편집 모드 상태의 단일 진입점
// @MX:REASON: [AUTO] WidgetLayout, BookmarkCard, HeaderMoreMenu 등 다수 컴포넌트가 의존
// @MX:SPEC: SPEC-UX-007, SPEC-UX-010
export const useEditModeStore = create<EditModeState>((set) => ({
  // REQ-UX-007-020: 앱 부팅 시 기본값은 항상 false
  isEditing: false,
  // REQ-UX-010-008: 자동 종료 기본값 true, localStorage에서 복원
  autoExitEnabled: readBool(AUTO_EXIT_KEY, true),
  // REQ-UX-010-011: 빈 카테고리 숨김 기본값 false, localStorage에서 복원
  hideEmptyCategories: readBool(HIDE_EMPTY_KEY, false),

  toggle: () => set((s) => ({ isEditing: !s.isEditing })),
  set: (value) => set({ isEditing: value }),

  // REQ-UX-010-008: autoExitEnabled 설정 + localStorage 영속화
  setAutoExitEnabled: (enabled) => {
    try {
      localStorage.setItem(AUTO_EXIT_KEY, String(enabled))
    } catch {
      // localStorage 사용 불가 환경 — 무시
    }
    set({ autoExitEnabled: enabled })
  },

  // REQ-UX-010-011: hideEmptyCategories 설정 + localStorage 영속화
  setHideEmptyCategories: (hide) => {
    try {
      localStorage.setItem(HIDE_EMPTY_KEY, String(hide))
    } catch {
      // localStorage 사용 불가 환경 — 무시
    }
    set({ hideEmptyCategories: hide })
  },
}))

/**
 * 편의 훅 — useEditModeStore를 직접 반환
 * 컴포넌트에서 const { isEditing, toggle, set } = useEditMode() 형태로 사용
 */
export const useEditMode = (): EditModeState => useEditModeStore()
