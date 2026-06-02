// @MX:NOTE: [AUTO] NotesWidget — 600ms 디바운스 자동 저장, 마운트 시 로드, 언마운트 시 cleanup
// @MX:SPEC: SPEC-UI-001, SPEC-UX-009
import { useState, useEffect, useRef } from 'react'
import { storage } from '../../lib/storage'
// REQ-UX-009-003: 위젯 핸들 슬롯 컴포넌트
import { DragHandleSlot } from '../common/DragHandleSlot'
import { useEditMode } from '../../stores/editModeStore'

export default function NotesWidget(): JSX.Element {
  // REQ-UX-009-003: 편집 모드 상태 — 핸들 슬롯 tabIndex 제어
  const { isEditing } = useEditMode()
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
        // 위젯이 그리드 셀 높이를 정확히 채우도록 flex 컬럼 구성 (TodoWidget/FeedWidget 패턴).
        // 이전: 높이 미지정 + textarea minHeight:200 → 카드가 셀을 넘쳐 래퍼에 스크롤 발생.
        height: '100%',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        minHeight: 0,
        background: 'var(--card-bg)',
        borderRadius: 16,
        padding: '18px 20px',
        border: '1px solid var(--border)',
      }}
    >
      {/* REQ-UX-007-010: widget-drag-handle 추가
          REQ-UX-009-003: DragHandleSlot level="widget" 추가 (시각 마커) */}
      <div
        className="widget-drag-handle"
        style={{
          fontWeight: 700,
          fontSize: 15,
          color: 'var(--text-primary)',
          marginBottom: 14,
          display: 'flex',
          alignItems: 'center',
          gap: 4,
        }}
      >
        <DragHandleSlot
          level="widget"
          ariaLabel="위젯 이동: 빠른 메모"
          isEditing={isEditing}
        />
        <span>빠른 메모</span>
      </div>
      <textarea
        value={notes}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="여기에 메모를 작성하세요..."
        style={{
          width: '100%',
          // 남은 셀 높이를 정확히 채움 — 고정 minHeight 제거로 불필요한 스크롤 방지.
          // 텍스트가 넘칠 때만 textarea 내부 스크롤이 동작한다.
          flex: 1,
          minHeight: 0,
          padding: 12,
          borderRadius: 10,
          border: '1px solid var(--border)',
          background: 'var(--link-bg)',
          color: 'var(--text-primary)',
          fontSize: 13,
          outline: 'none',
          resize: 'none',
          lineHeight: 1.7,
          boxSizing: 'border-box',
        }}
      />
    </div>
  )
}
