// pomodoroStore 단위 테스트 — SPEC-WIDGET-004 검증
// REQ-001~009 및 NFR-001~003 커버리지
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const mockGet = vi.fn()
const mockSet = vi.fn()
vi.stubGlobal('storage', { get: mockGet, set: mockSet })

// Notification API 모킹
const mockNotification = vi.fn()
vi.stubGlobal('Notification', mockNotification)
Object.defineProperty(mockNotification, 'permission', {
  get: () => 'granted',
  configurable: true,
})

describe('pomodoroStore', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    vi.resetModules()
    vi.useFakeTimers()
    vi.stubGlobal('storage', { get: mockGet, set: mockSet })
    vi.stubGlobal('Notification', mockNotification)
    Object.defineProperty(mockNotification, 'permission', {
      get: () => 'granted',
      configurable: true,
    })
    mockGet.mockResolvedValue({ value: null })
    mockSet.mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  // --- 초기 상태 검증 ---
  it('초기 mode는 idle이어야 한다', async () => {
    const { usePomodoroStore } = await import('./pomodoroStore')
    expect(usePomodoroStore.getState().mode).toBe('idle')
  })

  it('초기 remaining은 focusMinutes * 60이어야 한다', async () => {
    const { usePomodoroStore } = await import('./pomodoroStore')
    const { remaining, settings } = usePomodoroStore.getState()
    expect(remaining).toBe(settings.focusMinutes * 60)
  })

  it('초기 completed는 0이어야 한다', async () => {
    const { usePomodoroStore } = await import('./pomodoroStore')
    expect(usePomodoroStore.getState().completed).toBe(0)
  })

  it('초기 linkedTodoId는 null이어야 한다', async () => {
    const { usePomodoroStore } = await import('./pomodoroStore')
    expect(usePomodoroStore.getState().linkedTodoId).toBeNull()
  })

  it('기본 설정은 focusMinutes=25, breakMinutes=5, longBreakMinutes=15이어야 한다', async () => {
    const { usePomodoroStore } = await import('./pomodoroStore')
    const { settings } = usePomodoroStore.getState()
    expect(settings.focusMinutes).toBe(25)
    expect(settings.breakMinutes).toBe(5)
    expect(settings.longBreakMinutes).toBe(15)
  })

  // --- REQ-001: start() 검증 ---
  it('start()는 mode를 focus로 변경해야 한다', async () => {
    const { usePomodoroStore } = await import('./pomodoroStore')
    usePomodoroStore.getState().start()
    expect(usePomodoroStore.getState().mode).toBe('focus')
  })

  it('start()는 intervalId를 설정해야 한다', async () => {
    const { usePomodoroStore } = await import('./pomodoroStore')
    usePomodoroStore.getState().start()
    expect(usePomodoroStore.getState().intervalId).not.toBeNull()
    // 정리
    usePomodoroStore.getState().reset()
  })

  it('start() 후 1초가 지나면 remaining이 1 감소해야 한다', async () => {
    const { usePomodoroStore } = await import('./pomodoroStore')
    const initialRemaining = usePomodoroStore.getState().remaining
    usePomodoroStore.getState().start()
    vi.advanceTimersByTime(1000)
    expect(usePomodoroStore.getState().remaining).toBe(initialRemaining - 1)
    usePomodoroStore.getState().reset()
  })

  it('start() 후 3초가 지나면 remaining이 3 감소해야 한다', async () => {
    const { usePomodoroStore } = await import('./pomodoroStore')
    const initialRemaining = usePomodoroStore.getState().remaining
    usePomodoroStore.getState().start()
    vi.advanceTimersByTime(3000)
    expect(usePomodoroStore.getState().remaining).toBe(initialRemaining - 3)
    usePomodoroStore.getState().reset()
  })

  // --- REQ-002: pause() 검증 ---
  it('pause()는 intervalId를 null로 초기화해야 한다', async () => {
    const { usePomodoroStore } = await import('./pomodoroStore')
    usePomodoroStore.getState().start()
    usePomodoroStore.getState().pause()
    expect(usePomodoroStore.getState().intervalId).toBeNull()
  })

  it('pause() 후에는 remaining이 감소하지 않아야 한다', async () => {
    const { usePomodoroStore } = await import('./pomodoroStore')
    usePomodoroStore.getState().start()
    vi.advanceTimersByTime(2000)
    const remainingAfterPause = usePomodoroStore.getState().remaining
    usePomodoroStore.getState().pause()
    vi.advanceTimersByTime(3000)
    expect(usePomodoroStore.getState().remaining).toBe(remainingAfterPause)
  })

  it('pause()는 remaining 값을 보존해야 한다', async () => {
    const { usePomodoroStore } = await import('./pomodoroStore')
    usePomodoroStore.getState().start()
    vi.advanceTimersByTime(5000)
    const remainingBeforePause = usePomodoroStore.getState().remaining
    usePomodoroStore.getState().pause()
    expect(usePomodoroStore.getState().remaining).toBe(remainingBeforePause)
  })

  // --- REQ-003: reset() 검증 ---
  it('reset()은 mode를 idle로 변경해야 한다', async () => {
    const { usePomodoroStore } = await import('./pomodoroStore')
    usePomodoroStore.getState().start()
    usePomodoroStore.getState().reset()
    expect(usePomodoroStore.getState().mode).toBe('idle')
  })

  it('reset()은 remaining을 focusMinutes*60으로 복원해야 한다', async () => {
    const { usePomodoroStore } = await import('./pomodoroStore')
    usePomodoroStore.getState().start()
    vi.advanceTimersByTime(10000)
    usePomodoroStore.getState().reset()
    const { remaining, settings } = usePomodoroStore.getState()
    expect(remaining).toBe(settings.focusMinutes * 60)
  })

  it('reset()은 intervalId를 null로 초기화해야 한다', async () => {
    const { usePomodoroStore } = await import('./pomodoroStore')
    usePomodoroStore.getState().start()
    usePomodoroStore.getState().reset()
    expect(usePomodoroStore.getState().intervalId).toBeNull()
  })

  // --- REQ-004: 집중 세션 완료 검증 ---
  it('25분 후 mode가 break로 전환되어야 한다', async () => {
    const { usePomodoroStore } = await import('./pomodoroStore')
    usePomodoroStore.getState().start()
    vi.advanceTimersByTime(25 * 60 * 1000)
    expect(usePomodoroStore.getState().mode).toBe('break')
    usePomodoroStore.getState().reset()
  })

  it('집중 세션 완료 후 completed가 1 증가해야 한다', async () => {
    const { usePomodoroStore } = await import('./pomodoroStore')
    usePomodoroStore.getState().start()
    vi.advanceTimersByTime(25 * 60 * 1000)
    expect(usePomodoroStore.getState().completed).toBe(1)
    usePomodoroStore.getState().reset()
  })

  it('집중 세션 완료 시 알림을 발송해야 한다', async () => {
    const { usePomodoroStore } = await import('./pomodoroStore')
    usePomodoroStore.getState().start()
    vi.advanceTimersByTime(25 * 60 * 1000)
    expect(mockNotification).toHaveBeenCalled()
    usePomodoroStore.getState().reset()
  })

  it('집중 세션 완료 후 break remaining은 breakMinutes*60이어야 한다', async () => {
    const { usePomodoroStore } = await import('./pomodoroStore')
    const { settings } = usePomodoroStore.getState()
    usePomodoroStore.getState().start()
    vi.advanceTimersByTime(25 * 60 * 1000)
    expect(usePomodoroStore.getState().remaining).toBe(settings.breakMinutes * 60)
    usePomodoroStore.getState().reset()
  })

  // --- REQ-005: 휴식 세션 완료 검증 ---
  it('5분 휴식 후 mode가 idle로 전환되어야 한다', async () => {
    const { usePomodoroStore } = await import('./pomodoroStore')
    usePomodoroStore.getState().start()
    // 집중 완료
    vi.advanceTimersByTime(25 * 60 * 1000)
    // 휴식 완료
    vi.advanceTimersByTime(5 * 60 * 1000)
    expect(usePomodoroStore.getState().mode).toBe('idle')
  })

  it('휴식 세션 완료 시 알림을 발송해야 한다', async () => {
    const { usePomodoroStore } = await import('./pomodoroStore')
    usePomodoroStore.getState().start()
    vi.advanceTimersByTime(25 * 60 * 1000)
    mockNotification.mockClear()
    vi.advanceTimersByTime(5 * 60 * 1000)
    expect(mockNotification).toHaveBeenCalled()
  })

  // --- REQ-009: 4번 포모도로 후 긴 휴식 제안 ---
  it('4번 완료 후 mode가 longBreak로 전환되어야 한다', async () => {
    const { usePomodoroStore } = await import('./pomodoroStore')

    // 4번의 포모도로 + 3번의 휴식 사이클 완료
    for (let i = 0; i < 4; i++) {
      usePomodoroStore.getState().start()
      vi.advanceTimersByTime(25 * 60 * 1000) // 집중 완료

      if (i < 3) {
        // 4번째 집중 후에는 longBreak로 전환되므로 휴식은 3번만
        vi.advanceTimersByTime(5 * 60 * 1000) // 휴식 완료
      }
    }

    expect(usePomodoroStore.getState().mode).toBe('longBreak')
    usePomodoroStore.getState().reset()
  })

  it('4번 완료 후 longBreak remaining은 longBreakMinutes*60이어야 한다', async () => {
    const { usePomodoroStore } = await import('./pomodoroStore')
    const { settings } = usePomodoroStore.getState()

    for (let i = 0; i < 4; i++) {
      usePomodoroStore.getState().start()
      vi.advanceTimersByTime(25 * 60 * 1000)
      if (i < 3) {
        vi.advanceTimersByTime(5 * 60 * 1000)
      }
    }

    expect(usePomodoroStore.getState().remaining).toBe(settings.longBreakMinutes * 60)
    usePomodoroStore.getState().reset()
  })

  // --- REQ-007: linkTodo() 검증 ---
  it('linkTodo()는 linkedTodoId를 설정해야 한다', async () => {
    const { usePomodoroStore } = await import('./pomodoroStore')
    usePomodoroStore.getState().linkTodo('todo-123')
    expect(usePomodoroStore.getState().linkedTodoId).toBe('todo-123')
  })

  it('linkTodo(null)은 linkedTodoId를 null로 초기화해야 한다', async () => {
    const { usePomodoroStore } = await import('./pomodoroStore')
    usePomodoroStore.getState().linkTodo('todo-123')
    usePomodoroStore.getState().linkTodo(null)
    expect(usePomodoroStore.getState().linkedTodoId).toBeNull()
  })

  // --- REQ-008: updateSettings() 검증 ---
  it('updateSettings()는 설정을 업데이트해야 한다', async () => {
    const { usePomodoroStore } = await import('./pomodoroStore')
    usePomodoroStore.getState().updateSettings({ focusMinutes: 30 })
    expect(usePomodoroStore.getState().settings.focusMinutes).toBe(30)
  })

  it('updateSettings()는 부분 업데이트를 지원해야 한다', async () => {
    const { usePomodoroStore } = await import('./pomodoroStore')
    usePomodoroStore.getState().updateSettings({ breakMinutes: 10 })
    const { settings } = usePomodoroStore.getState()
    expect(settings.breakMinutes).toBe(10)
    expect(settings.focusMinutes).toBe(25) // 나머지는 유지
  })

  it('updateSettings()는 storage에 설정을 영속화해야 한다', async () => {
    const { usePomodoroStore } = await import('./pomodoroStore')
    usePomodoroStore.getState().updateSettings({ focusMinutes: 30 })
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(mockSet).toHaveBeenCalledWith(
      'pomodoro-settings',
      expect.stringContaining('30')
    )
  })

  // --- tick() 검증 ---
  it('tick()은 remaining을 1 감소시켜야 한다', async () => {
    const { usePomodoroStore } = await import('./pomodoroStore')
    usePomodoroStore.getState().start()
    const before = usePomodoroStore.getState().remaining
    usePomodoroStore.getState().tick()
    expect(usePomodoroStore.getState().remaining).toBe(before - 1)
    usePomodoroStore.getState().reset()
  })
})
