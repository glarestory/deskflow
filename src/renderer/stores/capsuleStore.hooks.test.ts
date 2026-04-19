// @MX:SPEC: SPEC-CAPSULE-001
// Phase 4 훅 통합 테스트 — bookmarkStore/todoStore 삭제·생성 시 캡슐 훅 동작

import { describe, it, expect, vi, beforeEach } from 'vitest'

// storage 모킹
const mockGet = vi.fn()
const mockSet = vi.fn()

vi.mock('../lib/storage', () => ({
  storage: {
    get: (...args: unknown[]) => mockGet(...args),
    set: (...args: unknown[]) => mockSet(...args),
  },
}))

// viewModeStore 모킹
vi.mock('./viewModeStore', () => ({
  useViewModeStore: {
    getState: vi.fn(() => ({ setMode: vi.fn(), mode: 'pivot' })),
  },
}))

// viewStore 모킹
vi.mock('./viewStore', () => ({
  useViewStore: {
    getState: vi.fn(() => ({ setContext: vi.fn(), context: { kind: 'all' } })),
  },
}))

// pomodoroStore 모킹
vi.mock('./pomodoroStore', () => ({
  usePomodoroStore: {
    getState: vi.fn(() => ({
      updateSettings: vi.fn(),
      settings: { focusMinutes: 25, breakMinutes: 5, longBreakMinutes: 15 },
    })),
  },
}))

// embeddingStore 모킹 (Phase 3 훅 의존)
vi.mock('./embeddingStore', () => ({
  useEmbeddingStore: {
    getState: vi.fn(() => ({
      enqueueIndex: vi.fn(),
      removeEmbedding: vi.fn(),
    })),
  },
}))

describe('Phase 4: bookmarkStore → capsuleStore purgeOrphan 훅 (SPEC-CAPSULE-001 REQ-017)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    mockGet.mockResolvedValue({ value: null })
    mockSet.mockResolvedValue(undefined)
  })

  it('AC-029: removeBookmark 호출 시 캡슐의 bookmarkIds에서 해당 id가 제거된다', async () => {
    const { useCapsuleStore } = await import('./capsuleStore')
    const { useBookmarkStore, DEFAULT_BOOKMARKS } = await import('./bookmarkStore')

    // 캡슐 생성 후 북마크 카테고리 id 추가
    useCapsuleStore.setState({ capsules: [], loaded: true, activeCapsuleId: null })
    const capsule = useCapsuleStore.getState().createCapsule({
      name: '고아 테스트 캡슐',
      bookmarkIds: [DEFAULT_BOOKMARKS[0].id, DEFAULT_BOOKMARKS[1].id],
    })

    // 북마크 로드 완료 설정
    useBookmarkStore.setState({ bookmarks: DEFAULT_BOOKMARKS, loaded: true })

    // 북마크 삭제 — purgeOrphan 훅이 자동으로 캡슐에서 제거해야 함
    useBookmarkStore.getState().removeBookmark(DEFAULT_BOOKMARKS[0].id)

    const updatedCapsule = useCapsuleStore.getState().capsules.find((c) => c.id === capsule.id)
    expect(updatedCapsule?.bookmarkIds).not.toContain(DEFAULT_BOOKMARKS[0].id)
    expect(updatedCapsule?.bookmarkIds).toContain(DEFAULT_BOOKMARKS[1].id)
  })

  it('AC-018: autoAddToActive=true + 활성 캡슐 상태에서 addBookmark 시 캡슐에 자동 추가', async () => {
    const { useCapsuleStore } = await import('./capsuleStore')
    const { useBookmarkStore } = await import('./bookmarkStore')

    // 캡슐 생성 및 활성화
    useCapsuleStore.setState({ capsules: [], loaded: true })
    const capsule = useCapsuleStore.getState().createCapsule({ name: '자동 추가 테스트' })
    useCapsuleStore.setState({ activeCapsuleId: capsule.id, autoAddToActive: true })

    // 새 북마크 추가
    const newBookmark = { id: 'new-bm', name: '새 카테고리', icon: '📁', links: [] }
    useBookmarkStore.setState({ bookmarks: [], loaded: true })
    useBookmarkStore.getState().addBookmark(newBookmark)

    // 활성 캡슐의 bookmarkIds에 자동 추가되어야 함
    const updatedCapsule = useCapsuleStore.getState().capsules.find((c) => c.id === capsule.id)
    expect(updatedCapsule?.bookmarkIds).toContain('new-bm')
  })

  it('AC-019: autoAddToActive=false이면 addBookmark 시 캡슐에 자동 추가되지 않음', async () => {
    const { useCapsuleStore } = await import('./capsuleStore')
    const { useBookmarkStore } = await import('./bookmarkStore')

    useCapsuleStore.setState({ capsules: [], loaded: true })
    const capsule = useCapsuleStore.getState().createCapsule({ name: '자동 추가 비활성 테스트' })
    useCapsuleStore.setState({ activeCapsuleId: capsule.id, autoAddToActive: false })

    const newBookmark = { id: 'new-bm-2', name: '새 카테고리2', icon: '📁', links: [] }
    useBookmarkStore.setState({ bookmarks: [], loaded: true })
    useBookmarkStore.getState().addBookmark(newBookmark)

    const updatedCapsule = useCapsuleStore.getState().capsules.find((c) => c.id === capsule.id)
    expect(updatedCapsule?.bookmarkIds).not.toContain('new-bm-2')
  })

  it('활성 캡슐이 없으면 addBookmark 시 어떤 캡슐에도 자동 추가되지 않음 (기존 동작 유지)', async () => {
    const { useCapsuleStore } = await import('./capsuleStore')
    const { useBookmarkStore } = await import('./bookmarkStore')

    useCapsuleStore.setState({
      capsules: [],
      loaded: true,
      activeCapsuleId: null,
      autoAddToActive: true,
    })

    const newBookmark = { id: 'new-bm-3', name: '새 카테고리3', icon: '📁', links: [] }
    useBookmarkStore.setState({ bookmarks: [], loaded: true })
    useBookmarkStore.getState().addBookmark(newBookmark)

    // 캡슐이 없으므로 아무것도 변경되지 않음
    expect(useCapsuleStore.getState().capsules).toHaveLength(0)
  })
})

describe('Phase 4: todoStore → capsuleStore 훅 (SPEC-CAPSULE-001 REQ-017, REQ-011, REQ-020)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    mockGet.mockResolvedValue({ value: null })
    mockSet.mockResolvedValue(undefined)
  })

  it('AC-030: removeTodo 호출 시 캡슐의 todoIds에서 해당 id가 제거된다', async () => {
    const { useCapsuleStore } = await import('./capsuleStore')
    const { useTodoStore, DEFAULT_TODOS } = await import('./todoStore')

    useCapsuleStore.setState({ capsules: [], loaded: true, activeCapsuleId: null })
    const capsule = useCapsuleStore.getState().createCapsule({
      name: 'todo 고아 테스트',
      todoIds: [DEFAULT_TODOS[0].id, DEFAULT_TODOS[1].id],
    })

    useTodoStore.setState({ todos: DEFAULT_TODOS, loaded: true })
    useTodoStore.getState().removeTodo(DEFAULT_TODOS[0].id)

    const updatedCapsule = useCapsuleStore.getState().capsules.find((c) => c.id === capsule.id)
    expect(updatedCapsule?.todoIds).not.toContain(DEFAULT_TODOS[0].id)
    expect(updatedCapsule?.todoIds).toContain(DEFAULT_TODOS[1].id)
  })

  it('AC-018: autoAddToActive=true + 활성 캡슐 상태에서 addTodo 시 캡슐에 자동 추가', async () => {
    const { useCapsuleStore } = await import('./capsuleStore')
    const { useTodoStore } = await import('./todoStore')

    useCapsuleStore.setState({ capsules: [], loaded: true })
    const capsule = useCapsuleStore.getState().createCapsule({ name: 'todo 자동 추가 테스트' })
    useCapsuleStore.setState({ activeCapsuleId: capsule.id, autoAddToActive: true })

    useTodoStore.setState({ todos: [], loaded: true })
    useTodoStore.getState().addTodo('새 할 일 항목')

    const updatedCapsule = useCapsuleStore.getState().capsules.find((c) => c.id === capsule.id)
    expect(updatedCapsule?.todoIds).toHaveLength(1)
  })

  it('AC-034: 활성 캡슐 상태에서 Todo 완료 체크 시 completedTodos 메트릭 증가', async () => {
    const { useCapsuleStore } = await import('./capsuleStore')
    const { useTodoStore } = await import('./todoStore')

    useCapsuleStore.setState({ capsules: [], loaded: true })
    const capsule = useCapsuleStore.getState().createCapsule({ name: '메트릭 테스트' })
    useCapsuleStore.setState({ activeCapsuleId: capsule.id })

    useTodoStore.setState({
      todos: [{ id: 'td-1', text: '할 일', done: false }],
      loaded: true,
    })
    useTodoStore.getState().toggleTodo('td-1')

    const updatedCapsule = useCapsuleStore.getState().capsules.find((c) => c.id === capsule.id)
    expect(updatedCapsule?.metrics.completedTodos).toBe(1)
  })

  it('AC-035: 활성 캡슐이 없을 때 Todo 완료는 어떤 메트릭에도 영향 없음', async () => {
    const { useCapsuleStore } = await import('./capsuleStore')
    const { useTodoStore } = await import('./todoStore')

    useCapsuleStore.setState({
      capsules: [],
      loaded: true,
      activeCapsuleId: null,
    })

    useTodoStore.setState({
      todos: [{ id: 'td-2', text: '비활성 할 일', done: false }],
      loaded: true,
    })
    useTodoStore.getState().toggleTodo('td-2')

    // 아무 캡슐도 없으므로 메트릭 변화 없음
    expect(useCapsuleStore.getState().capsules).toHaveLength(0)
  })
})
