// @MX:NOTE: [AUTO] SearchBar 위젯 — Google 검색 창, 빈 검색어 무시
// @MX:SPEC: SPEC-UI-001
import { useState } from 'react'

export default function SearchBar(): JSX.Element {
  const [query, setQuery] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return
    window.open(`https://www.google.com/search?q=${encodeURIComponent(query)}`, '_blank')
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        display: 'flex',
        alignItems: 'center',
        background: 'var(--card-bg)',
        border: '1.5px solid var(--border)',
        borderRadius: 14,
        padding: '0 16px',
        height: 48,
        maxWidth: 560,
        margin: '0 auto',
        transition: 'border-color .2s',
      }}
    >
      <span style={{ fontSize: 18, marginRight: 10, opacity: 0.45 }}>🔍</span>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Google에서 검색..."
        style={{
          flex: 1,
          background: 'transparent',
          border: 'none',
          outline: 'none',
          fontSize: 15,
          color: 'var(--text-primary)',
        }}
      />
      <button type="submit" style={{ display: 'none' }}>
        검색
      </button>
    </form>
  )
}
