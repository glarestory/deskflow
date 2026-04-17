// @MX:NOTE: [AUTO] IntroToast — Pivot 첫 진입 기존 사용자 안내 토스트 (5초 자동 해제)
// @MX:SPEC: SPEC-UX-005
import { useEffect } from 'react'

/** IntroToast 컴포넌트 props */
export interface IntroToastProps {
  /** 표시 여부 */
  isVisible: boolean
  /** 해제 콜백 (자동 또는 수동 닫기 시 호출) */
  onDismiss: () => void
}

/**
 * Pivot 첫 진입 안내 토스트.
 * REQ-011: 기존 위젯 사용자에게 1회 표시 후 자동 해제.
 */
export default function IntroToast({ isVisible, onDismiss }: IntroToastProps): JSX.Element | null {
  // 5초 후 자동 해제
  useEffect(() => {
    if (!isVisible) return undefined
    const timer = setTimeout(() => {
      onDismiss()
    }, 5000)
    return () => { clearTimeout(timer) }
  }, [isVisible, onDismiss])

  if (!isVisible) return null

  return (
    <div
      data-testid="intro-toast"
      style={{
        position: 'fixed',
        bottom: 24,
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'var(--card-bg, #1e2030)',
        border: '1px solid var(--accent, #7b8cde)',
        borderRadius: 12,
        padding: '12px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        zIndex: 9999,
        boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
        maxWidth: 420,
      }}
    >
      <span style={{ fontSize: 12, color: 'var(--text-primary, #e0e4f0)' }}>
        새로운 Pivot 레이아웃입니다.{' '}
        <strong>위젯 모드</strong>로 돌아가려면 사이드바 설정 &gt; 위젯 모드로 전환을 클릭하세요.
      </span>
      <button
        data-testid="intro-toast-dismiss"
        onClick={onDismiss}
        style={{
          flexShrink: 0,
          width: 20,
          height: 20,
          borderRadius: '50%',
          border: 'none',
          background: 'var(--border, #2a2d3e)',
          color: 'var(--text-muted, #6b7094)',
          cursor: 'pointer',
          fontSize: 12,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        aria-label="닫기"
      >
        ×
      </button>
    </div>
  )
}
