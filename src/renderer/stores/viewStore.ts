// @MX:ANCHOR: [AUTO] viewStore — Pivot 레이아웃 컨텍스트/뷰 상태 관리 중심 진입점
// @MX:REASON: [AUTO] PivotLayout, Sidebar, MainView, BookmarkList 등 다수 컴포넌트가 의존
// @MX:SPEC: SPEC-UX-003
import { create } from 'zustand'

/**
 * 사이드바 선택 컨텍스트 — 현재 표시할 북마크 집합을 결정한다.
 * discriminated union으로 타입 안전성 보장.
 */
export type SidebarContext =
  | { kind: 'all' }
  | { kind: 'favorites' }
  | { kind: 'category'; categoryId: string }
  | { kind: 'tag'; tag: string }

/** 뷰 모드 — 리스트 또는 격자 */
export type ViewMode = 'list' | 'grid'

/** 정보 밀도 — 행 높이 결정에 사용 */
export type Density = 'compact' | 'comfortable' | 'spacious'

/**
 * 밀도별 react-window FixedSizeList itemSize 매핑 (px).
 * REQ-007: compact=40px, comfortable=56px, spacious=72px
 */
export const DENSITY_ITEM_SIZE: Record<Density, number> = {
  compact: 40,
  comfortable: 56,
  spacious: 72,
}

export interface ViewState {
  /** 현재 선택된 사이드바 컨텍스트 */
  context: SidebarContext
  /** 현재 컨텍스트 내 검색어 (debounce는 컴포넌트 레이어에서 처리) */
  searchQuery: string
  /** 뷰 모드 (list | grid) */
  viewMode: ViewMode
  /** 정보 밀도 */
  density: Density
  /** 사이드바 접힘 여부 */
  sidebarCollapsed: boolean

  /** 컨텍스트 변경 — 검색어를 자동으로 초기화한다 */
  setContext: (ctx: SidebarContext) => void
  /** 검색어 설정 */
  setSearchQuery: (q: string) => void
  /** 뷰 모드 설정 */
  setViewMode: (m: ViewMode) => void
  /** 밀도 설정 */
  setDensity: (d: Density) => void
  /** 사이드바 접힘 토글 */
  toggleSidebar: () => void
}

export const useViewStore = create<ViewState>((set) => ({
  // 초기 상태
  context: { kind: 'all' },
  searchQuery: '',
  viewMode: 'list',
  density: 'comfortable',
  sidebarCollapsed: false,

  setContext: (ctx) =>
    // 컨텍스트 변경 시 검색어 초기화 (REQ-003, AC-017)
    set({ context: ctx, searchQuery: '' }),

  setSearchQuery: (q) => set({ searchQuery: q }),

  setViewMode: (m) => set({ viewMode: m }),

  setDensity: (d) => set({ density: d }),

  toggleSidebar: () =>
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
}))
