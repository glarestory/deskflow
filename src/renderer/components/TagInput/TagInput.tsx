// @MX:NOTE: [AUTO] TagInput — 태그 chip 입력/삭제/자동완성 컴포넌트
// @MX:SPEC: SPEC-BOOKMARK-003

import { useState, useRef } from 'react'

/** 태그 최대 길이 */
const MAX_TAG_LENGTH = 20
/** 북마크당 태그 최대 개수 */
const MAX_TAGS = 10

interface TagInputProps {
  /** 현재 태그 배열 */
  tags: string[]
  /** 태그 변경 콜백 */
  onChange: (tags: string[]) => void
  /** 자동완성 제안 목록 (전체 태그 목록에서 전달) */
  suggestions: string[]
}

/**
 * 태그를 정규화한다.
 * - 앞뒤 공백 제거
 * - 소문자 변환
 * - 내부 공백을 하이픈으로 치환
 * - 한글/영문/숫자/하이픈만 허용 (기타 특수문자 제거)
 */
function normalizeTag(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-') // 공백 → 하이픈
    .replace(/[^a-z0-9가-힣ㄱ-ㅎ-]/g, '') // 허용 문자 외 제거
}

export default function TagInput({ tags, onChange, suggestions }: TagInputProps): JSX.Element {
  const [inputValue, setInputValue] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  // 현재 입력값과 매칭되는 제안 목록 (이미 추가된 태그 제외)
  const filteredSuggestions = inputValue.trim()
    ? suggestions.filter(
        (s) =>
          s.includes(inputValue.toLowerCase().trim()) &&
          !tags.includes(s),
      )
    : []

  /** 태그를 추가한다. 유효성 검사 포함 */
  const addTag = (raw: string): void => {
    const normalized = normalizeTag(raw)

    if (!normalized) return // 빈 문자열 무시

    // 최대 길이 초과
    if (normalized.length > MAX_TAG_LENGTH) return

    // 최대 개수 초과
    if (tags.length >= MAX_TAGS) {
      setErrorMessage('최대 10개까지 태그를 추가할 수 있습니다')
      return
    }

    // 중복 무시 (EDGE-003)
    if (tags.includes(normalized)) return

    setErrorMessage('')
    onChange([...tags, normalized])
    setInputValue('')
    setShowSuggestions(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag(inputValue)
    } else if (e.key === 'Backspace' && inputValue === '' && tags.length > 0) {
      // 입력창 비어 있을 때 Backspace → 마지막 태그 제거
      onChange(tags.slice(0, -1))
    }
  }

  const handleRemove = (tag: string): void => {
    onChange(tags.filter((t) => t !== tag))
  }

  const handleSuggestionClick = (suggestion: string): void => {
    addTag(suggestion)
    inputRef.current?.focus()
  }

  const chipStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    padding: '2px 8px',
    borderRadius: 12,
    background: 'var(--accent)',
    color: '#fff',
    fontSize: 12,
    fontWeight: 500,
    cursor: 'default',
  }

  const removeButtonStyle: React.CSSProperties = {
    background: 'none',
    border: 'none',
    color: '#fff',
    cursor: 'pointer',
    padding: '0 2px',
    fontSize: 12,
    lineHeight: 1,
    opacity: 0.8,
  }

  return (
    <div style={{ position: 'relative' }}>
      {/* 태그 chip + 입력창 컨테이너 */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 6,
          padding: '6px 10px',
          borderRadius: 8,
          border: '1px solid var(--border)',
          background: 'var(--link-bg)',
          minHeight: 36,
          cursor: 'text',
        }}
        onClick={() => inputRef.current?.focus()}
      >
        {/* 기존 태그 chip 표시 */}
        {tags.map((tag) => (
          <span key={tag} style={chipStyle}>
            {tag}
            <button
              aria-label={`${tag} 태그 제거`}
              onClick={(e) => {
                e.stopPropagation()
                handleRemove(tag)
              }}
              style={removeButtonStyle}
            >
              ×
            </button>
          </span>
        ))}

        {/* 입력창 */}
        <input
          ref={inputRef}
          type="text"
          placeholder="태그 입력..."
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value)
            setErrorMessage('')
            setShowSuggestions(true)
          }}
          onKeyDown={handleKeyDown}
          onBlur={() => {
            // 약간의 딜레이로 suggestion 클릭 허용
            setTimeout(() => setShowSuggestions(false), 150)
          }}
          style={{
            flex: 1,
            minWidth: 80,
            border: 'none',
            outline: 'none',
            background: 'transparent',
            color: 'var(--text-primary)',
            fontSize: 13,
            padding: '0 2px',
          }}
        />
      </div>

      {/* 오류 메시지 (최대 개수 초과 등) */}
      {errorMessage && (
        <div style={{ fontSize: 11, color: '#e05c5c', marginTop: 4 }}>{errorMessage}</div>
      )}

      {/* 자동완성 드롭다운 */}
      {showSuggestions && filteredSuggestions.length > 0 && (
        <ul
          role="listbox"
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            background: 'var(--card-bg)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            marginTop: 4,
            padding: 4,
            listStyle: 'none',
            zIndex: 100,
            maxHeight: 160,
            overflowY: 'auto',
          }}
        >
          {filteredSuggestions.map((suggestion) => (
            <li
              key={suggestion}
              role="option"
              aria-selected={false}
              onClick={() => handleSuggestionClick(suggestion)}
              style={{
                padding: '6px 10px',
                cursor: 'pointer',
                borderRadius: 6,
                fontSize: 13,
                color: 'var(--text-primary)',
              }}
              onMouseEnter={(e) => {
                ;(e.currentTarget as HTMLLIElement).style.background = 'var(--link-hover)'
              }}
              onMouseLeave={(e) => {
                ;(e.currentTarget as HTMLLIElement).style.background = 'transparent'
              }}
            >
              {suggestion}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
