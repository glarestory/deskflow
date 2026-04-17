// @MX:SPEC: SPEC-UX-005
// T-010: viewModeStore 통합 시나리오 테스트
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGet = vi.fn()
const mockSet = vi.fn()

vi.mock('../lib/storage', () => ({
  storage: {
    get: (...args: unknown[]) => mockGet(...args),
    set: (...args: unknown[]) => mockSet(...args),
  },
}))

describe('viewModeStore 통합 시나리오 (SPEC-UX-005)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    mockGet.mockResolvedValue({ value: null })
    mockSet.mockResolvedValue(undefined)
  })

  // AC-001: 신규 사용자 기본값 pivot
  it('AC-001: 신규 사용자 기본값은 pivot이다', async () => {
    const { useViewModeStore } = await import('./viewModeStore')
    await useViewModeStore.getState().loadMode()
    expect(useViewModeStore.getState().mode).toBe('pivot')
    expect(useViewModeStore.getState().loaded).toBe(true)
  })

  // AC-002: Pivot → 위젯 전환 및 storage 저장
  it('AC-002: toggleMode 후 widgets로 변경되고 storage에 저장된다', async () => {
    const { useViewModeStore } = await import('./viewModeStore')
    useViewModeStore.setState({ mode: 'pivot', loaded: true })
    useViewModeStore.getState().toggleMode()
    expect(useViewModeStore.getState().mode).toBe('widgets')
    expect(mockSet).toHaveBeenCalledWith('view-mode', JSON.stringify('widgets'))
  })

  // AC-003: 위젯 → Pivot 전환
  it('AC-003: widgets에서 toggleMode 후 pivot으로 변경된다', async () => {
    const { useViewModeStore } = await import('./viewModeStore')
    useViewModeStore.setState({ mode: 'widgets', loaded: true })
    useViewModeStore.getState().toggleMode()
    expect(useViewModeStore.getState().mode).toBe('pivot')
  })

  // AC-004: 새로고침 후 viewMode 복원
  it('AC-004: loadMode 호출 시 저장된 widgets 값을 복원한다', async () => {
    mockGet.mockResolvedValue({ value: JSON.stringify('widgets') })
    const { useViewModeStore } = await import('./viewModeStore')
    await useViewModeStore.getState().loadMode()
    expect(useViewModeStore.getState().mode).toBe('widgets')
  })

  // EDGE-001: 잘못된 storage 값 → pivot 복구
  it('EDGE-001: 잘못된 storage 값은 pivot으로 복구된다', async () => {
    mockGet.mockResolvedValue({ value: '"invalid_value"' })
    const { useViewModeStore } = await import('./viewModeStore')
    await useViewModeStore.getState().loadMode()
    expect(useViewModeStore.getState().mode).toBe('pivot')
  })

  // EDGE-002: 연속 토글 (race condition 없음)
  it('EDGE-002: 연속 토글 시 마지막 결과가 적용된다', async () => {
    const { useViewModeStore } = await import('./viewModeStore')
    useViewModeStore.setState({ mode: 'pivot', loaded: true })
    useViewModeStore.getState().toggleMode() // pivot → widgets
    useViewModeStore.getState().toggleMode() // widgets → pivot
    useViewModeStore.getState().toggleMode() // pivot → widgets
    expect(useViewModeStore.getState().mode).toBe('widgets')
  })

  // 로드 후 toggleMode는 storage에도 저장
  it('loadMode 후 toggleMode는 새 mode를 storage에 저장한다', async () => {
    mockGet.mockResolvedValue({ value: JSON.stringify('pivot') })
    const { useViewModeStore } = await import('./viewModeStore')
    await useViewModeStore.getState().loadMode()
    mockSet.mockClear()
    useViewModeStore.getState().toggleMode()
    expect(mockSet).toHaveBeenCalledWith('view-mode', JSON.stringify('widgets'))
  })
})
