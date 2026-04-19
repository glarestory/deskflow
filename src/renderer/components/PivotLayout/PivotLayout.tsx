// @MX:ANCHOR: [AUTO] PivotLayout — Pivot 레이아웃 최상위 컨테이너 (TopBar + Sidebar + MainView)
// @MX:REASON: [AUTO] App.tsx에서 진입점으로 사용, REQ-001 2-column 레이아웃 구현
// @MX:SPEC: SPEC-UX-003, SPEC-CAPSULE-001
import { Sidebar } from './Sidebar'
import { MainView } from './MainView'
import CapsuleSwitcher from '../CapsuleSwitcher/CapsuleSwitcher'

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
 * EDGE-004: 768px 미만 시 사이드바 자동 접힘 (CSS media query)
 * SPEC-CAPSULE-001 REQ-012: 상단 바에 CapsuleSwitcher 렌더
 */
export function PivotLayout({
  onOpenCapsuleList,
  onOpenCreateCapsule,
}: PivotLayoutProps = {}): JSX.Element {
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
      {/* @MX:NOTE: [AUTO] SPEC-CAPSULE-001 REQ-012: Pivot 모드 상단 바 CapsuleSwitcher */}
      {(onOpenCapsuleList !== undefined || onOpenCreateCapsule !== undefined) && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '10px 16px',
            borderBottom: '1px solid var(--border)',
            background: 'var(--card-bg)',
            flexShrink: 0,
          }}
        >
          <CapsuleSwitcher
            onOpenList={onOpenCapsuleList ?? (() => undefined)}
            onOpenCreate={onOpenCreateCapsule ?? (() => undefined)}
          />
        </div>
      )}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar />
        <MainView />
      </div>
    </div>
  )
}

export default PivotLayout
