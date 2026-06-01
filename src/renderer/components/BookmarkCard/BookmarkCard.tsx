// BookmarkCard — 카테고리 북마크 카드 (SPEC-UX-007: 전역 편집 모드 통합, useSortable 지원)
// @MX:NOTE: [AUTO] BookmarkCard — 카테고리 북마크 카드, dnd-kit 정렬 편집 모드 포함
// @MX:SPEC: SPEC-UI-001, SPEC-UX-002, SPEC-UX-006, SPEC-UX-007, SPEC-UX-008, SPEC-UX-009, SPEC-UX-011
import React, { useRef, useMemo } from 'react'
import { useDroppable } from '@dnd-kit/core'
import {
  SortableContext,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useUsageStore } from '../../stores/usageStore'
import { useEditMode } from '../../stores/editModeStore'
import type { Category } from '../../types'
import SortableLink from './SortableLink'
// REQ-UX-009-004: 그룹 핸들 슬롯 컴포넌트
import { DragHandleSlot } from '../common/DragHandleSlot'

interface BookmarkCardProps {
  category: Category
  onEdit: (category: Category) => void
}

export default function BookmarkCard({ category, onEdit }: BookmarkCardProps): React.JSX.Element {
  // SPEC-UX-002: 북마크 클릭 시 usage 기록
  const { recordUsage } = useUsageStore()

  // REQ-UX-007-015: 로컬 isEditing 제거 — 전역 편집 모드 사용
  const { isEditing } = useEditMode()

  // REQ-UX-007-016: 카드 외부 클릭 cleanup useEffect 제거 (전역 토글로 통일)
  const cardRef = useRef<HTMLDivElement>(null)

  // REQ-UX-007-018: 카테고리 자체 useSortable — 편집 모드 OFF 시 disabled
  // (WidgetLayout의 단일 DndContext 내에서 동작, SPEC-UX-008 D1)
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: category.id, disabled: !isEditing, data: { type: 'category' as const } })

  // SPEC-UX-011: 소스 placeholder — opacity 0.4 + dashed outline + accent-soft 배경
  // BUGFIX: DragOverlay 사용 시 active 카드 자체에는 transform을 적용하지 않는다.
  // 그렇지 않으면 DragOverlay ghost와 별개로 원본 카드까지 포인터를 따라가
  // "카드가 화살표 끝으로 점프"하는 현상이 발생한다 (dnd-kit + DragOverlay 표준 패턴).
  const sortableStyle: React.CSSProperties = {
    transform: isDragging ? undefined : CSS.Transform.toString(transform),
    transition: isDragging ? undefined : transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 10 : undefined,
    outline: isDragging ? '1.5px dashed var(--accent-soft, rgba(99,102,241,0.4))' : undefined,
  }

  // REQ-UX-008-003: 링크 grid 영역을 useDroppable로 등록 — 빈 카테고리도 drop target
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: category.id })

  // SPEC-UX-011: linkIds useMemo — 드래그 중 SortableContext id 배열 불안정 방지
  const linkIds = useMemo(() => category.links.map((l) => l.id), [category.links])

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
        // BUGFIX: 모든 카드 높이를 고정하여 드래그·재정렬 시 행 높이 변동으로 인한 세로 jitter 제거.
        // (이전: minHeight:160 — 4링크 카드와 20링크 카드 높이가 200~420px 가변
        //  → CSS Grid 행 높이가 swap 시 바뀌어 카드들이 위아래로 튀는 현상 발생)
        // 카드 내부 링크 그리드가 flex:1로 남은 공간을 채우고 overflowY:auto로 스크롤
        // 220px = 헤더(48) + 헤더 margin(14) + padding(36) + 링크 영역(~122 = 3행 표시)
        height: 220,
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
      {/* 카테고리 헤더 — REQ-UX-007-010: useSortable listeners 만 사용
          SPEC-UX-008 FIX: 위젯 자체 드래그 핸들(widget-drag-handle) 클래스 제거.
          이전에는 react-grid-layout(.widget-drag-handle) 과 dnd-kit useSortable 이 동일 요소에서
          포인터 이벤트를 경쟁해 그룹/링크 DnD 가 깨졌다. 위젯 자체는 위젯 상단 "즐겨찾기" 타이틀로 분리.
          SPEC-UX-011: 헤더 행 전체(비인터랙티브 영역)에도 listeners 확장 — 클릭 가능 요소는 stopPropagation */}
      <div
        ref={cardRef}
        data-category-handle
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 14,
          // SPEC-UX-011: 편집 모드에서 헤더 행 전체에 grab 커서 (핸들 슬롯 외 영역 포함)
          cursor: isEditing ? 'grab' : 'default',
          touchAction: isEditing ? 'none' : undefined,
          userSelect: isEditing ? 'none' : undefined,
          borderRadius: 8,
          // SPEC-UX-011: 호버 시 배경 밝기 상승
          transition: 'background .12s',
        }}
        // SPEC-UX-011: 헤더 행 전체에 dnd-kit listeners spread (편집 모드에서만)
        {...(isEditing ? (listeners as Record<string, unknown>) : {})}
      >
        {/* REQ-UX-009-004: 그룹 핸들 슬롯 — 헤더의 첫 자식, 카테고리 아이콘 좌측
            listeners를 이 슬롯에만 spread하여 카테고리 아이콘/이름 클릭과 분리
            SPEC-UX-011: roleDescription 한국어 오버라이드 */}
        <DragHandleSlot
          level="group"
          ariaLabel={`카테고리 이동: ${category.name}`}
          attributes={attributes as Record<string, unknown>}
          listeners={listeners as Record<string, unknown>}
          isEditing={isEditing}
          roleDescription="정렬 가능한 그룹"
        />
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
        {/* REQ-UX-007-015: ⚙️ 버튼 — 카테고리 메타 편집 모달 열기만 담당
            SPEC-UX-011: stopPropagation으로 헤더 행 listeners 충돌 방지 */}
        <button
          onClick={(e) => {
            // dnd-kit의 포인터 이벤트와 충돌 방지
            e.stopPropagation()
            onEdit(category)
          }}
          onPointerDown={(e) => {
            // SPEC-UX-011: ⚙️ 버튼 pointerdown이 헤더 행 drag listener로 버블링 방지
            e.stopPropagation()
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

      {/* REQ-UX-008-002: BookmarkCard 내부 DndContext 제거 — WidgetLayout 단일 DndContext 사용 (D1)
          REQ-UX-008-004: SortableContext에 id={category.id} 명시 — dnd-kit sortable.containerId 식별
          REQ-UX-008-003: setDropRef로 스크롤 래퍼를 droppable 컨테이너로 등록
          BUGFIX(SPEC-UX-011 회귀): display:grid + flex:1 단일 div에 minHeight:0 누락 시
            암묵적 그리드 행이 flex 컨텍스트에서 압축되어 링크 텍스트가 겹치는 문제 수정.
            → 스크롤 래퍼(flex:1, min-height:0, overflow-y:auto)와 내부 그리드를 분리. */}
      <SortableContext id={category.id} items={linkIds} strategy={rectSortingStrategy}>
        {/* 스크롤 래퍼: flex 자식으로 남은 공간 차지 + 실제 스크롤 컨테이너
            setDropRef를 여기 배치하여 드롭 히트 영역 = 전체 스크롤 영역 (REQ-UX-008-003) */}
        <div
          ref={setDropRef}
          data-scroll-wrapper
          style={{
            flex: 1,
            // CRITICAL: flex 자식이 스크롤되려면 min-height:0 이 필수
            // (기본값 min-height:auto 가 내용물 크기만큼 늘어나 overflow가 동작하지 않음)
            minHeight: 0,
            overflowY: 'auto',
            minWidth: 0,
            // SPEC-UX-011: 드롭 타겟 시각 강화 — dashed outline + inset shadow + 배경
            background: isOver && isEditing ? 'var(--accent-subtle, rgba(99,102,241,0.08))' : undefined,
            borderRadius: isOver && isEditing ? 8 : undefined,
            outline: isOver && isEditing ? '1.5px dashed var(--accent, oklch(0.55 0.2 264))' : undefined,
            boxShadow: isOver && isEditing ? 'inset 0 0 0 1.5px var(--accent, oklch(0.55 0.2 264))' : undefined,
            transition: 'background .12s, outline .12s, box-shadow .12s',
          }}
        >
          {/* 내부 그리드: 링크 아이템 레이아웃만 담당, 스크롤은 부모 래퍼가 처리 */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 8,
              // REQ-UX-008-003 D4: 빈 카테고리도 drop target hit-area 확보 (NFR-003 모바일)
              minHeight: 48,
            }}
          >
            {category.links.map((link) => (
              <SortableLink
                key={link.id}
                link={link}
                isEditing={isEditing}
                onUsage={(id) => recordUsage('bookmark', id)}
                categoryId={category.id}
              />
            ))}
            {/* SPEC-UX-010 REQ-UX-010-011: 빈 카테고리 placeholder (D5) */}
            {category.links.length === 0 && (
              <div
                data-empty-placeholder
                style={{
                  gridColumn: '1 / -1',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '12px 8px',
                  border: '1.5px dashed var(--border)',
                  borderRadius: 8,
                  color: 'var(--text-muted)',
                  fontSize: 12,
                  minHeight: 48,
                  userSelect: 'none',
                }}
              >
                {isEditing ? '여기로 드래그하여 추가' : '북마크가 없습니다'}
              </div>
            )}
          </div>
        </div>
      </SortableContext>
    </div>
  )
}
