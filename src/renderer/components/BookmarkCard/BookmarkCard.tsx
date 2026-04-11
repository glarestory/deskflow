// @MX:NOTE: [AUTO] BookmarkCard — 카테고리 북마크 카드, 2열 링크 그리드, hover 효과
// @MX:SPEC: SPEC-UI-001
import type { Category } from '../../types'

interface BookmarkCardProps {
  category: Category
  onEdit: (category: Category) => void
}

export default function BookmarkCard({ category, onEdit }: BookmarkCardProps): JSX.Element {
  return (
    <div
      style={{
        background: 'var(--card-bg)',
        borderRadius: 16,
        padding: '18px 20px',
        border: '1px solid var(--border)',
        transition: 'transform .15s, box-shadow .15s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)'
        e.currentTarget.style.boxShadow = '0 8px 24px var(--shadow)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = ''
        e.currentTarget.style.boxShadow = ''
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 14,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 20 }}>{category.icon}</span>
          <span
            style={{
              fontWeight: 700,
              fontSize: 15,
              color: 'var(--text-primary)',
            }}
          >
            {category.name}
          </span>
        </div>
        <button
          onClick={() => onEdit(category)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: 14,
            opacity: 0.35,
            color: 'var(--text-primary)',
          }}
          aria-label="편집"
        >
          ⚙️
        </button>
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 8,
        }}
      >
        {category.links.map((link) => (
          <a
            key={link.id}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 12px',
              borderRadius: 10,
              background: 'var(--link-bg)',
              textDecoration: 'none',
              color: 'var(--text-primary)',
              transition: 'background .15s',
              fontSize: 13,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--link-hover)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--link-bg)'
            }}
          >
            <span
              style={{
                fontWeight: 500,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
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
