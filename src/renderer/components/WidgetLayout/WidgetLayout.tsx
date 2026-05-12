// @MX:NOTE: [AUTO] WidgetLayout — Responsive 그리드 레이아웃 컴포넌트 (SPEC-UX-006 반응형 그리드 전환)
// @MX:NOTE: [AUTO] App.tsx에서 추출 (SPEC-UX-005 T-003). viewMode === 'widgets'일 때 렌더링됨
// @MX:SPEC: SPEC-UX-005, SPEC-LAYOUT-001, SPEC-UI-001, SPEC-CAPSULE-001, SPEC-MOBILE-RESPONSIVE-001, SPEC-UX-006
import { useMemo, useState, useCallback, useEffect } from 'react'
import { Responsive, WidthProvider } from 'react-grid-layout/legacy'
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'
import type { Category } from '../../types'
import type { WidgetLayout as WidgetLayoutItem } from '../../stores/layoutStore'
import { useBookmarkStore } from '../../stores/bookmarkStore'
import { useThemeStore } from '../../stores/themeStore'
import { useLayoutStore } from '../../stores/layoutStore'
import { useAuthStore } from '../../stores/authStore'
import { useIsMobile } from '../../hooks/useIsMobile'
import Clock from '../Clock/Clock'
import SearchBar from '../SearchBar/SearchBar'
import BookmarkCard from '../BookmarkCard/BookmarkCard'
import TodoWidget from '../TodoWidget/TodoWidget'
import NotesWidget from '../NotesWidget/NotesWidget'
import FeedWidget from '../FeedWidget/FeedWidget'
import CapsuleSwitcher from '../CapsuleSwitcher/CapsuleSwitcher'
import HeaderMoreMenu from './HeaderMoreMenu'

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

  // REQ-UX-006-003: 현재 브레이크포인트 상태 (Responsive onBreakpointChange 콜백에서 갱신)
  const [currentBreakpoint, setCurrentBreakpoint] = useState<string>('lg')

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
          draggableHandle=".widget-drag-handle"
          isResizable={!isMobile && !isMobileBreakpoint}
          isDraggable={!isMobile && !isMobileBreakpoint}
          measureBeforeMount={false}
          onDragStart={onDragStart}
          onDragStop={onDragStop}
        >
          {/* Clock 위젯 */}
          <div key="clock" style={{ background: 'transparent' }}>
            <Clock />
          </div>

          {/* SearchBar 위젯 — 데스크탑에서만 그리드 내부에 표시 */}
          <div key="search" style={{ background: 'transparent' }}>
            {!isMobile && <SearchBar />}
          </div>

          {/* Bookmarks 위젯 */}
          {/* @MX:NOTE: [AUTO] SPEC-LAYOUT-002 Step 3 — 스크롤 컨테이너와 내부 grid 분리 */}
          <div
            key="bookmarks"
            style={{
              background: 'var(--card-bg)',
              borderRadius: 12,
              border: '1px solid var(--border)',
              overflowX: 'hidden',
              overflowY: 'auto',
            }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                gap: 16,
                padding: 16,
                minWidth: 0,
                boxSizing: 'border-box',
              }}
            >
              {bookmarks.map((cat) => (
                <BookmarkCard
                  key={cat.id}
                  category={cat}
                  onEdit={onSetEditingCategory}
                />
              ))}
            </div>
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
