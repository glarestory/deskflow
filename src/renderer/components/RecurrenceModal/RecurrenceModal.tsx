// @MX:NOTE: [AUTO] RecurrenceModal — 반복 할 일 추가 모달 컴포넌트
// @MX:SPEC: SPEC-TODO-002
import { useState } from 'react'
import type { Recurrence } from '../../types'

// 반복 유형 선택 옵션
type RecurrenceType = 'none' | 'daily' | 'weekly' | 'monthly'

// 요일 레이블 (0=일, 1=월, ..., 6=토)
const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토']

interface RecurrenceModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (text: string, recurrence: Omit<Recurrence, 'nextDue' | 'seriesId'>) => void
}

export default function RecurrenceModal({ isOpen, onClose, onConfirm }: RecurrenceModalProps): JSX.Element | null {
  const [text, setText] = useState('')
  const [recType, setRecType] = useState<RecurrenceType>('daily')
  const [selectedDays, setSelectedDays] = useState<number[]>([])
  const [dayOfMonth, setDayOfMonth] = useState<string>('')

  if (!isOpen) return null

  // 요일 토글
  const toggleDay = (day: number) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort((a, b) => a - b)
    )
  }

  // 확인 버튼 처리
  const handleConfirm = () => {
    if (!text.trim()) return

    if (recType === 'none') {
      onClose()
      return
    }

    if (recType === 'weekly' && selectedDays.length === 0) return

    const recurrence: Omit<Recurrence, 'nextDue' | 'seriesId'> = {
      type: recType as 'daily' | 'weekly' | 'monthly',
      ...(recType === 'weekly' && { daysOfWeek: selectedDays }),
      ...(recType === 'monthly' && { dayOfMonth: dayOfMonth ? Number(dayOfMonth) : 1 }),
    }

    onConfirm(text.trim(), recurrence)

    // 상태 초기화
    setText('')
    setRecType('daily')
    setSelectedDays([])
    setDayOfMonth('')
  }

  // 취소 버튼 처리
  const handleClose = () => {
    setText('')
    setRecType('daily')
    setSelectedDays([])
    setDayOfMonth('')
    onClose()
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={handleClose}
    >
      <div
        style={{
          background: 'var(--card-bg)',
          borderRadius: 16,
          padding: '24px',
          minWidth: 320,
          border: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 제목 */}
        <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>
          반복 할 일 추가
        </div>

        {/* 텍스트 입력 */}
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="할 일 내용 입력..."
          style={{
            padding: '8px 12px',
            borderRadius: 10,
            border: '1px solid var(--border)',
            background: 'var(--link-bg)',
            color: 'var(--text-primary)',
            fontSize: 13,
            outline: 'none',
          }}
        />

        {/* 반복 유형 선택 */}
        <div style={{ display: 'flex', gap: 8 }}>
          {(['none', 'daily', 'weekly', 'monthly'] as const).map((type) => {
            const label = type === 'none' ? '없음' : type === 'daily' ? '매일' : type === 'weekly' ? '매주' : '매월'
            return (
              <button
                key={type}
                onClick={() => setRecType(type)}
                style={{
                  flex: 1,
                  padding: '6px 8px',
                  borderRadius: 8,
                  border: recType === type ? 'none' : '1px solid var(--border)',
                  background: recType === type ? 'var(--accent)' : 'var(--link-bg)',
                  color: recType === type ? '#fff' : 'var(--text-primary)',
                  fontSize: 12,
                  cursor: 'pointer',
                  fontWeight: recType === type ? 600 : 400,
                }}
              >
                {label}
              </button>
            )
          })}
        </div>

        {/* 매주: 요일 선택 */}
        {recType === 'weekly' && (
          <div style={{ display: 'flex', gap: 6 }}>
            {DAY_LABELS.map((label, idx) => (
              <button
                key={idx}
                onClick={() => toggleDay(idx)}
                style={{
                  flex: 1,
                  padding: '6px 2px',
                  borderRadius: 8,
                  border: selectedDays.includes(idx) ? 'none' : '1px solid var(--border)',
                  background: selectedDays.includes(idx) ? 'var(--accent)' : 'var(--link-bg)',
                  color: selectedDays.includes(idx) ? '#fff' : 'var(--text-primary)',
                  fontSize: 12,
                  cursor: 'pointer',
                  fontWeight: selectedDays.includes(idx) ? 600 : 400,
                }}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {/* 매월: 날짜 입력 */}
        {recType === 'monthly' && (
          <input
            type="number"
            value={dayOfMonth}
            onChange={(e) => setDayOfMonth(e.target.value)}
            placeholder="1-31"
            min={1}
            max={31}
            style={{
              padding: '8px 12px',
              borderRadius: 10,
              border: '1px solid var(--border)',
              background: 'var(--link-bg)',
              color: 'var(--text-primary)',
              fontSize: 13,
              outline: 'none',
            }}
          />
        )}

        {/* 버튼 영역 */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button
            onClick={handleClose}
            style={{
              padding: '8px 16px',
              borderRadius: 10,
              border: '1px solid var(--border)',
              background: 'var(--link-bg)',
              color: 'var(--text-primary)',
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            취소
          </button>
          <button
            onClick={handleConfirm}
            style={{
              padding: '8px 16px',
              borderRadius: 10,
              border: 'none',
              background: 'var(--accent)',
              color: '#fff',
              fontSize: 13,
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            확인
          </button>
        </div>
      </div>
    </div>
  )
}
