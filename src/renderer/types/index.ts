// @MX:NOTE: [AUTO] 위젯 시스템 전체에서 사용되는 핵심 타입 정의
// @MX:SPEC: SPEC-UI-001, SPEC-BOOKMARK-003, SPEC-UX-003

export interface Link {
  id: string
  name: string
  url: string
  // SPEC-BOOKMARK-003: 자동 태그 + 수동 태그 배열 (빈 배열 허용)
  tags: string[]
  // SPEC-UX-003: 즐겨찾기 플래그 (옵셔널, 마이그레이션 대응)
  favorite?: boolean
  // SPEC-UX-003: 생성 시각 (밀리초, 옵셔널 — backfillMissingCreatedAt으로 채움)
  createdAt?: number
}

export interface Bookmark {
  id: string
  name: string
  icon: string
  links: Link[]
}

// Category는 Bookmark와 동일한 구조
export type Category = Bookmark

// 반복 설정 타입 — SPEC-TODO-002
export interface Recurrence {
  type: 'daily' | 'weekly' | 'monthly'
  daysOfWeek?: number[] // 0=일...6=토, weekly용
  dayOfMonth?: number // 1-31, monthly용
  nextDue: string // ISO 날짜 문자열 YYYY-MM-DD
  seriesId: string // 같은 반복 시리즈의 모든 인스턴스를 묶는 ID
}

export interface Todo {
  id: string
  text: string
  done: boolean
  recurrence?: Recurrence
}

export type ThemeMode = 'dark' | 'light'

export interface ThemeTokens {
  '--bg': string
  '--bg-pattern': string
  '--card-bg': string
  '--border': string
  '--text-primary': string
  '--text-muted': string
  '--link-bg': string
  '--link-hover': string
  '--accent': string
  '--shadow': string
  // SPEC-CAPSULE-001: 캡슐 색상 강조 토큰 (DEC-002)
  '--capsule-accent': string
}
