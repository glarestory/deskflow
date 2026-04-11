// @MX:NOTE: [AUTO] todoStore — 할 일 목록 CRUD 상태 관리
// @MX:SPEC: SPEC-UI-001
import { create } from 'zustand'
import type { Todo } from '../types'
import { storage } from '../lib/storage'

const uid = () => Math.random().toString(36).slice(2, 9)

export const DEFAULT_TODOS: Todo[] = [
  { id: 't1', text: '프로젝트 기획서 작성', done: false },
  { id: 't2', text: '주간 회의 준비', done: false },
  { id: 't3', text: '디자인 리뷰', done: true },
]

interface TodoState {
  todos: Todo[]
  loaded: boolean
  loadTodos: () => Promise<void>
  addTodo: (text: string) => void
  toggleTodo: (id: string) => void
  removeTodo: (id: string) => void
}

export const useTodoStore = create<TodoState>((set, get) => ({
  todos: DEFAULT_TODOS,
  loaded: false,

  loadTodos: async () => {
    try {
      const result = await storage.get('hub-todos')
      const todos = result.value ? (JSON.parse(result.value) as Todo[]) : DEFAULT_TODOS
      set({ todos, loaded: true })
    } catch {
      set({ todos: DEFAULT_TODOS, loaded: true })
    }
  },

  addTodo: (text) => {
    set((state) => ({
      todos: [...state.todos, { id: uid(), text, done: false }],
    }))
    const { loaded, todos } = get()
    if (loaded) {
      void storage.set('hub-todos', JSON.stringify(todos))
    }
  },

  toggleTodo: (id) => {
    set((state) => ({
      todos: state.todos.map((t) => (t.id === id ? { ...t, done: !t.done } : t)),
    }))
    const { loaded, todos } = get()
    if (loaded) {
      void storage.set('hub-todos', JSON.stringify(todos))
    }
  },

  removeTodo: (id) => {
    set((state) => ({
      todos: state.todos.filter((t) => t.id !== id),
    }))
    const { loaded, todos } = get()
    if (loaded) {
      void storage.set('hub-todos', JSON.stringify(todos))
    }
  },
}))
