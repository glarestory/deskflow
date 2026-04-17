// @MX:SPEC: SPEC-UX-003, SPEC-UX-005
import { useThemeStore } from '../../stores/themeStore'
import { useAuthStore } from '../../stores/authStore'
import { useViewModeStore } from '../../stores/viewModeStore'

interface SidebarSettingsProps {
  collapsed?: boolean
}

/**
 * 사이드바 하단 설정 영역.
 * - 테마 토글
 * - 로그아웃
 * - 사용자 아바타 + 이름
 * - SPEC-UX-005에서 위젯 모드 전환 버튼 추가 예정
 */
export function SidebarSettings({ collapsed = false }: SidebarSettingsProps): JSX.Element {
  const { mode, toggleMode } = useThemeStore()
  const { user, signOut } = useAuthStore()
  // @MX:NOTE: [AUTO] SPEC-UX-005: Pivot → 위젯 모드 전환 버튼
  const { toggleMode: toggleViewMode } = useViewModeStore()

  return (
    <div data-testid="sidebar-settings">
      {/* 사용자 정보 */}
      {!collapsed && user !== null && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 12px',
            borderTop: '1px solid var(--border)',
          }}
        >
          {user.photoURL !== null && user.photoURL !== undefined && (
            <img
              src={user.photoURL}
              alt="프로필"
              style={{
                width: 24,
                height: 24,
                borderRadius: '50%',
                border: '1px solid var(--border)',
                flexShrink: 0,
              }}
            />
          )}
          <span
            style={{
              fontSize: 12,
              color: 'var(--text-muted)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {user.displayName ?? user.email ?? '사용자'}
          </span>
        </div>
      )}

      {/* 액션 버튼 그룹 */}
      <div
        style={{
          display: 'flex',
          flexDirection: collapsed ? 'column' : 'row',
          alignItems: 'center',
          gap: 4,
          padding: collapsed ? '8px 4px' : '8px 12px',
        }}
      >
        {/* 테마 토글 버튼 */}
        <button
          data-testid="sidebar-theme-toggle"
          onClick={toggleMode}
          title={mode === 'dark' ? '라이트 모드로 전환' : '다크 모드로 전환'}
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            border: '1px solid var(--border)',
            background: 'var(--card-bg)',
            cursor: 'pointer',
            fontSize: 14,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {mode === 'dark' ? '☀️' : '🌙'}
        </button>

        {/* 로그아웃 버튼 */}
        {!collapsed && (
          <button
            data-testid="sidebar-logout"
            onClick={() => { void signOut() }}
            style={{
              flex: 1,
              padding: '6px 10px',
              borderRadius: 8,
              border: '1px solid var(--border)',
              background: 'var(--card-bg)',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              fontSize: 12,
            }}
          >
            로그아웃
          </button>
        )}

        {/* SPEC-UX-005: 위젯 모드 전환 버튼 (T-006) */}
        {!collapsed && (
          <button
            data-testid="sidebar-widget-mode-btn"
            onClick={toggleViewMode}
            style={{
              flex: 1,
              padding: '6px 10px',
              borderRadius: 8,
              border: '1px solid var(--accent)',
              background: 'var(--card-bg)',
              color: 'var(--accent)',
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            위젯 모드로 전환
          </button>
        )}
      </div>
    </div>
  )
}

export default SidebarSettings
