// @MX:ANCHOR: [AUTO] Sidebar — Pivot 레이아웃 사이드바 컨테이너
// @MX:REASON: [AUTO] PivotLayout, MainView, App.tsx가 참조하는 Pivot UI 진입점
// @MX:SPEC: SPEC-UX-003
import { useViewStore } from '../../stores/viewStore'
import { SidebarCategoryList } from './SidebarCategoryList'
import { SidebarTagList } from './SidebarTagList'
import { SidebarSettings } from './SidebarSettings'

/**
 * Pivot 레이아웃 사이드바.
 * REQ-002: 5개 섹션 (전체, 즐겨찾기, 카테고리, 태그, 설정)
 * REQ-014: 접기/펼치기 토글 (250px <-> 60px)
 * NFR-003: ARIA tree 패턴
 */
export function Sidebar(): JSX.Element {
  const { context, sidebarCollapsed, setContext, toggleSidebar } = useViewStore()

  const isAllActive = context.kind === 'all'
  const isFavActive = context.kind === 'favorites'

  return (
    <aside
      style={{
        width: sidebarCollapsed ? '60px' : '250px',
        flexShrink: 0,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--card-bg)',
        borderRight: '1px solid var(--border)',
        transition: 'width 0.2s ease',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* 상단: 앱 이름 + 접기 토글 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: sidebarCollapsed ? 'center' : 'space-between',
          padding: sidebarCollapsed ? '16px 8px' : '16px 12px',
          borderBottom: '1px solid var(--border)',
          flexShrink: 0,
        }}
      >
        {!sidebarCollapsed && (
          <span
            style={{
              fontWeight: 700,
              fontSize: 14,
              color: 'var(--text-primary)',
              letterSpacing: -0.3,
            }}
          >
            Deskflow
          </span>
        )}
        <button
          data-testid="sidebar-toggle"
          onClick={toggleSidebar}
          title={sidebarCollapsed ? '사이드바 펼치기' : '사이드바 접기'}
          style={{
            width: 28,
            height: 28,
            borderRadius: 6,
            border: '1px solid var(--border)',
            background: 'transparent',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            fontSize: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {sidebarCollapsed ? '→' : '←'}
        </button>
      </div>

      {/* 네비게이션 트리 */}
      <nav
        role="tree"
        aria-label="북마크 탐색"
        style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: '8px 0',
        }}
      >
        {/* 전체 */}
        <button
          data-testid="sidebar-item-all"
          data-active={isAllActive}
          role="treeitem"
          aria-selected={isAllActive}
          onClick={() => setContext({ kind: 'all' })}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: sidebarCollapsed ? 0 : 8,
            justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
            width: '100%',
            padding: sidebarCollapsed ? '8px 0' : '7px 12px',
            border: 'none',
            borderRadius: 8,
            background: isAllActive ? 'var(--accent)' : 'transparent',
            color: isAllActive ? '#fff' : 'var(--text-primary)',
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: isAllActive ? 600 : 400,
          }}
        >
          <span>📋</span>
          {!sidebarCollapsed && <span>전체</span>}
        </button>

        {/* 즐겨찾기 */}
        <button
          data-testid="sidebar-item-favorites"
          data-active={isFavActive}
          role="treeitem"
          aria-selected={isFavActive}
          onClick={() => setContext({ kind: 'favorites' })}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: sidebarCollapsed ? 0 : 8,
            justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
            width: '100%',
            padding: sidebarCollapsed ? '8px 0' : '7px 12px',
            border: 'none',
            borderRadius: 8,
            background: isFavActive ? 'var(--accent)' : 'transparent',
            color: isFavActive ? '#fff' : 'var(--text-primary)',
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: isFavActive ? 600 : 400,
          }}
        >
          <span>⭐</span>
          {!sidebarCollapsed && <span>즐겨찾기</span>}
        </button>

        {/* 카테고리 목록 */}
        <SidebarCategoryList collapsed={sidebarCollapsed} />

        {/* 태그 목록 */}
        <SidebarTagList collapsed={sidebarCollapsed} />
      </nav>

      {/* 하단: 설정 */}
      <SidebarSettings collapsed={sidebarCollapsed} />
    </aside>
  )
}

export default Sidebar
