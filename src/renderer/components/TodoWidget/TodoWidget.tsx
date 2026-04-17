// @MX:NOTE: [AUTO] TodoWidget — todoStore와 연결된 할 일 목록 위젯 (반복 기능 포함)
// @MX:SPEC: SPEC-TODO-002
import { useState, useEffect } from 'react'
import { useTodoStore } from '../../stores/todoStore'
import RecurrenceModal from '../RecurrenceModal/RecurrenceModal'
import type { Recurrence } from '../../types'

// 삭제 확인 상태 타입
interface DeleteConfirm {
  todoId: string
  seriesId: string | null
}

export default function TodoWidget(): JSX.Element {
  const { todos, addTodo, addRecurringTodo, toggleTodo, removeTodo, deleteTodoSeries, checkAndRegenerateRecurring } =
    useTodoStore()
  const [input, setInput] = useState('')
  const [isRecurrenceOpen, setIsRecurrenceOpen] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirm | null>(null)

  // 앱 마운트 시 반복 할 일 재생성 확인
  useEffect(() => {
    void checkAndRegenerateRecurring()
  }, [checkAndRegenerateRecurring])

  const handleAdd = () => {
    if (!input.trim()) return
    addTodo(input.trim())
    setInput('')
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleAdd()
  }

  // 반복 할 일 추가 모달 확인
  const handleRecurrenceConfirm = (
    text: string,
    recurrence: Omit<Recurrence, 'nextDue' | 'seriesId'>
  ) => {
    addRecurringTodo(text, recurrence)
    setIsRecurrenceOpen(false)
  }

  // 삭제 버튼 클릭 처리
  const handleDeleteClick = (todoId: string, seriesId: string | undefined) => {
    if (seriesId) {
      // 반복 할 일이면 확인 선택지를 보여줌
      setDeleteConfirm({ todoId, seriesId })
    } else {
      removeTodo(todoId)
    }
  }

  // 이 항목만 삭제
  const handleDeleteSingle = () => {
    if (!deleteConfirm) return
    removeTodo(deleteConfirm.todoId)
    setDeleteConfirm(null)
  }

  // 반복 전체 삭제
  const handleDeleteSeries = () => {
    if (!deleteConfirm?.seriesId) return
    deleteTodoSeries(deleteConfirm.seriesId)
    setDeleteConfirm(null)
  }

  const pendingCount = todos.filter((t) => !t.done).length

  return (
    // @MX:NOTE: [AUTO] SPEC-LAYOUT-002 Step 3 — react-grid-layout 아이템의 높이에 반응하도록
    // 루트를 flex 컬럼으로 구성. 내부 리스트는 flex: 1로 늘어나 위젯 리사이즈 시 활용 공간 확대.
    <div
      style={{
        background: 'var(--card-bg)',
        borderRadius: 16,
        padding: '18px 20px',
        border: '1px solid var(--border)',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
      }}
    >
      {/* 헤더 */}
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
        <span>할 일 목록</span>
        <span
          style={{
            fontSize: 12,
            fontWeight: 400,
            color: 'var(--text-muted)',
            marginLeft: 'auto',
          }}
        >
          {pendingCount}개 남음
        </span>
      </div>

      {/* 입력 영역 */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="새 할 일 추가..."
          style={{
            flex: 1,
            padding: '8px 12px',
            borderRadius: 10,
            border: '1px solid var(--border)',
            background: 'var(--link-bg)',
            color: 'var(--text-primary)',
            fontSize: 13,
            outline: 'none',
          }}
        />
        <button
          onClick={handleAdd}
          style={{
            padding: '8px 14px',
            borderRadius: 10,
            border: 'none',
            background: 'var(--accent)',
            color: '#fff',
            fontSize: 13,
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          추가
        </button>
        {/* 반복 할 일 추가 버튼 */}
        <button
          onClick={() => setIsRecurrenceOpen(true)}
          style={{
            padding: '8px 12px',
            borderRadius: 10,
            border: '1px solid var(--border)',
            background: 'var(--link-bg)',
            color: 'var(--text-primary)',
            fontSize: 12,
            cursor: 'pointer',
          }}
        >
          반복 추가
        </button>
      </div>

      {/* 할 일 목록 — 위젯 높이에 반응하여 flex로 늘어남 */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
        }}
      >
        {todos.map((todo) => (
          <div key={todo.id}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '8px 10px',
                borderRadius: 8,
                background: 'var(--link-bg)',
              }}
            >
              {/* 체크박스 */}
              <div
                role="checkbox"
                aria-checked={todo.done}
                onClick={() => toggleTodo(todo.id)}
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 6,
                  border: todo.done ? 'none' : '2px solid var(--border)',
                  background: todo.done ? 'var(--accent)' : 'transparent',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  fontSize: 12,
                  color: '#fff',
                }}
              >
                {todo.done && '✓'}
              </div>

              {/* 텍스트 및 반복 정보 */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  {/* 반복 아이콘 */}
                  {todo.recurrence && (
                    <span
                      title="반복 할 일"
                      style={{ fontSize: 11, opacity: 0.6, flexShrink: 0 }}
                    >
                      🔁
                    </span>
                  )}
                  <span
                    style={{
                      fontSize: 13,
                      color: 'var(--text-primary)',
                      textDecoration: todo.done ? 'line-through' : 'none',
                      opacity: todo.done ? 0.45 : 1,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {todo.text}
                  </span>
                </div>
                {/* 다음 예정일 표시 */}
                {todo.recurrence && (
                  <div
                    style={{
                      fontSize: 11,
                      color: 'var(--text-muted)',
                      marginTop: 2,
                    }}
                  >
                    {todo.recurrence.nextDue}
                  </div>
                )}
              </div>

              {/* 삭제 버튼 */}
              <button
                onClick={() => handleDeleteClick(todo.id, todo.recurrence?.seriesId)}
                aria-label="삭제"
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 12,
                  opacity: 0.3,
                  color: 'var(--text-primary)',
                  padding: 4,
                  flexShrink: 0,
                }}
              >
                ✕
              </button>
            </div>

            {/* 반복 삭제 확인 선택지 */}
            {deleteConfirm?.todoId === todo.id && (
              <div
                style={{
                  display: 'flex',
                  gap: 6,
                  padding: '6px 10px',
                  background: 'var(--link-bg)',
                  borderRadius: '0 0 8px 8px',
                  borderTop: '1px solid var(--border)',
                }}
              >
                <button
                  onClick={handleDeleteSingle}
                  style={{
                    flex: 1,
                    padding: '4px 8px',
                    borderRadius: 6,
                    border: '1px solid var(--border)',
                    background: 'var(--link-bg)',
                    color: 'var(--text-primary)',
                    fontSize: 11,
                    cursor: 'pointer',
                  }}
                >
                  이 항목만
                </button>
                <button
                  onClick={handleDeleteSeries}
                  style={{
                    flex: 1,
                    padding: '4px 8px',
                    borderRadius: 6,
                    border: 'none',
                    background: '#ef4444',
                    color: '#fff',
                    fontSize: 11,
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  반복 전체
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* RecurrenceModal */}
      <RecurrenceModal
        isOpen={isRecurrenceOpen}
        onClose={() => setIsRecurrenceOpen(false)}
        onConfirm={handleRecurrenceConfirm}
      />
    </div>
  )
}
