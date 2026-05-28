// @MX:NOTE: [AUTO] WidgetVisibilityMenu — 위젯 표시/숨김 토글 드롭다운
// @MX:SPEC: SPEC-WIDGET-TOGGLE-001
import { useState, useEffect, useRef } from 'react'
import { Check, Square, LayoutGrid } from 'lucide-react'
import {
  useWidgetVisibility,
  WIDGET_KEYS,
  WIDGET_LABELS,
  type WidgetKey,
} from '../../stores/widgetVisibilityStore'

export interface WidgetVisibilityMenuProps {
  /** 트리거 버튼 스타일 (데스크톱 헤더 / 모바일 More 메뉴 별로 다름) */
  variant?: 'desktop' | 'compact'
}

/**
 * 위젯 표시/숨김 토글 메뉴.
 * 데스크톱 헤더: 'desktop' 변형 — 텍스트 + 아이콘 버튼
 * 모바일 More 메뉴: 'compact' 변형 — More 메뉴 내부 인라인 섹션
 */
export default function WidgetVisibilityMenu({
  variant = 'desktop',
}: WidgetVisibilityMenuProps): JSX.Element {
  const { hiddenWidgets, toggleWidget, showAllWidgets } = useWidgetVisibility()
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // 외부 클릭 시 닫기
  useEffect(() => {
    if (!isOpen) return
    const handleOutsideClick = (e: MouseEvent): void => {
      if (menuRef.current !== null && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [isOpen])

  const visibleCount = WIDGET_KEYS.length - hiddenWidgets.size

  // 모바일 More 메뉴 내부 변형 — 트리거 없이 인라인 토글 섹션만 렌더
  if (variant === 'compact') {
    return (
      <div data-testid="widget-visibility-compact">
        <div
          style={{
            padding: '8px 16px 4px',
            fontSize: 11,
            fontWeight: 600,
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            letterSpacing: 0.5,
          }}
        >
          위젯 표시
        </div>
        {WIDGET_KEYS.map((key) => {
          const hidden = hiddenWidgets.has(key)
          return (
            <button
              key={key}
              data-testid={`widget-toggle-compact-${key}`}
              onClick={() => toggleWidget(key)}
              aria-pressed={!hidden}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                width: '100%',
                padding: '10px 16px',
                border: 'none',
                background: 'transparent',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                fontSize: 14,
                textAlign: 'left',
              }}
            >
              {hidden ? (
                <Square size={16} style={{ color: 'var(--text-muted)' }} />
              ) : (
                <Check size={16} style={{ color: 'var(--accent)' }} />
              )}
              <span>{WIDGET_LABELS[key]}</span>
            </button>
          )
        })}
      </div>
    )
  }

  // 데스크톱 변형 — 트리거 버튼 + 드롭다운
  return (
    <div ref={menuRef} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        data-testid="widget-visibility-trigger"
        onClick={() => setIsOpen((v) => !v)}
        aria-haspopup="true"
        aria-expanded={isOpen}
        aria-label="위젯 표시/숨김"
        title={`위젯 ${visibleCount}/${WIDGET_KEYS.length}`}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '7px 14px',
          borderRadius: 10,
          border: '1px solid var(--border)',
          background: 'var(--card-bg)',
          color: 'var(--text-muted)',
          fontSize: 12,
          cursor: 'pointer',
        }}
      >
        <LayoutGrid size={14} />
        위젯 {visibleCount}/{WIDGET_KEYS.length}
      </button>
      {isOpen && (
        <div
          data-testid="widget-visibility-dropdown"
          role="menu"
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            right: 0,
            minWidth: 180,
            background: 'var(--card-bg)',
            border: '1px solid var(--border)',
            borderRadius: 10,
            boxShadow: '0 8px 24px var(--shadow)',
            padding: '4px 0',
            zIndex: 50,
          }}
        >
          {WIDGET_KEYS.map((key: WidgetKey) => {
            const hidden = hiddenWidgets.has(key)
            return (
              <button
                key={key}
                data-testid={`widget-toggle-${key}`}
                role="menuitemcheckbox"
                aria-checked={!hidden}
                onClick={() => toggleWidget(key)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  width: '100%',
                  padding: '8px 14px',
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  fontSize: 13,
                  textAlign: 'left',
                }}
              >
                {hidden ? (
                  <Square size={14} style={{ color: 'var(--text-muted)' }} />
                ) : (
                  <Check size={14} style={{ color: 'var(--accent)' }} />
                )}
                <span>{WIDGET_LABELS[key]}</span>
              </button>
            )
          })}
          {hiddenWidgets.size > 0 && (
            <>
              <div
                style={{
                  height: 1,
                  background: 'var(--border)',
                  margin: '4px 0',
                }}
              />
              <button
                data-testid="widget-show-all"
                onClick={() => {
                  showAllWidgets()
                  setIsOpen(false)
                }}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '8px 14px',
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--accent)',
                  cursor: 'pointer',
                  fontSize: 12,
                  textAlign: 'left',
                  fontWeight: 600,
                }}
              >
                모두 표시
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
