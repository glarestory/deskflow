// SortableLink.tsx — @dnd-kit/sortable 기반 드래그 가능한 북마크 링크 항목 컴포넌트
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
}

/**
 * REQ-UX-006-008: DndContext 내에서 useSortable 을 사용하는 정렬 가능 링크 항목
 * REQ-UX-006-009: isEditing=false 이면 일반 <a> 클릭 동작만 허용
 */
export default function SortableLink({ link, isEditing, onUsage }: SortableLinkProps): JSX.Element {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: link.id, disabled: !isEditing })

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
