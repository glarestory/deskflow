// @MX:NOTE: [AUTO] SPEC-SEARCH-RAG-001 AC-030 AC-031 — RAG 토글 + 임계값 슬라이더
// @MX:SPEC: SPEC-UX-003, SPEC-UX-005, SPEC-SEARCH-RAG-001
import { useThemeStore } from '../../stores/themeStore'
import { useAuthStore } from '../../stores/authStore'
import { useViewModeStore } from '../../stores/viewModeStore'
import { useRagStore } from '../../stores/ragStore'

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
  // @MX:NOTE: [AUTO] SPEC-SEARCH-RAG-001 AC-030 AC-031: RAG 설정 상태
  const {
    enabled: ragEnabled,
    similarityThreshold,
    ollamaAvailable,
    modelMissing,
    lastHealthCheck,
    setEnabled: setRagEnabled,
    setThreshold: setRagThreshold,
    checkHealth,
  } = useRagStore()

  // Ollama 상태 텍스트 계산
  const ollamaStatusText = ollamaAvailable
    ? (modelMissing ? '모델 누락' : '준비됨')
    : '미탐지'

  const lastCheckFormatted = lastHealthCheck !== null
    ? new Date(lastHealthCheck).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
    : '없음'

  return (
    <div data-testid="sidebar-settings">
      {/* RAG 검색 설정 섹션 (AC-030, AC-031) */}
      {!collapsed && (
        <div
          data-testid="rag-settings-section"
          style={{
            borderTop: '1px solid var(--border)',
            padding: '10px 12px 6px',
          }}
        >
          <div
            style={{
              fontSize: 11,
              color: 'var(--text-muted)',
              fontWeight: 600,
              marginBottom: 8,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            RAG 검색
          </div>

          {/* RAG 활성화 토글 */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 8,
            }}
          >
            <span style={{ fontSize: 12, color: 'var(--text-primary)' }}>RAG 활성화</span>
            <button
              data-testid="rag-enabled-toggle"
              onClick={() => { setRagEnabled(!ragEnabled) }}
              style={{
                width: 36,
                height: 20,
                borderRadius: 10,
                border: 'none',
                background: ragEnabled ? 'var(--accent, #7b8cde)' : 'var(--border, #2a2d3e)',
                cursor: 'pointer',
                position: 'relative',
                transition: 'background 0.2s',
              }}
              aria-label={ragEnabled ? 'RAG 비활성화' : 'RAG 활성화'}
              aria-checked={ragEnabled}
              role="switch"
            >
              <span
                style={{
                  position: 'absolute',
                  top: 2,
                  left: ragEnabled ? 18 : 2,
                  width: 16,
                  height: 16,
                  borderRadius: '50%',
                  background: '#fff',
                  transition: 'left 0.2s',
                }}
              />
            </button>
          </div>

          {/* 유사도 임계값 슬라이더 */}
          <div style={{ marginBottom: 8 }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: 4,
              }}
            >
              <span style={{ fontSize: 12, color: 'var(--text-primary)' }}>유사도 임계값</span>
              <span style={{ fontSize: 12, color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
                {similarityThreshold.toFixed(2)}
              </span>
            </div>
            <input
              data-testid="rag-threshold-slider"
              type="range"
              min={0.50}
              max={0.90}
              step={0.05}
              value={similarityThreshold}
              onChange={(e) => { setRagThreshold(parseFloat(e.target.value)) }}
              style={{ width: '100%', cursor: 'pointer' }}
              aria-label="유사도 임계값"
            />
          </div>

          {/* Ollama 상태 + 재시도 버튼 */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 4,
            }}
          >
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              Ollama 상태: <strong>{ollamaStatusText}</strong>
            </span>
            <button
              data-testid="rag-retry-btn"
              onClick={() => { void checkHealth() }}
              style={{
                padding: '3px 8px',
                borderRadius: 6,
                border: '1px solid var(--border)',
                background: 'var(--card-bg)',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                fontSize: 11,
              }}
            >
              재시도
            </button>
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', opacity: 0.6 }}>
            마지막 확인: {lastCheckFormatted}
          </div>
        </div>
      )}

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
