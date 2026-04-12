import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import type { ParseResult } from '../../lib/bookmarkParser'

// bookmarkParser 모킹
vi.mock('../../lib/bookmarkParser', () => ({
  parseChromeBookmarkHtml: vi.fn(),
  getEmojiForCategory: vi.fn(() => '🔖'),
}))

// bookmarkStore 모킹
const mockImportBookmarks = vi.fn()
vi.mock('../../stores/bookmarkStore', () => ({
  useBookmarkStore: vi.fn(() => ({
    importBookmarks: mockImportBookmarks,
  })),
}))

import ImportModal from './ImportModal'
import { parseChromeBookmarkHtml } from '../../lib/bookmarkParser'

const mockParseResult: ParseResult = {
  categories: [
    { id: 'c1', name: '개발 도구', icon: '💻', links: [
      { id: 'l1', name: 'GitHub', url: 'https://github.com' },
      { id: 'l2', name: 'VSCode', url: 'https://vscode.dev' },
    ]},
    { id: 'c2', name: '뉴스', icon: '📰', links: [
      { id: 'l3', name: 'HN', url: 'https://news.ycombinator.com' },
    ]},
  ],
  totalLinks: 3,
  skippedEmpty: 1,
}

describe('ImportModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders "파일 선택" button initially', () => {
    render(<ImportModal onClose={vi.fn()} />)
    expect(screen.getByText('파일 선택')).toBeInTheDocument()
  })

  it('file input is hidden (not visible to user)', () => {
    render(<ImportModal onClose={vi.fn()} />)
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    expect(input).not.toBeNull()
    // input은 숨겨져 있어야 함
    const style = input.getAttribute('style') ?? ''
    expect(style).toMatch(/display:\s*none|opacity:\s*0/)
  })

  it('shows preview with category count after valid file is selected', async () => {
    vi.mocked(parseChromeBookmarkHtml).mockReturnValue(mockParseResult)

    render(<ImportModal onClose={vi.fn()} />)

    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['<DL></DL>'], 'bookmarks.html', { type: 'text/html' })
    Object.defineProperty(file, 'text', {
      value: vi.fn().mockResolvedValue('<DL></DL>'),
    })

    fireEvent.change(input, { target: { files: [file] } })

    await waitFor(() => {
      expect(screen.getByText(/2개 카테고리/)).toBeInTheDocument()
    })
  })

  it('calls importBookmarks with "merge" mode when "병합" button is clicked', async () => {
    vi.mocked(parseChromeBookmarkHtml).mockReturnValue(mockParseResult)
    const onClose = vi.fn()

    render(<ImportModal onClose={onClose} />)

    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['<DL></DL>'], 'bookmarks.html', { type: 'text/html' })
    Object.defineProperty(file, 'text', {
      value: vi.fn().mockResolvedValue('<DL></DL>'),
    })

    fireEvent.change(input, { target: { files: [file] } })

    await waitFor(() => {
      expect(screen.getByText(/병합/)).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText(/병합/))

    expect(mockImportBookmarks).toHaveBeenCalledWith(mockParseResult.categories, 'merge')
    expect(onClose).toHaveBeenCalled()
  })

  it('calls importBookmarks with "replace" mode when "교체" button is clicked', async () => {
    vi.mocked(parseChromeBookmarkHtml).mockReturnValue(mockParseResult)
    const onClose = vi.fn()

    render(<ImportModal onClose={onClose} />)

    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['<DL></DL>'], 'bookmarks.html', { type: 'text/html' })
    Object.defineProperty(file, 'text', {
      value: vi.fn().mockResolvedValue('<DL></DL>'),
    })

    fireEvent.change(input, { target: { files: [file] } })

    await waitFor(() => {
      expect(screen.getByText(/교체/)).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText(/교체/))

    expect(mockImportBookmarks).toHaveBeenCalledWith(mockParseResult.categories, 'replace')
    expect(onClose).toHaveBeenCalled()
  })

  it('shows error message when parse throws', async () => {
    vi.mocked(parseChromeBookmarkHtml).mockImplementation(() => {
      throw new Error('유효한 크롬 북마크 파일이 아닙니다')
    })

    render(<ImportModal onClose={vi.fn()} />)

    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['invalid content'], 'invalid.html', { type: 'text/html' })
    Object.defineProperty(file, 'text', {
      value: vi.fn().mockResolvedValue('invalid content'),
    })

    fireEvent.change(input, { target: { files: [file] } })

    await waitFor(() => {
      expect(screen.getByText(/유효한 크롬 북마크 파일이 아닙니다/)).toBeInTheDocument()
    })
  })

  it('calls onClose when close/cancel button is clicked', () => {
    const onClose = vi.fn()
    render(<ImportModal onClose={onClose} />)

    const closeBtn = screen.getByText('닫기')
    fireEvent.click(closeBtn)

    expect(onClose).toHaveBeenCalled()
  })
})
