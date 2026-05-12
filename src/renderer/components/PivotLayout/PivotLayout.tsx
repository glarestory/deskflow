// @MX:ANCHOR: [AUTO] PivotLayout — Pivot 레이아웃 최상위 컨테이너 (TopBar + Sidebar + MainView)
// @MX:REASON: [AUTO] App.tsx에서 진입점으로 사용, REQ-001 2-column 레이아웃 구현
// @MX:SPEC: SPEC-UX-003, SPEC-CAPSULE-001, SPEC-MOBILE-RESPONSIVE-001
import { useEffect, useRef } from 'react'
import { Sidebar } from './Sidebar'
import { MainView } from './MainView'
import CapsuleSwitcher from '../CapsuleSwitcher/CapsuleSwitcher'
import { useViewStore } from '../../stores/viewStore'
import { useIsMobile } from '../../hooks/useIsMobile'

/** PivotLayout props — SPEC-CAPSULE-001 REQ-012 통합 */
export interface PivotLayoutProps {
  /** SPEC-CAPSULE-001: 캡슐 목록 패널 열기 */
  onOpenCapsuleList?: () => void
  /** SPEC-CAPSULE-001: 신규 캡슐 생성 모달 열기 */
  onOpenCreateCapsule?: () => void
}

/**
 * Pivot 레이아웃 루트 컴포넌트.
 * REQ-001: 항상 좌측 Sidebar(250px) + 우측 Main(가변)으로 구성
 * SPEC-MOBILE-RESPONSIVE-001: 640px 미만 시 Sidebar 가 fixed 오버레이로 전환되며,
 *   햄버거 버튼 + 반투명 backdrop 으로 토글한다. 데스크톱 → 모바일 첫 진입 시 자동 collapse.
 * SPEC-CAPSULE-001 REQ-012: 상단 바에 CapsuleSwitcher 렌더
 */
export function PivotLayout({
  onOpenCapsuleList,
  onOpenCreateCapsule,
}: PivotLayoutProps = {}): JSX.Element {
  const { sidebarCollapsed, toggleSidebar } = useViewStore()
  const isMobile = useIsMobile()
  const hasAutoCollapsedRef = useRef(false)

  // 데스크톱 → 모바일 첫 진입 시 자동 collapse
  // ref 가드로 사용자가 모바일에서 명시적으로 연 후 다시 자동으로 닫히는 일이 없도록 한다.
  useEffect(() => {
    if (isMobile && !sidebarCollapsed && !hasAutoCollapsedRef.current) {
      hasAutoCollapsedRef.current = true
      toggleSidebar()
    }
    if (!isMobile) {
      hasAutoCollapsedRef.current = false
    }
  }, [isMobile, sidebarCollapsed, toggleSidebar])

  const showCapsuleBar = onOpenCapsuleList !== undefined || onOpenCreateCapsule !== undefined
  const showBackdrop = isMobile && !sidebarCollapsed

  return (
    <div
      data-testid="pivot-layout"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        overflow: 'hidden',
        background: 'var(--bg)',
      }}
    >
      {/* @MX:NOTE: [AUTO] SPEC-CAPSULE-001 REQ-012: Pivot 모드 상단 바 CapsuleSwitcher + 모바일 햄버거 */}
      {(showCapsuleBar || isMobile) && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 16px',
            borderBottom: '1px solid var(--border)',
            background: 'var(--card-bg)',
            flexShrink: 0,
          }}
        >
          {/* 모바일 햄버거 버튼 — 오버레이 사이드바 토글 */}
          {isMobile && (
            <button
              data-testid="mobile-menu-btn"
              onClick={toggleSidebar}
              aria-label="메뉴 열기"
              style={{
                width: 44,
                height: 44,
                borderRadius: 8,
                border: '1px solid var(--border)',
                background: 'transparent',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                fontSize: 18,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              ☰
            </button>
          )}
          {showCapsuleBar && (
            <CapsuleSwitcher
              onOpenList={onOpenCapsuleList ?? (() => undefined)}
              onOpenCreate={onOpenCreateCapsule ?? (() => undefined)}
            />
          )}
        </div>
      )}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative' }}>
        <Sidebar />
        {/* 모바일 백드롭 — Sidebar 외부 클릭 시 닫기 */}
        {showBackdrop && (
          <div
            data-testid="sidebar-backdrop"
            onClick={toggleSidebar}
            aria-hidden="true"
            style={{
              position: 'fixed',
              top: 0,
              right: 0,
              bottom: 0,
              // Sidebar(width: min(80vw, 320px), z-index 100) 우측 외부만 덮어
              // backdrop 클릭이 Sidebar 내부 요소에 가로채이지 않도록 한다
              left: 'min(80vw, 320px)',
              background: 'rgba(0,0,0,0.5)',
              zIndex: 99,
            }}
          />
        )}
        <MainView />
      </div>
    </div>
  )
}

export default PivotLayout
