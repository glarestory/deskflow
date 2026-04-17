// @MX:SPEC: SPEC-UX-005
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import '@testing-library/jest-dom'

describe('IntroToast (SPEC-UX-005)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  // T-008: IntroToast가 isVisible=true이면 렌더링된다
  it('isVisible이 true이면 토스트 메시지를 표시한다', async () => {
    const { default: IntroToast } = await import('./IntroToast')
    render(<IntroToast isVisible={true} onDismiss={vi.fn()} />)
    expect(screen.getByTestId('intro-toast')).toBeInTheDocument()
    expect(screen.getByText(/새로운 Pivot 레이아웃/)).toBeInTheDocument()
  })

  // T-008: IntroToast가 isVisible=false이면 렌더링되지 않는다
  it('isVisible이 false이면 토스트가 표시되지 않는다', async () => {
    const { default: IntroToast } = await import('./IntroToast')
    render(<IntroToast isVisible={false} onDismiss={vi.fn()} />)
    expect(screen.queryByTestId('intro-toast')).not.toBeInTheDocument()
  })

  // T-008: 5초 후 자동으로 onDismiss 호출
  it('5초 후 자동으로 onDismiss가 호출된다', async () => {
    const mockDismiss = vi.fn()
    const { default: IntroToast } = await import('./IntroToast')
    render(<IntroToast isVisible={true} onDismiss={mockDismiss} />)

    act(() => { vi.advanceTimersByTime(5000) })
    expect(mockDismiss).toHaveBeenCalledOnce()
  })

  // T-008: 5초 미만에는 onDismiss 미호출
  it('5초 이전에는 onDismiss가 호출되지 않는다', async () => {
    const mockDismiss = vi.fn()
    const { default: IntroToast } = await import('./IntroToast')
    render(<IntroToast isVisible={true} onDismiss={mockDismiss} />)

    act(() => { vi.advanceTimersByTime(4999) })
    expect(mockDismiss).not.toHaveBeenCalled()
  })

  // T-008: 닫기 버튼 클릭 시 즉시 onDismiss 호출
  it('닫기 버튼 클릭 시 즉시 onDismiss가 호출된다', async () => {
    const mockDismiss = vi.fn()
    const { default: IntroToast } = await import('./IntroToast')
    render(<IntroToast isVisible={true} onDismiss={mockDismiss} />)

    fireEvent.click(screen.getByTestId('intro-toast-dismiss'))
    expect(mockDismiss).toHaveBeenCalledOnce()
  })

  // T-008: 안내 메시지에 위젯 모드로 돌아가는 경로 표시
  it('위젯 모드로 돌아가는 안내 메시지를 표시한다', async () => {
    const { default: IntroToast } = await import('./IntroToast')
    render(<IntroToast isVisible={true} onDismiss={vi.fn()} />)
    const elements = screen.getAllByText(/위젯 모드/)
    expect(elements.length).toBeGreaterThan(0)
  })
})
