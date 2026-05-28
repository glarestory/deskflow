// @MX:TEST: SPEC-WIDGET-TOGGLE-001
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGet = vi.fn()
const mockSet = vi.fn()

vi.mock('../lib/storage', () => ({
  storage: {
    get: (...args: unknown[]) => mockGet(...args),
    set: (...args: unknown[]) => mockSet(...args),
  },
  setUserStorage: vi.fn(),
}))

describe('widgetVisibilityStore (SPEC-WIDGET-TOGGLE-001)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    mockSet.mockResolvedValue(undefined)
  })

  describe('초기 상태', () => {
    it('기본값은 모든 위젯 표시 (hiddenWidgets 빈 Set)', async () => {
      const { useWidgetVisibilityStore } = await import('./widgetVisibilityStore')
      const state = useWidgetVisibilityStore.getState()
      expect(state.hiddenWidgets.size).toBe(0)
      expect(state.loaded).toBe(false)
    })

    it('WIDGET_KEYS 는 정확히 6개 (clock, search, bookmarks, todo, notes, feed)', async () => {
      const { WIDGET_KEYS } = await import('./widgetVisibilityStore')
      expect(WIDGET_KEYS).toEqual(['clock', 'search', 'bookmarks', 'todo', 'notes', 'feed'])
    })

    it('WIDGET_LABELS 가 모든 키에 대해 한국어 레이블을 가진다', async () => {
      const { WIDGET_KEYS, WIDGET_LABELS } = await import('./widgetVisibilityStore')
      for (const key of WIDGET_KEYS) {
        expect(WIDGET_LABELS[key]).toBeTruthy()
      }
    })
  })

  describe('loadVisibility', () => {
    it('storage 값이 null 이면 빈 Set 유지', async () => {
      mockGet.mockResolvedValue({ value: null })
      const { useWidgetVisibilityStore } = await import('./widgetVisibilityStore')
      await useWidgetVisibilityStore.getState().loadVisibility()
      expect(useWidgetVisibilityStore.getState().hiddenWidgets.size).toBe(0)
      expect(useWidgetVisibilityStore.getState().loaded).toBe(true)
    })

    it('저장된 배열을 Set 으로 복원', async () => {
      mockGet.mockResolvedValue({ value: JSON.stringify(['feed', 'notes']) })
      const { useWidgetVisibilityStore } = await import('./widgetVisibilityStore')
      await useWidgetVisibilityStore.getState().loadVisibility()
      const hidden = useWidgetVisibilityStore.getState().hiddenWidgets
      expect(hidden.has('feed')).toBe(true)
      expect(hidden.has('notes')).toBe(true)
      expect(hidden.size).toBe(2)
    })

    it('알 수 없는 키는 필터링한다 (스키마 가드)', async () => {
      mockGet.mockResolvedValue({
        value: JSON.stringify(['feed', 'unknown-widget', 'todo']),
      })
      const { useWidgetVisibilityStore } = await import('./widgetVisibilityStore')
      await useWidgetVisibilityStore.getState().loadVisibility()
      const hidden = useWidgetVisibilityStore.getState().hiddenWidgets
      expect(hidden.has('feed')).toBe(true)
      expect(hidden.has('todo')).toBe(true)
      expect(hidden.size).toBe(2)
      expect(Array.from(hidden)).not.toContain('unknown-widget')
    })

    it('깨진 JSON 이면 빈 Set 으로 폴백', async () => {
      mockGet.mockResolvedValue({ value: '{not-json' })
      const { useWidgetVisibilityStore } = await import('./widgetVisibilityStore')
      await useWidgetVisibilityStore.getState().loadVisibility()
      expect(useWidgetVisibilityStore.getState().hiddenWidgets.size).toBe(0)
      expect(useWidgetVisibilityStore.getState().loaded).toBe(true)
    })

    it('storage.get 거부 시 빈 Set 으로 폴백', async () => {
      mockGet.mockRejectedValue(new Error('disk full'))
      const { useWidgetVisibilityStore } = await import('./widgetVisibilityStore')
      await useWidgetVisibilityStore.getState().loadVisibility()
      expect(useWidgetVisibilityStore.getState().hiddenWidgets.size).toBe(0)
      expect(useWidgetVisibilityStore.getState().loaded).toBe(true)
    })
  })

  describe('toggleWidget', () => {
    it('표시 상태 → 숨김 으로 토글하고 영속화한다', async () => {
      const { useWidgetVisibilityStore } = await import('./widgetVisibilityStore')
      useWidgetVisibilityStore.getState().toggleWidget('feed')

      expect(useWidgetVisibilityStore.getState().hiddenWidgets.has('feed')).toBe(true)
      expect(mockSet).toHaveBeenCalledWith('widget-visibility', JSON.stringify(['feed']))
    })

    it('숨김 상태 → 표시 로 토글', async () => {
      const { useWidgetVisibilityStore } = await import('./widgetVisibilityStore')
      useWidgetVisibilityStore.getState().toggleWidget('feed')
      useWidgetVisibilityStore.getState().toggleWidget('feed')

      expect(useWidgetVisibilityStore.getState().hiddenWidgets.has('feed')).toBe(false)
      expect(mockSet).toHaveBeenLastCalledWith('widget-visibility', JSON.stringify([]))
    })
  })

  describe('hideWidget / showWidget', () => {
    it('hideWidget 은 중복 호출해도 멱등', async () => {
      const { useWidgetVisibilityStore } = await import('./widgetVisibilityStore')
      useWidgetVisibilityStore.getState().hideWidget('todo')
      useWidgetVisibilityStore.getState().hideWidget('todo')

      const hidden = useWidgetVisibilityStore.getState().hiddenWidgets
      expect(hidden.has('todo')).toBe(true)
      expect(hidden.size).toBe(1)
    })

    it('showWidget 은 표시 상태에서 호출해도 안전 (no-op)', async () => {
      const { useWidgetVisibilityStore } = await import('./widgetVisibilityStore')
      useWidgetVisibilityStore.getState().showWidget('todo')

      expect(useWidgetVisibilityStore.getState().hiddenWidgets.has('todo')).toBe(false)
    })
  })

  describe('showAllWidgets', () => {
    it('모든 숨긴 위젯을 표시로 되돌린다', async () => {
      const { useWidgetVisibilityStore } = await import('./widgetVisibilityStore')
      useWidgetVisibilityStore.getState().hideWidget('feed')
      useWidgetVisibilityStore.getState().hideWidget('notes')
      useWidgetVisibilityStore.getState().hideWidget('todo')

      useWidgetVisibilityStore.getState().showAllWidgets()

      expect(useWidgetVisibilityStore.getState().hiddenWidgets.size).toBe(0)
      expect(mockSet).toHaveBeenLastCalledWith('widget-visibility', JSON.stringify([]))
    })
  })
})
