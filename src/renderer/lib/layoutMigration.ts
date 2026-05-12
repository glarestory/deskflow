// layoutMigration.ts — 평면 WidgetLayout[] 를 Responsive 형태로 변환하는 마이그레이션 유틸리티
import type { WidgetLayout } from '../stores/layoutStore'

// @MX:ANCHOR: [AUTO] ResponsiveLayout — Responsive 레이아웃 타입 (SPEC-UX-006 REQ-001)
// @MX:REASON: [AUTO] layoutStore, WidgetLayout.tsx, migrateLayoutToResponsive 등 다수 의존
// @MX:SPEC: SPEC-UX-006

/** Responsive 그리드 레이아웃 스키마 */
export interface ResponsiveLayout {
  lg: WidgetLayout[]
  md?: WidgetLayout[]
  sm?: WidgetLayout[]
  xs?: WidgetLayout[]
  xxs?: WidgetLayout[]
}

/**
 * 입력값이 ResponsiveLayout 형태인지 판별한다.
 * lg 키를 가진 객체이면 true.
 */
export function isResponsiveLayout(value: unknown): value is ResponsiveLayout {
  return (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    'lg' in (value as object)
  )
}

/**
 * 평면 WidgetLayout[] 또는 ResponsiveLayout 을 ResponsiveLayout 으로 변환한다.
 * - 이미 ResponsiveLayout 이면 그대로 반환 (idempotent)
 * - 평면 배열이면 {lg: [...]} 로 감싼다
 * - null/undefined 이면 {lg: []} 로 fallback
 */
export function migrateLayoutToResponsive(
  value: WidgetLayout[] | ResponsiveLayout | null | undefined,
): ResponsiveLayout {
  if (value === null || value === undefined) {
    return { lg: [] }
  }
  if (isResponsiveLayout(value)) {
    return value
  }
  if (Array.isArray(value)) {
    return { lg: value }
  }
  return { lg: [] }
}
