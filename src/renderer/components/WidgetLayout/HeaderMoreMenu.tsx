// HeaderMoreMenu.tsx — 모바일(sm 이하) 헤더에서 축소된 7개 액션을 담는 More 메뉴 컴포넌트
import { useState, useEffect, useRef } from 'react'

/** HeaderMoreMenu props */
export interface HeaderMoreMenuProps {
  /** 카테고리 추가 핸들러 */
  handleAddCategory: () => void
  /** 가져오기 모달 열기 */
  onOpenImport: () => void
  /** 북마크 내보내기 */
  exportBookmarks: () => void
  /** 중복 탐지 모달 열기 */
  onOpenDedup: () => void
  /** 레이아웃 초기화 */
  resetLayout: () => void
  /** Pivot 모드 전환 */
  onTogglePivotMode: () => void
  /** 로그아웃 */
  signOut: () => void
}

/**
 * REQ-UX-006-012: sm 이하에서 7개 헤더 액션을 More(⋯) 메뉴로 collapse
 */
export default function HeaderMoreMenu({
  handleAddCategory,
  onOpenImport,
  exportBookmarks,
  onOpenDedup,
  resetLayout,
  onTogglePivotMode,
  signOut,
}: HeaderMoreMenuProps): JSX.Element {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // 외부 클릭 시 메뉴 닫기
  useEffect(() => {
    if (!isOpen) return
    const handleOutsideClick = (e: MouseEvent): void => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [isOpen])

  const close = (): void => setIsOpen(false)

  const menuItemStyle: React.CSSProperties = {
    display: 'block',
    width: '100%',
    padding: '10px 16px',
    background: 'none',
    border: 'none',
    color: 'var(--text-primary)',
    fontSize: 13,
    cursor: 'pointer',
    textAlign: 'left',
    whiteSpace: 'nowrap',
  }

  return (
    <div ref={menuRef} style={{ position: 'relative' }}>
      <button
        data-testid="more-menu-btn"
        onClick={() => setIsOpen((prev) => !prev)}
        style={{
          padding: '7px 12px',
          borderRadius: 10,
          border: '1px solid var(--border)',
          background: 'var(--card-bg)',
          color: 'var(--text-muted)',
          fontSize: 16,
          cursor: 'pointer',
        }}
        aria-label="더 보기"
        aria-expanded={isOpen}
      >
        ⋯
      </button>

      {isOpen && (
        <div
          data-testid="more-menu-list"
          style={{
            position: 'absolute',
            right: 0,
            top: '100%',
            marginTop: 4,
            background: 'var(--card-bg)',
            border: '1px solid var(--border)',
            borderRadius: 10,
            boxShadow: 'var(--shadow-md)',
            zIndex: 100,
            overflow: 'hidden',
            minWidth: 160,
          }}
        >
          <button
            data-testid="more-add-category"
            style={menuItemStyle}
            onClick={() => { handleAddCategory(); close() }}
          >
            + 카테고리
          </button>
          <button
            data-testid="more-import"
            style={menuItemStyle}
            onClick={() => { onOpenImport(); close() }}
          >
            + 가져오기
          </button>
          <button
            data-testid="more-export"
            style={menuItemStyle}
            onClick={() => { exportBookmarks(); close() }}
          >
            내보내기
          </button>
          <button
            data-testid="more-dedup"
            style={menuItemStyle}
            onClick={() => { onOpenDedup(); close() }}
          >
            중복 탐지
          </button>
          <button
            data-testid="more-reset-layout"
            style={menuItemStyle}
            onClick={() => { resetLayout(); close() }}
          >
            레이아웃 초기화
          </button>
          <button
            data-testid="more-pivot"
            style={menuItemStyle}
            onClick={() => { onTogglePivotMode(); close() }}
          >
            Pivot 모드
          </button>
          <button
            data-testid="more-logout"
            style={menuItemStyle}
            onClick={() => { void signOut(); close() }}
          >
            로그아웃
          </button>
        </div>
      )}
    </div>
  )
}
