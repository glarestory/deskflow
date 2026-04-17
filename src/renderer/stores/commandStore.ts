// @MX:ANCHOR: [AUTO] commandStore — CommandPalette 열기/닫기/쿼리/선택 인덱스 전역 상태
// @MX:REASON: [AUTO] CommandPalette 컴포넌트, useCommandPalette 훅, App.tsx 등이 의존
// @MX:SPEC: SPEC-UX-002
import { create } from 'zustand'

export interface CommandState {
  /** 팔레트 열림 여부 */
  isOpen: boolean
  /** 현재 검색어 */
  query: string
  /** 현재 선택된 결과 인덱스 */
  selectedIndex: number
  /** 팔레트 열기 */
  open: () => void
  /** 팔레트 닫기 (query, selectedIndex 초기화) */
  close: () => void
  /** 팔레트 열림 상태 토글 */
  toggle: () => void
  /** 검색어 설정 (selectedIndex 자동 0 리셋) */
  setQuery: (query: string) => void
  /** 선택 인덱스 설정 */
  setSelectedIndex: (index: number) => void
  /** 모든 상태 초기화 */
  reset: () => void
}

const initialState = {
  isOpen: false,
  query: '',
  selectedIndex: 0,
}

export const useCommandStore = create<CommandState>((set) => ({
  ...initialState,

  open: () => set({ isOpen: true }),

  close: () => set({ isOpen: false, query: '', selectedIndex: 0 }),

  toggle: () => set((state) => ({ isOpen: !state.isOpen })),

  setQuery: (query: string) => set({ query, selectedIndex: 0 }),

  setSelectedIndex: (selectedIndex: number) => set({ selectedIndex }),

  reset: () => set({ ...initialState }),
}))
