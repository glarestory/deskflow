// @MX:NOTE: [AUTO] WidgetLayout — 기존 ReactGridLayout 기반 드래그 위젯 그리드 레이아웃 컴포넌트
// @MX:NOTE: [AUTO] App.tsx에서 추출 (SPEC-UX-005 T-003). viewMode === 'widgets'일 때 렌더링됨
// @MX:SPEC: SPEC-UX-005, SPEC-LAYOUT-001, SPEC-UI-001
import ReactGridLayout from 'react-grid-layout'
import { WidthProvider } from 'react-grid-layout/legacy'
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'
import type { Category } from '../../types'
import type { WidgetLayout as WidgetLayoutItem } from '../../stores/layoutStore'
import { useBookmarkStore } from '../../stores/bookmarkStore'
import { useThemeStore } from '../../stores/themeStore'
import { useLayoutStore } from '../../stores/layoutStore'
import { useAuthStore } from '../../stores/authStore'
import Clock from '../Clock/Clock'
import SearchBar from '../SearchBar/SearchBar'
import BookmarkCard from '../BookmarkCard/BookmarkCard'
import TodoWidget from '../TodoWidget/TodoWidget'
import NotesWidget from '../NotesWidget/NotesWidget'
import FeedWidget from '../FeedWidget/FeedWidget'

// @MX:NOTE: [AUTO] WidthProvider가 컨테이너 너비를 자동 측정하여 그리드에 주입 (반응형)
const ResponsiveGridLayout = WidthProvider(ReactGridLayout)

// 그리드 기본 설정
const GRID_COLS = 12
const GRID_ROW_HEIGHT = 60
const GRID_MARGIN: [number, number] = [16, 16]

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
}

/**
 * SPEC-LAYOUT-001 / SPEC-UI-001 기반 드래그 위젯 그리드 레이아웃.
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
}: WidgetLayoutProps): JSX.Element {
  const { bookmarks, exportBookmarks } = useBookmarkStore()
  const { mode, toggleMode } = useThemeStore()
  const { layout, resetLayout } = useLayoutStore()
  const { user, signOut } = useAuthStore()

  // onTogglePivotMode prop이 있으면 우선 사용, 없으면 store 직접 호출
  const handlePivotModeClick = (): void => {
    onTogglePivotMode()
  }

  return (
    <div
      style={{
        // @MX:NOTE: [AUTO] SPEC-LAYOUT-002 Step 3 — PivotLayout과 동일한 스크롤 모델
        // 루트가 뷰포트를 차지하고 내부에서 스크롤 → 모드 전환 시 스크롤 UX 일관성 확보
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
          padding: '16px 28px',
          maxWidth: 1440,
          margin: '0 auto',
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
        </div>
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
      </div>

      {/* 메인 그리드 레이아웃 (react-grid-layout) */}
      <div
        style={{
          maxWidth: 1440,
          margin: '0 auto',
          padding: '0 28px 40px',
        }}
      >
        <ResponsiveGridLayout
          layout={layout}
          cols={GRID_COLS}
          rowHeight={GRID_ROW_HEIGHT}
          margin={GRID_MARGIN}
          onLayoutChange={handleLayoutChange}
          draggableHandle=".widget-drag-handle"
          isResizable={true}
          isDraggable={true}
          measureBeforeMount={false}
        >
          {/* Clock 위젯 */}
          <div key="clock" style={{ background: 'transparent' }}>
            <Clock />
          </div>

          {/* SearchBar 위젯 */}
          <div key="search" style={{ background: 'transparent' }}>
            <SearchBar />
          </div>

          {/* Bookmarks 위젯 */}
          {/* @MX:NOTE: [AUTO] SPEC-LAYOUT-002 Step 3 — 스크롤 컨테이너와 내부 grid 분리:
              외곽 div는 경계/스크롤만 담당, 패딩은 내부 grid에 위치시켜 스크롤바가 패딩을 침범하지 않게 함 */}
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
