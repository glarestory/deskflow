// @MX:NOTE: [AUTO] todoStore — 할 일 목록 CRUD + 반복 일정 상태 관리
// @MX:SPEC: SPEC-TODO-002
// @MX:ANCHOR: [AUTO] checkAndRegenerateRecurring — 앱 시작 시 반복 할 일 재생성 진입점
// @MX:REASON: TodoWidget.tsx 및 App.tsx에서 호출됨 (fan_in >= 3)
import { create } from 'zustand'
import type { Todo, Recurrence } from '../types'
import { storage } from '../lib/storage'

const uid = () => Math.random().toString(36).slice(2, 9)

// 날짜를 YYYY-MM-DD 문자열로 변환하는 헬퍼
const toDateStr = (d: Date): string => {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/**
 * 반복 설정에서 fromDate 이후 다음 예정일을 계산한다.
 * 순수 함수 — 부작용 없음.
 */
export const calcNextDue = (recurrence: Recurrence, fromDate: Date): string => {
  const next = new Date(fromDate)

  if (recurrence.type === 'daily') {
    // 매일: 하루 뒤
    next.setDate(next.getDate() + 1)
    return toDateStr(next)
  }

  if (recurrence.type === 'weekly') {
    const days = recurrence.daysOfWeek ?? []
    if (days.length === 0) {
      // 요일 없으면 7일 후
      next.setDate(next.getDate() + 7)
      return toDateStr(next)
    }
    // fromDate 이후 가장 가까운 선택 요일을 찾는다
    for (let i = 1; i <= 7; i++) {
      const candidate = new Date(fromDate)
      candidate.setDate(fromDate.getDate() + i)
      if (days.includes(candidate.getDay())) {
        return toDateStr(candidate)
      }
    }
    // 안전 폴백 (실제로 도달하지 않음)
    next.setDate(next.getDate() + 7)
    return toDateStr(next)
  }

  if (recurrence.type === 'monthly') {
    // 매월: 다음 달 같은 날
    const targetDay = recurrence.dayOfMonth ?? 1
    const nextMonth = new Date(fromDate.getFullYear(), fromDate.getMonth() + 1, targetDay)
    return toDateStr(nextMonth)
  }

  // 폴백
  next.setDate(next.getDate() + 1)
  return toDateStr(next)
}

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
  addRecurringTodo: (text: string, recurrence: Omit<Recurrence, 'nextDue' | 'seriesId'> & Partial<Pick<Recurrence, 'nextDue' | 'seriesId'>>) => void
  toggleTodo: (id: string) => void
  removeTodo: (id: string) => void
  deleteTodoSeries: (seriesId: string) => void
  checkAndRegenerateRecurring: () => Promise<void>
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

  addRecurringTodo: (text, recurrenceConfig) => {
    // seriesId가 없으면 새로 생성, nextDue는 오늘로 설정
    const seriesId = recurrenceConfig.seriesId || uid()
    const today = toDateStr(new Date())

    const recurrence: Recurrence = {
      ...recurrenceConfig,
      nextDue: today,
      seriesId,
    }

    set((state) => ({
      todos: [...state.todos, { id: uid(), text, done: false, recurrence }],
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

  deleteTodoSeries: (seriesId) => {
    set((state) => ({
      todos: state.todos.filter((t) => t.recurrence?.seriesId !== seriesId),
    }))
    const { loaded, todos } = get()
    if (loaded) {
      void storage.set('hub-todos', JSON.stringify(todos))
    }
  },

  checkAndRegenerateRecurring: async () => {
    const { todos, loaded } = get()
    const today = toDateStr(new Date())

    // 완료되고 nextDue <= 오늘인 반복 할 일을 찾아 다음 인스턴스 생성
    const newTodos: Todo[] = []

    for (const todo of todos) {
      if (todo.done && todo.recurrence && todo.recurrence.nextDue <= today) {
        // 같은 시리즈에 미완료 항목이 이미 있는지 확인 (중복 방지)
        const alreadyExists = todos.some(
          (t) =>
            t.recurrence?.seriesId === todo.recurrence!.seriesId &&
            !t.done &&
            t.id !== todo.id
        )

        if (!alreadyExists) {
          const nextDue = calcNextDue(todo.recurrence, new Date())
          newTodos.push({
            id: uid(),
            text: todo.text,
            done: false,
            recurrence: {
              ...todo.recurrence,
              nextDue,
            },
          })
        }
      }
    }

    if (newTodos.length > 0) {
      set((state) => ({
        todos: [...state.todos, ...newTodos],
      }))
      const { todos: updatedTodos } = get()
      if (loaded) {
        void storage.set('hub-todos', JSON.stringify(updatedTodos))
      }
    }
  },
}))
