// @MX:NOTE: [AUTO] 반복 할 일 기능 테스트 — SPEC-TODO-002
// @MX:SPEC: SPEC-TODO-002
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGet = vi.fn()
const mockSet = vi.fn()
vi.stubGlobal('storage', { get: mockGet, set: mockSet })

describe('calcNextDue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    vi.stubGlobal('storage', { get: mockGet, set: mockSet })
  })

  it('매일 반복: 다음 날 날짜를 반환한다', async () => {
    const { calcNextDue } = await import('./todoStore')
    const result = calcNextDue({ type: 'daily', nextDue: '', seriesId: 's1' }, new Date('2026-01-10'))
    expect(result).toBe('2026-01-11')
  })

  it('매일 반복: 월말에서 다음 달로 넘어간다', async () => {
    const { calcNextDue } = await import('./todoStore')
    const result = calcNextDue({ type: 'daily', nextDue: '', seriesId: 's1' }, new Date('2026-01-31'))
    expect(result).toBe('2026-02-01')
  })

  it('매주 반복: 선택된 요일 중 다음 발생일을 반환한다', async () => {
    const { calcNextDue } = await import('./todoStore')
    // 2026-01-10은 토요일(6), 다음 월요일(1)이어야 함
    const result = calcNextDue(
      { type: 'weekly', daysOfWeek: [1, 3], nextDue: '', seriesId: 's1' },
      new Date('2026-01-10')
    )
    expect(result).toBe('2026-01-12') // 다음 월요일
  })

  it('매주 반복: 요일 없으면 7일 후를 반환한다', async () => {
    const { calcNextDue } = await import('./todoStore')
    const result = calcNextDue(
      { type: 'weekly', daysOfWeek: [], nextDue: '', seriesId: 's1' },
      new Date('2026-01-10')
    )
    expect(result).toBe('2026-01-17')
  })

  it('매월 반복: 다음 달 같은 날을 반환한다', async () => {
    const { calcNextDue } = await import('./todoStore')
    const result = calcNextDue(
      { type: 'monthly', dayOfMonth: 15, nextDue: '', seriesId: 's1' },
      new Date('2026-01-15')
    )
    expect(result).toBe('2026-02-15')
  })

  it('매월 반복: dayOfMonth 없으면 다음 달 1일을 반환한다', async () => {
    const { calcNextDue } = await import('./todoStore')
    const result = calcNextDue(
      { type: 'monthly', nextDue: '', seriesId: 's1' },
      new Date('2026-01-15')
    )
    expect(result).toBe('2026-02-01')
  })
})

describe('addRecurringTodo', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    vi.resetModules()
    vi.stubGlobal('storage', { get: mockGet, set: mockSet })
    mockGet.mockResolvedValue({ value: null })
  })

  it('반복 설정이 있는 할 일을 추가한다', async () => {
    const { useTodoStore } = await import('./todoStore')
    await useTodoStore.getState().loadTodos()

    useTodoStore.getState().addRecurringTodo('매일 운동', {
      type: 'daily',
      nextDue: '',
      seriesId: '',
    })

    const todos = useTodoStore.getState().todos
    const recurring = todos.find((t) => t.text === '매일 운동')
    expect(recurring).toBeDefined()
    expect(recurring?.recurrence).toBeDefined()
    expect(recurring?.recurrence?.type).toBe('daily')
    expect(recurring?.recurrence?.seriesId).toBeTruthy()
  })

  it('nextDue를 오늘 날짜로 설정한다', async () => {
    const { useTodoStore } = await import('./todoStore')
    await useTodoStore.getState().loadTodos()

    const today = new Date()
    const expectedDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

    useTodoStore.getState().addRecurringTodo('오늘부터 매일', {
      type: 'daily',
      nextDue: '',
      seriesId: '',
    })

    const todos = useTodoStore.getState().todos
    const recurring = todos.find((t) => t.text === '오늘부터 매일')
    expect(recurring?.recurrence?.nextDue).toBe(expectedDate)
  })

  it('매주 반복에서 daysOfWeek를 보존한다', async () => {
    const { useTodoStore } = await import('./todoStore')
    await useTodoStore.getState().loadTodos()

    useTodoStore.getState().addRecurringTodo('주간 회의', {
      type: 'weekly',
      daysOfWeek: [1, 3, 5],
      nextDue: '',
      seriesId: '',
    })

    const todos = useTodoStore.getState().todos
    const recurring = todos.find((t) => t.text === '주간 회의')
    expect(recurring?.recurrence?.daysOfWeek).toEqual([1, 3, 5])
  })

  it('매월 반복에서 dayOfMonth를 보존한다', async () => {
    const { useTodoStore } = await import('./todoStore')
    await useTodoStore.getState().loadTodos()

    useTodoStore.getState().addRecurringTodo('월간 보고서', {
      type: 'monthly',
      dayOfMonth: 25,
      nextDue: '',
      seriesId: '',
    })

    const todos = useTodoStore.getState().todos
    const recurring = todos.find((t) => t.text === '월간 보고서')
    expect(recurring?.recurrence?.dayOfMonth).toBe(25)
  })
})

describe('checkAndRegenerateRecurring', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    vi.resetModules()
    vi.stubGlobal('storage', { get: mockGet, set: mockSet })
    mockGet.mockResolvedValue({ value: null })
  })

  it('완료된 매일 반복 할 일의 다음 인스턴스를 생성한다', async () => {
    const { useTodoStore } = await import('./todoStore')
    await useTodoStore.getState().loadTodos()

    // 어제 날짜의 완료된 반복 할 일을 직접 설정
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`

    const { useTodoStore: freshStore } = await import('./todoStore')
    const completedTodo = {
      id: 'recurring-1',
      text: '매일 운동',
      done: true,
      recurrence: {
        type: 'daily' as const,
        nextDue: yesterdayStr,
        seriesId: 'series-1',
      },
    }

    freshStore.setState({ todos: [completedTodo], loaded: true })
    await freshStore.getState().checkAndRegenerateRecurring()

    const todos = freshStore.getState().todos
    // 새로운 인스턴스가 생성되어야 함
    const newInstance = todos.find((t) => t.text === '매일 운동' && !t.done)
    expect(newInstance).toBeDefined()
    expect(newInstance?.recurrence?.seriesId).toBe('series-1')
  })

  it('완료된 매주 반복 할 일의 다음 인스턴스를 생성한다', async () => {
    const { useTodoStore } = await import('./todoStore')
    await useTodoStore.getState().loadTodos()

    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`

    useTodoStore.setState({
      todos: [
        {
          id: 'weekly-1',
          text: '주간 회의',
          done: true,
          recurrence: {
            type: 'weekly' as const,
            daysOfWeek: [1, 3, 5],
            nextDue: yesterdayStr,
            seriesId: 'series-weekly',
          },
        },
      ],
      loaded: true,
    })

    await useTodoStore.getState().checkAndRegenerateRecurring()
    const todos = useTodoStore.getState().todos
    const newInstance = todos.find((t) => t.text === '주간 회의' && !t.done)
    expect(newInstance).toBeDefined()
    expect(newInstance?.recurrence?.seriesId).toBe('series-weekly')
  })

  it('완료된 매월 반복 할 일의 다음 인스턴스를 생성한다', async () => {
    const { useTodoStore } = await import('./todoStore')
    await useTodoStore.getState().loadTodos()

    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`

    useTodoStore.setState({
      todos: [
        {
          id: 'monthly-1',
          text: '월간 보고서',
          done: true,
          recurrence: {
            type: 'monthly' as const,
            dayOfMonth: yesterday.getDate(),
            nextDue: yesterdayStr,
            seriesId: 'series-monthly',
          },
        },
      ],
      loaded: true,
    })

    await useTodoStore.getState().checkAndRegenerateRecurring()
    const todos = useTodoStore.getState().todos
    const newInstance = todos.find((t) => t.text === '월간 보고서' && !t.done)
    expect(newInstance).toBeDefined()
  })

  it('완료되지 않은 반복 할 일은 재생성하지 않는다', async () => {
    const { useTodoStore } = await import('./todoStore')

    const today = new Date()
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

    useTodoStore.setState({
      todos: [
        {
          id: 'incomplete-1',
          text: '미완료 반복',
          done: false,
          recurrence: {
            type: 'daily' as const,
            nextDue: todayStr,
            seriesId: 'series-incomplete',
          },
        },
      ],
      loaded: true,
    })

    const before = useTodoStore.getState().todos.length
    await useTodoStore.getState().checkAndRegenerateRecurring()
    expect(useTodoStore.getState().todos.length).toBe(before)
  })

  it('반복 설정이 없는 완료 항목은 재생성하지 않는다', async () => {
    const { useTodoStore } = await import('./todoStore')

    useTodoStore.setState({
      todos: [{ id: 'plain-1', text: '일반 완료 항목', done: true }],
      loaded: true,
    })

    const before = useTodoStore.getState().todos.length
    await useTodoStore.getState().checkAndRegenerateRecurring()
    expect(useTodoStore.getState().todos.length).toBe(before)
  })
})

describe('deleteTodoSeries', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    vi.resetModules()
    vi.stubGlobal('storage', { get: mockGet, set: mockSet })
    mockGet.mockResolvedValue({ value: null })
  })

  it('같은 seriesId를 가진 모든 할 일을 삭제한다', async () => {
    const { useTodoStore } = await import('./todoStore')

    useTodoStore.setState({
      todos: [
        {
          id: 'series-a-1',
          text: '반복 할 일',
          done: false,
          recurrence: { type: 'daily' as const, nextDue: '2026-01-01', seriesId: 'series-a' },
        },
        {
          id: 'series-a-2',
          text: '반복 할 일',
          done: true,
          recurrence: { type: 'daily' as const, nextDue: '2026-01-02', seriesId: 'series-a' },
        },
        {
          id: 'other-1',
          text: '다른 할 일',
          done: false,
        },
      ],
      loaded: true,
    })

    useTodoStore.getState().deleteTodoSeries('series-a')

    const todos = useTodoStore.getState().todos
    expect(todos.find((t) => t.recurrence?.seriesId === 'series-a')).toBeUndefined()
    expect(todos.find((t) => t.id === 'other-1')).toBeDefined()
    expect(todos.length).toBe(1)
  })

  it('존재하지 않는 seriesId는 아무것도 삭제하지 않는다', async () => {
    const { useTodoStore } = await import('./todoStore')

    useTodoStore.setState({
      todos: [{ id: 'plain-1', text: '일반 할 일', done: false }],
      loaded: true,
    })

    const before = useTodoStore.getState().todos.length
    useTodoStore.getState().deleteTodoSeries('nonexistent')
    expect(useTodoStore.getState().todos.length).toBe(before)
  })
})
