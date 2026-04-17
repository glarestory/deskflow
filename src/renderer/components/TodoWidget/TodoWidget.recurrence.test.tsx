// @MX:NOTE: [AUTO] TodoWidget 반복 기능 테스트 — SPEC-TODO-002
// @MX:SPEC: SPEC-TODO-002
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'

const mockGet = vi.fn()
const mockSet = vi.fn()
vi.stubGlobal('storage', { get: mockGet, set: mockSet })

describe('TodoWidget - 반복 기능', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    vi.resetModules()
    vi.stubGlobal('storage', { get: mockGet, set: mockSet })
    mockGet.mockResolvedValue({ value: null })
  })

  it('반복 할 일에 반복 아이콘을 표시한다', async () => {
    const { useTodoStore } = await import('../../stores/todoStore')
    await useTodoStore.getState().loadTodos()

    useTodoStore.setState({
      todos: [
        {
          id: 'r1',
          text: '매일 운동',
          done: false,
          recurrence: {
            type: 'daily' as const,
            nextDue: '2026-01-15',
            seriesId: 'series-1',
          },
        },
        {
          id: 'r2',
          text: '일반 할 일',
          done: false,
        },
      ],
      loaded: true,
    })

    const { default: TodoWidget } = await import('./TodoWidget')
    render(<TodoWidget />)

    // 반복 아이콘이 표시되어야 함
    expect(screen.getByTitle('반복 할 일')).toBeInTheDocument()
  })

  it('반복 할 일에 nextDue 날짜를 표시한다', async () => {
    const { useTodoStore } = await import('../../stores/todoStore')

    useTodoStore.setState({
      todos: [
        {
          id: 'r1',
          text: '매일 운동',
          done: false,
          recurrence: {
            type: 'daily' as const,
            nextDue: '2026-01-15',
            seriesId: 'series-1',
          },
        },
      ],
      loaded: true,
    })

    const { default: TodoWidget } = await import('./TodoWidget')
    render(<TodoWidget />)

    expect(screen.getByText('2026-01-15')).toBeInTheDocument()
  })

  it('"반복 할 일 추가" 버튼이 렌더링된다', async () => {
    const { useTodoStore } = await import('../../stores/todoStore')
    await useTodoStore.getState().loadTodos()

    const { default: TodoWidget } = await import('./TodoWidget')
    render(<TodoWidget />)

    expect(screen.getByText('반복 추가')).toBeInTheDocument()
  })

  it('반복 할 일 삭제 버튼 클릭 시 삭제 확인 선택지를 보여준다', async () => {
    const { useTodoStore } = await import('../../stores/todoStore')

    useTodoStore.setState({
      todos: [
        {
          id: 'r1',
          text: '매일 운동',
          done: false,
          recurrence: {
            type: 'daily' as const,
            nextDue: '2026-01-15',
            seriesId: 'series-1',
          },
        },
      ],
      loaded: true,
    })

    const { default: TodoWidget } = await import('./TodoWidget')
    render(<TodoWidget />)

    const deleteBtns = screen.getAllByLabelText('삭제')
    fireEvent.click(deleteBtns[0])

    expect(screen.getByText('이 항목만')).toBeInTheDocument()
    expect(screen.getByText('반복 전체')).toBeInTheDocument()
  })

  it('"이 항목만" 선택 시 해당 항목만 삭제된다', async () => {
    const { useTodoStore } = await import('../../stores/todoStore')

    useTodoStore.setState({
      todos: [
        {
          id: 'r1',
          text: '매일 운동',
          done: false,
          recurrence: {
            type: 'daily' as const,
            nextDue: '2026-01-15',
            seriesId: 'series-1',
          },
        },
        {
          id: 'r2',
          text: '매일 운동',
          done: true,
          recurrence: {
            type: 'daily' as const,
            nextDue: '2026-01-14',
            seriesId: 'series-1',
          },
        },
      ],
      loaded: true,
    })

    const { default: TodoWidget } = await import('./TodoWidget')
    render(<TodoWidget />)

    const deleteBtns = screen.getAllByLabelText('삭제')
    fireEvent.click(deleteBtns[0])

    fireEvent.click(screen.getByText('이 항목만'))

    // series-1이 하나만 남아야 함
    const remaining = useTodoStore.getState().todos
    expect(remaining.length).toBe(1)
    expect(remaining[0].id).toBe('r2')
  })

  it('"반복 전체" 선택 시 시리즈 전체가 삭제된다', async () => {
    const { useTodoStore } = await import('../../stores/todoStore')

    useTodoStore.setState({
      todos: [
        {
          id: 'r1',
          text: '매일 운동',
          done: false,
          recurrence: {
            type: 'daily' as const,
            nextDue: '2026-01-15',
            seriesId: 'series-1',
          },
        },
        {
          id: 'r2',
          text: '매일 운동',
          done: true,
          recurrence: {
            type: 'daily' as const,
            nextDue: '2026-01-14',
            seriesId: 'series-1',
          },
        },
        {
          id: 'other',
          text: '다른 할 일',
          done: false,
        },
      ],
      loaded: true,
    })

    const { default: TodoWidget } = await import('./TodoWidget')
    render(<TodoWidget />)

    const deleteBtns = screen.getAllByLabelText('삭제')
    fireEvent.click(deleteBtns[0])

    fireEvent.click(screen.getByText('반복 전체'))

    const remaining = useTodoStore.getState().todos
    expect(remaining.find((t) => t.recurrence?.seriesId === 'series-1')).toBeUndefined()
    expect(remaining.find((t) => t.id === 'other')).toBeDefined()
  })
})
