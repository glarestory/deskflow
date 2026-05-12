// SortableLink.tsx — @dnd-kit/sortable 기반 드래그 가능한 북마크 링크 항목 컴포넌트
import React from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Link } from '../../types'

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
    gap: 8,
    padding: '10px 12px',
    borderRadius: 10,
    background: 'var(--link-bg)',
    textDecoration: 'none',
    color: 'var(--text-primary)',
    fontSize: 13,
    minWidth: 0,
    overflow: 'hidden',
    // 편집 모드에서 드래그 가능 표시
    cursor: isEditing ? 'grab' : 'pointer',
  }

  return (
    <a
      ref={setNodeRef}
      href={isEditing ? undefined : link.url}
      target={isEditing ? undefined : '_blank'}
      rel="noopener noreferrer"
      onClick={isEditing ? (e) => e.preventDefault() : () => onUsage(link.id)}
      style={style}
      {...attributes}
      {...(isEditing ? listeners : {})}
      onMouseEnter={(e) => {
        if (!isDragging) e.currentTarget.style.background = 'var(--link-hover)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'var(--link-bg)'
      }}
    >
      <span
        style={{
          fontWeight: 500,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {link.name}
      </span>
    </a>
  )
}
