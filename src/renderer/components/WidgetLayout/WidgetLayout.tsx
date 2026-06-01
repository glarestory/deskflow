// @MX:NOTE: [AUTO] WidgetLayout — Responsive 그리드 레이아웃 컴포넌트 (SPEC-UX-006 반응형 그리드 전환)
// @MX:NOTE: [AUTO] App.tsx에서 추출 (SPEC-UX-005 T-003). viewMode === 'widgets'일 때 렌더링됨
// @MX:SPEC: SPEC-UX-005, SPEC-LAYOUT-001, SPEC-UI-001, SPEC-CAPSULE-001, SPEC-MOBILE-RESPONSIVE-001, SPEC-UX-006, SPEC-UX-011
import { useMemo, useState, useCallback, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Responsive, WidthProvider } from 'react-grid-layout/legacy'
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'
import { Pencil, Check } from 'lucide-react'
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type Announcements,
} from '@dnd-kit/core'
import { SortableContext, arrayMove, rectSortingStrategy, sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import type { Category, Link } from '../../types'
import type { WidgetLayout as WidgetLayoutItem } from '../../stores/layoutStore'
import { useBookmarkStore } from '../../stores/bookmarkStore'
import { useThemeStore } from '../../stores/themeStore'
import { useLayoutStore } from '../../stores/layoutStore'
import { useAuthStore } from '../../stores/authStore'
import { useIsMobile } from '../../hooks/useIsMobile'
import { useEditMode } from '../../stores/editModeStore'
// SPEC-UX-010 REQ-UX-010-003: 편집 히스토리 undo/clear 통합
import { useEditHistoryStore } from '../../stores/editHistoryStore'
// SPEC-UX-010 REQ-UX-010-012: 드래그 시작 시 햅틱 피드백
import { tryHaptic } from '../../utils/haptic'
import Clock from '../Clock/Clock'
import SearchBar from '../SearchBar/SearchBar'
import BookmarkCard from '../BookmarkCard/BookmarkCard'
import TodoWidget from '../TodoWidget/TodoWidget'
import NotesWidget from '../NotesWidget/NotesWidget'
import FeedWidget from '../FeedWidget/FeedWidget'
import CapsuleSwitcher from '../CapsuleSwitcher/CapsuleSwitcher'
import HeaderMoreMenu from './HeaderMoreMenu'
// REQ-UX-009-003: 위젯 핸들 슬롯 컴포넌트
import { DragHandleSlot } from '../common/DragHandleSlot'

// @MX:NOTE: [AUTO] WidthProvider가 컨테이너 너비를 자동 측정하여 Responsive 그리드에 주입
const ResponsiveGridLayout = WidthProvider(Responsive)

// REQ-UX-006-001: 브레이크포인트 및 컬럼 수 설정
const BREAKPOINTS = { lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }
const COLS = { lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }

const GRID_ROW_HEIGHT = 60
const GRID_MARGIN: [number, number] = [16, 16]

// SPEC-MOBILE-RESPONSIVE-001: 모바일 xs/xxs 단일 컬럼 세로 스택
const MOBILE_LAYOUT: WidgetLayoutItem[] = [
  { i: 'clock', x: 0, y: 0, w: 1, h: 2 },
  { i: 'search', x: 0, y: 2, w: 1, h: 2 },
  { i: 'bookmarks', x: 0, y: 4, w: 1, h: 6 },
  { i: 'todo', x: 0, y: 10, w: 1, h: 5 },
  { i: 'notes', x: 0, y: 15, w: 1, h: 4 },
  { i: 'feed', x: 0, y: 19, w: 1, h: 4 },
]

// xs/xxs 브레이크포인트 판별 (REQ-UX-006-002)
const MOBILE_BREAKPOINTS = new Set(['xs', 'xxs'])

/** WidgetLayout 컴포넌트 props */
export interface WidgetLayoutProps {
  /** 카테고리 추가 핸들러 */
  handleAddCategory: () => void
  /** 레이아웃 변경 핸들러 */
  handleLayoutChange: (newLayout: WidgetLayoutItem[]) => void
  /** 가져오기 모달 열기 */
  onOpenImport: () => void
  /** 빠른 추가 모달 열기 */
  onOpenQuickCapture: () => void
  /** 중복 탐지 모달 열기 */
  onOpenDedup: () => void
  /** 카테고리 편집 설정 */
  onSetEditingCategory: (category: Category | null) => void
  /** Pivot 모드로 전환 */
  onTogglePivotMode: () => void
  /** SPEC-CAPSULE-001: 캡슐 목록 패널 열기 */
  onOpenCapsuleList: () => void
  /** SPEC-CAPSULE-001: 신규 캡슐 생성 모달 열기 */
  onOpenCreateCapsule: () => void
}

/**
 * SPEC-LAYOUT-001 / SPEC-UX-006 기반 Responsive 드래그 위젯 그리드 레이아웃.
 * viewMode === 'widgets'일 때 App.tsx에서 렌더링된다.
 */
export default function WidgetLayout({
  handleAddCategory,
  handleLayoutChange,
  onOpenImport,
  onOpenQuickCapture,
  onOpenDedup,
  onSetEditingCategory,
  onTogglePivotMode,
  onOpenCapsuleList,
  onOpenCreateCapsule,
}: WidgetLayoutProps): JSX.Element {
  const { bookmarks, exportBookmarks } = useBookmarkStore()
  const { mode, toggleMode } = useThemeStore()
  const { layout, resetLayout } = useLayoutStore()
  const { user, signOut } = useAuthStore()
  const isMobile = useIsMobile()
  // REQ-UX-007-001: 전역 편집 모드 상태
  const { isEditing, toggle: toggleEditMode, set: setEditMode, autoExitEnabled, isDragging: isDragInProgress, setDragging } = useEditMode()

  // REQ-UX-006-003: 현재 브레이크포인트 상태 (Responsive onBreakpointChange 콜백에서 갱신)
  const [currentBreakpoint, setCurrentBreakpoint] = useState<string>('lg')

  // SPEC-UX-011: 센서 조건부 설정 — isMobileBreakpoint는 아래에서 선언되므로 currentBreakpoint로 직접 판별
  // - 모바일(isMobile 또는 xs/xxs bp): long-press delay 200ms, tolerance 5 (터치 스크롤과 구분)
  // - 데스크탑: distance 5px (클릭 vs 드래그를 명확히 구분, long-press 불필요)
  // REQ-UX-009-003 (M5): KeyboardSensor — Space/Enter 드래그, 방향키 이동, Esc 취소 (WCAG 2.1.1)
  const isMobileSensor = isMobile || MOBILE_BREAKPOINTS.has(currentBreakpoint)
  const categorySensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: isMobileSensor
        ? { delay: 200, tolerance: 5 }
        : { distance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  const { reorderCategories, updateBookmark, moveLinkBetweenGroups } = useBookmarkStore()

  // D7 옵션 B: dragging 중 in-memory 임시 상태 (영속화는 dragEnd에서만)
  const [localBookmarks, setLocalBookmarks] = useState<Category[] | null>(null)

  // dragStart 시 원본 카테고리 id를 ref에 저장 (dragOver 이후에도 원본 추적)
  const originalCategoryIdRef = useRef<string | null>(null)
  // DragOverlay 렌더링을 위한 active 링크 상태
  const [activeLink, setActiveLink] = useState<Link | null>(null)
  // SPEC-UX-011: DragOverlay — active 카테고리 상태 (그룹 드래그 overlay용)
  const [activeCategory, setActiveCategory] = useState<Category | null>(null)

  // REQ-UX-008-001: onDragStart — active 항목 종류 분기, 원본 카테고리 기억
  // SPEC-UX-010 REQ-UX-010-012: 드래그 시작 시 햅틱 피드백
  // SPEC-UX-011: setDragging(true)로 자동 종료 타이머 일시 중지
  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      // 모바일 드래그 시작 시 10ms 햅틱 (REQ-UX-010-012)
      tryHaptic(10)
      // SPEC-UX-011: 드래그 시작 — 자동 종료 타이머 일시 중지
      setDragging(true)
      const { active } = event
      if (active.data.current?.type === 'link') {
        const categoryId = active.data.current.categoryId as string
        originalCategoryIdRef.current = categoryId
        // DragOverlay 렌더링을 위해 active 링크 객체 추출
        const source = bookmarks.find((b) => b.id === categoryId)
        const link = source?.links.find((l) => l.id === active.id)
        setActiveLink(link ?? null)
        setActiveCategory(null)
        // 임시 상태를 store bookmarks로 초기화
        setLocalBookmarks(bookmarks.map((b) => ({ ...b, links: [...b.links] })))
      } else if (active.data.current?.type === 'category') {
        // SPEC-UX-011: 그룹 DragOverlay — active 카테고리 객체 추출
        const category = bookmarks.find((b) => b.id === String(active.id))
        setActiveCategory(category ?? null)
        setActiveLink(null)
        originalCategoryIdRef.current = null
      } else {
        originalCategoryIdRef.current = null
        setActiveLink(null)
        setActiveCategory(null)
      }
    },
    [bookmarks, setDragging],
  )

  // REQ-UX-008-010: onDragOver — 카테고리 간 이동을 in-memory 상태로 미리 반영
  // 영속화 금지 (REQ-UX-008-013)
  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const { active, over } = event
      if (!over) return
      // link 드래그만 처리
      if (active.data.current?.type !== 'link') return

      const sourceCategoryId = active.data.current.categoryId as string
      // over가 링크 카드면 sortable.containerId, over가 droppable 컨테이너면 over.id
      const targetCategoryId =
        (over.data.current?.sortable?.containerId as string | undefined) ?? String(over.id)

      // 같은 카테고리면 no-op (단일 그룹 정렬은 dragEnd에서 처리)
      if (sourceCategoryId === targetCategoryId) return

      // 임시 상태 갱신 (in-memory only, 영속화 없음)
      setLocalBookmarks((prev) => {
        const base = prev ?? bookmarks
        const linkId = String(active.id)

        const fromCat = base.find((b) => b.id === sourceCategoryId)
        const toCat = base.find((b) => b.id === targetCategoryId)
        if (!fromCat || !toCat) return prev

        const link = fromCat.links.find((l) => l.id === linkId)
        if (!link) return prev

        const nextFromLinks = fromCat.links.filter((l) => l.id !== linkId)
        // over가 링크 카드이면 그 인덱스에 삽입, over가 컨테이너이면 끝에 삽입
        const overLinkIndex = toCat.links.findIndex((l) => l.id === String(over.id))
        const insertIndex = overLinkIndex >= 0 ? overLinkIndex : toCat.links.length
        const nextToLinks = [
          ...toCat.links.slice(0, insertIndex),
          link,
          ...toCat.links.slice(insertIndex),
        ]

        return base.map((b) => {
          if (b.id === sourceCategoryId) return { ...b, links: nextFromLinks }
          if (b.id === targetCategoryId) return { ...b, links: nextToLinks }
          return b
        })
      })
    },
    [bookmarks],
  )

  // REQ-UX-008-001: handleDragEnd — active type 분기로 카테고리/링크 처리 통합
  // SPEC-UX-011: setDragging(false)로 자동 종료 타이머 재개
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event

      // SPEC-UX-011: 드래그 종료 — 자동 종료 타이머 재개
      setDragging(false)
      // dragEnd 후 임시 상태와 overlay 초기화
      setLocalBookmarks(null)
      setActiveLink(null)
      setActiveCategory(null)

      if (!over) {
        originalCategoryIdRef.current = null
        return
      }

      if (active.data.current?.type === 'category') {
        // REQ-UX-007-013: 카테고리 자체 정렬 — 기존 SPEC-UX-007 동작 유지
        if (active.id === over.id) {
          originalCategoryIdRef.current = null
          return
        }
        const ids = bookmarks.map((b) => b.id)
        const oldIndex = ids.indexOf(String(active.id))
        const newIndex = ids.indexOf(String(over.id))
        if (oldIndex !== -1 && newIndex !== -1) {
          reorderCategories(arrayMove(ids, oldIndex, newIndex))
        }
        originalCategoryIdRef.current = null
        return
      }

      if (active.data.current?.type === 'link') {
        const originalCategoryId = originalCategoryIdRef.current
        originalCategoryIdRef.current = null

        if (!originalCategoryId) return

        const linkId = String(active.id)
        // over가 링크이면 containerId, over가 droppable 컨테이너이면 over.id
        const finalTargetCategoryId =
          (over.data.current?.sortable?.containerId as string | undefined) ?? String(over.id)

        if (originalCategoryId === finalTargetCategoryId) {
          // REQ-UX-008-006: 단일 그룹 정렬 (SPEC-UX-006 패턴 유지)
          if (active.id === over.id) {
            // REQ-UX-008-016: 같은 위치 no-op
            return
          }
          const cat = bookmarks.find((b) => b.id === originalCategoryId)
          if (!cat) return
          const oldIndex = cat.links.findIndex((l) => l.id === linkId)
          const newIndex = cat.links.findIndex((l) => l.id === String(over.id))
          if (oldIndex === -1 || newIndex === -1) return
          updateBookmark({ ...cat, links: arrayMove(cat.links, oldIndex, newIndex) })
        } else {
          // REQ-UX-008-007: 그룹 간 이동 — moveLinkBetweenGroups 1회 호출
          const toCat = bookmarks.find((b) => b.id === finalTargetCategoryId)
          if (!toCat) return
          const overLinkIndex = toCat.links.findIndex((l) => l.id === String(over.id))
          // over가 링크이면 그 인덱스, over가 droppable 컨테이너이면 끝(links.length)
          const toIndex = overLinkIndex >= 0 ? overLinkIndex : toCat.links.length
          moveLinkBetweenGroups(linkId, originalCategoryId, finalTargetCategoryId, toIndex)
        }
      }
    },
    [bookmarks, reorderCategories, updateBookmark, moveLinkBetweenGroups, setDragging],
  )

  // REQ-UX-008-013: dragCancel 시 임시 상태 복원 (영속화 없음)
  // SPEC-UX-011: setDragging(false)로 자동 종료 타이머 재개
  const handleDragCancel = useCallback(() => {
    setDragging(false)
    setLocalBookmarks(null)
    setActiveLink(null)
    setActiveCategory(null)
    originalCategoryIdRef.current = null
  }, [setDragging])

  // D7 옵션 B: 렌더링에 사용할 bookmarks — dragging 중에는 임시, 아니면 store
  const displayBookmarks = localBookmarks ?? bookmarks

  // SPEC-UX-011: SortableContext id 배열 useMemo — 드래그 중 배열 불안정 방지
  const displayBookmarkIds = useMemo(() => displayBookmarks.map((b) => b.id), [displayBookmarks])

  // SPEC-UX-011: 스크린 리더 공지용 이름 헬퍼 — id로 링크/카테고리 이름 조회
  const getNameById = useCallback(
    (id: string | number): string => {
      const sid = String(id)
      for (const cat of displayBookmarks) {
        if (cat.id === sid) return cat.name
        const link = cat.links.find((l) => l.id === sid)
        if (link) return link.name
      }
      return sid
    },
    [displayBookmarks],
  )

  // SPEC-UX-011: dnd-kit accessibility announcements (한국어 스크린 리더 공지)
  const dndAnnouncements: Announcements = useMemo(() => ({
    onDragStart({ active }) {
      const name = getNameById(active.id)
      const kind = active.data.current?.type === 'category' ? '그룹' : '항목'
      return `${name} ${kind}을(를) 들었습니다.`
    },
    onDragOver({ active, over }) {
      const activeName = getNameById(active.id)
      if (!over) return `${activeName} 항목이 드롭 가능한 영역 밖에 있습니다.`
      const overName = getNameById(over.id)
      return `${activeName} 항목을 ${overName} 위에 놓을 수 있습니다.`
    },
    onDragEnd({ active, over }) {
      const activeName = getNameById(active.id)
      if (!over) return `드래그가 취소되었습니다. ${activeName} 항목이 원위치로 돌아갔습니다.`
      const overName = getNameById(over.id)
      return `${activeName} 항목을 ${overName} 위치로 옮겼습니다.`
    },
    onDragCancel({ active }) {
      const activeName = getNameById(active.id)
      return `드래그가 취소되었습니다. ${activeName} 항목이 원위치로 돌아갔습니다.`
    },
  }), [getNameById])

  // REQ-UX-006-002: xs/xxs 에서 드래그·리사이즈 비활성
  const isMobileBreakpoint = MOBILE_BREAKPOINTS.has(currentBreakpoint)

  // 모바일 단일 컬럼 레이아웃 또는 저장된 lg 레이아웃 사용
  // @MX:NOTE: [AUTO] xs/xxs 브레이크포인트에서는 MOBILE_LAYOUT 강제 적용
  const activeLayout = useMemo(
    () => (isMobile ? MOBILE_LAYOUT : layout),
    [isMobile, layout],
  )

  // 모바일에서는 layout 변경이 propagate 되지 않도록 onLayoutChange 무력화
  const onLayoutChangeGuarded = (newLayout: WidgetLayoutItem[]): void => {
    if (isMobile || isMobileBreakpoint) return
    handleLayoutChange(newLayout)
  }

  // REQ-UX-006-007: 드래그 중 body 스크롤 격리 — 동시 드래그 카운터
  const draggingCount = useMemo(() => ({ value: 0 }), [])

  const onDragStart = useCallback(() => {
    // SPEC-UX-010 REQ-UX-010-012: 위젯 드래그 시작 시 햅틱 피드백
    tryHaptic(10)
    draggingCount.value += 1
    document.body.classList.add('is-dragging-widget')
  }, [draggingCount])

  const onDragStop = useCallback(() => {
    draggingCount.value -= 1
    if (draggingCount.value <= 0) {
      draggingCount.value = 0
      document.body.classList.remove('is-dragging-widget')
    }
  }, [draggingCount])

  // EDGE-004: unmount 시 is-dragging-widget 클래스 제거 (leak 방지)
  useEffect(() => {
    return () => {
      document.body.classList.remove('is-dragging-widget')
    }
  }, [])

  // REQ-UX-007-008: 편집 모드 ON/OFF 시 body.is-edit-mode 클래스 토글 (D4)
  // EDGE-003: PivotLayout 전환으로 unmount 시 클래스 누수 방지
  useEffect(() => {
    document.body.classList.toggle('is-edit-mode', isEditing)
    return () => {
      document.body.classList.remove('is-edit-mode')
    }
  }, [isEditing])

  // REQ-UX-007-007: Esc 키로 편집 모드 종료 (D3)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape' && isEditing) {
        setEditMode(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isEditing, setEditMode])

  // SPEC-UX-010 REQ-UX-010-001: Cmd+Z / Ctrl+Z Undo 단축키 (편집 모드 ON 한정)
  // EDGE-004: input/textarea/select 포커스 중에는 브라우저 기본 undo 허용
  useEffect(() => {
    if (!isEditing) return
    const handleUndoKey = (e: KeyboardEvent): void => {
      if (!(e.metaKey || e.ctrlKey) || e.key !== 'z' || e.shiftKey) return
      // input/textarea/select 포커스 중에는 undo 단축키 무시
      const tag = (document.activeElement as HTMLElement | null)?.tagName?.toUpperCase()
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      e.preventDefault()
      useEditHistoryStore.getState().undo()
    }
    window.addEventListener('keydown', handleUndoKey)
    return () => window.removeEventListener('keydown', handleUndoKey)
  }, [isEditing])

  // SPEC-UX-010 REQ-UX-010-002: 편집 모드 OFF 전환 시 히스토리 clear (EDGE-002)
  const prevIsEditingRef = useRef<boolean>(isEditing)
  useEffect(() => {
    if (prevIsEditingRef.current && !isEditing) {
      useEditHistoryStore.getState().clear()
    }
    prevIsEditingRef.current = isEditing
  }, [isEditing])

  // SPEC-UX-010 REQ-UX-010-008: 편집 모드 자동 종료 + 카운트다운 표시 + 활동 시 리셋
  // 사용자 피드백 반영: 30초 → 120초로 연장, 남은 시간을 편집 버튼에 표시,
  // 위젯 영역에서 pointer/keyboard 활동 시 타이머 리셋
  // SPEC-UX-011: 드래그 중(isDragInProgress=true)에는 타이머 카운트다운 정지
  const AUTO_EXIT_SECONDS = 120
  const [remainingSeconds, setRemainingSeconds] = useState<number>(AUTO_EXIT_SECONDS)
  const lastActivityRef = useRef<number>(Date.now())

  useEffect(() => {
    if (!isEditing || !autoExitEnabled) {
      setRemainingSeconds(AUTO_EXIT_SECONDS)
      return
    }
    lastActivityRef.current = Date.now()
    setRemainingSeconds(AUTO_EXIT_SECONDS)

    // 1초마다 남은 시간 계산, 0 도달 시 편집 모드 종료
    // SPEC-UX-011: isDragInProgress가 true이면 lastActivityRef를 현재 시각으로 갱신 (타이머 정지 효과)
    const intervalId = setInterval(() => {
      if (isDragInProgress) {
        // 드래그 중에는 활동 시각 갱신으로 타이머 정지
        lastActivityRef.current = Date.now()
        return
      }
      const elapsed = Math.floor((Date.now() - lastActivityRef.current) / 1000)
      const remaining = Math.max(0, AUTO_EXIT_SECONDS - elapsed)
      setRemainingSeconds(remaining)
      if (remaining === 0) {
        setEditMode(false)
      }
    }, 1000)

    // 사용자 활동(pointer/key) 시 타이머 리셋
    const onActivity = (): void => {
      lastActivityRef.current = Date.now()
    }
    document.addEventListener('pointerdown', onActivity, true)
    document.addEventListener('keydown', onActivity, true)

    return () => {
      clearInterval(intervalId)
      document.removeEventListener('pointerdown', onActivity, true)
      document.removeEventListener('keydown', onActivity, true)
    }
  }, [isEditing, autoExitEnabled, setEditMode, isDragInProgress])

  const handlePivotModeClick = (): void => {
    onTogglePivotMode()
  }

  // REQ-UX-006-019: 모바일에서만 safe-area inset 적용
  const safeAreaPadding = isMobile
    ? {
        paddingTop: 'env(safe-area-inset-top)',
        paddingLeft: 'env(safe-area-inset-left)',
        paddingRight: 'env(safe-area-inset-right)',
      }
    : {}

  return (
    <div
      style={{
        background: 'var(--bg)',
        height: '100vh',
        overflowY: 'auto',
        overflowX: 'hidden',
        transition: 'background .3s',
      }}
    >
      {/* TopBar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: isMobile ? '12px 12px' : '16px 28px',
          maxWidth: 1440,
          margin: '0 auto',
          flexWrap: isMobile ? 'wrap' : 'nowrap',
          gap: isMobile ? 8 : 0,
          ...safeAreaPadding,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 10,
              background: 'var(--accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 16,
            }}
          >
            🚀
          </div>
          <span
            style={{
              fontWeight: 700,
              fontSize: 16,
              color: 'var(--text-primary)',
              letterSpacing: -0.5,
            }}
          >
            My Hub
          </span>
          {/* @MX:NOTE: [AUTO] SPEC-CAPSULE-001 REQ-012: 상단 바 좌측 CapsuleSwitcher */}
          <CapsuleSwitcher
            onOpenList={onOpenCapsuleList}
            onOpenCreate={onOpenCreateCapsule}
          />
        </div>

        {/* REQ-UX-006-012: 모바일에서는 More 메뉴 + 직접 노출 2개만, 데스크탑은 전체 버튼 */}
        {isMobile ? (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {/* 빠른 추가 — 항상 직접 노출 */}
            <button
              data-testid="quick-capture-btn"
              onClick={onOpenQuickCapture}
              style={{
                padding: '7px 14px',
                borderRadius: 10,
                border: '1px solid var(--border)',
                background: 'var(--card-bg)',
                color: 'var(--text-muted)',
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              빠른 추가
            </button>
            {/* 테마 토글 — 항상 직접 노출 */}
            <button
              data-testid="theme-toggle"
              onClick={toggleMode}
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                border: '1px solid var(--border)',
                background: 'var(--card-bg)',
                fontSize: 18,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {mode === 'dark' ? '☀️' : '🌙'}
            </button>
            {/* More 메뉴 (7개 축소 액션) */}
            <HeaderMoreMenu
              handleAddCategory={handleAddCategory}
              onOpenImport={onOpenImport}
              exportBookmarks={exportBookmarks}
              onOpenDedup={onOpenDedup}
              resetLayout={resetLayout}
              onTogglePivotMode={handlePivotModeClick}
              signOut={signOut}
              isEditing={isEditing}
              onToggleEdit={toggleEditMode}
            />
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            {/* 사용자 정보 및 로그아웃 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {user !== null && user.photoURL !== null && (
                <img
                  src={user.photoURL}
                  alt="프로필"
                  style={{ width: 28, height: 28, borderRadius: '50%', border: '1px solid var(--border)' }}
                />
              )}
              {user !== null && (
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {user.displayName ?? user.email ?? '사용자'}
                </span>
              )}
            </div>
            <button
              data-testid="logout-btn"
              onClick={() => { void signOut() }}
              style={{
                padding: '7px 14px',
                borderRadius: 10,
                border: '1px solid var(--border)',
                background: 'var(--card-bg)',
                color: 'var(--text-muted)',
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              로그아웃
            </button>
            <button
              onClick={handleAddCategory}
              style={{
                padding: '7px 14px',
                borderRadius: 10,
                border: '1px solid var(--border)',
                background: 'var(--card-bg)',
                color: 'var(--text-muted)',
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              + 카테고리
            </button>
            <button
              onClick={onOpenImport}
              style={{
                padding: '7px 14px',
                borderRadius: 10,
                border: '1px solid var(--border)',
                background: 'var(--card-bg)',
                color: 'var(--text-muted)',
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              + 가져오기
            </button>
            {/* SPEC-BOOKMARK-002: 빠른 추가 버튼 */}
            <button
              data-testid="quick-capture-btn"
              onClick={onOpenQuickCapture}
              style={{
                padding: '7px 14px',
                borderRadius: 10,
                border: '1px solid var(--border)',
                background: 'var(--card-bg)',
                color: 'var(--text-muted)',
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              빠른 추가
            </button>
            {/* SPEC-BOOKMARK-002: 내보내기 버튼 */}
            <button
              data-testid="export-bookmarks-btn"
              onClick={exportBookmarks}
              style={{
                padding: '7px 14px',
                borderRadius: 10,
                border: '1px solid var(--border)',
                background: 'var(--card-bg)',
                color: 'var(--text-muted)',
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              내보내기
            </button>
            {/* SPEC-BOOKMARK-002: 중복 탐지 버튼 */}
            <button
              data-testid="dedup-btn"
              onClick={onOpenDedup}
              style={{
                padding: '7px 14px',
                borderRadius: 10,
                border: '1px solid var(--border)',
                background: 'var(--card-bg)',
                color: 'var(--text-muted)',
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              중복 탐지
            </button>
            {/* REQ-005: 레이아웃 초기화 버튼 */}
            <button
              data-testid="reset-layout-btn"
              onClick={resetLayout}
              style={{
                padding: '7px 14px',
                borderRadius: 10,
                border: '1px solid var(--border)',
                background: 'var(--card-bg)',
                color: 'var(--text-muted)',
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              레이아웃 초기화
            </button>
            {/* REQ-UX-007-002: 데스크탑 편집 모드 토글 버튼 */}
            <button
              data-testid="edit-mode-toggle"
              onClick={toggleEditMode}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: '7px 14px',
                borderRadius: 10,
                border: isEditing ? '1px solid var(--accent)' : '1px solid var(--border)',
                background: isEditing ? 'var(--accent)' : 'var(--card-bg)',
                color: isEditing ? '#fff' : 'var(--text-muted)',
                fontSize: 12,
                cursor: 'pointer',
                fontWeight: isEditing ? 600 : 400,
              }}
            >
              {isEditing ? <Check size={14} /> : <Pencil size={14} />}
              {isEditing ? (
                <>
                  완료
                  {autoExitEnabled && (
                    <span
                      data-testid="edit-mode-countdown"
                      aria-label={`자동 종료까지 ${remainingSeconds}초 남음`}
                      style={{
                        marginLeft: 6,
                        fontSize: 11,
                        opacity: 0.85,
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {Math.floor(remainingSeconds / 60)}:
                      {String(remainingSeconds % 60).padStart(2, '0')}
                    </span>
                  )}
                </>
              ) : (
                '편집'
              )}
            </button>
            {/* T-005: SPEC-UX-005 — Pivot 모드 전환 버튼 */}
            <button
              data-testid="pivot-mode-btn"
              onClick={handlePivotModeClick}
              style={{
                padding: '7px 14px',
                borderRadius: 10,
                border: '1px solid var(--accent)',
                background: 'var(--card-bg)',
                color: 'var(--accent)',
                fontSize: 12,
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              Pivot 모드
            </button>
            <button
              data-testid="theme-toggle"
              onClick={toggleMode}
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                border: '1px solid var(--border)',
                background: 'var(--card-bg)',
                fontSize: 18,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {mode === 'dark' ? '☀️' : '🌙'}
            </button>
          </div>
        )}
      </div>

      {/* REQ-UX-006-014: 모바일에서 SearchBar 를 헤더 외부 자체 row 로 배치 */}
      {isMobile && (
        <div
          style={{
            maxWidth: 1440,
            margin: '0 auto',
            padding: '0 12px 8px',
          }}
        >
          <div style={{ width: '100%' }}>
            <SearchBar />
          </div>
        </div>
      )}

      {/* 메인 그리드 레이아웃 (react-grid-layout Responsive) */}
      <div
        data-testid="widget-grid-container"
        style={{
          maxWidth: 1440,
          margin: '0 auto',
          padding: isMobile ? '0 12px 24px' : '0 28px 40px',
        }}
      >
        <ResponsiveGridLayout
          layouts={{ lg: activeLayout }}
          breakpoints={BREAKPOINTS}
          cols={COLS}
          rowHeight={GRID_ROW_HEIGHT}
          margin={GRID_MARGIN}
          onLayoutChange={onLayoutChangeGuarded}
          onBreakpointChange={(bp) => setCurrentBreakpoint(bp)}
          draggableHandle="[data-widget-handle]"
          isResizable={isEditing && !isMobile && !isMobileBreakpoint}
          isDraggable={isEditing && !isMobile && !isMobileBreakpoint}
          measureBeforeMount={false}
          onDragStart={onDragStart}
          onDragStop={onDragStop}
        >
          {/* Clock 위젯 — REQ-UX-007-010: 헤더 없으므로 셀 래퍼에 drag-handle 부여 (D1)
              REQ-UX-009-003: DragHandleSlot level="widget" 추가 (시각 마커, 절대 위치)
              SPEC-UX-011: data-widget-handle 속성 추가 — draggableHandle 셀렉터 [data-widget-handle] 매칭 */}
          <div key="clock" className="widget-drag-handle" data-widget-handle style={{ background: 'transparent', position: 'relative' }}>
            <DragHandleSlot
              level="widget"
              ariaLabel="위젯 이동: 시계"
              isEditing={isEditing && !isMobile && !isMobileBreakpoint}
            />
            <Clock />
          </div>

          {/* SearchBar 위젯 — 데스크탑에서만 그리드 내부에 표시 (REQ-UX-007-010: 셀 래퍼에 drag-handle)
              REQ-UX-009-003: DragHandleSlot level="widget" 추가 (시각 마커, 절대 위치)
              SPEC-UX-011: data-widget-handle 속성 추가 */}
          <div key="search" className="widget-drag-handle" data-widget-handle style={{ background: 'transparent', position: 'relative' }}>
            <DragHandleSlot
              level="widget"
              ariaLabel="위젯 이동: 검색"
              isEditing={isEditing && !isMobile && !isMobileBreakpoint}
            />
            {!isMobile && <SearchBar />}
          </div>

          {/* Bookmarks 위젯 */}
          {/* @MX:NOTE: [AUTO] SPEC-LAYOUT-002 Step 3 — 스크롤 컨테이너와 내부 grid 분리 */}
          {/* REQ-UX-008-001: 단일 DndContext로 카테고리 정렬 + 링크 이동 통합 (D1) */}
          <div
            key="bookmarks"
            style={{
              background: 'var(--card-bg)',
              borderRadius: 12,
              border: '1px solid var(--border)',
              overflowX: 'hidden',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* 즐겨찾기 위젯 타이틀 — react-grid-layout 전용 드래그 핸들 (BookmarkCard 카테고리 헤더와 분리)
                widget-drag-handle 클래스는 위젯 타이틀에만 부여하여 내부 dnd-kit DnD와의 충돌 제거
                REQ-UX-009-003: DragHandleSlot level="widget" 추가 (시각 마커) */}
            {/* SPEC-UX-011: data-widget-handle 속성 추가 — draggableHandle 셀렉터 [data-widget-handle] 매칭
                즐겨찾기 위젯 타이틀에만 부여 (내부 DnD와 충돌 방지) */}
            <div
              className="widget-drag-handle"
              data-widget-handle
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '2px 20px 2px 0',
                cursor: isEditing && !isMobile && !isMobileBreakpoint ? 'grab' : 'default',
                userSelect: 'none',
                borderBottom: '1px solid var(--border)',
              }}
            >
              {/* REQ-UX-009-003: 위젯 핸들 시각 마커 — 타이틀 좌측에 GripVertical 아이콘 */}
              <DragHandleSlot
                level="widget"
                ariaLabel="위젯 이동: 즐겨찾기"
                isEditing={isEditing && !isMobile && !isMobileBreakpoint}
              />
              <span style={{ fontSize: 18 }}>⭐</span>
              <span
                style={{
                  fontWeight: 700,
                  fontSize: 15,
                  color: 'var(--text-primary)',
                  letterSpacing: -0.3,
                }}
              >
                즐겨찾기
              </span>
            </div>
            {/* REQ-UX-008-011 D2: closestCorners — 빈 카테고리 포함 droppable 경계 인식
                SPEC-UX-011: accessibility announcements + autoScroll 엣지 임계값 조정 */}
            <DndContext
              sensors={categorySensors}
              collisionDetection={closestCorners}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragEnd={handleDragEnd}
              onDragCancel={handleDragCancel}
              accessibility={{
                announcements: dndAnnouncements,
                screenReaderInstructions: {
                  draggable: '드래그하려면 스페이스바를 누르세요. 방향키로 이동하고, 스페이스바로 놓으세요. 취소하려면 Esc를 누르세요.',
                },
              }}
              // BUGFIX: gridAutoRows: 220px로 행 높이가 고정되므로 위젯 내부 스크롤도
              // jitter를 일으키지 않는다. autoScroll을 위젯 내부에 허용하여
              // row2 카드에 드래그로 자연스럽게 도달할 수 있게 한다.
              autoScroll={{ threshold: { x: 0.1, y: 0.2 } }}
            >
              {/* REQ-UX-007-011: 카테고리 자체 정렬용 SortableContext (SPEC-UX-007 유지)
                  SPEC-UX-011: items useMemo 배열 사용 — 드래그 중 배열 불안정 방지 */}
              <SortableContext items={displayBookmarkIds} strategy={rectSortingStrategy}>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                    // BUGFIX: 행 높이를 카드 height(220)와 동일하게 고정.
                    // 카드 height 가변이거나 행마다 콘텐츠가 달라도 행 높이가 일정해,
                    // 드래그 swap 시 row 높이 변동으로 인한 세로 jitter가 발생하지 않는다.
                    gridAutoRows: '220px',
                    gap: 16,
                    padding: 16,
                    minWidth: 0,
                    boxSizing: 'border-box',
                    alignItems: 'start',
                  }}
                >
                  {displayBookmarks.map((cat) => (
                    <BookmarkCard
                      key={cat.id}
                      category={cat}
                      onEdit={onSetEditingCategory}
                    />
                  ))}
                </div>
              </SortableContext>
              {/* REQ-UX-008-012: 드래그 중 링크/그룹 미러 표시
                  SPEC-UX-011: 링크 — scale(1.02) + ring + shadow / 그룹 — 컴팩트 카드
                  BUGFIX: react-grid-layout이 부모 셀에 CSS transform을 적용해
                  DragOverlay 좌표계가 시프트되는 문제 → document.body로 포털하여
                  ghost가 마우스 커서를 정확히 따라가도록 한다. */}
              {createPortal(
              <DragOverlay>
                {activeLink ? (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '10px 12px',
                      borderRadius: 10,
                      background: 'var(--link-bg)',
                      color: 'var(--text-primary)',
                      fontSize: 13,
                      opacity: 1,
                      cursor: 'grabbing',
                      transform: 'scale(1.02)',
                      boxShadow: '0 12px 32px var(--shadow)',
                      outline: '2px solid var(--accent)',
                      outlineOffset: 1,
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
                      {activeLink.name}
                    </span>
                  </div>
                ) : activeCategory ? (
                  // SPEC-UX-011: 그룹 DragOverlay — 헤더(아이콘+이름) + 링크 수 표시
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '12px 16px',
                      borderRadius: 12,
                      background: 'var(--card-bg)',
                      border: '1px solid var(--accent)',
                      color: 'var(--text-primary)',
                      fontSize: 14,
                      opacity: 0.95,
                      cursor: 'grabbing',
                      transform: 'scale(1.02)',
                      boxShadow: '0 12px 32px var(--shadow)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <span style={{ fontSize: 20 }}>{activeCategory.icon}</span>
                    <span style={{ fontWeight: 700 }}>{activeCategory.name}</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                      · {activeCategory.links.length}개
                    </span>
                  </div>
                ) : null}
              </DragOverlay>,
              document.body,
              )}
            </DndContext>
          </div>

          {/* Todo 위젯 */}
          <div key="todo" style={{ overflow: 'auto' }}>
            <TodoWidget />
          </div>

          {/* Notes 위젯 */}
          <div key="notes" style={{ overflow: 'auto' }}>
            <NotesWidget />
          </div>

          {/* Feed 위젯 — SPEC-WIDGET-003 */}
          <div key="feed" style={{ overflow: 'hidden' }}>
            <FeedWidget />
          </div>
        </ResponsiveGridLayout>
      </div>
    </div>
  )
}
