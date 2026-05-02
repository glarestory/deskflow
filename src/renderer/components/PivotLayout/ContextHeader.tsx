// @MX:SPEC: SPEC-UX-003
import { LayoutList, Star, Folder, Hash, X } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useViewStore } from '../../stores/viewStore'
import { useBookmarkStore } from '../../stores/bookmarkStore'
import type { SidebarContext } from '../../stores/viewStore'

/**
 * 현재 컨텍스트를 시각화하는 헤더 + breadcrumb.
 * AC-017: 각 segment 클릭으로 필터 해제
 */
export function ContextHeader(): JSX.Element {
  const { context, setContext } = useViewStore()
  const bookmarks = useBookmarkStore((s) => s.bookmarks)

  const label = getContextLabel(context, bookmarks)
  const Icon = getContextIcon(context)
  const iconColor =
    context.kind === 'favorites' ? 'var(--favorite)' : context.kind === 'all' ? 'var(--text-secondary)' : 'var(--accent)'

  return (
    <div
      data-testid="context-header"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-3)',
        padding: '0 0 var(--space-3) 0',
        borderBottom: '1px solid var(--border-subtle)',
        marginBottom: 'var(--space-3)',
      }}
    >
      <Icon size={18} strokeWidth={2} style={{ color: iconColor, flexShrink: 0 }} fill={context.kind === 'favorites' ? 'currentColor' : 'none'} />
      <span
        style={{
          fontSize: 17,
          fontWeight: 700,
          color: 'var(--text-primary)',
          letterSpacing: '-0.015em',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
        title={label}
      >
        {label}
      </span>
      {/* context가 all이 아닐 때 초기화 버튼 */}
      {context.kind !== 'all' && (
        <button
          data-testid="context-clear"
          onClick={() => setContext({ kind: 'all' })}
          title="전체로 돌아가기"
          aria-label="필터 초기화"
          style={{
            marginLeft: 'auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 24,
            height: 24,
            border: 'none',
            background: 'transparent',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            borderRadius: 'var(--radius-sm)',
            transition: 'background var(--motion-fast), color var(--motion-fast)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--surface-2)'
            e.currentTarget.style.color = 'var(--text-primary)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent'
            e.currentTarget.style.color = 'var(--text-muted)'
          }}
        >
          <X size={14} strokeWidth={2} />
        </button>
      )}
    </div>
  )
}

function getContextIcon(context: SidebarContext): LucideIcon {
  switch (context.kind) {
    case 'all': return LayoutList
    case 'favorites': return Star
    case 'category': return Folder
    case 'tag': return Hash
  }
}

function getContextLabel(
  context: SidebarContext,
  bookmarks: { id: string; name: string }[],
): string {
  switch (context.kind) {
    case 'all': return '전체'
    case 'favorites': return '즐겨찾기'
    case 'category': {
      const cat = bookmarks.find((b) => b.id === context.categoryId)
      return cat?.name ?? context.categoryId
    }
    case 'tag': return `#${context.tag}`
  }
}

export default ContextHeader
