// @MX:SPEC: SPEC-UX-003
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'

const mockSetSearchQuery = vi.fn()

vi.mock('../../stores/viewStore', () => ({
  useViewStore: () => ({
    searchQuery: '',
    setSearchQuery: mockSetSearchQuery,
  }),
}))

describe('SearchInput (SPEC-UX-003)', () => {
  beforeEach(() => vi.clearAllMocks())

  it('검색 입력창을 렌더링한다', async () => {
    const { SearchInput } = await import('./SearchInput')
    render(<SearchInput />)

    expect(screen.getByTestId('search-input')).toBeInTheDocument()
  })

  it('입력 변경 시 debounce 100ms 후 setSearchQuery를 호출한다', async () => {
    vi.useFakeTimers()
    const { SearchInput } = await import('./SearchInput')
    render(<SearchInput />)

    const input = screen.getByTestId('search-input')
    fireEvent.change(input, { target: { value: 'chat' } })

    // debounce 전에는 호출 안됨
    expect(mockSetSearchQuery).not.toHaveBeenCalled()

    // 100ms 경과 후 호출됨
    vi.advanceTimersByTime(100)
    expect(mockSetSearchQuery).toHaveBeenCalledWith('chat')

    vi.useRealTimers()
  })

  it('placeholder 텍스트가 있다', async () => {
    const { SearchInput } = await import('./SearchInput')
    render(<SearchInput />)

    const input = screen.getByTestId('search-input')
    expect(input).toHaveAttribute('placeholder')
  })

  it('type=search 속성을 가진다', async () => {
    const { SearchInput } = await import('./SearchInput')
    render(<SearchInput />)

    const input = screen.getByTestId('search-input')
    expect(input.tagName).toBe('INPUT')
  })
})
