// PomodoroWidget 컴포넌트 테스트 — SPEC-WIDGET-004
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'

// pomodoroStore 모킹
const mockStart = vi.fn()
const mockPause = vi.fn()
const mockReset = vi.fn()
const mockLinkTodo = vi.fn()
const mockUpdateSettings = vi.fn()
const mockTick = vi.fn()

const mockPomodoroState = {
  mode: 'idle' as 'idle' | 'focus' | 'break' | 'longBreak',
  remaining: 25 * 60,
  completed: 0,
  linkedTodoId: null as string | null,
  settings: {
    focusMinutes: 25,
    breakMinutes: 5,
    longBreakMinutes: 15,
  },
  intervalId: null,
  start: mockStart,
  pause: mockPause,
  reset: mockReset,
  tick: mockTick,
  linkTodo: mockLinkTodo,
  updateSettings: mockUpdateSettings,
}

vi.mock('../../stores/pomodoroStore', () => ({
  usePomodoroStore: (selector?: (s: typeof mockPomodoroState) => unknown) => {
    if (selector) return selector(mockPomodoroState)
    return mockPomodoroState
  },
}))

// todoStore 모킹
const mockTodos = [
  { id: 't1', text: '프로젝트 기획서 작성', done: false },
  { id: 't2', text: '주간 회의 준비', done: false },
  { id: 't3', text: '디자인 리뷰', done: true },
]

vi.mock('../../stores/todoStore', () => ({
  useTodoStore: (selector?: (s: { todos: typeof mockTodos }) => unknown) => {
    const state = { todos: mockTodos }
    if (selector) return selector(state)
    return state
  },
}))

describe('PomodoroWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // 상태 초기화
    mockPomodoroState.mode = 'idle'
    mockPomodoroState.remaining = 25 * 60
    mockPomodoroState.completed = 0
    mockPomodoroState.linkedTodoId = null
    mockPomodoroState.intervalId = null
    mockPomodoroState.settings = {
      focusMinutes: 25,
      breakMinutes: 5,
      longBreakMinutes: 15,
    }
  })

  // --- MM:SS 표시 검증 ---
  it('MM:SS 형식으로 남은 시간을 표시해야 한다', async () => {
    const { default: PomodoroWidget } = await import('./PomodoroWidget')
    render(<PomodoroWidget />)
    // 25:00 표시
    expect(screen.getByText('25:00')).toBeInTheDocument()
  })

  it('remaining=90일 때 01:30으로 표시되어야 한다', async () => {
    mockPomodoroState.remaining = 90
    const { default: PomodoroWidget } = await import('./PomodoroWidget')
    render(<PomodoroWidget />)
    expect(screen.getByText('01:30')).toBeInTheDocument()
  })

  it('remaining=0일 때 00:00으로 표시되어야 한다', async () => {
    mockPomodoroState.remaining = 0
    const { default: PomodoroWidget } = await import('./PomodoroWidget')
    render(<PomodoroWidget />)
    expect(screen.getByText('00:00')).toBeInTheDocument()
  })

  // --- 모드 레이블 검증 ---
  it('mode=idle일 때 대기 레이블을 표시해야 한다', async () => {
    mockPomodoroState.mode = 'idle'
    const { default: PomodoroWidget } = await import('./PomodoroWidget')
    render(<PomodoroWidget />)
    expect(screen.getByText('대기')).toBeInTheDocument()
  })

  it('mode=focus일 때 집중 레이블을 표시해야 한다', async () => {
    mockPomodoroState.mode = 'focus'
    const { default: PomodoroWidget } = await import('./PomodoroWidget')
    render(<PomodoroWidget />)
    expect(screen.getByText('집중')).toBeInTheDocument()
  })

  it('mode=break일 때 휴식 레이블을 표시해야 한다', async () => {
    mockPomodoroState.mode = 'break'
    const { default: PomodoroWidget } = await import('./PomodoroWidget')
    render(<PomodoroWidget />)
    expect(screen.getByText('휴식')).toBeInTheDocument()
  })

  it('mode=longBreak일 때 긴 휴식 레이블을 표시해야 한다', async () => {
    mockPomodoroState.mode = 'longBreak'
    const { default: PomodoroWidget } = await import('./PomodoroWidget')
    render(<PomodoroWidget />)
    expect(screen.getByText('긴 휴식')).toBeInTheDocument()
  })

  // --- 완료 카운트 표시 ---
  it('완료된 포모도로 수를 표시해야 한다', async () => {
    mockPomodoroState.completed = 3
    const { default: PomodoroWidget } = await import('./PomodoroWidget')
    render(<PomodoroWidget />)
    expect(screen.getByText(/3/)).toBeInTheDocument()
  })

  // --- 버튼 동작 ---
  it('시작 버튼 클릭 시 start()를 호출해야 한다', async () => {
    const { default: PomodoroWidget } = await import('./PomodoroWidget')
    render(<PomodoroWidget />)
    const startBtn = screen.getByTestId('pomodoro-start-btn')
    fireEvent.click(startBtn)
    expect(mockStart).toHaveBeenCalledOnce()
  })

  it('일시정지 버튼 클릭 시 pause()를 호출해야 한다', async () => {
    mockPomodoroState.mode = 'focus'
    mockPomodoroState.intervalId = 1 as unknown as ReturnType<typeof setInterval>
    const { default: PomodoroWidget } = await import('./PomodoroWidget')
    render(<PomodoroWidget />)
    const pauseBtn = screen.getByTestId('pomodoro-pause-btn')
    fireEvent.click(pauseBtn)
    expect(mockPause).toHaveBeenCalledOnce()
  })

  it('초기화 버튼 클릭 시 reset()을 호출해야 한다', async () => {
    const { default: PomodoroWidget } = await import('./PomodoroWidget')
    render(<PomodoroWidget />)
    const resetBtn = screen.getByTestId('pomodoro-reset-btn')
    fireEvent.click(resetBtn)
    expect(mockReset).toHaveBeenCalledOnce()
  })

  // --- Todo 선택기 ---
  it('todo 목록을 드롭다운에 표시해야 한다', async () => {
    const { default: PomodoroWidget } = await import('./PomodoroWidget')
    render(<PomodoroWidget />)
    const select = screen.getByTestId('todo-selector')
    expect(select).toBeInTheDocument()
    // 할 일 항목이 옵션으로 있어야 함
    expect(screen.getByText('프로젝트 기획서 작성')).toBeInTheDocument()
    expect(screen.getByText('주간 회의 준비')).toBeInTheDocument()
  })

  it('todo를 선택하면 linkTodo()를 호출해야 한다', async () => {
    const { default: PomodoroWidget } = await import('./PomodoroWidget')
    render(<PomodoroWidget />)
    const select = screen.getByTestId('todo-selector')
    fireEvent.change(select, { target: { value: 't1' } })
    expect(mockLinkTodo).toHaveBeenCalledWith('t1')
  })

  it('빈 값 선택 시 linkTodo(null)을 호출해야 한다', async () => {
    const { default: PomodoroWidget } = await import('./PomodoroWidget')
    render(<PomodoroWidget />)
    const select = screen.getByTestId('todo-selector')
    fireEvent.change(select, { target: { value: '' } })
    expect(mockLinkTodo).toHaveBeenCalledWith(null)
  })

  // --- 긴 휴식 제안 모달 ---
  it('mode=longBreak일 때 긴 휴식 제안을 표시해야 한다', async () => {
    mockPomodoroState.mode = 'longBreak'
    mockPomodoroState.completed = 4
    const { default: PomodoroWidget } = await import('./PomodoroWidget')
    render(<PomodoroWidget />)
    expect(screen.getByTestId('long-break-suggestion')).toBeInTheDocument()
  })

  // --- 설정 폼 ---
  it('설정 토글 버튼 클릭 시 설정 폼이 표시되어야 한다', async () => {
    const { default: PomodoroWidget } = await import('./PomodoroWidget')
    render(<PomodoroWidget />)
    const settingsBtn = screen.getByTestId('settings-toggle-btn')
    fireEvent.click(settingsBtn)
    expect(screen.getByTestId('settings-form')).toBeInTheDocument()
  })
})
