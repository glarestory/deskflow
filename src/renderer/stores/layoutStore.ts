// @MX:ANCHOR: [AUTO] layoutStore — 드래그 앤 드롭 위젯 레이아웃 상태 관리 진입점
// @MX:REASON: [AUTO] App.tsx, 레이아웃 초기화 버튼 등 다수 컴포넌트가 의존
// @MX:SPEC: SPEC-LAYOUT-001, SPEC-UX-006
import { create } from 'zustand'
import { storage } from '../lib/storage'
import { migrateLayoutToResponsive } from '../lib/layoutMigration'
// SPEC-UX-010 REQ-UX-010-003: 편집 히스토리 push 통합
import { useEditHistoryStore } from './editHistoryStore'

// 레이아웃 스토리지 키
const LAYOUT_STORAGE_KEY = 'widget-layout'

// 위젯 레이아웃 스키마 (react-grid-layout Layout 타입과 호환)
export interface WidgetLayout {
  i: string     // 위젯 ID
  x: number     // 열 위치
  y: number     // 행 위치
  w: number     // 열 너비
  h: number     // 행 높이
  minW?: number // 최소 열 너비
  minH?: number // 최소 행 높이
}

// Direction A — "Search + Favorites 중심 허브" 레이아웃 (12열 그리드 기반)
// 계층 구조: clock(좌상단 컴팩트) → search(상단 와이드 바) → bookmarks(주요 히어로 타일)
//           → todo/notes(우측 레일 스택) → feed(하단 전폭 스트림)
// @MX:NOTE: [AUTO] 검색+즐겨찾기 중심 허브 — bookmarks를 w8 h6 주요 타일로,
//           clock을 w3으로 축소, search를 w9 프로미넌트 바로 배치, feed를 하단 전폭으로
export const DEFAULT_LAYOUT: WidgetLayout[] = [
  { i: 'clock',     x: 0, y: 0, w: 3,  h: 2, minW: 2, minH: 2 },
  { i: 'search',    x: 3, y: 0, w: 9,  h: 2, minW: 4, minH: 2 },
  { i: 'bookmarks', x: 0, y: 2, w: 8,  h: 6, minW: 4, minH: 4 },
  { i: 'todo',      x: 8, y: 2, w: 4,  h: 3, minW: 3, minH: 2 },
  { i: 'notes',     x: 8, y: 5, w: 4,  h: 3, minW: 3, minH: 2 },
  // SPEC-WIDGET-003: RSS 뉴스 피드 위젯 — 하단 전폭 스트림
  { i: 'feed',      x: 0, y: 8, w: 12, h: 3, minW: 4, minH: 3 },
]

interface LayoutState {
  layout: WidgetLayout[]
  loaded: boolean
  // REQ-004: 저장된 레이아웃 복원
  loadLayout: () => Promise<void>
  // REQ-003: 레이아웃 변경 저장
  updateLayout: (layout: WidgetLayout[]) => void
  // REQ-005: 기본 레이아웃으로 초기화
  resetLayout: () => void
}

export const useLayoutStore = create<LayoutState>((set, get) => ({
  layout: DEFAULT_LAYOUT,
  loaded: false,

  loadLayout: async () => {
    try {
      const result = await storage.get(LAYOUT_STORAGE_KEY)
      if (!result.value) {
        set({ layout: DEFAULT_LAYOUT, loaded: true })
        return
      }
      // REQ-UX-006-004: 평면 WidgetLayout[] 또는 ResponsiveLayout 모두 처리
      const parsed = JSON.parse(result.value) as WidgetLayout[] | { lg?: WidgetLayout[] }
      const responsive = migrateLayoutToResponsive(parsed as WidgetLayout[] | { lg: WidgetLayout[] })
      // 마이그레이션 결과를 저장소에 즉시 재저장 (idempotent)
      void storage.set(LAYOUT_STORAGE_KEY, JSON.stringify(responsive))
      set({ layout: responsive.lg, loaded: true })
    } catch {
      set({ layout: DEFAULT_LAYOUT, loaded: true })
    }
  },

  updateLayout: (layout) => {
    // REQ-UX-010-003: 변경 직전 상태를 히스토리에 push
    const prev = get().layout
    useEditHistoryStore.getState().push({ type: 'layout', layout: prev })
    set({ layout })
    void storage.set(LAYOUT_STORAGE_KEY, JSON.stringify(layout))
  },

  resetLayout: () => {
    set({ layout: DEFAULT_LAYOUT })
    void storage.set(LAYOUT_STORAGE_KEY, JSON.stringify(DEFAULT_LAYOUT))
  },
}))
