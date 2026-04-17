// @MX:NOTE: [AUTO] SearchInput — debounce 100ms로 viewStore.searchQuery를 갱신하는 입력 컴포넌트
// @MX:SPEC: SPEC-UX-003
import { useEffect, useRef, useState } from 'react'
import { useViewStore } from '../../stores/viewStore'

interface SearchInputProps {
  /** 외부에서 포커스를 요청할 때 사용하는 ref (useHotkeys / 키 ) */
  inputRef?: React.RefObject<HTMLInputElement | null>
}

/**
 * 현재 컨텍스트 내 검색어 입력창.
 * REQ-004: 메인 영역 상단에 항상 표시
 * AC-005: debounce 100ms 후 setSearchQuery 호출
 */
export function SearchInput({ inputRef }: SearchInputProps): JSX.Element {
  const { searchQuery, setSearchQuery } = useViewStore()
  const [localValue, setLocalValue] = useState(searchQuery)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 외부 searchQuery 변경(컨텍스트 전환)에 동기화
  useEffect(() => {
    setLocalValue(searchQuery)
  }, [searchQuery])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const val = e.target.value
    setLocalValue(val)

    // debounce 100ms
    if (timerRef.current !== null) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      setSearchQuery(val)
    }, 100)
  }

  return (
    <input
      ref={inputRef as React.RefObject<HTMLInputElement>}
      data-testid="search-input"
      type="search"
      value={localValue}
      onChange={handleChange}
      placeholder="북마크 검색..."
      aria-label="북마크 검색"
      style={{
        width: '100%',
        padding: '8px 12px',
        borderRadius: 8,
        border: '1px solid var(--border)',
        background: 'var(--link-bg)',
        color: 'var(--text-primary)',
        fontSize: 13,
        outline: 'none',
        boxSizing: 'border-box',
      }}
    />
  )
}

export default SearchInput
