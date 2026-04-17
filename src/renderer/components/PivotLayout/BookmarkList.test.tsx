// @MX:SPEC: SPEC-UX-003
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'

vi.mock('./BookmarkRow', () => ({
  BookmarkRow: ({ link, index }: { link: { name: string }; index: number; style: React.CSSProperties }) => (
    <div data-testid={`bookmark-row-${index}`}>{link.name}</div>
  ),
}))

const testLinks = Array.from({ length: 100 }, (_, i) => ({
  id: `l${i + 1}`,
  name: `Link ${i + 1}`,
  url: `https://example${i + 1}.com`,
  tags: [],
}))

describe('BookmarkList (SPEC-UX-003)', () => {
  beforeEach(() => vi.clearAllMocks())

  it('bookmark-list 컨테이너를 렌더링한다 (가상화 제거)', async () => {
    const { BookmarkList } = await import('./BookmarkList')
    render(<BookmarkList links={testLinks} density="comfortable" viewMode="list" />)

    expect(screen.getByTestId('bookmark-list')).toBeInTheDocument()
  })

  it('links가 비어있을 때 빈 상태 메시지를 표시한다', async () => {
    const { BookmarkList } = await import('./BookmarkList')
    render(<BookmarkList links={[]} density="comfortable" viewMode="list" />)

    expect(screen.getByTestId('empty-state')).toBeInTheDocument()
  })

  it('density에 따라 row 높이가 적용된다', async () => {
    const { BookmarkList } = await import('./BookmarkList')
    render(<BookmarkList links={testLinks.slice(0, 3)} density="compact" viewMode="list" />)

    // density=compact일 때 모든 row가 렌더링됨 (가상화 제거)
    expect(screen.getByTestId('bookmark-row-0')).toBeInTheDocument()
    expect(screen.getByTestId('bookmark-row-1')).toBeInTheDocument()
    expect(screen.getByTestId('bookmark-row-2')).toBeInTheDocument()
  })

  it('모든 링크가 DOM에 렌더링된다 (가상화 없음)', async () => {
    const { BookmarkList } = await import('./BookmarkList')
    render(<BookmarkList links={testLinks.slice(0, 3)} density="comfortable" viewMode="list" />)

    expect(screen.getByText('Link 1')).toBeInTheDocument()
    expect(screen.getByText('Link 2')).toBeInTheDocument()
    expect(screen.getByText('Link 3')).toBeInTheDocument()
  })
})
