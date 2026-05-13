// @MX:SPEC: SPEC-UX-010
// haptic 유틸리티 단위 테스트 — SPEC-UX-010 M6
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

describe('tryHaptic', () => {
  const mockVibrate = vi.fn(() => true)

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    // window.navigator 원복
    Object.defineProperty(window, 'navigator', {
      value: { ...window.navigator },
      writable: true,
      configurable: true,
    })
  })

  // AC-032: navigator.vibrate가 있으면 호출된다
  it('navigator.vibrate가 지원되면 tryHaptic 호출 시 vibrate가 실행된다 (AC-032)', async () => {
    Object.defineProperty(window.navigator, 'vibrate', {
      value: mockVibrate,
      writable: true,
      configurable: true,
    })
    const { tryHaptic } = await import('./haptic')
    tryHaptic(10)
    expect(mockVibrate).toHaveBeenCalledWith(10)
  })

  // AC-033: navigator.vibrate가 없으면 오류 없이 무시된다
  it('navigator.vibrate가 없으면 tryHaptic이 오류 없이 실행된다 (AC-033)', async () => {
    Object.defineProperty(window.navigator, 'vibrate', {
      value: undefined,
      writable: true,
      configurable: true,
    })
    const { tryHaptic } = await import('./haptic')
    expect(() => tryHaptic(10)).not.toThrow()
    expect(mockVibrate).not.toHaveBeenCalled()
  })

  // AC-034: prefers-reduced-motion: reduce 시 vibrate 미호출
  it('prefers-reduced-motion: reduce 설정 시 vibrate가 호출되지 않는다 (AC-034)', async () => {
    Object.defineProperty(window.navigator, 'vibrate', {
      value: mockVibrate,
      writable: true,
      configurable: true,
    })
    // matchMedia 모킹 — prefers-reduced-motion: reduce
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query === '(prefers-reduced-motion: reduce)',
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))
    const { tryHaptic } = await import('./haptic')
    tryHaptic(10)
    expect(mockVibrate).not.toHaveBeenCalled()
    vi.unstubAllGlobals()
  })

  // AC-035: prefers-reduced-motion: no-preference 시 vibrate 호출
  it('prefers-reduced-motion: no-preference 시 vibrate가 호출된다 (AC-035)', async () => {
    Object.defineProperty(window.navigator, 'vibrate', {
      value: mockVibrate,
      writable: true,
      configurable: true,
    })
    // matchMedia 모킹 — prefers-reduced-motion: no-preference
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))
    const { tryHaptic } = await import('./haptic')
    tryHaptic(10)
    expect(mockVibrate).toHaveBeenCalledWith(10)
    vi.unstubAllGlobals()
  })
})
