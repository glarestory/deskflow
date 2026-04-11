// @MX:NOTE: [AUTO] 다크/라이트 테마 CSS 변수 토큰 정의
// @MX:SPEC: SPEC-UI-001
import type { ThemeTokens } from '../types'

export const darkTheme: ThemeTokens = {
  '--bg': '#0f1117',
  '--bg-pattern': '#161822',
  '--card-bg': '#1a1d2b',
  '--border': '#2a2d3d',
  '--text-primary': '#e4e6f0',
  '--text-muted': '#6b7094',
  '--link-bg': '#22253a',
  '--link-hover': '#2c3050',
  '--accent': '#6366f1',
  '--shadow': 'rgba(0,0,0,0.25)',
}

export const lightTheme: ThemeTokens = {
  '--bg': '#f0f2f5',
  '--bg-pattern': '#e8e9ef',
  '--card-bg': '#ffffff',
  '--border': '#e0e2ea',
  '--text-primary': '#1a1d2b',
  '--text-muted': '#8b8fa8',
  '--link-bg': '#f5f6fa',
  '--link-hover': '#ecedf3',
  '--accent': '#6366f1',
  '--shadow': 'rgba(0,0,0,0.06)',
}
