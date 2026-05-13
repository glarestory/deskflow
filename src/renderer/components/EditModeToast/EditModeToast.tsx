// @MX:NOTE: [AUTO] EditModeToast — 편집 모드 undo/자동종료경고 토스트 (SPEC-UX-010 M4)
// @MX:SPEC: SPEC-UX-010
import { useEffect } from 'react'

/** EditModeToast 변형 — undo 액션 또는 자동 종료 경고 */
export type EditModeToastVariant = 'undo' | 'auto-exit-warning'

/** EditModeToast 컴포넌트 props */
export interface EditModeToastProps {
  /** 표시 여부 */
  isVisible: boolean
  /** 토스트 변형 — undo: 실행 취소 버튼 포함, auto-exit-warning: 경고만 표시 */
  variant: EditModeToastVariant
  /** 해제 콜백 (자동 또는 수동 닫기 시 호출) */
  onDismiss: () => void
  /** 실행 취소 버튼 클릭 콜백 (variant="undo" 시 사용) */
  onUndo: () => void
}

// variant별 자동 해제 딜레이 (ms)
const AUTO_DISMISS_DELAY: Record<EditModeToastVariant, number> = {
  'undo': 3000,
  'auto-exit-warning': 5000,
}

/**
 * 편집 모드 토스트 컴포넌트.
 * - variant="undo": 실행 취소 버튼 포함, 3초 자동 해제
 * - variant="auto-exit-warning": 자동 종료 경고 메시지, 5초 자동 해제
 * 하단 중앙(bottom-center) 고정 위치로 표시된다.
 */
export default function EditModeToast({
  isVisible,
  variant,
  onDismiss,
  onUndo,
}: EditModeToastProps): JSX.Element | null {
  // 자동 해제 타이머
  useEffect(() => {
    if (!isVisible) return undefined
    const timer = setTimeout(() => {
      onDismiss()
    }, AUTO_DISMISS_DELAY[variant])
    return () => { clearTimeout(timer) }
  }, [isVisible, variant, onDismiss])

  if (!isVisible) return null

  return (
    <div
      data-testid="edit-mode-toast"
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
        boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
        minWidth: 260,
      }}
    >
      {/* 메시지 텍스트 */}
      <span style={{ fontSize: 13, color: 'var(--text-primary, #e0e0e0)', flex: 1 }}>
        {variant === 'undo'
          ? '편집 내용이 변경되었습니다.'
          : '2분 후 편집 모드가 자동 종료됩니다.'}
      </span>

      {/* variant="undo" 시만 실행 취소 버튼 표시 */}
      {variant === 'undo' && (
        <button
          data-testid="toast-undo-btn"
          onClick={onUndo}
          style={{
            padding: '5px 12px',
            borderRadius: 8,
            border: '1px solid var(--accent, #7b8cde)',
            background: 'transparent',
            color: 'var(--accent, #7b8cde)',
            fontSize: 12,
            cursor: 'pointer',
            fontWeight: 600,
            whiteSpace: 'nowrap',
          }}
        >
          실행 취소
        </button>
      )}

      {/* 닫기 버튼 */}
      <button
        data-testid="toast-dismiss-btn"
        onClick={onDismiss}
        aria-label="토스트 닫기"
        style={{
          width: 24,
          height: 24,
          borderRadius: 6,
          border: 'none',
          background: 'transparent',
          color: 'var(--text-muted, #888)',
          fontSize: 16,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 0,
        }}
      >
        ×
      </button>
    </div>
  )
}
