// @MX:NOTE: [AUTO] PomodoroWidget — 포모도로 타이머 위젯 (집중/휴식 사이클, 할 일 연동)
// @MX:SPEC: SPEC-WIDGET-004
import { useState } from 'react'
import { usePomodoroStore } from '../../stores/pomodoroStore'
import { useTodoStore } from '../../stores/todoStore'
import type { PomodoroMode } from '../../stores/pomodoroStore'

// 초를 MM:SS 형식으로 변환하는 헬퍼
const formatTime = (seconds: number): string => {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

// 모드에 따른 레이블 반환
const getModeLabel = (mode: PomodoroMode): string => {
  switch (mode) {
    case 'focus': return '집중'
    case 'break': return '휴식'
    case 'longBreak': return '긴 휴식'
    default: return '대기'
  }
}

// 모드에 따른 색상 반환
const getModeColor = (mode: PomodoroMode): string => {
  switch (mode) {
    case 'focus': return 'var(--accent, #ef4444)'
    case 'break': return '#22c55e'
    case 'longBreak': return '#3b82f6'
    default: return 'var(--text-muted, #6b7094)'
  }
}

export default function PomodoroWidget(): JSX.Element {
  const {
    mode,
    remaining,
    completed,
    linkedTodoId,
    settings,
    intervalId,
    start,
    pause,
    reset,
    linkTodo,
    updateSettings,
  } = usePomodoroStore()

  const { todos } = useTodoStore()

  // 설정 폼 표시 상태
  const [showSettings, setShowSettings] = useState(false)
  // 임시 설정 입력값
  const [focusInput, setFocusInput] = useState(String(settings.focusMinutes))
  const [breakInput, setBreakInput] = useState(String(settings.breakMinutes))
  const [longBreakInput, setLongBreakInput] = useState(String(settings.longBreakMinutes))

  // 실행 중 여부
  const isRunning = intervalId !== null
  const modeColor = getModeColor(mode)

  // 설정 저장 핸들러
  const handleSaveSettings = (): void => {
    const focusMinutes = Math.max(1, parseInt(focusInput, 10) || 25)
    const breakMinutes = Math.max(1, parseInt(breakInput, 10) || 5)
    const longBreakMinutes = Math.max(1, parseInt(longBreakInput, 10) || 15)
    updateSettings({ focusMinutes, breakMinutes, longBreakMinutes })
    setShowSettings(false)
  }

  return (
    <div
      className="widget-drag-handle"
      style={{
        background: 'var(--card-bg)',
        borderRadius: 12,
        border: '1px solid var(--border)',
        padding: '16px',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        boxSizing: 'border-box',
        overflow: 'hidden',
      }}
    >
      {/* 헤더 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
          🍅 포모도로
        </span>
        <button
          data-testid="settings-toggle-btn"
          onClick={() => setShowSettings(!showSettings)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--text-muted)',
            fontSize: 14,
            padding: '2px 4px',
          }}
          title="설정"
        >
          ⚙️
        </button>
      </div>

      {/* 설정 폼 (접이식) */}
      {showSettings && (
        <div
          data-testid="settings-form"
          style={{
            background: 'var(--bg)',
            borderRadius: 8,
            padding: 10,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: 2 }}>
            집중 시간 (분)
            <input
              type="number"
              min={1}
              max={60}
              value={focusInput}
              onChange={(e) => setFocusInput(e.target.value)}
              style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--card-bg)', color: 'var(--text-primary)', fontSize: 12 }}
            />
          </label>
          <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: 2 }}>
            휴식 시간 (분)
            <input
              type="number"
              min={1}
              max={30}
              value={breakInput}
              onChange={(e) => setBreakInput(e.target.value)}
              style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--card-bg)', color: 'var(--text-primary)', fontSize: 12 }}
            />
          </label>
          <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: 2 }}>
            긴 휴식 시간 (분)
            <input
              type="number"
              min={1}
              max={60}
              value={longBreakInput}
              onChange={(e) => setLongBreakInput(e.target.value)}
              style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--card-bg)', color: 'var(--text-primary)', fontSize: 12 }}
            />
          </label>
          <button
            onClick={handleSaveSettings}
            style={{
              padding: '6px 12px',
              borderRadius: 6,
              border: 'none',
              background: modeColor,
              color: '#fff',
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            저장
          </button>
        </div>
      )}

      {/* 긴 휴식 제안 */}
      {mode === 'longBreak' && (
        <div
          data-testid="long-break-suggestion"
          style={{
            background: '#3b82f620',
            borderRadius: 8,
            padding: '8px 12px',
            textAlign: 'center',
            fontSize: 12,
            color: '#3b82f6',
          }}
        >
          🎉 4번 완료! {settings.longBreakMinutes}분 긴 휴식을 취하세요
        </div>
      )}

      {/* 타이머 표시 */}
      <div style={{ textAlign: 'center', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 4 }}>
        {/* 모드 레이블 */}
        <div style={{ fontSize: 12, color: modeColor, fontWeight: 600, letterSpacing: 2, textTransform: 'uppercase' }}>
          {getModeLabel(mode)}
        </div>

        {/* MM:SS 카운트다운 */}
        <div
          data-testid="pomodoro-timer"
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 42,
            fontWeight: 700,
            color: modeColor,
            lineHeight: 1,
            letterSpacing: -1,
          }}
        >
          {formatTime(remaining)}
        </div>

        {/* 완료된 포모도로 수 */}
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
          {'🍅'.repeat(Math.min(completed % 4 || (completed > 0 ? 4 : 0), 4))} &times; {completed}
        </div>
      </div>

      {/* 컨트롤 버튼 */}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
        {/* 시작 버튼 */}
        <button
          data-testid="pomodoro-start-btn"
          onClick={start}
          disabled={isRunning}
          style={{
            flex: 1,
            padding: '8px 0',
            borderRadius: 8,
            border: 'none',
            background: isRunning ? 'var(--border)' : modeColor,
            color: isRunning ? 'var(--text-muted)' : '#fff',
            fontSize: 13,
            fontWeight: 600,
            cursor: isRunning ? 'not-allowed' : 'pointer',
          }}
        >
          시작
        </button>

        {/* 일시정지 버튼 */}
        <button
          data-testid="pomodoro-pause-btn"
          onClick={pause}
          disabled={!isRunning}
          style={{
            flex: 1,
            padding: '8px 0',
            borderRadius: 8,
            border: '1px solid var(--border)',
            background: 'var(--card-bg)',
            color: !isRunning ? 'var(--text-muted)' : 'var(--text-primary)',
            fontSize: 13,
            fontWeight: 600,
            cursor: !isRunning ? 'not-allowed' : 'pointer',
          }}
        >
          일시정지
        </button>

        {/* 초기화 버튼 */}
        <button
          data-testid="pomodoro-reset-btn"
          onClick={reset}
          style={{
            flex: 1,
            padding: '8px 0',
            borderRadius: 8,
            border: '1px solid var(--border)',
            background: 'var(--card-bg)',
            color: 'var(--text-muted)',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          초기화
        </button>
      </div>

      {/* Todo 선택기 */}
      <div>
        <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
          연결된 할 일
        </label>
        <select
          data-testid="todo-selector"
          value={linkedTodoId ?? ''}
          onChange={(e) => linkTodo(e.target.value || null)}
          style={{
            width: '100%',
            padding: '6px 8px',
            borderRadius: 6,
            border: '1px solid var(--border)',
            background: 'var(--card-bg)',
            color: 'var(--text-primary)',
            fontSize: 12,
            cursor: 'pointer',
          }}
        >
          <option value="">선택 안 함</option>
          {todos.map((todo) => (
            <option key={todo.id} value={todo.id}>
              {todo.text}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
