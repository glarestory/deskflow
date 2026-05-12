// 전역 편집 모드(Global Edit Mode) 상태를 관리하는 zustand 스토어 (SPEC-UX-007)
import { create } from 'zustand'

/**
 * 전역 편집 모드 상태 인터페이스 (REQ-UX-007-001)
 * 세션 단위 휘발성 — 영속화 없음
 */
interface EditModeState {
  /** 현재 편집 모드 활성 여부 */
  isEditing: boolean
  /** isEditing 값을 반전 */
  toggle: () => void
  /** isEditing 값을 직접 설정 */
  set: (value: boolean) => void
}

// @MX:ANCHOR: [AUTO] useEditModeStore — 전역 편집 모드 상태의 단일 진입점
// @MX:REASON: [AUTO] WidgetLayout, BookmarkCard, HeaderMoreMenu 등 다수 컴포넌트가 의존
// @MX:SPEC: SPEC-UX-007
export const useEditModeStore = create<EditModeState>((set) => ({
  // REQ-UX-007-020: 앱 부팅 시 기본값은 항상 false
  isEditing: false,
  toggle: () => set((s) => ({ isEditing: !s.isEditing })),
  set: (value) => set({ isEditing: value }),
}))

/**
 * 편의 훅 — useEditModeStore를 직접 반환
 * 컴포넌트에서 const { isEditing, toggle, set } = useEditMode() 형태로 사용
 */
export const useEditMode = (): EditModeState => useEditModeStore()
