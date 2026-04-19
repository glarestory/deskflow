// @MX:SPEC: SPEC-CAPSULE-001
// Phase 3 통합 테스트 — activateCapsule 복원 체인 (viewMode + viewStore + pomodoroStore)

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

// viewModeStore의 setMode를 추적하는 spy
const mockSetMode = vi.fn()
const mockSetContext = vi.fn()
const mockUpdateSettings = vi.fn()

vi.mock('./viewModeStore', () => ({
  useViewModeStore: {
    getState: vi.fn(() => ({
      setMode: mockSetMode,
      mode: 'pivot',
    })),
  },
}))

vi.mock('./viewStore', () => ({
  useViewStore: {
    getState: vi.fn(() => ({
      setContext: mockSetContext,
      context: { kind: 'all' },
    })),
  },
}))

vi.mock('./pomodoroStore', () => ({
  usePomodoroStore: {
    getState: vi.fn(() => ({
      updateSettings: mockUpdateSettings,
      settings: { focusMinutes: 25, breakMinutes: 5, longBreakMinutes: 15 },
    })),
  },
}))

describe('capsuleStore — Phase 3: activateCapsule 복원 체인 (SPEC-CAPSULE-001)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    mockGet.mockResolvedValue({ value: null })
    mockSet.mockResolvedValue(undefined)
  })

  // ── AC-007: activateCapsule(id) → activeCapsuleId 즉시 반영 ──────────
  it('AC-007: activateCapsule(id) 호출 시 activeCapsuleId = id 즉시 반영', async () => {
    const { useCapsuleStore } = await import('./capsuleStore')
    useCapsuleStore.setState({ capsules: [], loaded: true })

    const capsule = useCapsuleStore.getState().createCapsule({ name: '활성화 테스트' })
    await useCapsuleStore.getState().activateCapsule(capsule.id)

    expect(useCapsuleStore.getState().activeCapsuleId).toBe(capsule.id)
  })

  // ── AC-008: viewMode 복원 ─────────────────────────────────────────────
  it('AC-008: viewMode = "pivot" 캡슐 활성화 시 viewModeStore.setMode("pivot") 호출', async () => {
    const { useCapsuleStore } = await import('./capsuleStore')
    useCapsuleStore.setState({ capsules: [], loaded: true })

    const capsule = useCapsuleStore.getState().createCapsule({
      name: 'pivot 복원 테스트',
      viewMode: 'pivot',
    })

    await useCapsuleStore.getState().activateCapsule(capsule.id)

    expect(mockSetMode).toHaveBeenCalledWith('pivot')
  })

  it('viewMode = "widgets" 캡슐 활성화 시 viewModeStore.setMode("widgets") 호출', async () => {
    const { useCapsuleStore } = await import('./capsuleStore')
    useCapsuleStore.setState({ capsules: [], loaded: true })

    const capsule = useCapsuleStore.getState().createCapsule({
      name: 'widgets 복원 테스트',
      viewMode: 'widgets',
    })

    await useCapsuleStore.getState().activateCapsule(capsule.id)

    expect(mockSetMode).toHaveBeenCalledWith('widgets')
  })

  it('viewMode = null인 캡슐 활성화 시 viewModeStore.setMode 호출 안 함', async () => {
    const { useCapsuleStore } = await import('./capsuleStore')
    useCapsuleStore.setState({ capsules: [], loaded: true })

    const capsule = useCapsuleStore.getState().createCapsule({
      name: 'viewMode null 테스트',
      viewMode: null,
    })

    await useCapsuleStore.getState().activateCapsule(capsule.id)

    expect(mockSetMode).not.toHaveBeenCalled()
  })

  // ── AC-009: pivotContext 복원 ─────────────────────────────────────────
  it('AC-009: pivotContext = { kind: "tag", tag: "react" } 복원 시 viewStore.setContext 호출', async () => {
    const { useCapsuleStore } = await import('./capsuleStore')
    useCapsuleStore.setState({ capsules: [], loaded: true })

    const pivotContext = { kind: 'tag' as const, tag: 'react' }
    const capsule = useCapsuleStore.getState().createCapsule({
      name: 'pivot context 복원 테스트',
      pivotContext,
    })

    await useCapsuleStore.getState().activateCapsule(capsule.id)

    expect(mockSetContext).toHaveBeenCalledWith(pivotContext)
  })

  it('pivotContext = null인 캡슐 활성화 시 viewStore.setContext 호출 안 함', async () => {
    const { useCapsuleStore } = await import('./capsuleStore')
    useCapsuleStore.setState({ capsules: [], loaded: true })

    const capsule = useCapsuleStore.getState().createCapsule({
      name: 'pivotContext null 테스트',
      pivotContext: null,
    })

    await useCapsuleStore.getState().activateCapsule(capsule.id)

    expect(mockSetContext).not.toHaveBeenCalled()
  })

  // ── AC-010: pomodoroPreset 복원 ──────────────────────────────────────
  it('AC-010: pomodoroPreset이 존재하면 pomodoroStore.updateSettings 호출', async () => {
    const { useCapsuleStore } = await import('./capsuleStore')
    useCapsuleStore.setState({ capsules: [], loaded: true })

    const preset = {
      focusMinutes: 50,
      breakMinutes: 10,
      longBreakMinutes: 20,
      cyclesBeforeLongBreak: 4,
    }

    const capsule = useCapsuleStore.getState().createCapsule({
      name: 'pomodoro 복원 테스트',
      pomodoroPreset: preset,
    })

    await useCapsuleStore.getState().activateCapsule(capsule.id)

    expect(mockUpdateSettings).toHaveBeenCalledWith({
      focusMinutes: 50,
      breakMinutes: 10,
      longBreakMinutes: 20,
    })
  })

  it('pomodoroPreset = null인 캡슐 활성화 시 updateSettings 호출 안 함', async () => {
    const { useCapsuleStore } = await import('./capsuleStore')
    useCapsuleStore.setState({ capsules: [], loaded: true })

    const capsule = useCapsuleStore.getState().createCapsule({
      name: 'preset null 테스트',
      pomodoroPreset: null,
    })

    await useCapsuleStore.getState().activateCapsule(capsule.id)

    expect(mockUpdateSettings).not.toHaveBeenCalled()
  })

  // ── AC-011: lastActivatedAt 갱신 + activationCount 증가 ──────────────
  it('AC-011: activateCapsule 시 lastActivatedAt이 갱신된다', async () => {
    const { useCapsuleStore } = await import('./capsuleStore')
    useCapsuleStore.setState({ capsules: [], loaded: true })

    const capsule = useCapsuleStore.getState().createCapsule({ name: 'lastActivatedAt 테스트' })
    expect(capsule.lastActivatedAt).toBeNull()

    await useCapsuleStore.getState().activateCapsule(capsule.id)

    const updated = useCapsuleStore.getState().capsules.find((c) => c.id === capsule.id)
    expect(updated?.lastActivatedAt).toBeTruthy()
    expect(new Date(updated!.lastActivatedAt!).getTime()).toBeGreaterThan(0)
  })

  it('AC-011: activateCapsule 시 metrics.activationCount가 1 증가한다', async () => {
    const { useCapsuleStore } = await import('./capsuleStore')
    useCapsuleStore.setState({ capsules: [], loaded: true })

    const capsule = useCapsuleStore.getState().createCapsule({ name: '활성화 카운트 테스트' })
    expect(capsule.metrics.activationCount).toBe(0)

    await useCapsuleStore.getState().activateCapsule(capsule.id)

    const updated = useCapsuleStore.getState().capsules.find((c) => c.id === capsule.id)
    expect(updated?.metrics.activationCount).toBe(1)

    // 다시 활성화
    await useCapsuleStore.getState().activateCapsule(capsule.id)
    const updated2 = useCapsuleStore.getState().capsules.find((c) => c.id === capsule.id)
    expect(updated2?.metrics.activationCount).toBe(2)
  })

  // ── AC-012: activateCapsule(null) → 해제 ─────────────────────────────
  it('AC-012: activateCapsule(null) 시 activeCapsuleId = null', async () => {
    const { useCapsuleStore } = await import('./capsuleStore')
    useCapsuleStore.setState({ capsules: [], loaded: true })

    const capsule = useCapsuleStore.getState().createCapsule({ name: '해제 테스트' })
    await useCapsuleStore.getState().activateCapsule(capsule.id)
    expect(useCapsuleStore.getState().activeCapsuleId).toBe(capsule.id)

    await useCapsuleStore.getState().activateCapsule(null)
    expect(useCapsuleStore.getState().activeCapsuleId).toBeNull()
  })

  it('AC-012: activateCapsule(null) 시 viewModeStore/viewStore는 변경되지 않는다', async () => {
    const { useCapsuleStore } = await import('./capsuleStore')
    useCapsuleStore.setState({ capsules: [], loaded: true, activeCapsuleId: 'some-id' })

    await useCapsuleStore.getState().activateCapsule(null)

    // 해제 시 다른 스토어 호출 없음
    expect(mockSetMode).not.toHaveBeenCalled()
    expect(mockSetContext).not.toHaveBeenCalled()
    expect(mockUpdateSettings).not.toHaveBeenCalled()
  })

  // ── T-003 복원 체인 통합 시나리오 ────────────────────────────────────
  it('T-003: 복원 체인 — pivotContext + viewMode + pomodoroPreset 동시 복원', async () => {
    const { useCapsuleStore } = await import('./capsuleStore')
    useCapsuleStore.setState({ capsules: [], loaded: true })

    const capsule = useCapsuleStore.getState().createCapsule({
      name: 'rust-study',
      pivotContext: { kind: 'tag', tag: 'rust' },
      viewMode: 'pivot',
      pomodoroPreset: {
        focusMinutes: 50,
        breakMinutes: 10,
        longBreakMinutes: 20,
        cyclesBeforeLongBreak: 4,
      },
    })

    await useCapsuleStore.getState().activateCapsule(capsule.id)

    // 순서 확인: viewMode → pivotContext → pomodoro → metrics
    expect(mockSetMode).toHaveBeenCalledWith('pivot')
    expect(mockSetContext).toHaveBeenCalledWith({ kind: 'tag', tag: 'rust' })
    expect(mockUpdateSettings).toHaveBeenCalledWith({
      focusMinutes: 50,
      breakMinutes: 10,
      longBreakMinutes: 20,
    })

    const updated = useCapsuleStore.getState().capsules.find((c) => c.id === capsule.id)
    expect(updated?.metrics.activationCount).toBe(1)
    expect(updated?.lastActivatedAt).toBeTruthy()
  })

  // ── active-capsule-id 저장 검증 ──────────────────────────────────────
  it('activateCapsule 시 active-capsule-id가 storage에 저장된다', async () => {
    const { useCapsuleStore } = await import('./capsuleStore')
    useCapsuleStore.setState({ capsules: [], loaded: true })

    const capsule = useCapsuleStore.getState().createCapsule({ name: '저장 검증' })
    vi.clearAllMocks()

    await useCapsuleStore.getState().activateCapsule(capsule.id)

    expect(mockSet).toHaveBeenCalledWith(
      'active-capsule-id',
      JSON.stringify(capsule.id),
    )
  })
})
