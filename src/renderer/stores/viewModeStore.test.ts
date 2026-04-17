// @MX:SPEC: SPEC-UX-005
import { describe, it, expect, vi, beforeEach } from 'vitest'

// storage 모킹
const mockGet = vi.fn()
const mockSet = vi.fn()

vi.mock('../lib/storage', () => ({
  storage: {
    get: (...args: unknown[]) => mockGet(...args),
    set: (...args: unknown[]) => mockSet(...args),
  },
}))

describe('viewModeStore (SPEC-UX-005)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    mockGet.mockResolvedValue({ value: null })
    mockSet.mockResolvedValue(undefined)
  })

  // REQ-002: 기본값은 'pivot'
  it('초기 mode는 pivot이어야 한다', async () => {
    const { useViewModeStore } = await import('./viewModeStore')
    const state = useViewModeStore.getState()
    expect(state.mode).toBe('pivot')
  })

  // loaded 초기값은 false
  it('초기 loaded는 false이어야 한다', async () => {
    const { useViewModeStore } = await import('./viewModeStore')
    const state = useViewModeStore.getState()
    expect(state.loaded).toBe(false)
  })

  // REQ-004: loadMode가 storage에서 값을 읽어와 복원한다
  it('loadMode 실행 시 storage에서 widgets 값을 복원한다', async () => {
    mockGet.mockResolvedValue({ value: JSON.stringify('widgets') })
    const { useViewModeStore } = await import('./viewModeStore')
    await useViewModeStore.getState().loadMode()
    expect(useViewModeStore.getState().mode).toBe('widgets')
    expect(useViewModeStore.getState().loaded).toBe(true)
  })

  // REQ-004: loadMode가 pivot 값을 복원한다
  it('loadMode 실행 시 storage에서 pivot 값을 복원한다', async () => {
    mockGet.mockResolvedValue({ value: JSON.stringify('pivot') })
    const { useViewModeStore } = await import('./viewModeStore')
    await useViewModeStore.getState().loadMode()
    expect(useViewModeStore.getState().mode).toBe('pivot')
    expect(useViewModeStore.getState().loaded).toBe(true)
  })

  // loadMode: storage에 값 없으면 기본값 pivot
  it('loadMode 실행 시 storage에 값 없으면 pivot을 기본값으로 사용한다', async () => {
    mockGet.mockResolvedValue({ value: null })
    const { useViewModeStore } = await import('./viewModeStore')
    await useViewModeStore.getState().loadMode()
    expect(useViewModeStore.getState().mode).toBe('pivot')
    expect(useViewModeStore.getState().loaded).toBe(true)
  })

  // EDGE-001: 잘못된 storage 값 → pivot으로 복구
  it('EDGE-001: storage에 잘못된 값이 있으면 pivot으로 복구한다', async () => {
    mockGet.mockResolvedValue({ value: '"invalid_string"' })
    const { useViewModeStore } = await import('./viewModeStore')
    await useViewModeStore.getState().loadMode()
    expect(useViewModeStore.getState().mode).toBe('pivot')
    expect(useViewModeStore.getState().loaded).toBe(true)
  })

  // REQ-003: setMode가 상태를 변경하고 storage에 저장한다
  it('setMode("widgets") 시 mode가 widgets로 변경되고 storage에 저장한다', async () => {
    const { useViewModeStore } = await import('./viewModeStore')
    useViewModeStore.getState().setMode('widgets')
    expect(useViewModeStore.getState().mode).toBe('widgets')
    expect(mockSet).toHaveBeenCalledWith('view-mode', JSON.stringify('widgets'))
  })

  it('setMode("pivot") 시 mode가 pivot으로 변경되고 storage에 저장한다', async () => {
    const { useViewModeStore } = await import('./viewModeStore')
    // 먼저 widgets로 설정
    useViewModeStore.getState().setMode('widgets')
    vi.clearAllMocks()
    useViewModeStore.getState().setMode('pivot')
    expect(useViewModeStore.getState().mode).toBe('pivot')
    expect(mockSet).toHaveBeenCalledWith('view-mode', JSON.stringify('pivot'))
  })

  // toggleMode: pivot → widgets
  it('toggleMode 시 pivot에서 widgets로 전환한다', async () => {
    mockGet.mockResolvedValue({ value: JSON.stringify('pivot') })
    const { useViewModeStore } = await import('./viewModeStore')
    // 초기화
    useViewModeStore.setState({ mode: 'pivot', loaded: true })
    useViewModeStore.getState().toggleMode()
    expect(useViewModeStore.getState().mode).toBe('widgets')
  })

  // toggleMode: widgets → pivot
  it('toggleMode 시 widgets에서 pivot으로 전환한다', async () => {
    const { useViewModeStore } = await import('./viewModeStore')
    useViewModeStore.setState({ mode: 'widgets', loaded: true })
    useViewModeStore.getState().toggleMode()
    expect(useViewModeStore.getState().mode).toBe('pivot')
  })

  // loadMode: storage.get에서 올바른 키 사용
  it('loadMode는 view-mode 키로 storage.get을 호출한다', async () => {
    const { useViewModeStore } = await import('./viewModeStore')
    await useViewModeStore.getState().loadMode()
    expect(mockGet).toHaveBeenCalledWith('view-mode')
  })

  // loadMode 실패 시에도 기본값 pivot, loaded true
  it('loadMode 실패 시 pivot을 기본값으로 loaded true로 복구한다', async () => {
    mockGet.mockRejectedValue(new Error('storage error'))
    const { useViewModeStore } = await import('./viewModeStore')
    await useViewModeStore.getState().loadMode()
    expect(useViewModeStore.getState().mode).toBe('pivot')
    expect(useViewModeStore.getState().loaded).toBe(true)
  })
})
