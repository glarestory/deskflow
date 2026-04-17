// @MX:SPEC: SPEC-BOOKMARK-002
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'

// bookmarkDedup 모킹
vi.mock('../../lib/bookmarkDedup', () => ({
  findDuplicates: vi.fn(),
}))

// bookmarkStore 모킹
const mockRemoveDuplicates = vi.fn()
const mockBookmarks = [
  {
    id: 'cat-1',
    name: 'Work',
    icon: '💼',
    links: [
      { id: 'l1', name: 'GitHub', url: 'https://github.com' },
    ],
  },
  {
    id: 'cat-2',
    name: 'Dev',
    icon: '⚡',
    links: [
      { id: 'l2', name: 'GitHub (Dev)', url: 'https://github.com' },
    ],
  },
]
vi.mock('../../stores/bookmarkStore', () => ({
  useBookmarkStore: vi.fn(() => ({
    bookmarks: mockBookmarks,
    removeDuplicates: mockRemoveDuplicates,
  })),
}))

import DedupModal from './DedupModal'
import type { DuplicateGroup } from '../../lib/bookmarkDedup'
import { findDuplicates } from '../../lib/bookmarkDedup'

const MOCK_DUPLICATE_GROUPS: DuplicateGroup[] = [
  {
    url: 'https://github.com',
    items: [
      { categoryId: 'cat-1', categoryName: 'Work', linkId: 'l1', title: 'GitHub' },
      { categoryId: 'cat-2', categoryName: 'Dev', linkId: 'l2', title: 'GitHub (Dev)' },
    ],
  },
]

describe('DedupModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('isOpen이 false이면 렌더링하지 않는다', () => {
    vi.mocked(findDuplicates).mockReturnValue([])
    render(<DedupModal isOpen={false} onClose={vi.fn()} />)
    expect(screen.queryByText('중복 북마크 정리')).not.toBeInTheDocument()
  })

  it('중복이 없으면 "중복 없음" 메시지를 표시한다', () => {
    vi.mocked(findDuplicates).mockReturnValue([])
    render(<DedupModal isOpen={true} onClose={vi.fn()} />)
    expect(screen.getByText(/중복.*없/)).toBeInTheDocument()
  })

  it('중복 그룹 목록을 표시한다', () => {
    vi.mocked(findDuplicates).mockReturnValue(MOCK_DUPLICATE_GROUPS)
    render(<DedupModal isOpen={true} onClose={vi.fn()} />)
    expect(screen.getByText('https://github.com')).toBeInTheDocument()
    // GitHub, Work, Dev는 라벨 내에 포함된 텍스트 (여러 요소 가능)
    expect(screen.getAllByText(/GitHub/).length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText(/Work/).length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText(/Dev/).length).toBeGreaterThanOrEqual(1)
  })

  it('기본적으로 첫 번째 항목을 유지하도록 선택된다', () => {
    vi.mocked(findDuplicates).mockReturnValue(MOCK_DUPLICATE_GROUPS)
    render(<DedupModal isOpen={true} onClose={vi.fn()} />)
    // 첫 번째 항목의 라디오가 체크됨 (기본값)
    const radios = screen.getAllByRole('radio') as HTMLInputElement[]
    expect(radios[0].checked).toBe(true)
    expect(radios[1].checked).toBe(false)
  })

  it('"중복 제거" 버튼 클릭 시 removeDuplicates가 호출된다', () => {
    vi.mocked(findDuplicates).mockReturnValue(MOCK_DUPLICATE_GROUPS)
    render(<DedupModal isOpen={true} onClose={vi.fn()} />)

    const dedupeBtn = screen.getByText('중복 제거')
    fireEvent.click(dedupeBtn)

    // 첫 번째 항목(l1)을 유지하도록 호출
    expect(mockRemoveDuplicates).toHaveBeenCalledWith(['l1'])
  })

  it('유지할 항목을 변경 후 "중복 제거" 클릭 시 올바른 linkId가 전달된다', () => {
    vi.mocked(findDuplicates).mockReturnValue(MOCK_DUPLICATE_GROUPS)
    render(<DedupModal isOpen={true} onClose={vi.fn()} />)

    // 두 번째 항목 선택
    const radios = screen.getAllByRole('radio')
    fireEvent.click(radios[1])

    const dedupeBtn = screen.getByText('중복 제거')
    fireEvent.click(dedupeBtn)

    // 두 번째 항목(l2)을 유지하도록 호출
    expect(mockRemoveDuplicates).toHaveBeenCalledWith(['l2'])
  })

  it('"중복 제거" 완료 후 onClose가 호출된다', () => {
    vi.mocked(findDuplicates).mockReturnValue(MOCK_DUPLICATE_GROUPS)
    const onClose = vi.fn()
    render(<DedupModal isOpen={true} onClose={onClose} />)

    const dedupeBtn = screen.getByText('중복 제거')
    fireEvent.click(dedupeBtn)

    expect(onClose).toHaveBeenCalled()
  })

  it('닫기 버튼 클릭 시 onClose가 호출된다', () => {
    vi.mocked(findDuplicates).mockReturnValue([])
    const onClose = vi.fn()
    render(<DedupModal isOpen={true} onClose={onClose} />)

    fireEvent.click(screen.getByText('닫기'))
    expect(onClose).toHaveBeenCalled()
  })
})
