import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGet = vi.fn()
const mockSet = vi.fn()
vi.stubGlobal('storage', { get: mockGet, set: mockSet })

describe('todoStore', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    vi.resetModules()
    vi.stubGlobal('storage', { get: mockGet, set: mockSet })
  })

  it('has default todos initially', async () => {
    mockGet.mockResolvedValue({ value: null })
    const { useTodoStore } = await import('./todoStore')
    expect(useTodoStore.getState().todos).toBeDefined()
    expect(useTodoStore.getState().todos.length).toBeGreaterThan(0)
  })

  it('loadTodos loads from storage when data exists', async () => {
    const savedData = [{ id: 't1', text: 'Test task', done: false }]
    mockGet.mockResolvedValue({ value: JSON.stringify(savedData) })

    const { useTodoStore } = await import('./todoStore')
    await useTodoStore.getState().loadTodos()

    expect(useTodoStore.getState().todos).toEqual(savedData)
    expect(useTodoStore.getState().loaded).toBe(true)
  })

  it('addTodo adds a new todo', async () => {
    mockGet.mockResolvedValue({ value: null })
    const { useTodoStore } = await import('./todoStore')
    await useTodoStore.getState().loadTodos()

    const before = useTodoStore.getState().todos.length
    useTodoStore.getState().addTodo('New task')
    expect(useTodoStore.getState().todos.length).toBe(before + 1)
    expect(useTodoStore.getState().todos.at(-1)?.text).toBe('New task')
    expect(useTodoStore.getState().todos.at(-1)?.done).toBe(false)
  })

  it('toggleTodo toggles done status', async () => {
    mockGet.mockResolvedValue({ value: null })
    const { useTodoStore } = await import('./todoStore')
    await useTodoStore.getState().loadTodos()

    const first = useTodoStore.getState().todos[0]
    const initialDone = first.done
    useTodoStore.getState().toggleTodo(first.id)
    expect(useTodoStore.getState().todos[0].done).toBe(!initialDone)
  })

  it('removeTodo removes a todo by id', async () => {
    mockGet.mockResolvedValue({ value: null })
    const { useTodoStore } = await import('./todoStore')
    await useTodoStore.getState().loadTodos()

    const first = useTodoStore.getState().todos[0]
    const before = useTodoStore.getState().todos.length
    useTodoStore.getState().removeTodo(first.id)
    expect(useTodoStore.getState().todos.length).toBe(before - 1)
  })
})
