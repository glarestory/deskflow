// @MX:NOTE: [AUTO] TopSection — "자주 쓰는 것" 상위 8개 북마크 격자 표시 (context=all일 때만)
// @MX:SPEC: SPEC-UX-003
import { useBookmarkStore } from '../../stores/bookmarkStore'
import { useUsageStore } from '../../stores/usageStore'
import { Favicon } from '../Favicon/Favicon'
import type { Link } from '../../types'

// 표시할 최대 항목 수
const TOP_SECTION_COUNT = 8

interface TopItem {
  link: Link
  score: number
}

/**
 * "자주 쓰는 것" 섹션.
 * REQ-012: usageStore 기반 상위 8개를 격자로 표시.
 * context=all일 때만 MainView에서 렌더링됨.
 */
export function TopSection(): JSX.Element {
  const bookmarks = useBookmarkStore((s) => s.bookmarks)
  const getScore = useUsageStore((s) => s.getScore)

  // 모든 링크에 점수 계산
  const allLinks: TopItem[] = bookmarks.flatMap((b) =>
    b.links.map((link) => ({
      link,
      score: getScore('bookmark', link.id),
    })),
  )

  // 점수 내림차순 정렬 후 상위 8개
  const topItems = allLinks
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, TOP_SECTION_COUNT)

  // 사용 기록이 없으면 표시 안 함
  if (topItems.length === 0) return <div data-testid="top-section" />

  return (
    <div data-testid="top-section" style={{ marginBottom: 'var(--space-5)' }}>
      <div
        style={{
          fontSize: 10,
          fontWeight: 600,
          color: 'var(--text-faint)',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          marginBottom: 'var(--space-3)',
          paddingLeft: 'var(--space-1)',
        }}
      >
        자주 쓰는 것
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(108px, 1fr))',
          gap: 'var(--space-2)',
        }}
      >
        {topItems.map(({ link }) => (
          <a
            key={link.id}
            data-testid={`top-section-item-${link.id}`}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => {
              e.preventDefault()
              window.open(link.url, '_blank')
            }}
            title={link.name}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 'var(--space-2)',
              padding: 'var(--space-3) var(--space-2)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border)',
              background: 'var(--surface-1)',
              textDecoration: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              transition:
                'background var(--motion-fast) var(--ease-out), transform var(--motion-fast) var(--ease-out), box-shadow var(--motion-fast) var(--ease-out), border-color var(--motion-fast)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--surface-2)'
              e.currentTarget.style.color = 'var(--text-primary)'
              e.currentTarget.style.borderColor = 'var(--border-strong)'
              e.currentTarget.style.transform = 'translateY(-1px)'
              e.currentTarget.style.boxShadow = 'var(--shadow-sm)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--surface-1)'
              e.currentTarget.style.color = 'var(--text-secondary)'
              e.currentTarget.style.borderColor = 'var(--border)'
              e.currentTarget.style.transform = 'none'
              e.currentTarget.style.boxShadow = 'none'
            }}
          >
            <Favicon url={link.url} size={24} />
            <span
              style={{
                fontSize: 11,
                fontWeight: 500,
                textAlign: 'center',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                maxWidth: '100%',
              }}
            >
              {link.name}
            </span>
          </a>
        ))}
      </div>
    </div>
  )
}

export default TopSection
