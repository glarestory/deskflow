// @MX:SPEC: SPEC-UX-003
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { fireEvent } from '@testing-library/react'

const mockSetContext = vi.fn()
const mockSetSearchQuery = vi.fn()
let mockIsCommandOpen = false
const mockBookmarks = [
  { id: 'cat-1', name: 'Work', icon: '💼', links: [] },
  { id: 'cat-2', name: 'Dev', icon: '⚡', links: [] },
  { id: 'cat-3', name: 'Media', icon: '🎧', links: [] },
]

vi.mock('../stores/viewStore', () => ({
  useViewStore: () => ({
    setContext: mockSetContext,
    setSearchQuery: mockSetSearchQuery,
  }),
}))

vi.mock('../stores/commandStore', () => ({
  useCommandStore: () => ({
    isOpen: mockIsCommandOpen,
  }),
}))

vi.mock('../stores/bookmarkStore', () => ({
  useBookmarkStore: (selector?: (s: unknown) => unknown) => {
    const state = { bookmarks: mockBookmarks }
    return selector ? selector(state) : state
  },
}))

describe('useHotkeys (SPEC-UX-003)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockIsCommandOpen = false
  })

  it('훅이 오류 없이 마운트된다', async () => {
    const { useHotkeys } = await import('./useHotkeys')
    // void 반환 훅 — 오류 없이 마운트/언마운트가 되면 성공
    expect(() => {
      renderHook(() => useHotkeys({ searchInputRef: { current: null } }))
    }).not.toThrow()
  })

  it('CommandPalette가 열려 있을 때 단축키를 무시한다', async () => {
    mockIsCommandOpen = true
    const { useHotkeys } = await import('./useHotkeys')
    renderHook(() => useHotkeys({ searchInputRef: { current: null } }))

    fireEvent.keyDown(document, { key: '1' })
    expect(mockSetContext).not.toHaveBeenCalled()
  })

  it('1 키 누름 시 첫 번째 카테고리로 이동한다', async () => {
    mockIsCommandOpen = false
    const { useHotkeys } = await import('./useHotkeys')
    renderHook(() => useHotkeys({ searchInputRef: { current: null } }))

    fireEvent.keyDown(document, { key: '1' })
    expect(mockSetContext).toHaveBeenCalledWith({ kind: 'category', categoryId: 'cat-1' })
  })

  it('2 키 누름 시 두 번째 카테고리로 이동한다', async () => {
    mockIsCommandOpen = false
    const { useHotkeys } = await import('./useHotkeys')
    renderHook(() => useHotkeys({ searchInputRef: { current: null } }))

    fireEvent.keyDown(document, { key: '2' })
    expect(mockSetContext).toHaveBeenCalledWith({ kind: 'category', categoryId: 'cat-2' })
  })

  it('범위 초과 숫자 키는 무시한다 (카테고리 3개인데 9 키)', async () => {
    mockIsCommandOpen = false
    const { useHotkeys } = await import('./useHotkeys')
    renderHook(() => useHotkeys({ searchInputRef: { current: null } }))

    fireEvent.keyDown(document, { key: '9' })
    expect(mockSetContext).not.toHaveBeenCalled()
  })

  it('훅 언마운트 시 이벤트 리스너가 제거된다', async () => {
    const { useHotkeys } = await import('./useHotkeys')
    const { unmount } = renderHook(() => useHotkeys({ searchInputRef: { current: null } }))

    unmount()
    // 언마운트 후 키 이벤트 발생 — 아무것도 호출 안됨
    fireEvent.keyDown(document, { key: '1' })
    expect(mockSetContext).not.toHaveBeenCalled()
  })
})
