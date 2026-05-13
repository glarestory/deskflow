// @MX:SPEC: SPEC-UX-010
// EditModeToast 컴포넌트 단위 테스트 — SPEC-UX-010 M4
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import '@testing-library/jest-dom'

describe('EditModeToast', () => {
  const mockOnDismiss = vi.fn()
  const mockOnUndo = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  // AC-019: isVisible=false 시 렌더링 없음
  it('isVisible=false 시 렌더링되지 않는다 (AC-019)', async () => {
    const { default: EditModeToast } = await import('./EditModeToast')
    render(
      <EditModeToast
        isVisible={false}
        variant="undo"
        onDismiss={mockOnDismiss}
        onUndo={mockOnUndo}
      />
    )
    expect(screen.queryByTestId('edit-mode-toast')).not.toBeInTheDocument()
  })

  // AC-020: isVisible=true, variant="undo" 시 토스트 렌더링
  it('isVisible=true, variant="undo" 시 토스트가 렌더링된다 (AC-020)', async () => {
    const { default: EditModeToast } = await import('./EditModeToast')
    render(
      <EditModeToast
        isVisible={true}
        variant="undo"
        onDismiss={mockOnDismiss}
        onUndo={mockOnUndo}
      />
    )
    expect(screen.getByTestId('edit-mode-toast')).toBeInTheDocument()
  })

  // AC-021: variant="undo" 시 실행 취소 버튼 표시
  it('variant="undo" 시 실행 취소 버튼이 표시된다 (AC-021)', async () => {
    const { default: EditModeToast } = await import('./EditModeToast')
    render(
      <EditModeToast
        isVisible={true}
        variant="undo"
        onDismiss={mockOnDismiss}
        onUndo={mockOnUndo}
      />
    )
    expect(screen.getByTestId('toast-undo-btn')).toBeInTheDocument()
  })

  // AC-022: 실행 취소 버튼 클릭 시 onUndo 호출
  it('실행 취소 버튼 클릭 시 onUndo가 호출된다 (AC-022)', async () => {
    const { default: EditModeToast } = await import('./EditModeToast')
    render(
      <EditModeToast
        isVisible={true}
        variant="undo"
        onDismiss={mockOnDismiss}
        onUndo={mockOnUndo}
      />
    )
    fireEvent.click(screen.getByTestId('toast-undo-btn'))
    expect(mockOnUndo).toHaveBeenCalledOnce()
  })

  // AC-023: variant="auto-exit-warning" 시 경고 메시지 표시
  it('variant="auto-exit-warning" 시 자동 종료 경고 메시지가 표시된다 (AC-023)', async () => {
    const { default: EditModeToast } = await import('./EditModeToast')
    render(
      <EditModeToast
        isVisible={true}
        variant="auto-exit-warning"
        onDismiss={mockOnDismiss}
        onUndo={mockOnUndo}
      />
    )
    expect(screen.getByTestId('edit-mode-toast')).toBeInTheDocument()
    // 자동 종료 경고 variant에는 undo 버튼 없음
    expect(screen.queryByTestId('toast-undo-btn')).not.toBeInTheDocument()
  })

  // AC-024: 닫기 버튼 클릭 시 onDismiss 호출
  it('닫기 버튼 클릭 시 onDismiss가 호출된다 (AC-024)', async () => {
    const { default: EditModeToast } = await import('./EditModeToast')
    render(
      <EditModeToast
        isVisible={true}
        variant="undo"
        onDismiss={mockOnDismiss}
        onUndo={mockOnUndo}
      />
    )
    fireEvent.click(screen.getByTestId('toast-dismiss-btn'))
    expect(mockOnDismiss).toHaveBeenCalledOnce()
  })

  // AC-025: variant="undo" — 3초 후 자동 onDismiss 호출
  it('variant="undo" 시 3초 후 자동으로 onDismiss가 호출된다 (AC-025)', async () => {
    const { default: EditModeToast } = await import('./EditModeToast')
    render(
      <EditModeToast
        isVisible={true}
        variant="undo"
        onDismiss={mockOnDismiss}
        onUndo={mockOnUndo}
      />
    )
    act(() => {
      vi.advanceTimersByTime(3000)
    })
    expect(mockOnDismiss).toHaveBeenCalledOnce()
  })

  // AC-026: variant="auto-exit-warning" — 5초 후 자동 onDismiss 호출
  it('variant="auto-exit-warning" 시 5초 후 자동으로 onDismiss가 호출된다 (AC-026)', async () => {
    const { default: EditModeToast } = await import('./EditModeToast')
    render(
      <EditModeToast
        isVisible={true}
        variant="auto-exit-warning"
        onDismiss={mockOnDismiss}
        onUndo={mockOnUndo}
      />
    )
    act(() => {
      vi.advanceTimersByTime(5000)
    })
    expect(mockOnDismiss).toHaveBeenCalledOnce()
  })

  // AC-027: isVisible=false 시 타이머가 설정되지 않는다 (onDismiss 미호출)
  it('isVisible=false 시 5초 경과해도 onDismiss가 호출되지 않는다 (AC-027)', async () => {
    const { default: EditModeToast } = await import('./EditModeToast')
    render(
      <EditModeToast
        isVisible={false}
        variant="undo"
        onDismiss={mockOnDismiss}
        onUndo={mockOnUndo}
      />
    )
    act(() => {
      vi.advanceTimersByTime(5000)
    })
    expect(mockOnDismiss).not.toHaveBeenCalled()
  })

  // AC-028: 하단 중앙 고정 위치 (position: fixed, bottom)
  it('토스트가 bottom-center 고정 위치로 렌더링된다 (AC-028)', async () => {
    const { default: EditModeToast } = await import('./EditModeToast')
    render(
      <EditModeToast
        isVisible={true}
        variant="undo"
        onDismiss={mockOnDismiss}
        onUndo={mockOnUndo}
      />
    )
    const toast = screen.getByTestId('edit-mode-toast')
    expect(toast).toHaveStyle({ position: 'fixed' })
  })
})
