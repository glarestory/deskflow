// @MX:NOTE: [AUTO] colorAdjust — OKLCH lightness 자동 보정 유틸
// @MX:SPEC: SPEC-CAPSULE-001 DEC-002

/**
 * OKLCH 색상값 파싱 결과 타입.
 */
export interface OklchColor {
  l: number
  c: number
  h: number
}

/**
 * oklch(L C H) 형식 문자열을 파싱한다.
 * 유효하지 않은 입력은 null을 반환한다.
 */
export function parseOklch(input: string): OklchColor | null {
  if (!input) return null

  // oklch(L C H) 형식 매칭 — 공백 다수도 허용
  const match = /^oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*\)$/.exec(input.trim())
  if (!match) return null

  const l = parseFloat(match[1])
  const c = parseFloat(match[2])
  const h = parseFloat(match[3])

  // NaN 체크
  if (isNaN(l) || isNaN(c) || isNaN(h)) return null

  return { l, c, h }
}

/**
 * OklchColor 객체를 oklch(L C H) 형식 문자열로 포맷한다.
 */
export function formatOklch({ l, c, h }: OklchColor): string {
  return `oklch(${l} ${c} ${h})`
}

/**
 * DEC-002: 테마에 따라 OKLCH lightness를 자동 클램핑한다.
 * - 다크 테마: L 범위 [0.55, 0.80]
 * - 라이트 테마: L 범위 [0.30, 0.60]
 * Chroma(C)와 Hue(H)는 보존하여 같은 색 계열 인지를 유지한다.
 *
 * @param oklch - OKLCH 형식 색상 문자열 (예: 'oklch(0.7 0.15 270)')
 * @param theme - 현재 테마 ('dark' | 'light')
 * @returns 보정된 OKLCH 문자열. 잘못된 입력은 원본 반환.
 */
export function adjustLightnessForTheme(oklch: string, theme: 'dark' | 'light'): string {
  const parsed = parseOklch(oklch)
  if (!parsed) return oklch

  // 테마별 lightness 범위
  const [minL, maxL] = theme === 'dark' ? [0.55, 0.80] : [0.30, 0.60]

  const clampedL = Math.min(maxL, Math.max(minL, parsed.l))

  return formatOklch({ l: clampedL, c: parsed.c, h: parsed.h })
}
