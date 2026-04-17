// @MX:ANCHOR: [AUTO] BookmarkRow — 가상화 리스트 행 컴포넌트 (BookmarkList에서 대량 렌더)
// @MX:REASON: [AUTO] BookmarkList의 FixedSizeList에서 itemRenderer로 사용되는 핵심 컴포넌트
// @MX:SPEC: SPEC-UX-003
import { useBookmarkStore } from '../../stores/bookmarkStore'
import { useUsageStore } from '../../stores/usageStore'
import { Favicon } from '../Favicon/Favicon'
import type { Link } from '../../types'

// 한 행에 표시할 최대 태그 수
const MAX_TAG_CHIPS = 3

/**
 * URL에서 도메인 부분만 추출한다 (https:// 및 www. 제거)
 */
function getDisplayDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

/**
 * timestamp를 한국어 상대 시간으로 변환한다.
 */
function getRelativeTime(ts: number): string {
  const diff = Date.now() - ts
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return '방금'
  if (minutes < 60) return `${minutes}분 전`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}시간 전`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}일 전`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months}달 전`
  return `${Math.floor(months / 12)}년 전`
}

export interface BookmarkRowProps {
  link: Link
  /** react-window에서 전달하는 스타일 (position, height 등) */
  style: React.CSSProperties
  /** 행 인덱스 */
  index: number
}

/**
 * 북마크 리스트 행 컴포넌트.
 * REQ-008: favicon + 이름 + URL + 시각 + 태그 chip + ⭐
 * REQ-009: 클릭 시 새 탭 열기 + usageStore 기록
 * REQ-010: ⭐ 클릭 시 favorite 토글
 */
export function BookmarkRow({ link, style, index }: BookmarkRowProps): JSX.Element {
  const toggleFavorite = useBookmarkStore((s) => s.toggleFavorite)
  const recordUsage = useUsageStore((s) => s.recordUsage)

  const domain = getDisplayDomain(link.url)
  // @MX:NOTE: [AUTO] 마이그레이션 전 데이터 또는 신규 추가 직후 tags 누락 방어
  const tags = link.tags ?? []
  const visibleTags = tags.slice(0, MAX_TAG_CHIPS)
  const extraCount = tags.length - MAX_TAG_CHIPS

  const handleClick = (e: React.MouseEvent): void => {
    // 즐겨찾기 버튼 클릭은 별도 처리
    if ((e.target as HTMLElement).closest('[data-testid^="favorite-btn"]')) return
    window.open(link.url, '_blank')
    recordUsage('bookmark', link.id)
  }

  const handleFavoriteClick = (e: React.MouseEvent): void => {
    e.stopPropagation()
    toggleFavorite(link.id)
  }

  return (
    <div
      data-testid={`bookmark-row-${link.id}`}
      data-index={index}
      onClick={handleClick}
      style={{
        ...style,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '0 16px',
        cursor: 'pointer',
        borderBottom: '1px solid var(--border)',
        background: 'transparent',
        transition: 'background 0.1s',
        boxSizing: 'border-box',
      }}
      onMouseEnter={(e) => {
        ;(e.currentTarget as HTMLElement).style.background = 'var(--link-hover)'
      }}
      onMouseLeave={(e) => {
        ;(e.currentTarget as HTMLElement).style.background = 'transparent'
      }}
    >
      {/* Favicon */}
      <Favicon url={link.url} size={16} />

      {/* 이름 */}
      <span
        style={{
          flex: '0 0 auto',
          maxWidth: 200,
          fontWeight: 500,
          fontSize: 13,
          color: 'var(--text-primary)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
        title={link.name}
      >
        {link.name}
      </span>

      {/* URL (도메인) */}
      <span
        style={{
          fontSize: 11,
          color: 'var(--text-muted)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          flex: '1 1 0',
          minWidth: 0,
        }}
        title={link.url}
      >
        {domain}
      </span>

      {/* 태그 chip */}
      <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
        {visibleTags.map((tag) => (
          <span
            key={tag}
            style={{
              fontSize: 10,
              padding: '1px 6px',
              borderRadius: 10,
              background: 'var(--border)',
              color: 'var(--text-muted)',
            }}
          >
            {tag}
          </span>
        ))}
        {extraCount > 0 && (
          <span
            style={{
              fontSize: 10,
              padding: '1px 6px',
              borderRadius: 10,
              background: 'var(--border)',
              color: 'var(--text-muted)',
            }}
          >
            +{extraCount}
          </span>
        )}
      </div>

      {/* 상대 시간 */}
      {link.createdAt !== undefined && (
        <span
          style={{
            fontSize: 11,
            color: 'var(--text-muted)',
            flexShrink: 0,
            minWidth: 50,
            textAlign: 'right',
          }}
        >
          {getRelativeTime(link.createdAt)}
        </span>
      )}

      {/* 즐겨찾기 버튼 */}
      <button
        data-testid={`favorite-btn-${link.id}`}
        data-active={link.favorite === true}
        onClick={handleFavoriteClick}
        title={link.favorite === true ? '즐겨찾기 해제' : '즐겨찾기 추가'}
        style={{
          width: 24,
          height: 24,
          borderRadius: 4,
          border: 'none',
          background: 'transparent',
          cursor: 'pointer',
          fontSize: 14,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: link.favorite === true ? '#f59e0b' : 'var(--text-muted)',
          flexShrink: 0,
        }}
      >
        {link.favorite === true ? '⭐' : '☆'}
      </button>
    </div>
  )
}

export default BookmarkRow
