// @MX:SPEC: SPEC-UX-003
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

  return (
    <div
      data-testid="context-header"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '0 0 8px 0',
        borderBottom: '1px solid var(--border)',
        marginBottom: 8,
      }}
    >
      <span style={{ fontSize: 18 }}>{getContextIcon(context)}</span>
      <span
        style={{
          fontSize: 16,
          fontWeight: 600,
          color: 'var(--text-primary)',
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
          style={{
            marginLeft: 'auto',
            border: 'none',
            background: 'transparent',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            fontSize: 12,
            padding: '2px 6px',
            borderRadius: 4,
          }}
        >
          ✕
        </button>
      )}
    </div>
  )
}

function getContextIcon(context: SidebarContext): string {
  switch (context.kind) {
    case 'all': return '📋'
    case 'favorites': return '⭐'
    case 'category': return '📂'
    case 'tag': return '🏷'
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
