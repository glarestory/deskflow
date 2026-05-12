// @MX:NOTE: [AUTO] BookmarkCard — 카테고리 북마크 카드, dnd-kit 정렬 편집 모드 포함
// @MX:SPEC: SPEC-UI-001, SPEC-UX-002, SPEC-UX-006
import { useState, useEffect, useRef } from 'react'
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
} from '@dnd-kit/sortable'
import { useUsageStore } from '../../stores/usageStore'
import { useBookmarkStore } from '../../stores/bookmarkStore'
import type { Category } from '../../types'
import SortableLink from './SortableLink'

interface BookmarkCardProps {
  category: Category
  onEdit: (category: Category) => void
}

export default function BookmarkCard({ category, onEdit }: BookmarkCardProps): JSX.Element {
  // SPEC-UX-002: 북마크 클릭 시 usage 기록
  const { recordUsage } = useUsageStore()
  const { updateBookmark } = useBookmarkStore()

  // REQ-UX-006-009: 편집 모드 상태 (⚙️ 버튼으로 토글)
  const [isEditing, setIsEditing] = useState(false)

  // 카드 외부 클릭 시 편집 모드 종료 (EDGE-003)
  const cardRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!isEditing) return
    const handleOutsideClick = (e: MouseEvent): void => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
        setIsEditing(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [isEditing])

  // REQ-UX-006-010: 모바일 long-press 250ms, 데스크탑 즉시 활성
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { delay: 250, tolerance: 5 },
    }),
  )

  // REQ-UX-006-011: 드래그 종료 시 순서 변경 → bookmarkStore 영속화
  const handleDragEnd = (event: DragEndEvent): void => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = category.links.findIndex((l) => l.id === active.id)
    const newIndex = category.links.findIndex((l) => l.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return

    const newLinks = arrayMove(category.links, oldIndex, newIndex)
    updateBookmark({ ...category, links: newLinks })
  }

  const linkIds = category.links.map((l) => l.id)

  return (
    <div
      ref={cardRef}
      style={{
        background: 'var(--card-bg)',
        borderRadius: 16,
        padding: '18px 20px',
        border: isEditing ? '1px solid var(--accent)' : '1px solid var(--border)',
        transition: 'transform .15s, box-shadow .15s',
        // @MX:NOTE: [AUTO] grid item 최소너비를 0으로 두어 내부 긴 텍스트가 카드를 밀어내지 않도록 함
        minWidth: 0,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)'
        e.currentTarget.style.boxShadow = '0 8px 24px var(--shadow)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = ''
        e.currentTarget.style.boxShadow = ''
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 14,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 20 }}>{category.icon}</span>
          <span
            style={{
              fontWeight: 700,
              fontSize: 15,
              color: 'var(--text-primary)',
            }}
          >
            {category.name}
          </span>
        </div>
        <button
          onClick={() => {
            // 편집 모드 토글: 편집 모드 진입은 isEditing 토글, 종료는 onEdit 도 호출
            if (isEditing) {
              setIsEditing(false)
            } else {
              setIsEditing(true)
              onEdit(category)
            }
          }}
          data-hover-reveal
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: 14,
            opacity: isEditing ? 1 : 0.35,
            color: isEditing ? 'var(--accent)' : 'var(--text-primary)',
            // SPEC-MOBILE-RESPONSIVE-001: 모바일 터치 hit-area
            minWidth: 44,
            minHeight: 44,
          }}
          aria-label="편집"
          data-testid="bookmark-edit-btn"
        >
          ⚙️
        </button>
      </div>

      {/* REQ-UX-006-008/009: 편집 모드에서만 dnd 활성화 */}
      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <SortableContext items={linkIds} strategy={rectSortingStrategy}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 8,
              maxHeight: 420,
              overflowY: 'auto',
              minWidth: 0,
            }}
          >
            {category.links.map((link) => (
              <SortableLink
                key={link.id}
                link={link}
                isEditing={isEditing}
                onUsage={(id) => recordUsage('bookmark', id)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  )
}
