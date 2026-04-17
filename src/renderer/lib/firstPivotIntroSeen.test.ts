// @MX:SPEC: SPEC-UX-005
import { describe, it, expect, beforeEach } from 'vitest'

// localStorage 모킹
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string): string | null => store[key] ?? null,
    setItem: (key: string, value: string): void => { store[key] = value },
    removeItem: (key: string): void => { delete store[key] },
    clear: (): void => { store = {} },
  }
})()

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true,
})

describe('firstPivotIntroSeen (SPEC-UX-005)', () => {
  beforeEach(() => {
    localStorageMock.clear()
  })

  // 초기 상태: 아직 안 본 경우 false 반환
  it('처음에는 hasSeenIntro()가 false를 반환한다', async () => {
    const { hasSeenPivotIntro } = await import('./firstPivotIntroSeen')
    expect(hasSeenPivotIntro()).toBe(false)
  })

  // markAsSeen 호출 후 hasSeenIntro()가 true 반환
  it('markPivotIntroAsSeen() 후 hasSeenPivotIntro()가 true를 반환한다', async () => {
    const { hasSeenPivotIntro, markPivotIntroAsSeen } = await import('./firstPivotIntroSeen')
    markPivotIntroAsSeen()
    expect(hasSeenPivotIntro()).toBe(true)
  })

  // markAsSeen은 멱등성 보장 (여러 번 호출해도 동일 결과)
  it('markPivotIntroAsSeen()는 여러 번 호출해도 멱등적이다', async () => {
    const { hasSeenPivotIntro, markPivotIntroAsSeen } = await import('./firstPivotIntroSeen')
    markPivotIntroAsSeen()
    markPivotIntroAsSeen()
    markPivotIntroAsSeen()
    expect(hasSeenPivotIntro()).toBe(true)
  })

  // localStorage에 올바른 키로 저장된다
  it('pivot-intro-seen 키로 localStorage에 저장한다', async () => {
    const { markPivotIntroAsSeen } = await import('./firstPivotIntroSeen')
    markPivotIntroAsSeen()
    expect(localStorageMock.getItem('pivot-intro-seen')).toBe('1')
  })

  // localStorage에 이미 값이 있으면 처음부터 true
  it('localStorage에 이미 값이 있으면 hasSeenPivotIntro()가 true를 반환한다', async () => {
    localStorageMock.setItem('pivot-intro-seen', '1')
    const { hasSeenPivotIntro } = await import('./firstPivotIntroSeen')
    expect(hasSeenPivotIntro()).toBe(true)
  })
})
