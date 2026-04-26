// @MX:TEST: SPEC-UX-001, SPEC-UX-002
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { fireEvent } from '@testing-library/react'

// commandStore 모킹 — 훅의 상호작용만 검증한다 (zustand 의존 격리)
const mockOpen = vi.fn()
const mockClose = vi.fn()
const mockToggle = vi.fn()
let mockIsOpen = false

vi.mock('../stores/commandStore', () => ({
  useCommandStore: () => ({
    isOpen: mockIsOpen,
    open: mockOpen,
    close: mockClose,
    toggle: mockToggle,
  }),
}))

import { useCommandPalette } from './useCommandPalette'

describe('useCommandPalette (SPEC-UX-001, SPEC-UX-002)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockIsOpen = false
  })

  afterEach(() => {
    // 다음 테스트가 키 이벤트에 영향받지 않도록 명시적 cleanup
    vi.restoreAllMocks()
  })

  it('훅이 commandStore의 현재 상태를 반환한다', () => {
    mockIsOpen = true
    const { result } = renderHook(() => useCommandPalette())

    expect(result.current.isOpen).toBe(true)
    expect(typeof result.current.openPalette).toBe('function')
    expect(typeof result.current.closePalette).toBe('function')
  })

  it('Cmd+K (metaKey) 입력 시 toggle이 호출된다', () => {
    renderHook(() => useCommandPalette())

    act(() => {
      fireEvent.keyDown(document, { key: 'k', metaKey: true })
    })

    expect(mockToggle).toHaveBeenCalledTimes(1)
  })

  it('Ctrl+K (ctrlKey) 입력 시 toggle이 호출된다', () => {
    renderHook(() => useCommandPalette())

    act(() => {
      fireEvent.keyDown(document, { key: 'k', ctrlKey: true })
    })

    expect(mockToggle).toHaveBeenCalledTimes(1)
  })

  it('수정자 키 없는 단순 k 입력은 toggle을 호출하지 않는다', () => {
    renderHook(() => useCommandPalette())

    act(() => {
      fireEvent.keyDown(document, { key: 'k' })
    })

    expect(mockToggle).not.toHaveBeenCalled()
  })

  it('다른 키와 metaKey 조합은 toggle을 호출하지 않는다 (예: Cmd+J)', () => {
    renderHook(() => useCommandPalette())

    act(() => {
      fireEvent.keyDown(document, { key: 'j', metaKey: true })
    })

    expect(mockToggle).not.toHaveBeenCalled()
  })

  it('Cmd+K 입력 시 preventDefault가 호출된다 (브라우저 기본 동작 차단)', () => {
    renderHook(() => useCommandPalette())

    const event = new KeyboardEvent('keydown', {
      key: 'k',
      metaKey: true,
      cancelable: true,
      bubbles: true,
    })
    const preventDefaultSpy = vi.spyOn(event, 'preventDefault')

    act(() => {
      document.dispatchEvent(event)
    })

    expect(preventDefaultSpy).toHaveBeenCalledTimes(1)
  })

  it('대문자 K + metaKey는 토글하지 않는다 (key는 lowercase 비교)', () => {
    renderHook(() => useCommandPalette())

    act(() => {
      fireEvent.keyDown(document, { key: 'K', metaKey: true })
    })

    // 회귀 안전망: 'K' (Shift) 입력은 무시된다
    expect(mockToggle).not.toHaveBeenCalled()
  })

  it('훅 언마운트 시 keydown 리스너가 제거된다 (메모리 누수 방지)', () => {
    const removeSpy = vi.spyOn(document, 'removeEventListener')
    const { unmount } = renderHook(() => useCommandPalette())

    unmount()

    expect(removeSpy).toHaveBeenCalledWith('keydown', expect.any(Function))

    // 언마운트 후 키 이벤트 — toggle이 호출되지 않아야 한다
    mockToggle.mockClear()
    act(() => {
      fireEvent.keyDown(document, { key: 'k', metaKey: true })
    })
    expect(mockToggle).not.toHaveBeenCalled()
  })

  it('openPalette / closePalette는 commandStore의 open/close에 직결된다', () => {
    const { result } = renderHook(() => useCommandPalette())

    act(() => {
      result.current.openPalette()
    })
    expect(mockOpen).toHaveBeenCalledTimes(1)

    act(() => {
      result.current.closePalette()
    })
    expect(mockClose).toHaveBeenCalledTimes(1)
  })

  it('동일 컴포넌트에서 단축키를 여러 번 눌러도 매번 toggle 호출된다', () => {
    renderHook(() => useCommandPalette())

    act(() => {
      fireEvent.keyDown(document, { key: 'k', metaKey: true })
      fireEvent.keyDown(document, { key: 'k', metaKey: true })
      fireEvent.keyDown(document, { key: 'k', ctrlKey: true })
    })

    expect(mockToggle).toHaveBeenCalledTimes(3)
  })
})
