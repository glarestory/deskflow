// @MX:ANCHOR: [AUTO] BookmarkList — 단순 리스트 렌더 (전체 메인 영역 자연 스크롤)
// @MX:REASON: [AUTO] PivotLayout MainView의 핵심 컴포넌트, 내부 스크롤 제거 사용자 요구
// @MX:SPEC: SPEC-UX-003
import { BookmarkRow } from './BookmarkRow'
import { DENSITY_ITEM_SIZE } from '../../stores/viewStore'
import type { Link } from '../../types'
import type { Density, ViewMode } from '../../stores/viewStore'

interface BookmarkListProps {
  links: Link[]
  density: Density
  viewMode: ViewMode
}

/**
 * 북마크 리스트.
 * 내부 스크롤 없음 — MainView가 페이지 단위로 스크롤한다.
 * REQ-007: density 변경 시 row 높이 즉시 적용
 * NFR-003: ARIA listbox 패턴
 *
 * @MX:NOTE: [AUTO] 가상화(react-window)는 사용자 요청으로 제거.
 * 1000개+ 데이터에서 성능이 문제가 되면 추후 가상화 재도입 검토.
 */
export function BookmarkList({ links, density }: BookmarkListProps): JSX.Element {
  // 빈 상태 처리 (REQ-011, AC-012)
  if (links.length === 0) {
    return (
      <div
        data-testid="empty-state"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: 200,
          gap: 12,
          color: 'var(--text-muted)',
        }}
      >
        <span style={{ fontSize: 32 }}>📭</span>
        <span style={{ fontSize: 14 }}>북마크가 없습니다</span>
        <span style={{ fontSize: 12 }}>북마크를 추가해 보세요</span>
      </div>
    )
  }

  const itemSize = DENSITY_ITEM_SIZE[density]

  return (
    <div
      role="listbox"
      aria-label="북마크 목록"
      data-testid="bookmark-list"
      data-item-count={links.length}
    >
      {links.map((link, index) => (
        <BookmarkRow
          key={link.id}
          link={link}
          index={index}
          style={{ height: itemSize }}
        />
      ))}
    </div>
  )
}

export default BookmarkList
