import { describe, it, expect, vi, beforeEach } from 'vitest'

// storage.ts 모듈을 직접 테스트하기 어려우므로
// registerStorageHandlers 함수가 올바른 IPC 핸들러를 등록하는지 테스트
describe('storage IPC handlers', () => {
  const mockStore = {
    get: vi.fn(),
    set: vi.fn(),
  }

  const mockIpcMain = {
    handle: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('registers storage:get and storage:set handlers', async () => {
    // 동적 임포트로 모듈 가져오기 - electron-store 모킹 필요
    vi.doMock('electron-store', () => ({
      default: vi.fn(() => mockStore),
    }))

    const { registerStorageHandlers } = await import('./storage')
    registerStorageHandlers(mockIpcMain as never)

    // storage:get과 storage:set 핸들러가 등록되었는지 확인
    expect(mockIpcMain.handle).toHaveBeenCalledTimes(2)
    const calls = mockIpcMain.handle.mock.calls.map((c) => c[0])
    expect(calls).toContain('storage:get')
    expect(calls).toContain('storage:set')
  })

  it('storage:get returns {value: string} when key exists', async () => {
    vi.doMock('electron-store', () => ({
      default: vi.fn(() => mockStore),
    }))
    mockStore.get.mockReturnValue('{"test":true}')

    const { registerStorageHandlers } = await import('./storage')
    registerStorageHandlers(mockIpcMain as never)

    // storage:get 핸들러 추출
    const getHandler = mockIpcMain.handle.mock.calls.find((c) => c[0] === 'storage:get')?.[1]
    expect(getHandler).toBeDefined()
    const result = await getHandler({}, 'test-key')
    expect(result).toEqual({ value: '{"test":true}' })
  })

  it('storage:get returns {value: null} when key does not exist', async () => {
    vi.doMock('electron-store', () => ({
      default: vi.fn(() => mockStore),
    }))
    mockStore.get.mockReturnValue(undefined)

    const { registerStorageHandlers } = await import('./storage')
    registerStorageHandlers(mockIpcMain as never)

    const getHandler = mockIpcMain.handle.mock.calls.find((c) => c[0] === 'storage:get')?.[1]
    const result = await getHandler({}, 'missing-key')
    expect(result).toEqual({ value: null })
  })

  it('storage:set calls store.set with key and value', async () => {
    vi.doMock('electron-store', () => ({
      default: vi.fn(() => mockStore),
    }))

    const { registerStorageHandlers } = await import('./storage')
    registerStorageHandlers(mockIpcMain as never)

    const setHandler = mockIpcMain.handle.mock.calls.find((c) => c[0] === 'storage:set')?.[1]
    await setHandler({}, 'hub-todos', '[{"id":"1","text":"test","done":false}]')
    expect(mockStore.set).toHaveBeenCalledWith('hub-todos', '[{"id":"1","text":"test","done":false}]')
  })
})
