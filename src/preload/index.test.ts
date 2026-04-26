// @MX:TEST: SPEC-UI-001 — contextBridge 노출 API 신뢰 경계 검증
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockExpose = vi.fn()
const mockInvoke = vi.fn()

vi.mock('electron', () => ({
  contextBridge: {
    exposeInMainWorld: (...args: unknown[]) => mockExpose(...args),
  },
  ipcRenderer: {
    invoke: (...args: unknown[]) => mockInvoke(...args),
  },
}))

describe('preload/index.ts (SPEC-UI-001)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it('preload 로딩 시 contextBridge.exposeInMainWorld가 정확히 두 번 호출된다 (api, storage)', async () => {
    await import('./index')

    expect(mockExpose).toHaveBeenCalledTimes(2)
    const exposedKeys = mockExpose.mock.calls.map((c) => c[0])
    expect(exposedKeys).toEqual(expect.arrayContaining(['api', 'storage']))
  })

  it('window.api는 빈 객체로 노출된다 (확장 진입점 예약)', async () => {
    await import('./index')

    const apiCall = mockExpose.mock.calls.find((c) => c[0] === 'api')
    expect(apiCall?.[1]).toEqual({})
  })

  it('window.storage는 정확히 get/set 두 메서드만 노출한다 (최소 권한 원칙)', async () => {
    await import('./index')

    const storageCall = mockExpose.mock.calls.find((c) => c[0] === 'storage')
    const exposed = storageCall?.[1] as Record<string, unknown>
    expect(Object.keys(exposed).sort()).toEqual(['get', 'set'])
  })

  it('storage.get은 storage:get 채널로만 invoke한다 (임의 채널 차단)', async () => {
    await import('./index')

    const storageCall = mockExpose.mock.calls.find((c) => c[0] === 'storage')
    const storage = storageCall?.[1] as { get: (k: string) => unknown }
    storage.get('hub-bookmarks')

    expect(mockInvoke).toHaveBeenCalledTimes(1)
    expect(mockInvoke).toHaveBeenCalledWith('storage:get', 'hub-bookmarks')
  })

  it('storage.set은 storage:set 채널로만 invoke한다 (임의 채널 차단)', async () => {
    await import('./index')

    const storageCall = mockExpose.mock.calls.find((c) => c[0] === 'storage')
    const storage = storageCall?.[1] as { set: (k: string, v: string) => unknown }
    storage.set('hub-todos', '[]')

    expect(mockInvoke).toHaveBeenCalledTimes(1)
    expect(mockInvoke).toHaveBeenCalledWith('storage:set', 'hub-todos', '[]')
  })

  it('storage.get/set은 invoke 결과(Promise)를 그대로 반환한다', async () => {
    mockInvoke.mockResolvedValueOnce({ value: 'data' })
    mockInvoke.mockResolvedValueOnce(undefined)

    await import('./index')
    const storageCall = mockExpose.mock.calls.find((c) => c[0] === 'storage')
    const storage = storageCall?.[1] as {
      get: (k: string) => Promise<{ value: string | null }>
      set: (k: string, v: string) => Promise<void>
    }

    await expect(storage.get('hub-bookmarks')).resolves.toEqual({ value: 'data' })
    await expect(storage.set('hub-todos', '[]')).resolves.toBeUndefined()
  })

  it('storage 객체에 nodeRequire/process 같은 위험한 프로퍼티가 노출되지 않는다', async () => {
    await import('./index')

    const storageCall = mockExpose.mock.calls.find((c) => c[0] === 'storage')
    const storage = storageCall?.[1] as Record<string, unknown>

    expect(storage).not.toHaveProperty('require')
    expect(storage).not.toHaveProperty('process')
    expect(storage).not.toHaveProperty('ipcRenderer')
    expect(storage).not.toHaveProperty('send')
    expect(storage).not.toHaveProperty('on')
  })
})
