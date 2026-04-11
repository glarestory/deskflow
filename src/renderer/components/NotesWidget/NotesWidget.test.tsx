import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import '@testing-library/jest-dom'
import NotesWidget from './NotesWidget'

const mockGet = vi.fn()
const mockSet = vi.fn()
vi.stubGlobal('storage', { get: mockGet, set: mockSet })

describe('NotesWidget', () => {
  afterEach(() => {
    vi.clearAllMocks()
    vi.useRealTimers()
  })

  it('renders textarea for notes', () => {
    mockGet.mockResolvedValue({ value: null })
    render(<NotesWidget />)
    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })

  it('loads notes from storage on mount', async () => {
    mockGet.mockResolvedValue({ value: 'saved notes content' })

    await act(async () => {
      render(<NotesWidget />)
    })

    expect(mockGet).toHaveBeenCalledWith('hub-notes')
    expect(screen.getByDisplayValue('saved notes content')).toBeInTheDocument()
  })

  it('debounces save by 600ms after typing', async () => {
    vi.useFakeTimers()
    mockGet.mockResolvedValue({ value: null })

    render(<NotesWidget />)

    const textarea = screen.getByRole('textbox')
    fireEvent.change(textarea, { target: { value: 'typing...' } })

    // 600ms 이전에는 저장 안 됨
    act(() => {
      vi.advanceTimersByTime(300)
    })
    expect(mockSet).not.toHaveBeenCalledWith('hub-notes', expect.any(String))

    // 600ms 후 저장됨
    act(() => {
      vi.advanceTimersByTime(300)
    })
    expect(mockSet).toHaveBeenCalledWith('hub-notes', 'typing...')
  })

  it('resets debounce timer on each keystroke', async () => {
    vi.useFakeTimers()
    mockGet.mockResolvedValue({ value: null })

    render(<NotesWidget />)

    const textarea = screen.getByRole('textbox')

    act(() => {
      fireEvent.change(textarea, { target: { value: 'first' } })
      vi.advanceTimersByTime(400)
      // 400ms 후 추가 입력
      fireEvent.change(textarea, { target: { value: 'second' } })
      vi.advanceTimersByTime(400)
    })
    // 아직 600ms 안 됐음 (last input 기준)
    expect(mockSet).not.toHaveBeenCalledWith('hub-notes', 'second')

    act(() => {
      vi.advanceTimersByTime(200)
    })
    expect(mockSet).toHaveBeenCalledWith('hub-notes', 'second')
  })

  it('clears debounce timer on unmount', () => {
    vi.useFakeTimers()
    mockGet.mockResolvedValue({ value: null })
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout')

    const { unmount } = render(<NotesWidget />)

    const textarea = screen.getByRole('textbox')
    fireEvent.change(textarea, { target: { value: 'typing before unmount' } })

    unmount()

    expect(clearTimeoutSpy).toHaveBeenCalled()
  })
})
