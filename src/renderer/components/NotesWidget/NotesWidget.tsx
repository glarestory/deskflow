// @MX:NOTE: [AUTO] NotesWidget — 600ms 디바운스 자동 저장, 마운트 시 로드, 언마운트 시 cleanup
// @MX:SPEC: SPEC-UI-001
import { useState, useEffect, useRef } from 'react'
import { storage } from '../../lib/storage'

export default function NotesWidget(): JSX.Element {
  const [notes, setNotes] = useState('')
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    storage.get('hub-notes').then((result) => {
      if (result.value !== null) {
        setNotes(result.value)
      }
    })

    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current)
      }
    }
  }, [])

  const handleChange = (val: string) => {
    setNotes(val)
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current)
    }
    timerRef.current = setTimeout(() => {
      void storage.set('hub-notes', val)
    }, 600)
  }

  return (
    <div
      style={{
        background: 'var(--card-bg)',
        borderRadius: 16,
        padding: '18px 20px',
        border: '1px solid var(--border)',
      }}
    >
      <div
        style={{
          fontWeight: 700,
          fontSize: 15,
          color: 'var(--text-primary)',
          marginBottom: 14,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <span>빠른 메모</span>
      </div>
      <textarea
        value={notes}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="여기에 메모를 작성하세요..."
        style={{
          width: '100%',
          minHeight: 200,
          padding: 12,
          borderRadius: 10,
          border: '1px solid var(--border)',
          background: 'var(--link-bg)',
          color: 'var(--text-primary)',
          fontSize: 13,
          outline: 'none',
          resize: 'vertical',
          lineHeight: 1.7,
          boxSizing: 'border-box',
        }}
      />
    </div>
  )
}
