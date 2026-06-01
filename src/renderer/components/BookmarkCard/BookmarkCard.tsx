// BookmarkCard — 카테고리 북마크 카드 (SPEC-UX-007: 전역 편집 모드 통합, useSortable 지원)
// SPEC-UX-012: 고정 높이(220px) 카드 → 멀티 확장 아코디언 + 칩 인라인 wrap 링크 재설계
// @MX:NOTE: [AUTO] BookmarkCard — 카테고리 북마크 카드, dnd-kit 정렬 편집 모드 포함
// @MX:SPEC: SPEC-UI-001, SPEC-UX-002, SPEC-UX-006, SPEC-UX-007, SPEC-UX-008, SPEC-UX-009, SPEC-UX-011, SPEC-UX-012
import React, { useRef, useMemo } from 'react'
import { useDroppable } from '@dnd-kit/core'
import {
  SortableContext,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ChevronDown } from 'lucide-react'
import { useUsageStore } from '../../stores/usageStore'
import { useEditMode } from '../../stores/editModeStore'
import { useFavoritesExpandStore } from '../../stores/favoritesExpandStore'
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

  // SPEC-UX-012: 카테고리 확장 상태 — useFavoritesExpandStore 구독
  const isExpanded = useFavoritesExpandStore((s) => s.isExpanded(category.id))
  const toggleExpand = useFavoritesExpandStore((s) => s.toggleExpand)

  // SPEC-UX-012: 아코디언 패널 id — aria-controls 연결용
  const panelId = `bookmark-panel-${category.id}`

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

  // REQ-UX-008-003: 링크 칩 영역을 useDroppable로 등록 — 빈 카테고리도 drop target
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: category.id })

  // SPEC-UX-011: linkIds useMemo — 드래그 중 SortableContext id 배열 불안정 방지
  const linkIds = useMemo(() => category.links.map((l) => l.id), [category.links])

  // SPEC-UX-012 D2: 헤더 클릭 토글 핸들러
  // — 인터랙티브 컨트롤(⚙️, 핸들)이 아닌 헤더 영역 클릭 시 펼침/접힘 토글
  const handleHeaderClick = () => {
    toggleExpand(category.id)
  }

  // SPEC-UX-012 REQ-UX-012-007: 키보드 Enter/Space 토글
  const handleHeaderKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      toggleExpand(category.id)
    }
  }

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
        // SPEC-UX-012 REQ-UX-012-001: 고정 높이(220px) 제거 — 콘텐츠 기반 자연 확장
        // 이전: height: 220, overflow: 'hidden'
        // 변경 사유: 아코디언 펼침 시 콘텐츠 높이에 맞춰 자연 확장, 접힘 시 헤더만 표시
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
      {/* SPEC-UX-012: 카테고리 헤더 — 아코디언 토글 + 핸들 분리
          D2: listeners를 DragHandleSlot에만 제한 (SPEC-UX-009 원형 회귀)
          헤더 본문 클릭 = 펼침/접힘 토글, 그룹 핸들 = 카테고리 재정렬
          SPEC-UX-008 FIX: widget-drag-handle 제거 (WidgetLayout 분리) */}
      <div
        ref={cardRef}
        data-category-handle
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          // SPEC-UX-012: 펼침 시 하단 여백, 접힘 시 여백 없음
          marginBottom: isExpanded ? 14 : 0,
          // SPEC-UX-012: 헤더 클릭 = 토글 (편집 모드 무관)
          cursor: 'pointer',
          touchAction: isEditing ? 'none' : undefined,
          userSelect: 'none',
          borderRadius: 8,
          transition: 'background .12s',
          // REQ-UX-012-017: 모바일 터치 hit-area 최소 44px
          minHeight: 44,
        }}
        // SPEC-UX-012 REQ-UX-012-006: 헤더 클릭 = 펼침/접힘 토글
        // D2: 헤더 행 전체 listeners spread 제거 — DragHandleSlot에만 제한
        onClick={handleHeaderClick}
        onKeyDown={handleHeaderKeyDown}
        role="button"
        aria-expanded={isExpanded}
        aria-controls={panelId}
        tabIndex={0}
      >
        {/* REQ-UX-009-004: 그룹 핸들 슬롯 래퍼 — 헤더의 첫 자식, 카테고리 아이콘 좌측
            D2: listeners를 이 슬롯에만 spread하여 카테고리 이동과 헤더 토글 분리
            SPEC-UX-012 REQ-UX-012-006: 래퍼 div의 onPointerDown stopPropagation으로 헤더 토글 버블링 차단 */}
        <div
          onPointerDown={(e) => {
            // SPEC-UX-012 REQ-UX-012-006: 그룹 핸들 pointerdown이 헤더 onClick 토글로 버블링 방지
            e.stopPropagation()
          }}
          onClick={(e) => {
            // 그룹 핸들 클릭이 헤더 토글 onClick으로 버블링 방지
            e.stopPropagation()
          }}
          style={{ display: 'flex', alignItems: 'center' }}
        >
          <DragHandleSlot
            level="group"
            ariaLabel={`카테고리 이동: ${category.name}`}
            attributes={attributes as Record<string, unknown>}
            listeners={listeners as Record<string, unknown>}
            isEditing={isEditing}
            roleDescription="정렬 가능한 그룹"
          />
        </div>
        {/* 카테고리 아이콘 + 이름 + 링크 수 배지 (REQ-UX-012-005) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
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
          {/* SPEC-UX-012 REQ-UX-012-005: 링크 수 배지 "(N)" */}
          <span
            style={{
              color: 'var(--text-muted)',
              fontSize: 13,
              fontWeight: 400,
            }}
          >
            ({category.links.length})
          </span>
        </div>
        {/* SPEC-UX-012 REQ-UX-012-005: 펼침/접힘 셰브론 — ChevronDown rotate(180deg) */}
        <ChevronDown
          aria-hidden="true"
          size={16}
          style={{
            color: 'var(--text-muted)',
            // 펼침 시 180도 회전 (위쪽 화살표), 접힘 시 기본(아래쪽)
            transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform .15s ease',
            flexShrink: 0,
          }}
        />
        {/* REQ-UX-007-015: ⚙️ 버튼 — 카테고리 메타 편집 모달 열기만 담당
            SPEC-UX-012 REQ-UX-012-006: stopPropagation으로 헤더 토글 차단 */}
        <button
          onClick={(e) => {
            // 헤더 클릭 토글로 버블링 방지
            e.stopPropagation()
            onEdit(category)
          }}
          onPointerDown={(e) => {
            // SPEC-UX-012: ⚙️ 버튼 pointerdown이 헤더 토글로 버블링 방지
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

      {/* SPEC-UX-012 REQ-UX-012-008: 펼침 상태에서만 링크 칩 영역 렌더
          REQ-UX-008-002: BookmarkCard 내부 DndContext 제거 — WidgetLayout 단일 DndContext 사용 (D1)
          REQ-UX-008-004: SortableContext에 id={category.id} 명시 — dnd-kit sortable.containerId 식별
          REQ-UX-008-003: setDropRef로 칩 컨테이너를 droppable 컨테이너로 등록 */}
      {isExpanded && (
        <SortableContext id={category.id} items={linkIds} strategy={rectSortingStrategy}>
          {/* SPEC-UX-012 REQ-UX-012-008: 칩 flex-wrap 컨테이너 (기존 스크롤 래퍼 + 2열 그리드 제거)
              setDropRef 배치 — 드롭 히트 영역 = 전체 칩 영역
              SPEC-UX-011: isOver 시각 — dashed outline + accent-subtle 배경 */}
          <div
            ref={setDropRef}
            id={panelId}
            data-scroll-wrapper
            role="region"
            aria-label={`${category.name} 링크 목록`}
            style={{
              // SPEC-UX-012 REQ-UX-012-008: flex-wrap 칩 레이아웃 (2열 그리드 대체)
              display: 'flex',
              flexWrap: 'wrap',
              gap: 8,
              minWidth: 0,
              // SPEC-UX-011: 드롭 타겟 시각 강화
              background: isOver && isEditing ? 'var(--accent-subtle, rgba(99,102,241,0.08))' : undefined,
              borderRadius: isOver && isEditing ? 8 : undefined,
              outline: isOver && isEditing ? '1.5px dashed var(--accent, oklch(0.55 0.2 264))' : undefined,
              boxShadow: isOver && isEditing ? 'inset 0 0 0 1.5px var(--accent, oklch(0.55 0.2 264))' : undefined,
              transition: 'background .12s, outline .12s, box-shadow .12s',
              // REQ-UX-008-003 D4: 빈 카테고리도 drop target hit-area 확보
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
            {/* SPEC-UX-010 REQ-UX-010-011: 빈 카테고리 placeholder (D6)
                SPEC-UX-012 REQ-UX-012-014: cross-group 비목표이므로 "북마크가 없습니다"로 단순화 */}
            {category.links.length === 0 && (
              <div
                data-empty-placeholder
                style={{
                  flex: '1 1 100%',
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
                북마크가 없습니다
              </div>
            )}
          </div>
        </SortableContext>
      )}
    </div>
  )
}
