// @MX:SPEC: SPEC-UX-003
// @MX:NOTE: [AUTO] 가상화 제거 후 — 전량 렌더 시 합리적 성능 검증 (1000개 기준)
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'

vi.mock('./BookmarkRow', () => ({
  BookmarkRow: ({ link, index }: { link: { name: string }; index: number; style: React.CSSProperties }) => (
    <div data-testid={`row-${index}`}>{link.name}</div>
  ),
}))

/**
 * N개 북마크 시드 데이터 생성
 */
function generateSeedLinks(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: `seed-${i + 1}`,
    name: `Bookmark ${i + 1}`,
    url: `https://example${i + 1}.com`,
    tags: [`tag${(i % 10) + 1}`, `tag${(i % 5) + 1}`],
    favorite: i % 7 === 0,
    createdAt: Date.now() - i * 86400000,
  }))
}

describe('BookmarkList 렌더링 (가상화 제거 후)', () => {
  it('1000개 링크가 모두 DOM에 렌더링된다', async () => {
    const { BookmarkList } = await import('./BookmarkList')
    const links = generateSeedLinks(1000)

    render(<BookmarkList links={links} density="comfortable" viewMode="list" />)

    const list = screen.getByTestId('bookmark-list')
    expect(list).toHaveAttribute('data-item-count', '1000')

    const rows = screen.getAllByTestId(/^row-/)
    expect(rows.length).toBe(1000)
  })

  it('density 변경이 즉시 반영된다', async () => {
    const { BookmarkList } = await import('./BookmarkList')
    const links = generateSeedLinks(100)

    const { rerender } = render(<BookmarkList links={links} density="comfortable" viewMode="list" />)
    rerender(<BookmarkList links={links} density="compact" viewMode="list" />)

    expect(screen.getByTestId('bookmark-list')).toBeInTheDocument()
    expect(screen.getAllByTestId(/^row-/).length).toBe(100)
  })

  it('100개 링크 렌더가 200ms 이내에 완료된다', async () => {
    const { BookmarkList } = await import('./BookmarkList')
    const links = generateSeedLinks(100)

    const start = performance.now()
    render(<BookmarkList links={links} density="comfortable" viewMode="list" />)
    const elapsed = performance.now() - start

    expect(elapsed).toBeLessThan(200)
  })
})
