// @MX:NOTE: [AUTO] storage 추상화 레이어 테스트 — Electron vs 브라우저 환경 분기 검증
// @MX:SPEC: SPEC-WEB-001
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

describe('storage (browser / non-Electron)', () => {
  let originalStorage: unknown

  beforeEach(() => {
    // window.storage 를 undefined 로 만들어 브라우저 환경 시뮬레이션
    originalStorage = (window as Window & { storage?: unknown }).storage
    ;(window as Window & { storage?: unknown }).storage = undefined
    localStorage.clear()
    vi.resetModules()
  })

  afterEach(() => {
    ;(window as Window & { storage?: unknown }).storage = originalStorage
  })

  it('get returns { value: null } when key is missing', async () => {
    const { storage } = await import('./storage')
    const result = await storage.get('missing-key')
    expect(result).toEqual({ value: null })
  })

  it('get returns stored value from localStorage', async () => {
    localStorage.setItem('test-key', 'hello')
    const { storage } = await import('./storage')
    const result = await storage.get('test-key')
    expect(result).toEqual({ value: 'hello' })
  })

  it('set saves value to localStorage', async () => {
    const { storage } = await import('./storage')
    await storage.set('test-key', 'world')
    expect(localStorage.getItem('test-key')).toBe('world')
  })
})
