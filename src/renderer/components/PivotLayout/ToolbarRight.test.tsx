// @MX:SPEC: SPEC-UX-003
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'

const mockSetViewMode = vi.fn()
const mockSetDensity = vi.fn()

vi.mock('../../stores/viewStore', () => ({
  useViewStore: () => ({
    viewMode: 'list' as const,
    density: 'comfortable' as const,
    setViewMode: mockSetViewMode,
    setDensity: mockSetDensity,
  }),
}))

describe('ToolbarRight (SPEC-UX-003)', () => {
  beforeEach(() => vi.clearAllMocks())

  it('뷰 토글 버튼을 렌더링한다', async () => {
    const { ToolbarRight } = await import('./ToolbarRight')
    render(<ToolbarRight />)

    expect(screen.getByTestId('view-mode-toggle')).toBeInTheDocument()
  })

  it('뷰 토글 클릭 시 grid로 전환한다', async () => {
    const { ToolbarRight } = await import('./ToolbarRight')
    render(<ToolbarRight />)

    fireEvent.click(screen.getByTestId('view-mode-toggle'))
    expect(mockSetViewMode).toHaveBeenCalledWith('grid')
  })

  it('밀도 선택 dropdown을 렌더링한다', async () => {
    const { ToolbarRight } = await import('./ToolbarRight')
    render(<ToolbarRight />)

    expect(screen.getByTestId('density-select')).toBeInTheDocument()
  })

  it('밀도 변경 시 setDensity를 호출한다', async () => {
    const { ToolbarRight } = await import('./ToolbarRight')
    render(<ToolbarRight />)

    const select = screen.getByTestId('density-select')
    fireEvent.change(select, { target: { value: 'compact' } })
    expect(mockSetDensity).toHaveBeenCalledWith('compact')
  })

  it('정렬 dropdown을 렌더링한다', async () => {
    const { ToolbarRight } = await import('./ToolbarRight')
    render(<ToolbarRight />)

    expect(screen.getByTestId('sort-select')).toBeInTheDocument()
  })
})
