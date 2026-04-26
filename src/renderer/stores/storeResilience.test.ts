// @MX:TEST: SPEC-UI-001, SPEC-LAYOUT-001, SPEC-TODO-002, SPEC-AUTH-001
// 4개 핵심 store 의 storage 실패 / JSON 깨짐 / 동시 호출 회복력 검증.
// 기존 store 테스트는 happy path 위주이므로 에러 경로 신호를 별도로 보강한다.
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGet = vi.fn()
const mockSet = vi.fn()

vi.mock('../lib/storage', () => ({
  storage: {
    get: (...args: unknown[]) => mockGet(...args),
    set: (...args: unknown[]) => mockSet(...args),
  },
  setUserStorage: vi.fn(),
  createUserStorage: vi.fn(),
}))

// capsuleStore / embeddingStore 의존성 격리 (bookmarkStore/todoStore 가 의존)
vi.mock('./capsuleStore', () => ({
  useCapsuleStore: {
    getState: vi.fn(() => ({
      autoAddToActive: false,
      activeCapsuleId: null,
      addBookmarkToCapsule: vi.fn(),
      addTodoToCapsule: vi.fn(),
      incrementMetric: vi.fn(),
      purgeOrphan: vi.fn(),
    })),
  },
}))

vi.mock('./embeddingStore', () => ({
  useEmbeddingStore: {
    getState: vi.fn(() => ({
      enqueueIndex: vi.fn(),
      removeEmbedding: vi.fn(),
    })),
  },
}))

describe('store resilience — storage 실패 회복', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  describe('themeStore', () => {
    it('storage.get 거부 시 기본 모드(dark)로 폴백하고 loaded=true 가 된다', async () => {
      mockGet.mockRejectedValue(new Error('IndexedDB unavailable'))
      const { useThemeStore } = await import('./themeStore')

      await useThemeStore.getState().loadTheme()

      const state = useThemeStore.getState()
      expect(state.mode).toBe('dark')
      expect(state.loaded).toBe(true)
    })

    it('저장된 JSON 이 깨져 있어도 기본값으로 복구된다', async () => {
      mockGet.mockResolvedValue({ value: '{not-json' })
      const { useThemeStore } = await import('./themeStore')

      await useThemeStore.getState().loadTheme()

      const state = useThemeStore.getState()
      expect(state.mode).toBe('dark')
      expect(state.loaded).toBe(true)
    })

    it('loaded=false 상태에서 toggleMode 는 storage.set 을 호출하지 않는다 (초기 깜빡임 방지)', async () => {
      const { useThemeStore } = await import('./themeStore')

      // loadTheme 호출 전 toggle
      useThemeStore.getState().toggleMode()

      expect(mockSet).not.toHaveBeenCalled()
    })
  })

  describe('todoStore', () => {
    it('storage.get 거부 시 DEFAULT_TODOS 로 폴백하고 loaded=true 가 된다', async () => {
      mockGet.mockRejectedValue(new Error('disk full'))
      const { useTodoStore, DEFAULT_TODOS } = await import('./todoStore')

      await useTodoStore.getState().loadTodos()

      const state = useTodoStore.getState()
      expect(state.todos).toEqual(DEFAULT_TODOS)
      expect(state.loaded).toBe(true)
    })

    it('저장된 JSON 이 깨져 있어도 DEFAULT_TODOS 로 복구된다', async () => {
      mockGet.mockResolvedValue({ value: '[invalid-json' })
      const { useTodoStore, DEFAULT_TODOS } = await import('./todoStore')

      await useTodoStore.getState().loadTodos()

      const state = useTodoStore.getState()
      expect(state.todos).toEqual(DEFAULT_TODOS)
      expect(state.loaded).toBe(true)
    })

    it('loaded=false 일 때 addTodo 는 storage.set 을 호출하지 않는다 (load 전 부작용 차단)', async () => {
      const { useTodoStore } = await import('./todoStore')

      useTodoStore.getState().addTodo('pre-load todo')

      expect(mockSet).not.toHaveBeenCalled()
      expect(useTodoStore.getState().todos.some((t) => t.text === 'pre-load todo')).toBe(true)
    })

    it('loadTodos 가 동시에 두 번 호출되어도 최종 상태는 일관적이다', async () => {
      mockGet.mockResolvedValue({ value: JSON.stringify([{ id: 'a', text: 'A', done: false }]) })
      const { useTodoStore } = await import('./todoStore')

      await Promise.all([
        useTodoStore.getState().loadTodos(),
        useTodoStore.getState().loadTodos(),
      ])

      const state = useTodoStore.getState()
      expect(state.loaded).toBe(true)
      expect(state.todos).toHaveLength(1)
    })
  })

  describe('layoutStore', () => {
    it('storage.get 거부 시 DEFAULT_LAYOUT 으로 폴백한다', async () => {
      mockGet.mockRejectedValue(new Error('quota exceeded'))
      const { useLayoutStore, DEFAULT_LAYOUT } = await import('./layoutStore')

      await useLayoutStore.getState().loadLayout()

      const state = useLayoutStore.getState()
      expect(state.layout).toEqual(DEFAULT_LAYOUT)
      expect(state.loaded).toBe(true)
    })

    it('저장된 JSON 이 깨져 있으면 DEFAULT_LAYOUT 으로 폴백한다', async () => {
      mockGet.mockResolvedValue({ value: 'totally-not-json' })
      const { useLayoutStore, DEFAULT_LAYOUT } = await import('./layoutStore')

      await useLayoutStore.getState().loadLayout()

      expect(useLayoutStore.getState().layout).toEqual(DEFAULT_LAYOUT)
    })

    it('updateLayout 호출 시 storage.set 이 정확한 키와 직렬화 결과로 호출된다', async () => {
      mockSet.mockResolvedValue(undefined)
      const { useLayoutStore } = await import('./layoutStore')

      const next = [{ i: 'clock', x: 0, y: 0, w: 6, h: 3 }]
      useLayoutStore.getState().updateLayout(next)

      expect(mockSet).toHaveBeenCalledWith('widget-layout', JSON.stringify(next))
    })

    it('storage.set 이 거부되어도 동기 set 자체는 실패하지 않는다 (UI 반응성 보장)', async () => {
      mockSet.mockRejectedValue(new Error('write failed'))
      const { useLayoutStore } = await import('./layoutStore')

      // void 호출이므로 throw 없어야 함
      expect(() =>
        useLayoutStore.getState().updateLayout([{ i: 'clock', x: 0, y: 0, w: 6, h: 3 }]),
      ).not.toThrow()
    })
  })

  describe('bookmarkStore', () => {
    it('storage.get 거부 시 DEFAULT_BOOKMARKS 로 폴백한다', async () => {
      mockGet.mockRejectedValue(new Error('IndexedDB closed'))
      const { useBookmarkStore, DEFAULT_BOOKMARKS } = await import('./bookmarkStore')

      await useBookmarkStore.getState().loadBookmarks()

      const state = useBookmarkStore.getState()
      expect(state.bookmarks).toEqual(DEFAULT_BOOKMARKS)
      expect(state.loaded).toBe(true)
    })

    it('저장된 JSON 이 깨져 있으면 DEFAULT_BOOKMARKS 로 폴백한다', async () => {
      mockGet.mockResolvedValue({ value: '{{not-json' })
      const { useBookmarkStore, DEFAULT_BOOKMARKS } = await import('./bookmarkStore')

      await useBookmarkStore.getState().loadBookmarks()

      expect(useBookmarkStore.getState().bookmarks).toEqual(DEFAULT_BOOKMARKS)
    })

    it('loadBookmarks 동시 호출에도 최종 상태는 단일 결과로 수렴한다', async () => {
      mockGet.mockResolvedValue({
        value: JSON.stringify([{ id: 'cat-x', name: 'X', icon: '⭐', links: [] }]),
      })
      const { useBookmarkStore } = await import('./bookmarkStore')

      await Promise.all([
        useBookmarkStore.getState().loadBookmarks(),
        useBookmarkStore.getState().loadBookmarks(),
        useBookmarkStore.getState().loadBookmarks(),
      ])

      const state = useBookmarkStore.getState()
      expect(state.loaded).toBe(true)
      expect(state.bookmarks).toHaveLength(1)
      expect(state.bookmarks[0].id).toBe('cat-x')
    })
  })
})
