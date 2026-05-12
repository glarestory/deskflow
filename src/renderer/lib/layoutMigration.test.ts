// layoutMigration.test.ts — Flat→Responsive 레이아웃 변환 유틸리티 단위 테스트
import { describe, it, expect } from 'vitest'
import {
  migrateLayoutToResponsive,
  isResponsiveLayout,
} from './layoutMigration'
import type { WidgetLayout } from '../stores/layoutStore'
import type { ResponsiveLayout } from './layoutMigration'

// 기본 평면 레이아웃 샘플 (REQ-UX-006-004)
const flatLayout: WidgetLayout[] = [
  { i: 'clock', x: 0, y: 0, w: 5, h: 2 },
  { i: 'search', x: 5, y: 0, w: 7, h: 2 },
]

describe('migrateLayoutToResponsive', () => {
  // AC-004: 평면 배열이 {lg: [...]} 형태로 변환되어야 한다
  it('평면 WidgetLayout[] 를 {lg: [...]} ResponsiveLayout 으로 변환한다', () => {
    const result = migrateLayoutToResponsive(flatLayout)
    expect(result).toEqual({ lg: flatLayout })
  })

  // AC-005: 이미 Responsive 형태이면 그대로 반환 (idempotent)
  it('이미 {lg: [...]} 형태인 경우 재변환 없이 그대로 반환한다 (idempotent)', () => {
    const responsive: ResponsiveLayout = { lg: flatLayout }
    const result = migrateLayoutToResponsive(responsive)
    expect(result).toEqual(responsive)
  })

  // EDGE-001: 손상된 입력 시 빈 lg 배열로 대응
  it('null/undefined 입력 시 {lg: []} 를 반환한다 (fallback)', () => {
    const result = migrateLayoutToResponsive(null)
    expect(result).toEqual({ lg: [] })
  })

  it('빈 배열 입력 시 {lg: []} 를 반환한다', () => {
    const result = migrateLayoutToResponsive([])
    expect(result).toEqual({ lg: [] })
  })

  // 기존 lg 키 데이터 무손실 (NFR-004)
  it('변환 시 원본 배열 요소가 그대로 보존된다 (무손실)', () => {
    const result = migrateLayoutToResponsive(flatLayout)
    expect(result.lg).toHaveLength(2)
    expect(result.lg[0]).toEqual({ i: 'clock', x: 0, y: 0, w: 5, h: 2 })
    expect(result.lg[1]).toEqual({ i: 'search', x: 5, y: 0, w: 7, h: 2 })
  })

  // md/sm/xs/xxs 키가 있는 Responsive도 idempotent
  it('md/sm/xs/xxs 키가 포함된 Responsive 도 그대로 반환한다', () => {
    const full: ResponsiveLayout = {
      lg: flatLayout,
      md: flatLayout,
      xs: [],
    }
    const result = migrateLayoutToResponsive(full)
    expect(result).toEqual(full)
  })
})

describe('isResponsiveLayout', () => {
  it('lg 키를 가진 객체는 true 를 반환한다', () => {
    expect(isResponsiveLayout({ lg: [] })).toBe(true)
  })

  it('배열은 false 를 반환한다', () => {
    expect(isResponsiveLayout(flatLayout)).toBe(false)
  })

  it('null 은 false 를 반환한다', () => {
    expect(isResponsiveLayout(null)).toBe(false)
  })

  it('lg 키 없는 객체는 false 를 반환한다', () => {
    expect(isResponsiveLayout({ md: [] })).toBe(false)
  })
})
