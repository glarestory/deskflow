// @MX:ANCHOR: [AUTO] layoutStore — 드래그 앤 드롭 위젯 레이아웃 상태 관리 진입점
// @MX:REASON: [AUTO] App.tsx, 레이아웃 초기화 버튼 등 다수 컴포넌트가 의존
// @MX:SPEC: SPEC-LAYOUT-001
import { create } from 'zustand'
import { storage } from '../lib/storage'

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

// SPEC 기본 레이아웃 (12열 그리드 기반)
// @MX:NOTE: [AUTO] 간격 최적화 — clock/search h:2, bookmarks 바로 아래 배치로 시각적 갭 최소화
export const DEFAULT_LAYOUT: WidgetLayout[] = [
  { i: 'clock',     x: 0, y: 0, w: 5, h: 2, minW: 3, minH: 2 },
  { i: 'search',    x: 5, y: 0, w: 7, h: 2, minW: 4, minH: 2 },
  { i: 'bookmarks', x: 0, y: 2, w: 8, h: 5, minW: 4, minH: 4 },
  { i: 'todo',      x: 8, y: 2, w: 4, h: 5, minW: 3, minH: 3 },
  { i: 'notes',     x: 8, y: 7, w: 4, h: 4, minW: 3, minH: 3 },
  // SPEC-WIDGET-003: RSS 뉴스 피드 위젯
  { i: 'feed',      x: 0, y: 7, w: 8, h: 4, minW: 4, minH: 3 },
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

export const useLayoutStore = create<LayoutState>((set) => ({
  layout: DEFAULT_LAYOUT,
  loaded: false,

  loadLayout: async () => {
    try {
      const result = await storage.get(LAYOUT_STORAGE_KEY)
      const layout = result.value
        ? (JSON.parse(result.value) as WidgetLayout[])
        : DEFAULT_LAYOUT
      set({ layout, loaded: true })
    } catch {
      set({ layout: DEFAULT_LAYOUT, loaded: true })
    }
  },

  updateLayout: (layout) => {
    set({ layout })
    void storage.set(LAYOUT_STORAGE_KEY, JSON.stringify(layout))
  },

  resetLayout: () => {
    set({ layout: DEFAULT_LAYOUT })
    void storage.set(LAYOUT_STORAGE_KEY, JSON.stringify(DEFAULT_LAYOUT))
  },
}))
