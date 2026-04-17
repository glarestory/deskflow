// @MX:NOTE: [AUTO] RecurrenceModal 컴포넌트 테스트 — SPEC-TODO-002
// @MX:SPEC: SPEC-TODO-002
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'

const mockGet = vi.fn()
const mockSet = vi.fn()
vi.stubGlobal('storage', { get: mockGet, set: mockSet })

describe('RecurrenceModal', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    vi.resetModules()
    vi.stubGlobal('storage', { get: mockGet, set: mockSet })
    mockGet.mockResolvedValue({ value: null })
  })

  it('isOpen이 false이면 렌더링하지 않는다', async () => {
    const { default: RecurrenceModal } = await import('./RecurrenceModal')
    const onClose = vi.fn()
    const onConfirm = vi.fn()

    render(<RecurrenceModal isOpen={false} onClose={onClose} onConfirm={onConfirm} />)
    expect(screen.queryByText('반복 할 일 추가')).not.toBeInTheDocument()
  })

  it('isOpen이 true이면 모달을 렌더링한다', async () => {
    const { default: RecurrenceModal } = await import('./RecurrenceModal')
    const onClose = vi.fn()
    const onConfirm = vi.fn()

    render(<RecurrenceModal isOpen={true} onClose={onClose} onConfirm={onConfirm} />)
    expect(screen.getByText('반복 할 일 추가')).toBeInTheDocument()
  })

  it('반복 유형 선택지를 렌더링한다', async () => {
    const { default: RecurrenceModal } = await import('./RecurrenceModal')
    render(<RecurrenceModal isOpen={true} onClose={vi.fn()} onConfirm={vi.fn()} />)

    expect(screen.getByText('없음')).toBeInTheDocument()
    expect(screen.getByText('매일')).toBeInTheDocument()
    expect(screen.getByText('매주')).toBeInTheDocument()
    expect(screen.getByText('매월')).toBeInTheDocument()
  })

  it('매주 선택 시 요일 체크박스를 표시한다', async () => {
    const { default: RecurrenceModal } = await import('./RecurrenceModal')
    render(<RecurrenceModal isOpen={true} onClose={vi.fn()} onConfirm={vi.fn()} />)

    fireEvent.click(screen.getByText('매주'))

    expect(screen.getByText('일')).toBeInTheDocument()
    expect(screen.getByText('월')).toBeInTheDocument()
    expect(screen.getByText('화')).toBeInTheDocument()
    expect(screen.getByText('수')).toBeInTheDocument()
    expect(screen.getByText('목')).toBeInTheDocument()
    expect(screen.getByText('금')).toBeInTheDocument()
    expect(screen.getByText('토')).toBeInTheDocument()
  })

  it('매월 선택 시 날짜 입력을 표시한다', async () => {
    const { default: RecurrenceModal } = await import('./RecurrenceModal')
    render(<RecurrenceModal isOpen={true} onClose={vi.fn()} onConfirm={vi.fn()} />)

    fireEvent.click(screen.getByText('매월'))

    const dayInput = screen.getByPlaceholderText('1-31')
    expect(dayInput).toBeInTheDocument()
  })

  it('취소 버튼 클릭 시 onClose가 호출된다', async () => {
    const { default: RecurrenceModal } = await import('./RecurrenceModal')
    const onClose = vi.fn()

    render(<RecurrenceModal isOpen={true} onClose={onClose} onConfirm={vi.fn()} />)
    fireEvent.click(screen.getByText('취소'))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('텍스트 입력 후 확인 버튼으로 onConfirm이 호출된다', async () => {
    const { default: RecurrenceModal } = await import('./RecurrenceModal')
    const onConfirm = vi.fn()

    render(<RecurrenceModal isOpen={true} onClose={vi.fn()} onConfirm={onConfirm} />)

    const textInput = screen.getByPlaceholderText('할 일 내용 입력...')
    fireEvent.change(textInput, { target: { value: '매일 운동' } })

    fireEvent.click(screen.getByText('매일'))
    fireEvent.click(screen.getByText('확인'))

    expect(onConfirm).toHaveBeenCalledWith('매일 운동', expect.objectContaining({ type: 'daily' }))
  })

  it('텍스트 없이 확인 시 onConfirm이 호출되지 않는다', async () => {
    const { default: RecurrenceModal } = await import('./RecurrenceModal')
    const onConfirm = vi.fn()

    render(<RecurrenceModal isOpen={true} onClose={vi.fn()} onConfirm={onConfirm} />)
    fireEvent.click(screen.getByText('확인'))

    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('매주 선택 시 요일을 하나도 선택 안 하면 onConfirm이 호출되지 않는다', async () => {
    const { default: RecurrenceModal } = await import('./RecurrenceModal')
    const onConfirm = vi.fn()

    render(<RecurrenceModal isOpen={true} onClose={vi.fn()} onConfirm={onConfirm} />)

    const textInput = screen.getByPlaceholderText('할 일 내용 입력...')
    fireEvent.change(textInput, { target: { value: '운동' } })
    fireEvent.click(screen.getByText('매주'))

    // 요일을 선택하지 않은 채 확인
    fireEvent.click(screen.getByText('확인'))
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('매주 - 요일 선택 후 올바른 데이터로 onConfirm이 호출된다', async () => {
    const { default: RecurrenceModal } = await import('./RecurrenceModal')
    const onConfirm = vi.fn()

    render(<RecurrenceModal isOpen={true} onClose={vi.fn()} onConfirm={onConfirm} />)

    const textInput = screen.getByPlaceholderText('할 일 내용 입력...')
    fireEvent.change(textInput, { target: { value: '주간 회의' } })
    fireEvent.click(screen.getByText('매주'))
    fireEvent.click(screen.getByText('월'))
    fireEvent.click(screen.getByText('확인'))

    expect(onConfirm).toHaveBeenCalledWith(
      '주간 회의',
      expect.objectContaining({ type: 'weekly', daysOfWeek: [1] })
    )
  })

  it('매월 - 날짜 입력 후 올바른 데이터로 onConfirm이 호출된다', async () => {
    const { default: RecurrenceModal } = await import('./RecurrenceModal')
    const onConfirm = vi.fn()

    render(<RecurrenceModal isOpen={true} onClose={vi.fn()} onConfirm={onConfirm} />)

    const textInput = screen.getByPlaceholderText('할 일 내용 입력...')
    fireEvent.change(textInput, { target: { value: '월급날' } })
    fireEvent.click(screen.getByText('매월'))

    const dayInput = screen.getByPlaceholderText('1-31')
    fireEvent.change(dayInput, { target: { value: '25' } })
    fireEvent.click(screen.getByText('확인'))

    expect(onConfirm).toHaveBeenCalledWith(
      '월급날',
      expect.objectContaining({ type: 'monthly', dayOfMonth: 25 })
    )
  })
})
