// @MX:ANCHOR: [AUTO] BookmarkRow — 가상화 리스트 행 컴포넌트 (BookmarkList에서 대량 렌더)
// @MX:REASON: [AUTO] BookmarkList의 itemRenderer로 사용되는 핵심 컴포넌트, list/grid 두 모드 지원
// @MX:SPEC: SPEC-UX-003
import { useState } from 'react'
import { Star } from 'lucide-react'
import { useBookmarkStore } from '../../stores/bookmarkStore'
import { useUsageStore } from '../../stores/usageStore'
import { Favicon } from '../Favicon/Favicon'
import type { Link } from '../../types'
import type { ViewMode } from '../../stores/viewStore'

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
  /** 컨테이너에서 전달하는 스타일 (height 등) */
  style: React.CSSProperties
  /** 행 인덱스 */
  index: number
  /** 뷰 모드 — list(수평 행) | grid(카드) */
  viewMode?: ViewMode
}

/**
 * 북마크 항목 컴포넌트 — Linear 톤의 정보 위계
 * REQ-008: favicon + 이름 + URL + 시각 + 태그 chip + ⭐
 * REQ-009: 클릭 시 새 탭 열기 + usageStore 기록
 * REQ-010: ⭐ 클릭 시 favorite 토글
 *
 * 시각 위계:
 * - 1순위: 이름 (text-primary, 14px, 600)
 * - 2순위: 도메인 (mono, 12px, text-muted)
 * - 3순위: 태그/시간 (10–11px, text-faint, hover 시에만 진해짐)
 * - 강조: 즐겨찾기는 좌측 1px accent bar
 */
export function BookmarkRow({ link, style, index, viewMode = 'list' }: BookmarkRowProps): JSX.Element {
  const toggleFavorite = useBookmarkStore((s) => s.toggleFavorite)
  const recordUsage = useUsageStore((s) => s.recordUsage)
  const [hovered, setHovered] = useState(false)

  const isGrid = viewMode === 'grid'
  const isFav = link.favorite === true

  const domain = getDisplayDomain(link.url)
  // @MX:NOTE: [AUTO] 마이그레이션 전 데이터 또는 신규 추가 직후 tags 누락 방어
  const tags = link.tags ?? []
  const visibleTags = tags.slice(0, MAX_TAG_CHIPS)
  const extraCount = tags.length - MAX_TAG_CHIPS

  const handleClick = (e: React.MouseEvent): void => {
    if ((e.target as HTMLElement).closest('[data-testid^="favorite-btn"]')) return
    window.open(link.url, '_blank')
    recordUsage('bookmark', link.id)
  }

  const handleFavoriteClick = (e: React.MouseEvent): void => {
    e.stopPropagation()
    toggleFavorite(link.id)
  }

  const containerBaseStyle: React.CSSProperties = isGrid
    ? {
        ...style,
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-2)',
        padding: 'var(--space-3) var(--space-3) var(--space-3) var(--space-4)',
        cursor: 'pointer',
        background: hovered ? 'var(--surface-2)' : 'var(--surface-1)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        transition: 'background var(--motion-fast) var(--ease-out), transform var(--motion-fast) var(--ease-out), box-shadow var(--motion-fast) var(--ease-out)',
        boxShadow: hovered ? 'var(--shadow-sm)' : 'none',
        transform: hovered ? 'translateY(-1px)' : 'none',
        boxSizing: 'border-box',
        overflow: 'hidden',
      }
    : {
        ...style,
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-3)',
        padding: '0 var(--space-4) 0 var(--space-4)',
        cursor: 'pointer',
        borderBottom: '1px solid var(--border-subtle)',
        background: hovered ? 'var(--surface-2)' : 'transparent',
        transition: 'background var(--motion-fast) var(--ease-out)',
        boxSizing: 'border-box',
      }

  // 좌측 accent bar — 즐겨찾기/hover 시
  const accentBar = (
    <span
      aria-hidden
      style={{
        position: 'absolute',
        left: 0,
        top: isGrid ? 0 : 6,
        bottom: isGrid ? 0 : 6,
        width: 2,
        background: isFav ? 'var(--favorite)' : hovered ? 'var(--accent)' : 'transparent',
        borderRadius: 'var(--radius-pill)',
        transition: 'background var(--motion-fast) var(--ease-out)',
      }}
    />
  )

  const tagChip = (tag: string, key: string): JSX.Element => (
    <span
      key={key}
      style={{
        fontSize: 10,
        lineHeight: 1.4,
        padding: '2px 6px',
        borderRadius: 'var(--radius-xs)',
        background: 'var(--surface-3)',
        color: hovered ? 'var(--text-secondary)' : 'var(--text-muted)',
        whiteSpace: 'nowrap',
        transition: 'color var(--motion-fast) var(--ease-out)',
      }}
    >
      {tag}
    </span>
  )

  // === GRID (card) ===
  if (isGrid) {
    return (
      <div
        data-testid={`bookmark-row-${link.id}`}
        data-index={index}
        data-view-mode="grid"
        onClick={handleClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={containerBaseStyle}
      >
        {accentBar}

        {/* Top: favicon + 이름 + 즐겨찾기 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <Favicon url={link.url} size={20} />
          <span
            style={{
              flex: 1,
              minWidth: 0,
              fontWeight: 600,
              fontSize: 14,
              lineHeight: 1.3,
              color: 'var(--text-primary)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
            title={link.name}
          >
            {link.name}
          </span>
          <button
            data-testid={`favorite-btn-${link.id}`}
            data-active={isFav}
            onClick={handleFavoriteClick}
            title={isFav ? '즐겨찾기 해제' : '즐겨찾기 추가'}
            style={{
              width: 28,
              height: 28,
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: isFav ? 'var(--favorite)' : 'var(--text-faint)',
              transition: 'color var(--motion-fast), background var(--motion-fast)',
              flexShrink: 0,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-3)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <Star size={16} strokeWidth={2} fill={isFav ? 'currentColor' : 'none'} />
          </button>
        </div>

        {/* Mid: 도메인 (mono) */}
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            lineHeight: 1.4,
            color: 'var(--text-muted)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
          title={link.url}
        >
          {domain}
        </span>

        {/* Bottom: 태그 + 시간 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-2)' }}>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', flex: 1, minWidth: 0 }}>
            {visibleTags.map((tag) => tagChip(tag, tag))}
            {extraCount > 0 && tagChip(`+${extraCount}`, '__extra')}
          </div>
          {link.createdAt !== undefined && (
            <span
              style={{
                fontSize: 10,
                color: 'var(--text-faint)',
                flexShrink: 0,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {getRelativeTime(link.createdAt)}
            </span>
          )}
        </div>
      </div>
    )
  }

  // === LIST (row) ===
  return (
    <div
      data-testid={`bookmark-row-${link.id}`}
      data-index={index}
      data-view-mode="list"
      onClick={handleClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={containerBaseStyle}
    >
      {accentBar}

      <Favicon url={link.url} size={18} />

      <span
        style={{
          flex: '0 0 auto',
          maxWidth: 220,
          fontWeight: 600,
          fontSize: 13,
          color: 'var(--text-primary)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          letterSpacing: '-0.005em',
        }}
        title={link.name}
      >
        {link.name}
      </span>

      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          color: hovered ? 'var(--text-secondary)' : 'var(--text-muted)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          flex: '1 1 0',
          minWidth: 0,
          transition: 'color var(--motion-fast)',
        }}
        title={link.url}
      >
        {domain}
      </span>

      <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
        {visibleTags.map((tag) => tagChip(tag, tag))}
        {extraCount > 0 && tagChip(`+${extraCount}`, '__extra')}
      </div>

      {link.createdAt !== undefined && (
        <span
          style={{
            fontSize: 11,
            color: 'var(--text-faint)',
            flexShrink: 0,
            minWidth: 56,
            textAlign: 'right',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {getRelativeTime(link.createdAt)}
        </span>
      )}

      {/* 즐겨찾기 버튼
          SPEC-MOBILE-RESPONSIVE-001: 모바일 터치를 위해 hit-area 를 44px 로 확장.
          시각적 아이콘은 14px 그대로, padding 으로 클릭 영역만 늘린다. */}
      <button
        data-testid={`favorite-btn-${link.id}`}
        data-active={isFav}
        onClick={handleFavoriteClick}
        title={isFav ? '즐겨찾기 해제' : '즐겨찾기 추가'}
        style={{
          minWidth: 44,
          minHeight: 44,
          width: 28,
          height: 28,
          borderRadius: 'var(--radius-sm)',
          border: 'none',
          background: 'transparent',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: isFav ? 'var(--favorite)' : hovered ? 'var(--text-secondary)' : 'var(--text-faint)',
          transition: 'color var(--motion-fast), background var(--motion-fast)',
          flexShrink: 0,
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-3)')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
      >
        <Star size={15} strokeWidth={2} fill={isFav ? 'currentColor' : 'none'} />
      </button>
    </div>
  )
}

export default BookmarkRow
