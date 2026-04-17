// @MX:SPEC: SPEC-BOOKMARK-002
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'

// 클립보드 API 모킹
Object.assign(navigator, {
  clipboard: {
    readText: vi.fn(),
  },
})

// bookmarkStore 모킹
const mockAddLink = vi.fn()
const mockCategories = [
  { id: 'cat-1', name: 'Work', icon: '💼', links: [] },
  { id: 'cat-2', name: 'Dev', icon: '⚡', links: [] },
]
vi.mock('../../stores/bookmarkStore', () => ({
  useBookmarkStore: vi.fn(() => ({
    bookmarks: mockCategories,
    addLink: mockAddLink,
    addBookmark: vi.fn(),
  })),
}))

import QuickCapture from './QuickCapture'

describe('QuickCapture', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(navigator.clipboard.readText).mockResolvedValue('')
  })

  it('isOpen이 false이면 렌더링하지 않는다', () => {
    render(<QuickCapture isOpen={false} onClose={vi.fn()} />)
    expect(screen.queryByPlaceholderText(/https:\/\//)).not.toBeInTheDocument()
  })

  it('isOpen이 true이면 URL 입력 필드를 표시한다', async () => {
    render(<QuickCapture isOpen={true} onClose={vi.fn()} />)
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/https:\/\//)).toBeInTheDocument()
    })
  })

  it('클립보드에 유효한 URL이 있으면 자동으로 붙여넣는다', async () => {
    vi.mocked(navigator.clipboard.readText).mockResolvedValue('https://example.com')

    render(<QuickCapture isOpen={true} onClose={vi.fn()} />)

    await waitFor(() => {
      const urlInput = screen.getByPlaceholderText(/https:\/\//) as HTMLInputElement
      expect(urlInput.value).toBe('https://example.com')
    })
  })

  it('클립보드에 유효하지 않은 URL이 있으면 자동 붙여넣기를 하지 않는다', async () => {
    vi.mocked(navigator.clipboard.readText).mockResolvedValue('not a url')

    render(<QuickCapture isOpen={true} onClose={vi.fn()} />)

    await waitFor(() => {
      const urlInput = screen.getByPlaceholderText(/https:\/\//) as HTMLInputElement
      expect(urlInput.value).toBe('')
    })
  })

  it('유효하지 않은 URL 입력 시 오류 메시지를 표시한다', async () => {
    render(<QuickCapture isOpen={true} onClose={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/https:\/\//)).toBeInTheDocument()
    })

    const urlInput = screen.getByPlaceholderText(/https:\/\//)
    fireEvent.change(urlInput, { target: { value: 'not-a-url' } })

    const confirmBtn = screen.getByText('추가')
    fireEvent.click(confirmBtn)

    expect(screen.getByText(/유효한 URL/)).toBeInTheDocument()
  })

  it('URL 제목 미입력 시 hostname을 기본 제목으로 사용한다', async () => {
    render(<QuickCapture isOpen={true} onClose={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/https:\/\//)).toBeInTheDocument()
    })

    const urlInput = screen.getByPlaceholderText(/https:\/\//)
    fireEvent.change(urlInput, { target: { value: 'https://example.com/path' } })

    // 카테고리 선택
    const categorySelect = screen.getByRole('combobox')
    fireEvent.change(categorySelect, { target: { value: 'cat-1' } })

    const confirmBtn = screen.getByText('추가')
    fireEvent.click(confirmBtn)

    await waitFor(() => {
      expect(mockAddLink).toHaveBeenCalledWith(
        'cat-1',
        expect.objectContaining({ name: 'example.com' }),
      )
    })
  })

  it('제목 입력 시 해당 제목으로 북마크를 추가한다', async () => {
    render(<QuickCapture isOpen={true} onClose={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/https:\/\//)).toBeInTheDocument()
    })

    const urlInput = screen.getByPlaceholderText(/https:\/\//)
    fireEvent.change(urlInput, { target: { value: 'https://example.com' } })

    const titleInput = screen.getByPlaceholderText(/제목/)
    fireEvent.change(titleInput, { target: { value: '내 사이트' } })

    const categorySelect = screen.getByRole('combobox')
    fireEvent.change(categorySelect, { target: { value: 'cat-1' } })

    const confirmBtn = screen.getByText('추가')
    fireEvent.click(confirmBtn)

    await waitFor(() => {
      expect(mockAddLink).toHaveBeenCalledWith(
        'cat-1',
        expect.objectContaining({ name: '내 사이트', url: 'https://example.com' }),
      )
    })
  })

  it('확인 후 onClose가 호출된다', async () => {
    const onClose = vi.fn()
    render(<QuickCapture isOpen={true} onClose={onClose} />)

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/https:\/\//)).toBeInTheDocument()
    })

    const urlInput = screen.getByPlaceholderText(/https:\/\//)
    fireEvent.change(urlInput, { target: { value: 'https://example.com' } })

    const categorySelect = screen.getByRole('combobox')
    fireEvent.change(categorySelect, { target: { value: 'cat-1' } })

    const confirmBtn = screen.getByText('추가')
    fireEvent.click(confirmBtn)

    await waitFor(() => {
      expect(onClose).toHaveBeenCalled()
    })
  })

  it('취소 버튼 클릭 시 onClose가 호출된다', async () => {
    const onClose = vi.fn()
    render(<QuickCapture isOpen={true} onClose={onClose} />)

    await waitFor(() => {
      expect(screen.getByText('취소')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('취소'))
    expect(onClose).toHaveBeenCalled()
  })

  // SPEC-BOOKMARK-003: TagInput 통합
  it('TagInput이 렌더링되어야 한다', async () => {
    render(<QuickCapture isOpen={true} onClose={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByPlaceholderText('태그 입력...')).toBeInTheDocument()
    })
  })

  it('태그를 포함한 링크를 추가해야 한다', async () => {
    render(<QuickCapture isOpen={true} onClose={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/https:\/\//)).toBeInTheDocument()
    })

    const urlInput = screen.getByPlaceholderText(/https:\/\//)
    fireEvent.change(urlInput, { target: { value: 'https://example.com' } })

    // 태그 입력
    const tagInput = screen.getByPlaceholderText('태그 입력...')
    fireEvent.change(tagInput, { target: { value: 'my-tag' } })
    fireEvent.keyDown(tagInput, { key: 'Enter' })

    const confirmBtn = screen.getByText('추가')
    fireEvent.click(confirmBtn)

    await waitFor(() => {
      expect(mockAddLink).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ tags: expect.arrayContaining(['my-tag']) }),
      )
    })
  })
})
