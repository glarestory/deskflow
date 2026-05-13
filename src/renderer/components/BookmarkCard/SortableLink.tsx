// SortableLink.tsx — @dnd-kit/sortable 기반 드래그 가능한 북마크 링크 항목 컴포넌트
// SPEC-UX-009: 링크 핸들 슬롯 분리 — listeners를 핸들 영역에만 spread
import React from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Link } from '../../types'
// REQ-UX-009-005: 링크 핸들 슬롯 컴포넌트
import { DragHandleSlot } from '../common/DragHandleSlot'

interface SortableLinkProps {
  /** 링크 데이터 */
  link: Link
  /** 편집 모드 여부 — true 일 때만 드래그 가능 */
  isEditing: boolean
  /** 클릭 시 usage 기록 */
  onUsage: (id: string) => void
  /**
   * REQ-UX-008-005: 링크가 속한 카테고리 id.
   * onDragOver/onDragEnd에서 active.data.current.categoryId로 소속 카테고리 즉시 식별
   */
  categoryId: string
}

/**
 * REQ-UX-006-008: DndContext 내에서 useSortable 을 사용하는 정렬 가능 링크 항목
 * REQ-UX-006-009: isEditing=false 이면 일반 <a> 클릭 동작만 허용
 * REQ-UX-008-005: data.current.type='link', data.current.categoryId 로 카테고리 식별
 */
export default function SortableLink({ link, isEditing, onUsage, categoryId }: SortableLinkProps): React.JSX.Element {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: link.id,
    disabled: !isEditing,
    // REQ-UX-008-005: 카테고리 id를 data에 포함하여 dragOver/dragEnd에서 즉시 식별
    data: { type: 'link' as const, categoryId },
  })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: transition ?? 'background .15s',
    opacity: isDragging ? 0.5 : 1,
    display: 'flex',
    alignItems: 'center',
    gap: 0,
    padding: '2px 12px 2px 0',
    borderRadius: 10,
    background: 'var(--link-bg)',
    textDecoration: 'none',
    color: 'var(--text-primary)',
    fontSize: 13,
    minWidth: 0,
    overflow: 'hidden',
    // REQ-UX-009-008: 편집 모드에서도 링크 본문(이름) 클릭은 드래그 시작 안 함
    // — cursor는 링크 본문과 핸들이 다름. 링크 행 자체는 default
    cursor: 'default',
  }

  return (
    // REQ-UX-009-013: setNodeRef는 <a> 태그에 유지 (dnd-kit sortable 노드 참조)
    // attributes는 <a>에 spread (sortable 접근성 속성)
    // REQ-UX-009-008: listeners는 DragHandleSlot에만 spread — <a> 본문 제거
    <a
      ref={setNodeRef}
      href={isEditing ? undefined : link.url}
      target={isEditing ? undefined : '_blank'}
      rel="noopener noreferrer"
      onClick={isEditing ? (e) => e.preventDefault() : () => onUsage(link.id)}
      // BUGFIX: <a>는 HTML 명세상 draggable=true 기본값. 편집 모드에서 링크 본문을
      // 잡고 끌면 브라우저 네이티브 드래그가 시작되어 ghost 이미지가 따라다니다
      // 사라지는 이상 동작 발생. SPEC-UX-009 이전에는 <a>에 dnd-kit listeners가
      // spread되어 pointerdown에서 preventDefault 처리되었으나, 핸들 분리 이후
      // 네이티브 드래그를 명시적으로 차단해야 한다.
      draggable={false}
      onDragStart={(e) => e.preventDefault()}
      style={style}
      {...attributes}
      onMouseEnter={(e) => {
        if (!isDragging) e.currentTarget.style.background = 'var(--link-hover)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'var(--link-bg)'
      }}
    >
      {/* REQ-UX-009-005: 링크 핸들 슬롯 — 링크 행의 첫 자식
          listeners를 이 슬롯에만 spread하여 링크 이름 클릭과 드래그 분리 */}
      <DragHandleSlot
        level="link"
        ariaLabel={`링크 이동: ${link.name}`}
        listeners={listeners as Record<string, unknown>}
        isEditing={isEditing}
      />
      <span
        style={{
          fontWeight: 500,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          flex: 1,
          paddingLeft: 4,
        }}
      >
        {link.name}
      </span>
    </a>
  )
}
