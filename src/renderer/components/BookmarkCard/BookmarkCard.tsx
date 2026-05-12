// BookmarkCard — 카테고리 북마크 카드 (SPEC-UX-007: 전역 편집 모드 통합, useSortable 지원)
// @MX:NOTE: [AUTO] BookmarkCard — 카테고리 북마크 카드, dnd-kit 정렬 편집 모드 포함
// @MX:SPEC: SPEC-UI-001, SPEC-UX-002, SPEC-UX-006, SPEC-UX-007
import React, { useRef } from 'react'
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
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useUsageStore } from '../../stores/usageStore'
import { useBookmarkStore } from '../../stores/bookmarkStore'
import { useEditMode } from '../../stores/editModeStore'
import type { Category } from '../../types'
import SortableLink from './SortableLink'

interface BookmarkCardProps {
  category: Category
  onEdit: (category: Category) => void
}

export default function BookmarkCard({ category, onEdit }: BookmarkCardProps): React.JSX.Element {
  // SPEC-UX-002: 북마크 클릭 시 usage 기록
  const { recordUsage } = useUsageStore()
  const { updateBookmark } = useBookmarkStore()

  // REQ-UX-007-015: 로컬 isEditing 제거 — 전역 편집 모드 사용
  const { isEditing } = useEditMode()

  // REQ-UX-007-016: 카드 외부 클릭 cleanup useEffect 제거 (전역 토글로 통일)
  const cardRef = useRef<HTMLDivElement>(null)

  // REQ-UX-007-018: 카테고리 자체 useSortable — 편집 모드 OFF 시 disabled
  // (WidgetLayout의 카테고리 SortableContext 내에서 동작, D2 격리 구조)
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: category.id, disabled: !isEditing })

  const sortableStyle: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  }

  // REQ-UX-006-010: 링크 내부 정렬 — 모바일 long-press 250ms, 데스크탑 즉시 활성 (SPEC-UX-006 패턴 유지)
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { delay: 250, tolerance: 5 },
    }),
  )

  // REQ-UX-006-011: 링크 드래그 종료 시 순서 변경 → bookmarkStore 영속화
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
      ref={setNodeRef}
      style={{
        ...sortableStyle,
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
        e.currentTarget.style.transform = isDragging ? '' : 'translateY(-2px)'
        e.currentTarget.style.boxShadow = isDragging ? '' : '0 8px 24px var(--shadow)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = ''
        e.currentTarget.style.boxShadow = ''
      }}
    >
      {/* 카테고리 헤더 — REQ-UX-007-010: widget-drag-handle 역할 + useSortable listeners */}
      <div
        ref={cardRef}
        className="widget-drag-handle"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 14,
          cursor: isEditing ? 'grab' : 'default',
        }}
        // REQ-UX-007-012: 편집 모드에서만 카테고리 드래그 활성 (D2)
        {...(isEditing ? { ...attributes, ...listeners } : {})}
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
        {/* REQ-UX-007-015: ⚙️ 버튼 — 카테고리 메타 편집 모달 열기만 담당 */}
        <button
          onClick={(e) => {
            // dnd-kit의 포인터 이벤트와 충돌 방지
            e.stopPropagation()
            onEdit(category)
          }}
          data-hover-reveal
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: 14,
            // REQ-UX-007-015: 편집 모드 ON일 때만 노출 (opacity 0/1)
            opacity: isEditing ? 1 : 0,
            color: 'var(--accent)',
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

      {/* REQ-UX-006-008/009: 링크 내부 dnd는 별도 DndContext로 격리 (D2) */}
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
