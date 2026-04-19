// @MX:NOTE: [AUTO] colorAdjust — OKLCH lightness 자동 보정 유틸 단위 테스트
// @MX:SPEC: SPEC-CAPSULE-001 DEC-002
import { describe, it, expect } from 'vitest'
import { parseOklch, formatOklch, adjustLightnessForTheme } from './colorAdjust'

describe('parseOklch', () => {
  it('유효한 oklch(L C H) 문자열을 파싱한다', () => {
    const result = parseOklch('oklch(0.7 0.15 270)')
    expect(result).toEqual({ l: 0.7, c: 0.15, h: 270 })
  })

  it('공백이 여러 개인 경우도 파싱한다', () => {
    const result = parseOklch('oklch(0.5  0.1  180)')
    expect(result).not.toBeNull()
    expect(result?.l).toBeCloseTo(0.5)
  })

  it('잘못된 형식은 null을 반환한다', () => {
    expect(parseOklch('rgb(255,0,0)')).toBeNull()
    expect(parseOklch('invalid')).toBeNull()
    expect(parseOklch('')).toBeNull()
    expect(parseOklch('oklch(abc def ghi)')).toBeNull()
  })

  it('숫자가 NaN인 경우 null을 반환한다', () => {
    expect(parseOklch('oklch(NaN 0.1 180)')).toBeNull()
  })
})

describe('formatOklch', () => {
  it('L, C, H 값을 oklch() 문자열로 포맷한다', () => {
    expect(formatOklch({ l: 0.7, c: 0.15, h: 270 })).toBe('oklch(0.7 0.15 270)')
  })

  it('소수점이 없는 정수도 올바르게 포맷한다', () => {
    expect(formatOklch({ l: 1, c: 0, h: 0 })).toBe('oklch(1 0 0)')
  })
})

describe('adjustLightnessForTheme', () => {
  describe('다크 테마 — L 범위 [0.55, 0.80]', () => {
    it('L이 범위 내면 그대로 유지한다', () => {
      const result = adjustLightnessForTheme('oklch(0.65 0.15 270)', 'dark')
      const parsed = parseOklch(result)
      expect(parsed?.l).toBeCloseTo(0.65)
    })

    it('L < 0.55이면 0.55로 클램핑한다', () => {
      const result = adjustLightnessForTheme('oklch(0.3 0.2 120)', 'dark')
      const parsed = parseOklch(result)
      expect(parsed?.l).toBeCloseTo(0.55)
    })

    it('L > 0.80이면 0.80으로 클램핑한다', () => {
      const result = adjustLightnessForTheme('oklch(0.95 0.1 60)', 'dark')
      const parsed = parseOklch(result)
      expect(parsed?.l).toBeCloseTo(0.80)
    })

    it('Chroma와 Hue는 보존한다 (다크)', () => {
      const result = adjustLightnessForTheme('oklch(0.3 0.22 330)', 'dark')
      const parsed = parseOklch(result)
      expect(parsed?.c).toBeCloseTo(0.22)
      expect(parsed?.h).toBeCloseTo(330)
    })
  })

  describe('라이트 테마 — L 범위 [0.30, 0.60]', () => {
    it('L이 범위 내면 그대로 유지한다', () => {
      const result = adjustLightnessForTheme('oklch(0.45 0.1 200)', 'light')
      const parsed = parseOklch(result)
      expect(parsed?.l).toBeCloseTo(0.45)
    })

    it('L < 0.30이면 0.30으로 클램핑한다', () => {
      const result = adjustLightnessForTheme('oklch(0.1 0.1 200)', 'light')
      const parsed = parseOklch(result)
      expect(parsed?.l).toBeCloseTo(0.30)
    })

    it('L > 0.60이면 0.60으로 클램핑한다', () => {
      const result = adjustLightnessForTheme('oklch(0.9 0.1 200)', 'light')
      const parsed = parseOklch(result)
      expect(parsed?.l).toBeCloseTo(0.60)
    })

    it('Chroma와 Hue는 보존한다 (라이트)', () => {
      const result = adjustLightnessForTheme('oklch(0.9 0.18 45)', 'light')
      const parsed = parseOklch(result)
      expect(parsed?.c).toBeCloseTo(0.18)
      expect(parsed?.h).toBeCloseTo(45)
    })
  })

  it('잘못된 oklch 입력은 원본 문자열을 반환한다', () => {
    const input = 'rgb(255,0,0)'
    expect(adjustLightnessForTheme(input, 'dark')).toBe(input)
  })
})
