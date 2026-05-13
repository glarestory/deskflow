// 드래그 핸들 슬롯 — 레벨별 시각 토큰 분기 (SPEC-UX-009 REQ-UX-009-003/004/005/011)
import React from 'react'
import { GripVertical, Grip } from 'lucide-react'

/** 드래그 핸들 레벨 타입 — 위젯/그룹/링크 3단계 */
type Level = 'widget' | 'group' | 'link'

interface DragHandleSlotProps {
  /** 핸들 레벨 — 레벨별 아이콘/색/크기 분기 */
  level: Level
  /** 접근성 레이블 (REQ-UX-009-011) */
  ariaLabel: string
  /** dnd-kit useSortable attributes spread 대상 */
  attributes?: Record<string, unknown>
  /** dnd-kit useSortable listeners spread 대상 */
  listeners?: Record<string, unknown>
  /** 편집 모드 여부 — true 일 때만 포커스/listeners 활성 */
  isEditing: boolean
}

// 레벨별 아이콘 크기 맵 (REQ-UX-009-003/004/005)
const SIZE_MAP: Record<Level, number> = {
  widget: 16,  // 레벨 A — GripVertical 16px
  group: 18,   // 레벨 B — Grip 18px
  link: 12,    // 레벨 C — GripVertical 12px
}

// 레벨별 아이콘 컴포넌트 맵
const ICON_MAP: Record<Level, typeof GripVertical> = {
  widget: GripVertical,  // 레벨 A — 6점 세로 패턴
  group: Grip,           // 레벨 B — 8점 격자 패턴
  link: GripVertical,    // 레벨 C — 6점 세로 패턴 (작은 사이즈)
}

// 레벨별 data 속성 맵 — CSS 토큰 셀렉터 매칭
const DATA_ATTR_MAP: Record<Level, string> = {
  widget: 'data-widget-handle',  // 시각 마커 only — RGL draggableHandle은 .widget-drag-handle 유지
  group: 'data-group-handle',
  link: 'data-link-handle',
}

/**
 * SPEC-UX-009 공통 드래그 핸들 슬롯 컴포넌트.
 *
 * - 레벨 A (widget): GripVertical 16px, --text-muted 색
 * - 레벨 B (group): Grip 18px, --accent 색
 * - 레벨 C (link): GripVertical 12px, --text-faint 색
 *
 * 가시성(opacity)과 pointer-events는 globals.css의 body.is-edit-mode 기반 CSS로 제어됨.
 * isEditing prop은 tabIndex와 listeners spread 여부 제어에만 사용.
 */
export function DragHandleSlot({
  level,
  ariaLabel,
  attributes,
  listeners,
  isEditing,
}: DragHandleSlotProps): React.JSX.Element {
  const Icon = ICON_MAP[level]
  const dataAttr = DATA_ATTR_MAP[level]

  return (
    <span
      role="button"
      tabIndex={isEditing ? 0 : -1}
      aria-label={ariaLabel}
      // data 속성 동적 할당 — CSS 토큰 셀렉터 매칭
      {...{ [dataAttr]: '' }}
      // 편집 모드 ON 시에만 dnd-kit attributes/listeners spread
      {...(isEditing && attributes ? attributes : {})}
      {...(isEditing && listeners ? listeners : {})}
    >
      <Icon size={SIZE_MAP[level]} aria-hidden="true" />
    </span>
  )
}
