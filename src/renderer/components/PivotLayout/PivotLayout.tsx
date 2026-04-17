// @MX:ANCHOR: [AUTO] PivotLayout — Pivot 레이아웃 최상위 컨테이너 (Sidebar + MainView 조합)
// @MX:REASON: [AUTO] App.tsx에서 진입점으로 사용, REQ-001 2-column 레이아웃 구현
// @MX:SPEC: SPEC-UX-003
import { Sidebar } from './Sidebar'
import { MainView } from './MainView'

/**
 * Pivot 레이아웃 루트 컴포넌트.
 * REQ-001: 항상 좌측 Sidebar(250px) + 우측 Main(가변)으로 구성
 * EDGE-004: 768px 미만 시 사이드바 자동 접힘 (CSS media query)
 */
export function PivotLayout(): JSX.Element {
  return (
    <div
      data-testid="pivot-layout"
      style={{
        display: 'flex',
        height: '100vh',
        overflow: 'hidden',
        background: 'var(--bg)',
      }}
    >
      <Sidebar />
      <MainView />
    </div>
  )
}

export default PivotLayout
