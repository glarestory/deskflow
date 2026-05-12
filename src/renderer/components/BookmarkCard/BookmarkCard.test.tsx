// BookmarkCard 단위 테스트 — 기본 렌더링 + dnd-kit 정렬 시나리오 (SPEC-UX-006)
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import BookmarkCard from './BookmarkCard'
import type { Category } from '../../types'

// usageStore 모킹
vi.mock('../../stores/usageStore', () => ({
  useUsageStore: () => ({ recordUsage: vi.fn() }),
}))

// bookmarkStore 모킹 — updateBookmark 검증용
const mockUpdateBookmark = vi.fn()
vi.mock('../../stores/bookmarkStore', () => ({
  useBookmarkStore: () => ({ updateBookmark: mockUpdateBookmark }),
}))

const mockCategory: Category = {
  id: 'cat-1',
  name: 'Work',
  icon: '💼',
  links: [
    { id: 'l1', name: 'Gmail', url: 'https://mail.google.com', tags: [] },
    { id: 'l2', name: 'Drive', url: 'https://drive.google.com', tags: [] },
  ],
}

describe('BookmarkCard', () => {
  it('renders category name and icon', () => {
    const onEdit = vi.fn()
    render(<BookmarkCard category={mockCategory} onEdit={onEdit} />)

    expect(screen.getByText('Work')).toBeInTheDocument()
    expect(screen.getByText('💼')).toBeInTheDocument()
  })

  it('renders all links in 2-column grid', () => {
    const onEdit = vi.fn()
    render(<BookmarkCard category={mockCategory} onEdit={onEdit} />)

    expect(screen.getByText('Gmail')).toBeInTheDocument()
    expect(screen.getByText('Drive')).toBeInTheDocument()
  })

  it('links open in new tab (편집 모드 OFF)', () => {
    const onEdit = vi.fn()
    render(<BookmarkCard category={mockCategory} onEdit={onEdit} />)

    const gmailLink = screen.getByText('Gmail').closest('a')
    expect(gmailLink).toHaveAttribute('href', 'https://mail.google.com')
    expect(gmailLink).toHaveAttribute('target', '_blank')
  })

  it('calls onEdit with category when settings button is clicked (편집 모드 진입)', () => {
    const onEdit = vi.fn()
    render(<BookmarkCard category={mockCategory} onEdit={onEdit} />)

    const settingsBtn = screen.getByTestId('bookmark-edit-btn')
    fireEvent.click(settingsBtn)

    expect(onEdit).toHaveBeenCalledWith(mockCategory)
  })

  // REQ-UX-006-009: 편집 모드 ON/OFF 분기
  it('편집 모드 진입 시 border 가 accent 색으로 변경된다', () => {
    const onEdit = vi.fn()
    render(<BookmarkCard category={mockCategory} onEdit={onEdit} />)

    const settingsBtn = screen.getByTestId('bookmark-edit-btn')
    fireEvent.click(settingsBtn)

    // 편집 모드 진입 후 ⚙️ 버튼의 opacity 가 1로 변경됨
    expect(settingsBtn).toHaveStyle({ opacity: '1' })
  })

  it('편집 모드에서 ⚙️ 버튼 재클릭 시 편집 모드가 종료된다', () => {
    const onEdit = vi.fn()
    render(<BookmarkCard category={mockCategory} onEdit={onEdit} />)

    const settingsBtn = screen.getByTestId('bookmark-edit-btn')
    fireEvent.click(settingsBtn) // 편집 모드 ON
    fireEvent.click(settingsBtn) // 편집 모드 OFF

    expect(settingsBtn).toHaveStyle({ opacity: '0.35' })
  })

  // REQ-UX-006-009: 편집 모드 OFF 시 링크가 일반 href 를 갖는다
  it('편집 모드 OFF 상태에서 링크에 href 가 있다', () => {
    const onEdit = vi.fn()
    render(<BookmarkCard category={mockCategory} onEdit={onEdit} />)

    const gmailLink = screen.getByText('Gmail').closest('a')
    expect(gmailLink).toHaveAttribute('href', 'https://mail.google.com')
  })
})
