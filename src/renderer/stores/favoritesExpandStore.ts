// 즐겨찾기 카테고리별 펼침/접힘 확장 상태를 관리하는 zustand 스토어 (SPEC-UX-012)
import { create } from 'zustand'

/**
 * 즐겨찾기 확장 상태 인터페이스
 * REQ-UX-012-002: 멀티 확장 (다중 동시 펼침) — Record<categoryId, boolean> 기반
 * REQ-UX-012-003: localStorage 영속화 — 'favorites-expanded' 키
 * REQ-UX-012-004: 기본값 = 모두 펼침 (키 없으면 true)
 */
interface FavoritesExpandState {
  /** 카테고리별 확장 상태 — 키 없으면 펼침(default: all expanded, REQ-UX-012-004) */
  expanded: Record<string, boolean>
  /**
   * 특정 카테고리 확장 여부 조회
   * REQ-UX-012-004: 영속화 map에 없는 카테고리(키 없음) = 펼침(true) 반환
   */
  isExpanded: (categoryId: string) => boolean
  /**
   * 카테고리 펼침/접힘 토글 + localStorage 영속화
   * REQ-UX-012-003: 상태 변경 시 localStorage에 즉시 저장
   */
  toggleExpand: (categoryId: string) => void
  /**
   * 특정 카테고리의 확장 상태를 직접 설정
   * REQ-UX-012-002: 다른 카테고리에 영향을 주지 않음
   */
  setExpanded: (categoryId: string, value: boolean) => void
}

// localStorage 영속화 키 — editModeStore.ts:33-34 패턴과 일관성 유지
const FAVORITES_EXPANDED_KEY = 'favorites-expanded'

/**
 * localStorage에서 확장 상태 map을 로드하는 헬퍼
 * EDGE-001: JSON 파싱 실패 시 {} 반환 → 모두 펼침으로 해석 (graceful fallback)
 */
function readExpanded(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(FAVORITES_EXPANDED_KEY)
    if (raw === null) return {}
    return JSON.parse(raw) as Record<string, boolean>
  } catch {
    // 손상된 JSON 또는 localStorage 접근 불가 — 빈 map 반환 (모두 펼침)
    return {}
  }
}

// @MX:ANCHOR: [AUTO] useFavoritesExpandStore — 즐겨찾기 확장 상태의 단일 진입점
// @MX:REASON: [AUTO] BookmarkCard(읽기/토글), WidgetLayout(데이터 흐름), 헤더 토글 등 다수 컴포넌트가 의존
// @MX:SPEC: SPEC-UX-012
export const useFavoritesExpandStore = create<FavoritesExpandState>((set, get) => ({
  // localStorage에서 복원 — 없으면 빈 map (모두 펼침으로 해석)
  expanded: readExpanded(),

  // REQ-UX-012-004: 키 없으면 펼침(true) 반환
  isExpanded: (categoryId: string) => {
    const v = get().expanded[categoryId]
    return v === undefined ? true : v
  },

  // REQ-UX-012-003: 토글 + localStorage 영속화
  toggleExpand: (categoryId: string) => {
    const current = get().expanded[categoryId]
    // 현재 값이 undefined이면 기본 펼침(true)이므로 false로 토글
    const next = { ...get().expanded, [categoryId]: !(current ?? true) }
    try {
      localStorage.setItem(FAVORITES_EXPANDED_KEY, JSON.stringify(next))
    } catch {
      // localStorage 사용 불가 환경 — 무시 (메모리 상태만 유지)
    }
    set({ expanded: next })
  },

  // 직접 설정 — 초기화나 외부 제어 시 사용
  setExpanded: (categoryId: string, value: boolean) => {
    const next = { ...get().expanded, [categoryId]: value }
    try {
      localStorage.setItem(FAVORITES_EXPANDED_KEY, JSON.stringify(next))
    } catch {
      // localStorage 사용 불가 환경 — 무시
    }
    set({ expanded: next })
  },
}))
