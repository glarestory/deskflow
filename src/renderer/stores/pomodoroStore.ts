// @MX:NOTE: [AUTO] pomodoroStore — 포모도로 타이머 상태 관리 (집중/휴식/긴 휴식 사이클)
// @MX:SPEC: SPEC-WIDGET-004
// @MX:ANCHOR: [AUTO] usePomodoroStore — tick, start, pause, reset 진입점
// @MX:REASON: [AUTO] PomodoroWidget과 테스트에서 호출됨 (fan_in >= 3)
import { create } from 'zustand'
import { storage } from '../lib/storage'

// 포모도로 모드 타입
export type PomodoroMode = 'idle' | 'focus' | 'break' | 'longBreak'

// 설정 인터페이스
export interface PomodoroSettings {
  focusMinutes: number    // 기본 25분
  breakMinutes: number    // 기본 5분
  longBreakMinutes: number // 기본 15분
}

// 스토어 상태 인터페이스
interface PomodoroState {
  mode: PomodoroMode
  remaining: number       // 초 단위
  completed: number       // 이번 세션 완료된 포모도로 수
  linkedTodoId: string | null
  settings: PomodoroSettings
  intervalId: ReturnType<typeof setInterval> | null
  // 액션
  start: () => void
  pause: () => void
  reset: () => void
  tick: () => void
  linkTodo: (todoId: string | null) => void
  updateSettings: (settings: Partial<PomodoroSettings>) => void
  sendNotification: (title: string, body: string) => void
  // @MX:NOTE: [AUTO] 버그 수정 — 앱 시작 시 storage에서 저장된 설정을 state로 복원
  loadSettings: () => Promise<void>
}

// 스토리지 키
const SETTINGS_KEY = 'pomodoro-settings'

// 기본 설정
const DEFAULT_SETTINGS: PomodoroSettings = {
  focusMinutes: 25,
  breakMinutes: 5,
  longBreakMinutes: 15,
}

// 알림 발송 헬퍼
const sendNotification = (title: string, body: string): void => {
  if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
    new Notification(title, { body })
  }
}

export const usePomodoroStore = create<PomodoroState>((set, get) => ({
  mode: 'idle',
  remaining: DEFAULT_SETTINGS.focusMinutes * 60,
  completed: 0,
  linkedTodoId: null,
  settings: DEFAULT_SETTINGS,
  intervalId: null,

  start: () => {
    const state = get()
    // 이미 실행 중이면 무시
    if (state.intervalId !== null) return

    // 집중 모드로 전환
    set({ mode: 'focus' })

    const id = setInterval(() => {
      get().tick()
    }, 1000)

    set({ intervalId: id })
  },

  pause: () => {
    const { intervalId } = get()
    if (intervalId !== null) {
      clearInterval(intervalId)
    }
    set({ intervalId: null })
  },

  reset: () => {
    const { intervalId, settings } = get()
    if (intervalId !== null) {
      clearInterval(intervalId)
    }
    set({
      mode: 'idle',
      remaining: settings.focusMinutes * 60,
      intervalId: null,
    })
  },

  tick: () => {
    const state = get()
    const newRemaining = state.remaining - 1

    if (newRemaining <= 0) {
      // 세션 완료 처리
      if (state.mode === 'focus') {
        // 집중 세션 완료
        const newCompleted = state.completed + 1
        clearInterval(state.intervalId!)

        sendNotification('집중 시간 완료!', '휴식을 취하세요')

        // 4번 완료 시 긴 휴식 제안
        if (newCompleted % 4 === 0) {
          const id = setInterval(() => {
            get().tick()
          }, 1000)
          set({
            mode: 'longBreak',
            remaining: state.settings.longBreakMinutes * 60,
            completed: newCompleted,
            intervalId: id,
          })
        } else {
          // 일반 휴식
          const id = setInterval(() => {
            get().tick()
          }, 1000)
          set({
            mode: 'break',
            remaining: state.settings.breakMinutes * 60,
            completed: newCompleted,
            intervalId: id,
          })
        }
      } else if (state.mode === 'break' || state.mode === 'longBreak') {
        // 휴식 세션 완료
        clearInterval(state.intervalId!)
        sendNotification('휴식 완료!', '다시 집중할 시간입니다')
        set({
          mode: 'idle',
          remaining: state.settings.focusMinutes * 60,
          intervalId: null,
        })
      }
    } else {
      set({ remaining: newRemaining })
    }
  },

  linkTodo: (todoId: string | null) => {
    set({ linkedTodoId: todoId })
  },

  updateSettings: (newSettings: Partial<PomodoroSettings>) => {
    const { settings } = get()
    const updated = { ...settings, ...newSettings }
    set({ settings: updated })
    // 설정 영속화
    void storage.set(SETTINGS_KEY, JSON.stringify(updated))
  },

  // @MX:NOTE: [AUTO] 앱 시작 시 저장된 설정 복원
  // mode가 idle일 때만 remaining도 새 focusMinutes 기준으로 초기화
  loadSettings: async () => {
    try {
      const result = await storage.get(SETTINGS_KEY)
      if (result.value !== null) {
        const saved = JSON.parse(result.value) as PomodoroSettings
        const { mode, remaining } = get()
        set({
          settings: saved,
          remaining: mode === 'idle' ? saved.focusMinutes * 60 : remaining,
        })
      }
    } catch {
      // 파싱 실패 시 기본값 유지 (EDGE: 손상된 저장 데이터 방어)
    }
  },

  sendNotification,
}))
