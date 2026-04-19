// @MX:NOTE: [AUTO] ResultItem — 검색 결과 항목 컴포넌트 (5종 variant: bookmark/category/tag/action/rag)
// @MX:SPEC: SPEC-UX-002, SPEC-SEARCH-RAG-001
import type { SearchResult } from '../../lib/searchAll'
import { formatScore } from './RagStatusBadge'

interface ResultItemProps {
  result: SearchResult
  isSelected: boolean
  onSelect: (index: number) => void
  onHover: (index: number) => void
  index: number
}

/**
 * 텍스트에 matchedRanges를 적용하여 highlight 마크업으로 렌더링.
 * 매칭된 부분은 <mark className="result-item-highlight"> 로 감싼다.
 */
function HighlightText({
  text,
  ranges,
}: {
  text: string
  ranges: [number, number][]
}): JSX.Element {
  if (ranges.length === 0) return <span>{text}</span>

  const parts: JSX.Element[] = []
  let lastEnd = 0

  for (const [start, end] of ranges) {
    // 매칭 이전 일반 텍스트
    if (start > lastEnd) {
      parts.push(<span key={`plain-${lastEnd}`}>{text.slice(lastEnd, start)}</span>)
    }
    // 매칭 부분 highlight
    parts.push(
      <mark key={`hl-${start}`} className="result-item-highlight">
        {text.slice(start, end)}
      </mark>,
    )
    lastEnd = end
  }

  // 나머지 일반 텍스트
  if (lastEnd < text.length) {
    parts.push(<span key={`plain-${lastEnd}`}>{text.slice(lastEnd)}</span>)
  }

  return <>{parts}</>
}

/**
 * 검색 결과 단일 항목 렌더링.
 * bookmark / category / tag / action / rag 5종 variant 지원.
 */
export default function ResultItem({
  result,
  isSelected,
  onSelect,
  onHover,
  index,
}: ResultItemProps): JSX.Element {
  const handleMouseDown = (e: React.MouseEvent): void => {
    e.preventDefault()
    if (result.kind === 'action' && result.action.disabled) return
    onSelect(index)
  }

  const handleRagMouseDown = (e: React.MouseEvent): void => {
    e.preventDefault()
    onSelect(index)
  }

  const handleMouseEnter = (): void => {
    onHover(index)
  }

  const isDisabled = result.kind === 'action' && result.action.disabled === true

  const baseClass = [
    'result-item',
    isSelected ? 'result-item--selected' : '',
    isDisabled ? 'result-item--disabled' : '',
  ]
    .filter(Boolean)
    .join(' ')

  // RAG 결과는 별도 mouseDown 핸들러 사용 (disabled 검사 불필요)
  const mouseDownHandler = result.kind === 'rag' ? handleRagMouseDown : handleMouseDown

  return (
    <li
      role="option"
      aria-selected={isSelected}
      aria-disabled={isDisabled || undefined}
      className={baseClass}
      onMouseDown={mouseDownHandler}
      onMouseEnter={handleMouseEnter}
      data-index={index}
    >
      {result.kind === 'bookmark' && (
        <BookmarkVariant result={result} />
      )}
      {result.kind === 'category' && (
        <CategoryVariant result={result} />
      )}
      {result.kind === 'tag' && (
        <TagVariant result={result} />
      )}
      {result.kind === 'action' && (
        <ActionVariant result={result} />
      )}
      {result.kind === 'rag' && (
        <RagVariant result={result} />
      )}
    </li>
  )
}

// --- Variant 컴포넌트들 ---

function BookmarkVariant({
  result,
}: {
  result: Extract<SearchResult, { kind: 'bookmark' }>
}): JSX.Element {
  // favicon placeholder — 도메인 기반 (SPEC-UX-003에서 실제 favicon 로딩 예정)
  const domain = (() => {
    try {
      return new URL(result.link.url).hostname.replace('www.', '')
    } catch {
      return result.link.url
    }
  })()

  return (
    <div className="result-item__content">
      <span className="result-item__icon result-item__icon--favicon">🔖</span>
      <div className="result-item__text">
        <span className="result-item__label">
          <HighlightText text={result.link.name} ranges={result.matchedRanges} />
        </span>
        <span className="result-item__subtext">{domain}</span>
      </div>
      <span className="result-item__badge">북마크</span>
    </div>
  )
}

function CategoryVariant({
  result,
}: {
  result: Extract<SearchResult, { kind: 'category' }>
}): JSX.Element {
  return (
    <div className="result-item__content">
      <span className="result-item__icon">{result.category.icon}</span>
      <div className="result-item__text">
        <span className="result-item__label">
          <HighlightText text={result.category.name} ranges={result.matchedRanges} />
        </span>
      </div>
      <span className="result-item__badge">카테고리</span>
    </div>
  )
}

function TagVariant({
  result,
}: {
  result: Extract<SearchResult, { kind: 'tag' }>
}): JSX.Element {
  return (
    <div className="result-item__content">
      <span className="result-item__icon">#</span>
      <div className="result-item__text">
        <span className="result-item__label">
          <HighlightText text={result.tag} ranges={result.matchedRanges} />
        </span>
      </div>
      <span className="result-item__count">{result.count}</span>
    </div>
  )
}

function ActionVariant({
  result,
}: {
  result: Extract<SearchResult, { kind: 'action' }>
}): JSX.Element {
  return (
    <div className="result-item__content">
      {result.action.icon !== undefined && (
        <span className="result-item__icon">{result.action.icon}</span>
      )}
      <div className="result-item__text">
        <span className="result-item__label">
          <HighlightText text={result.action.label} ranges={result.matchedRanges} />
        </span>
        {result.action.disabled === true && result.action.disabledReason !== undefined && (
          <span className="result-item__disabled-reason">{result.action.disabledReason}</span>
        )}
      </div>
      <span className="result-item__badge">액션</span>
    </div>
  )
}

// @MX:NOTE: [AUTO] SPEC-SEARCH-RAG-001 REQ-012 — RAG 결과 항목 렌더링 (아이콘 · 이름 · 점수 · URL)
function RagVariant({
  result,
}: {
  result: Extract<SearchResult, { kind: 'rag' }>
}): JSX.Element {
  const domain = (() => {
    try {
      return new URL(result.link.url).hostname.replace('www.', '')
    } catch {
      return result.link.url
    }
  })()

  return (
    <div className="result-item__content">
      <span className="result-item__icon" aria-hidden="true">✦</span>
      <div className="result-item__text">
        <span className="result-item__label">{result.link.name}</span>
        <span className="result-item__subtext">{domain}</span>
      </div>
      <span
        className="result-item__badge result-item__badge--score"
        aria-label={`유사도 점수 ${formatScore(result.score)}`}
      >
        {formatScore(result.score)}
      </span>
    </div>
  )
}
