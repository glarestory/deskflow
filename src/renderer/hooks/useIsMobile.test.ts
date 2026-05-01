// @MX:TEST: SPEC-MOBILE-RESPONSIVE-001
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

import { useIsMobile, MOBILE_BREAKPOINT } from './useIsMobile'

type Listener = (e: MediaQueryListEvent) => void

interface MockMql {
  matches: boolean
  media: string
  listeners: Set<Listener>
  addEventListener: (type: 'change', cb: Listener) => void
  removeEventListener: (type: 'change', cb: Listener) => void
  dispatch: (matches: boolean) => void
}

const createMockMql = (initial: boolean): MockMql => {
  const listeners = new Set<Listener>()
  const mql: MockMql = {
    matches: initial,
    media: `(max-width: ${MOBILE_BREAKPOINT}px)`,
    listeners,
    addEventListener: (_type, cb) => {
      listeners.add(cb)
    },
    removeEventListener: (_type, cb) => {
      listeners.delete(cb)
    },
    dispatch: (matches) => {
      mql.matches = matches
      const event = { matches } as MediaQueryListEvent
      listeners.forEach((cb) => cb(event))
    },
  }
  return mql
}

describe('useIsMobile (SPEC-MOBILE-RESPONSIVE-001)', () => {
  let mockMql: MockMql

  beforeEach(() => {
    mockMql = createMockMql(false)
    window.matchMedia = vi.fn(() => mockMql as unknown as MediaQueryList)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('MOBILE_BREAKPOINT 는 640 이다 (CapsuleSwitcher 와 동일 기준)', () => {
    expect(MOBILE_BREAKPOINT).toBe(640)
  })

  it('초기 매치 결과를 그대로 반환한다 (데스크톱)', () => {
    mockMql.matches = false
    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(false)
  })

  it('초기 매치 결과를 그대로 반환한다 (모바일)', () => {
    mockMql.matches = true
    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(true)
  })

  it('matchMedia 가 정확한 쿼리로 호출된다', () => {
    renderHook(() => useIsMobile())
    expect(window.matchMedia).toHaveBeenCalledWith(`(max-width: ${MOBILE_BREAKPOINT}px)`)
  })

  it('viewport 변경 시 자동 리렌더된다 (data → mobile)', () => {
    mockMql.matches = false
    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(false)

    act(() => {
      mockMql.dispatch(true)
    })

    expect(result.current).toBe(true)
  })

  it('viewport 변경 시 자동 리렌더된다 (mobile → desktop)', () => {
    mockMql.matches = true
    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(true)

    act(() => {
      mockMql.dispatch(false)
    })

    expect(result.current).toBe(false)
  })

  it('unmount 시 리스너가 제거된다 (메모리 누수 방지)', () => {
    const { unmount } = renderHook(() => useIsMobile())
    expect(mockMql.listeners.size).toBe(1)

    unmount()

    expect(mockMql.listeners.size).toBe(0)
  })

  it('matchMedia 미지원 환경에서도 안전하게 false 반환', () => {
    // @ts-expect-error: 의도적으로 matchMedia 제거
    window.matchMedia = undefined

    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(false)
  })
})
