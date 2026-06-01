// SortableLink.tsx — @dnd-kit/sortable 기반 드래그 가능한 북마크 링크 항목 컴포넌트
// SPEC-UX-009: 링크 핸들 슬롯 분리 — listeners를 핸들 영역에만 spread
// SPEC-UX-011: 확장 드래그 영역 + 소스 placeholder 시각 개선
// SPEC-UX-012: 칩(chip) 인라인 wrap 스타일 — truncation 완화 + maxWidth 200px
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
 * SPEC-UX-012: 칩 스타일 — flex: '0 0 auto', maxWidth: 200px, padding: '4px 10px'
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

  // SPEC-UX-011: 소스 placeholder — opacity 0.4 + dashed outline + accent-soft 배경
  // BUGFIX: DragOverlay 사용 시 active 링크 자체에는 transform을 적용하지 않는다.
  // 그렇지 않으면 DragOverlay ghost와 별개로 원본 링크까지 포인터를 따라가
  // "링크가 화살표 끝으로 점프"하는 현상이 발생한다 (dnd-kit + DragOverlay 표준 패턴).
  const style: React.CSSProperties = {
    transform: isDragging ? undefined : CSS.Transform.toString(transform),
    transition: isDragging ? undefined : (transition ?? 'background .15s'),
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 10 : undefined,
    // SPEC-UX-011: 드래그 중 dashed outline + accent-soft 배경
    outline: isDragging ? '1.5px dashed var(--accent-soft, rgba(45,212,191,0.40))' : undefined,
    background: isDragging ? 'var(--accent-soft, rgba(45,212,191,0.10))' : 'var(--link-bg)',
    display: 'flex',
    alignItems: 'center',
    gap: 0,
    // SPEC-UX-012 REQ-UX-012-009: 칩 컴팩트 패딩 (4px 10px) — 이전: '2px 12px 2px 0'
    padding: '4px 10px 4px 0',
    // SPEC-UX-012 REQ-UX-012-009: 칩 모서리 둥글게
    borderRadius: 10,
    textDecoration: 'none',
    color: 'var(--text-primary)',
    // SPEC-UX-012 REQ-UX-012-009: 폰트 크기 13px 유지
    fontSize: 13,
    // SPEC-UX-012 REQ-UX-012-010: 칩 width = 내용 기반 (flex: '0 0 auto')
    // — 카드 폭 절반에 강제되지 않음 (기존: minWidth: 0, overflow: 'hidden')
    flex: '0 0 auto',
    // SPEC-UX-012 REQ-UX-012-010: maxWidth 200px — truncation 완화 (기존 2열 그리드 폭 절반 대비 훨씬 넓음)
    maxWidth: 200,
    overflow: 'hidden',
    // REQ-UX-009-008: 편집 모드에서도 링크 본문(이름) 클릭은 드래그 시작 안 함
    cursor: 'default',
  }

  return (
    // REQ-UX-009-013: setNodeRef는 <a> 태그에 유지 (dnd-kit sortable 노드 참조)
    // attributes는 <a>에 spread (sortable 접근성 속성)
    // REQ-UX-009-008: listeners는 DragHandleSlot에만 spread — <a> 본문 제거
    // SPEC-UX-011: 편집 모드에서 링크 이름 텍스트에도 drag listeners 확장
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
        // 드래그 중이 아닐 때만 배경 복원
        if (!isDragging) e.currentTarget.style.background = 'var(--link-bg)'
      }}
    >
      {/* REQ-UX-009-005: 링크 핸들 슬롯 — 링크 행의 첫 자식
          listeners를 이 슬롯에만 spread하여 링크 이름 클릭과 드래그 분리 */}
      <DragHandleSlot
        level="link"
        ariaLabel={`링크 이동: ${link.name}`}
        listeners={listeners as Record<string, unknown>}
        isEditing={isEditing}
        roleDescription="정렬 가능한 링크"
      />
      {/* SPEC-UX-011: 편집 모드에서 링크 이름 텍스트에도 drag listeners 확장
          비편집 모드에서는 일반 span으로 — 링크 클릭 정상 동작
          SPEC-UX-012 REQ-UX-012-010: maxWidth 내 이름 표시, 초과 시 ellipsis (truncation 완화) */}
      {isEditing ? (
        <span
          style={{
            fontWeight: 500,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            // SPEC-UX-012: flex: 1은 유지하되 부모 maxWidth(200px)로 제한
            flex: 1,
            paddingLeft: 4,
            cursor: 'grab',
            touchAction: 'none',
            userSelect: 'none',
          }}
          {...(listeners as Record<string, unknown>)}
        >
          {link.name}
        </span>
      ) : (
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
      )}
    </a>
  )
}
