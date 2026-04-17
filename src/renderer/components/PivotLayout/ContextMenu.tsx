// @MX:SPEC: SPEC-UX-003
import { useEffect } from 'react'

interface ContextMenuProps {
  isOpen: boolean
  /** 클릭 위치 X (px) */
  x: number
  /** 클릭 위치 Y (px) */
  y: number
  /** 대상 링크 ID */
  linkId: string
  onClose: () => void
  onEdit: (linkId: string) => void
  onDelete: (linkId: string) => void
}

/**
 * 북마크 컨텍스트 메뉴 (1차: ⋯ 버튼 dropdown 방식).
 * AC-016: 편집/삭제/태그 추가/카테고리 이동 메뉴 표시.
 * 우클릭 컨텍스트 메뉴는 후속 SPEC에서 지원.
 */
export function ContextMenu({
  isOpen,
  x,
  y,
  linkId,
  onClose,
  onEdit,
  onDelete,
}: ContextMenuProps): JSX.Element | null {
  // 외부 클릭 시 닫기
  useEffect(() => {
    if (!isOpen) return
    const handler = (): void => onClose()
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      data-testid="context-menu"
      role="menu"
      aria-label="북마크 메뉴"
      onClick={(e) => e.stopPropagation()}
      style={{
        position: 'fixed',
        top: y,
        left: x,
        zIndex: 1000,
        background: 'var(--card-bg)',
        border: '1px solid var(--border)',
        borderRadius: 8,
        boxShadow: 'var(--shadow)',
        minWidth: 140,
        overflow: 'hidden',
      }}
    >
      <button
        data-testid="context-menu-edit"
        role="menuitem"
        onClick={() => {
          onEdit(linkId)
          onClose()
        }}
        style={menuItemStyle}
      >
        ✏️ 편집
      </button>
      <button
        data-testid="context-menu-delete"
        role="menuitem"
        onClick={() => {
          onDelete(linkId)
          onClose()
        }}
        style={{ ...menuItemStyle, color: '#ef4444' }}
      >
        🗑️ 삭제
      </button>
      {/* 태그 추가 / 카테고리 이동 — SPEC-UX-005에서 구현 예정 */}
      <button
        data-testid="context-menu-add-tag"
        role="menuitem"
        onClick={onClose}
        style={menuItemStyle}
      >
        🏷 태그 추가
      </button>
    </div>
  )
}

const menuItemStyle: React.CSSProperties = {
  display: 'block',
  width: '100%',
  padding: '8px 16px',
  border: 'none',
  background: 'transparent',
  color: 'var(--text-primary)',
  cursor: 'pointer',
  fontSize: 13,
  textAlign: 'left',
}

export default ContextMenu
