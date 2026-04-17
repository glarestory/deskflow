// @MX:SPEC: SPEC-UX-003
import { useState } from 'react'
import { useTagStore } from '../../stores/tagStore'
import { useViewStore } from '../../stores/viewStore'

// 기본적으로 표시할 태그 최대 수
const DEFAULT_TAG_LIMIT = 15

interface SidebarTagListProps {
  collapsed?: boolean
}

/**
 * 사이드바 태그 목록.
 * - tagStore.allTags에서 상위 N개 표시 (기본 15)
 * - "더 보기" 버튼으로 전체 태그 표시/숨김 토글
 * - 클릭 시 해당 태그로 컨텍스트 변경
 */
export function SidebarTagList({ collapsed = false }: SidebarTagListProps): JSX.Element {
  const allTags = useTagStore((s) => s.allTags)
  const { context, setContext } = useViewStore()
  const [showAll, setShowAll] = useState(false)

  if (allTags.length === 0) {
    if (collapsed) return <div />
    return (
      <div
        data-testid="sidebar-tag-list"
        style={{ padding: '8px 12px', fontSize: 12, color: 'var(--text-muted)' }}
      >
        태그가 없습니다
      </div>
    )
  }

  const visibleTags = showAll ? allTags : allTags.slice(0, DEFAULT_TAG_LIMIT)
  const hasMore = allTags.length > DEFAULT_TAG_LIMIT

  return (
    <div data-testid="sidebar-tag-list">
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
          태그
        </div>
      )}
      {visibleTags.map(({ tag }) => {
        const isActive = context.kind === 'tag' && context.tag === tag
        return (
          <button
            key={tag}
            data-testid={`sidebar-tag-${tag}`}
            data-active={isActive}
            role="treeitem"
            aria-selected={isActive}
            onClick={() => setContext({ kind: 'tag', tag })}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              justifyContent: collapsed ? 'center' : 'flex-start',
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
            }}
          >
            {!collapsed && <span style={{ color: isActive ? '#fff' : 'var(--text-muted)' }}>#</span>}
            {!collapsed && (
              <span
                style={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
                title={tag}
              >
                {tag}
              </span>
            )}
            {collapsed && (
              <span style={{ fontSize: 10, fontWeight: 700 }}>
                {tag[0]?.toUpperCase()}
              </span>
            )}
          </button>
        )
      })}
      {!collapsed && hasMore && (
        <button
          data-testid="sidebar-tag-more"
          onClick={() => setShowAll((v) => !v)}
          style={{
            display: 'block',
            width: '100%',
            padding: '5px 12px',
            border: 'none',
            background: 'transparent',
            color: 'var(--accent)',
            cursor: 'pointer',
            fontSize: 12,
            textAlign: 'left',
          }}
        >
          {showAll ? '접기' : `더 보기 (+${allTags.length - DEFAULT_TAG_LIMIT})`}
        </button>
      )}
    </div>
  )
}

export default SidebarTagList
