// @MX:SPEC: SPEC-UX-003
import { useBookmarkStore } from '../../stores/bookmarkStore'
import { useViewStore } from '../../stores/viewStore'

interface SidebarCategoryListProps {
  collapsed?: boolean
}

/**
 * 사이드바 카테고리 목록.
 * 각 카테고리의 북마크 수를 chip으로 표시하며, 클릭 시 해당 카테고리로 컨텍스트를 변경한다.
 * 키보드 1-9 단축키는 useHotkeys 훅에서 처리한다 (T-018).
 */
export function SidebarCategoryList({ collapsed = false }: SidebarCategoryListProps): JSX.Element {
  const bookmarks = useBookmarkStore((s) => s.bookmarks)
  const { context, setContext } = useViewStore()

  return (
    <div data-testid="sidebar-category-list">
      {!collapsed && (
        <div
          style={{
            padding: '4px 12px',
            fontSize: 10,
            fontWeight: 600,
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            letterSpacing: 1,
          }}
        >
          카테고리
        </div>
      )}
      {bookmarks.map((cat, idx) => {
        const isActive = context.kind === 'category' && context.categoryId === cat.id
        return (
          <button
            key={cat.id}
            data-testid={`sidebar-category-${cat.id}`}
            data-active={isActive}
            // 키보드 1-9: aria-label에 인덱스 포함 (useHotkeys에서 활용)
            aria-label={`${idx + 1}. ${cat.name} (${cat.links.length}개)`}
            role="treeitem"
            aria-selected={isActive}
            onClick={() => setContext({ kind: 'category', categoryId: cat.id })}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: collapsed ? 0 : 8,
              justifyContent: collapsed ? 'center' : 'space-between',
              width: '100%',
              padding: collapsed ? '8px 0' : '7px 12px',
              border: 'none',
              borderRadius: 8,
              background: isActive ? 'var(--accent)' : 'transparent',
              color: isActive ? '#fff' : 'var(--text-primary)',
              cursor: 'pointer',
              fontSize: 13,
              textAlign: 'left',
              transition: 'background 0.15s',
              overflow: 'hidden',
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
              <span style={{ fontSize: 14, flexShrink: 0 }}>{cat.icon}</span>
              {!collapsed && (
                <span
                  style={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                  title={cat.name}
                >
                  {cat.name}
                </span>
              )}
            </span>
            {!collapsed && (
              <span
                style={{
                  fontSize: 11,
                  padding: '1px 6px',
                  borderRadius: 10,
                  background: isActive ? 'rgba(255,255,255,0.25)' : 'var(--border)',
                  color: isActive ? '#fff' : 'var(--text-muted)',
                  flexShrink: 0,
                }}
              >
                {cat.links.length}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

export default SidebarCategoryList
