// @MX:NOTE: [AUTO] TodoWidget — todoStore와 연결된 할 일 목록 위젯
// @MX:SPEC: SPEC-UI-001
import { useState } from 'react'
import { useTodoStore } from '../../stores/todoStore'

export default function TodoWidget(): JSX.Element {
  const { todos, addTodo, toggleTodo, removeTodo } = useTodoStore()
  const [input, setInput] = useState('')

  const handleAdd = () => {
    if (!input.trim()) return
    addTodo(input.trim())
    setInput('')
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleAdd()
  }

  const pendingCount = todos.filter((t) => !t.done).length

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
      </div>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          maxHeight: 220,
          overflowY: 'auto',
        }}
      >
        {todos.map((todo) => (
          <div
            key={todo.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '8px 10px',
              borderRadius: 8,
              background: 'var(--link-bg)',
            }}
          >
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
            <span
              style={{
                flex: 1,
                fontSize: 13,
                color: 'var(--text-primary)',
                textDecoration: todo.done ? 'line-through' : 'none',
                opacity: todo.done ? 0.45 : 1,
              }}
            >
              {todo.text}
            </span>
            <button
              onClick={() => removeTodo(todo.id)}
              aria-label="삭제"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: 12,
                opacity: 0.3,
                color: 'var(--text-primary)',
                padding: 4,
              }}
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
