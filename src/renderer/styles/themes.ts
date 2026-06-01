// @MX:NOTE: [AUTO] 다크/라이트 테마 CSS 변수 토큰 정의
// @MX:NOTE: [AUTO] SPEC-CAPSULE-001: --capsule-accent 토큰 추가 (DEC-002)
// @MX:SPEC: SPEC-UI-001, SPEC-CAPSULE-001
import type { ThemeTokens } from '../types'

// SPEC-UX-012 후속: Midnight Slate + Teal 테마. App.tsx가 이 토큰을 인라인으로
// spread하여 globals.css :root를 덮어쓰므로, 실제 화면 색의 단일 소스는 이 파일이다.
// (globals.css의 surface-1/2/3·accent-hover/soft/fg 등 보조 토큰과 팔레트를 일치시킨다)
export const darkTheme: ThemeTokens = {
  '--bg': '#0e1626',
  '--bg-pattern': '#121c2e',
  '--card-bg': '#18233a',
  '--border': '#2a3854',
  '--text-primary': '#e6edf6',
  '--text-muted': '#8595ab',
  '--link-bg': '#1f2c46',
  '--link-hover': '#26344f',
  '--accent': '#2dd4bf',
  '--shadow': 'rgba(0,0,0,0.25)',
  // SPEC-CAPSULE-001: 캡슐 색상 강조 — 다크 테마 기본값 (OKLCH lightness 범위 [0.55, 0.80])
  '--capsule-accent': 'oklch(0.79 0.130 177)',
}

export const lightTheme: ThemeTokens = {
  '--bg': '#f1f4f8',
  '--bg-pattern': '#e7ecf2',
  '--card-bg': '#ffffff',
  '--border': '#dde3ec',
  '--text-primary': '#14202e',
  '--text-muted': '#5d6b80',
  '--link-bg': '#eef2f7',
  '--link-hover': '#e3e9f1',
  '--accent': '#0d9488',
  '--shadow': 'rgba(15,23,42,0.06)',
  // SPEC-CAPSULE-001: 캡슐 색상 강조 — 라이트 테마 기본값 (OKLCH lightness 범위 [0.30, 0.60])
  '--capsule-accent': 'oklch(0.45 0.140 177)',
}
