import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import '@testing-library/jest-dom'
import Clock from './Clock'

describe('Clock', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('renders time display with HH:MM format', () => {
    vi.useFakeTimers()
    // 2024-01-15 14:30:45
    vi.setSystemTime(new Date('2024-01-15T14:30:45'))

    render(<Clock />)

    // HH:MM 형식으로 시간이 표시되어야 함
    expect(screen.getByText('14:30')).toBeInTheDocument()
  })

  it('renders seconds separately with lower opacity styling', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-01-15T14:30:45'))

    render(<Clock />)

    // 초가 별도 span으로 렌더링되어야 함
    const secondsEl = screen.getByTestId('clock-seconds')
    expect(secondsEl).toBeInTheDocument()
    expect(secondsEl.textContent).toBe('45')
  })

  it('renders Korean date format', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-01-15T14:30:45'))

    render(<Clock />)

    // 한국어 날짜 형식이 포함되어야 함
    const dateEl = screen.getByTestId('clock-date')
    expect(dateEl).toBeInTheDocument()
    // 한국어 날짜에는 '월', '일' 같은 한국어 단어가 포함됨
    expect(dateEl.textContent).toMatch(/\d{4}년/)
  })

  it('displays greeting based on hour - morning (5-11)', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-01-15T09:00:00'))

    render(<Clock />)

    expect(screen.getByText(/Good Morning/)).toBeInTheDocument()
  })

  it('displays greeting based on hour - afternoon (12-17)', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-01-15T14:00:00'))

    render(<Clock />)

    expect(screen.getByText(/Good Afternoon/)).toBeInTheDocument()
  })

  it('displays greeting based on hour - evening (18-20)', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-01-15T19:00:00'))

    render(<Clock />)

    expect(screen.getByText(/Good Evening/)).toBeInTheDocument()
  })

  it('displays greeting based on hour - night', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-01-15T02:00:00'))

    render(<Clock />)

    expect(screen.getByText(/Good Night/)).toBeInTheDocument()
  })

  it('updates time every second via setInterval', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-01-15T14:30:00'))

    render(<Clock />)
    expect(screen.getByText('14:30')).toBeInTheDocument()

    act(() => {
      vi.setSystemTime(new Date('2024-01-15T14:31:00'))
      vi.advanceTimersByTime(1000)
    })

    expect(screen.getByText('14:31')).toBeInTheDocument()
  })

  it('clears interval on unmount', () => {
    vi.useFakeTimers()
    const clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval')

    const { unmount } = render(<Clock />)
    unmount()

    expect(clearIntervalSpy).toHaveBeenCalled()
  })
})
