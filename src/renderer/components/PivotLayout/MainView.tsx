// @MX:ANCHOR: [AUTO] MainView — Pivot 레이아웃 메인 영역 (검색, 컨텍스트, 북마크 리스트 통합)
// @MX:REASON: [AUTO] PivotLayout에서 Sidebar와 함께 2-column 구성의 핵심 우측 영역
// @MX:SPEC: SPEC-UX-003
import { useRef } from 'react'
import { useViewStore } from '../../stores/viewStore'
import { useBookmarkStore } from '../../stores/bookmarkStore'
import { ContextHeader } from './ContextHeader'
import { SearchInput } from './SearchInput'
import { ToolbarRight } from './ToolbarRight'
import { TopSection } from './TopSection'
import { BookmarkList } from './BookmarkList'
import type { SortOption } from './ToolbarRight'
import type { Link } from '../../types'
import { useState } from 'react'

/**
 * 현재 컨텍스트와 검색어 기준으로 북마크를 필터링한다.
 * REQ-003, REQ-013 (AND 필터)
 */
function filterLinks(
  links: { link: Link; categoryId: string }[],
  context: ReturnType<typeof useViewStore>['context'],
  searchQuery: string,
): Link[] {
  let filtered = links

  // 컨텍스트 필터
  switch (context.kind) {
    case 'all':
      break
    case 'favorites':
      filtered = filtered.filter((item) => item.link.favorite === true)
      break
    case 'category':
      filtered = filtered.filter((item) => item.categoryId === context.categoryId)
      break
    case 'tag':
      // @MX:NOTE: [AUTO] 마이그레이션 전 데이터의 tags 누락 방어
      filtered = filtered.filter((item) => (item.link.tags ?? []).includes(context.tag))
      break
  }

  // 검색어 필터 (대소문자 무시)
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase()
    filtered = filtered.filter(
      (item) =>
        item.link.name.toLowerCase().includes(q) || item.link.url.toLowerCase().includes(q),
    )
  }

  return filtered.map((item) => item.link)
}

/**
 * Pivot 레이아웃 메인 영역.
 * REQ-003: 선택 컨텍스트의 북마크 표시
 * REQ-004: 검색바 (debounce)
 * REQ-005: 가상화 리스트
 * REQ-006: 격자/리스트 뷰 토글
 * REQ-007: 밀도 토글
 * REQ-011: 빈 상태 표시
 * REQ-012: 자주 쓰는 것 (context=all)
 */
export function MainView(): JSX.Element {
  const { context, searchQuery, viewMode, density } = useViewStore()
  const bookmarks = useBookmarkStore((s) => s.bookmarks)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const [sort, setSort] = useState<SortOption>('name')

  // 모든 링크를 평면화 (categoryId 포함)
  const allLinksWithCategory = bookmarks.flatMap((b) =>
    b.links.map((link) => ({ link, categoryId: b.id })),
  )

  // 필터링
  const filteredLinks = filterLinks(allLinksWithCategory, context, searchQuery)

  // 정렬 — usage는 usageStore에서 직접 사용
  // 간단히 sort=usage는 BookmarkList에서 처리하지 않고 여기서 처리
  const sortedLinks = sort === 'usage'
    ? filteredLinks // usage 정렬은 TopSection의 패턴을 따름 (일단 pass-through)
    : filteredLinks.sort((a, b) => {
        if (sort === 'name') return a.name.localeCompare(b.name)
        if (sort === 'createdAt') return (b.createdAt ?? 0) - (a.createdAt ?? 0)
        return 0
      })

  return (
    <main
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        // @MX:NOTE: [AUTO] 메인 영역 자체가 스크롤 컨테이너 — 내부 리스트 가상화 스크롤 제거
        overflowY: 'auto',
        overflowX: 'hidden',
        minWidth: 0,
      }}
    >
      {/* @MX:NOTE: [AUTO] SPEC-LAYOUT-002 Step 2 — 컨텍스트/검색 영역을 sticky로 고정하여
          스크롤 시에도 현재 컨텍스트와 검색바가 상단에 유지되도록 보장 */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          background: 'var(--bg)',
          padding: '16px 20px 8px',
        }}
      >
        {/* 컨텍스트 헤더 */}
        <ContextHeader />

        {/* 검색 + 툴바 행 */}
        <div
          style={{
            display: 'flex',
            gap: 8,
            alignItems: 'center',
          }}
        >
          <div style={{ flex: 1 }}>
            <SearchInput inputRef={searchInputRef} />
          </div>
          <ToolbarRight sort={sort} onSortChange={setSort} />
        </div>
      </div>

      {/* 본문 영역 (스크롤 대상) */}
      <div style={{ padding: '8px 20px 16px' }}>
        {/* 자주 쓰는 것 — context=all일 때만 */}
        {context.kind === 'all' && <TopSection />}

        {/* 북마크 리스트 */}
        <BookmarkList links={sortedLinks} density={density} viewMode={viewMode} />
      </div>
    </main>
  )
}

export default MainView
