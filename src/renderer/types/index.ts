// @MX:NOTE: [AUTO] 위젯 시스템 전체에서 사용되는 핵심 타입 정의
// @MX:SPEC: SPEC-UI-001

export interface Link {
  id: string
  name: string
  url: string
}

export interface Bookmark {
  id: string
  name: string
  icon: string
  links: Link[]
}

// Category는 Bookmark와 동일한 구조
export type Category = Bookmark

export interface Todo {
  id: string
  text: string
  done: boolean
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
}
