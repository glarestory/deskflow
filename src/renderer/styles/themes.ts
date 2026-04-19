// @MX:NOTE: [AUTO] 다크/라이트 테마 CSS 변수 토큰 정의
// @MX:NOTE: [AUTO] SPEC-CAPSULE-001: --capsule-accent 토큰 추가 (DEC-002)
// @MX:SPEC: SPEC-UI-001, SPEC-CAPSULE-001
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
  // SPEC-CAPSULE-001: 캡슐 색상 강조 — 다크 테마 기본값 (OKLCH lightness 범위 [0.55, 0.80])
  '--capsule-accent': 'oklch(0.65 0.18 270)',
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
  // SPEC-CAPSULE-001: 캡슐 색상 강조 — 라이트 테마 기본값 (OKLCH lightness 범위 [0.30, 0.60])
  '--capsule-accent': 'oklch(0.45 0.18 270)',
}
