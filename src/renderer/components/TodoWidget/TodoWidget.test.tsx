import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'

const mockGet = vi.fn()
const mockSet = vi.fn()
vi.stubGlobal('storage', { get: mockGet, set: mockSet })

describe('TodoWidget', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    vi.resetModules()
    vi.stubGlobal('storage', { get: mockGet, set: mockSet })
    mockGet.mockResolvedValue({ value: null })
  })

  it('renders todo list with pending count', async () => {
    const { useTodoStore } = await import('../../stores/todoStore')
    await useTodoStore.getState().loadTodos()

    const { default: TodoWidget } = await import('./TodoWidget')
    render(<TodoWidget />)

    expect(screen.getByText(/개 남음/)).toBeInTheDocument()
  })

  it('adds a new todo on Enter key', async () => {
    const { useTodoStore } = await import('../../stores/todoStore')
    await useTodoStore.getState().loadTodos()

    const { default: TodoWidget } = await import('./TodoWidget')
    render(<TodoWidget />)

    const input = screen.getByPlaceholderText('새 할 일 추가...')
    fireEvent.change(input, { target: { value: '새 작업' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(screen.getByText('새 작업')).toBeInTheDocument()
  })

  it('adds a new todo on 추가 button click', async () => {
    const { useTodoStore } = await import('../../stores/todoStore')
    await useTodoStore.getState().loadTodos()

    const { default: TodoWidget } = await import('./TodoWidget')
    render(<TodoWidget />)

    const input = screen.getByPlaceholderText('새 할 일 추가...')
    fireEvent.change(input, { target: { value: '버튼으로 추가' } })

    const addBtn = screen.getByText('추가')
    fireEvent.click(addBtn)

    expect(screen.getByText('버튼으로 추가')).toBeInTheDocument()
  })

  it('ignores empty string on add', async () => {
    const { useTodoStore } = await import('../../stores/todoStore')
    await useTodoStore.getState().loadTodos()
    const beforeCount = useTodoStore.getState().todos.length

    const { default: TodoWidget } = await import('./TodoWidget')
    render(<TodoWidget />)

    const input = screen.getByPlaceholderText('새 할 일 추가...')
    fireEvent.change(input, { target: { value: '   ' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(useTodoStore.getState().todos.length).toBe(beforeCount)
  })

  it('toggles todo done state on checkbox click', async () => {
    const { useTodoStore } = await import('../../stores/todoStore')
    await useTodoStore.getState().loadTodos()

    const { default: TodoWidget } = await import('./TodoWidget')
    render(<TodoWidget />)

    const checkboxes = screen.getAllByRole('checkbox')
    const first = checkboxes[0]
    const initialChecked = first.getAttribute('aria-checked')
    fireEvent.click(first)

    const checkboxesAfter = screen.getAllByRole('checkbox')
    expect(checkboxesAfter[0].getAttribute('aria-checked')).not.toBe(initialChecked)
  })

  it('removes a todo on delete button click', async () => {
    const { useTodoStore } = await import('../../stores/todoStore')
    await useTodoStore.getState().loadTodos()
    const firstTodoText = useTodoStore.getState().todos[0].text

    const { default: TodoWidget } = await import('./TodoWidget')
    render(<TodoWidget />)

    const deleteBtns = screen.getAllByLabelText('삭제')
    fireEvent.click(deleteBtns[0])

    expect(screen.queryByText(firstTodoText)).not.toBeInTheDocument()
  })
})
