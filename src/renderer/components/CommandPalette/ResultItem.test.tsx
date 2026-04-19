// @MX:SPEC: SPEC-UX-002, SPEC-SEARCH-RAG-001
// ResultItem 컴포넌트 단위 테스트 — 5종 variant 렌더링 검증 (bookmark/category/tag/action/rag)
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import ResultItem from './ResultItem'
import type { SearchResult } from '../../lib/searchAll'

// storage 모킹
vi.stubGlobal('storage', { get: vi.fn(), set: vi.fn() })

const mockBookmarkResult: SearchResult = {
  kind: 'bookmark',
  link: {
    id: 'link-1',
    name: 'GitHub',
    url: 'https://github.com',
    tags: ['dev'],
  },
  categoryId: 'cat-1',
  matchedRanges: [[0, 3]],
  score: 0.9,
}

const mockCategoryResult: SearchResult = {
  kind: 'category',
  category: {
    id: 'cat-1',
    name: 'Dev Tools',
    icon: '⚡',
    links: [],
  },
  matchedRanges: [[0, 3]],
  score: 0.8,
}

const mockTagResult: SearchResult = {
  kind: 'tag',
  tag: 'ai',
  count: 5,
  matchedRanges: [[0, 2]],
  score: 0.7,
}

const mockActionResult: SearchResult = {
  kind: 'action',
  action: {
    id: 'action-toggle-theme',
    label: '테마 전환',
    keywords: ['theme'],
    execute: vi.fn(),
    icon: '🎨',
  },
  matchedRanges: [[0, 2]],
  score: 0.85,
}

describe('ResultItem', () => {
  // --- 북마크 variant ---

  it('bookmark variant: 이름이 렌더링된다', () => {
    render(
      <ResultItem
        result={mockBookmarkResult}
        isSelected={false}
        onSelect={vi.fn()}
        onHover={vi.fn()}
        index={0}
      />,
    )
    // HighlightText가 텍스트를 span/mark로 분할하므로 getAllByText 또는 getByRole 사용
    const item = screen.getByRole('option')
    expect(item.textContent).toContain('GitHub')
  })

  it('bookmark variant: URL이 서브텍스트로 표시된다', () => {
    render(
      <ResultItem
        result={mockBookmarkResult}
        isSelected={false}
        onSelect={vi.fn()}
        onHover={vi.fn()}
        index={0}
      />,
    )
    expect(screen.getByText(/github\.com/)).toBeInTheDocument()
  })

  it('bookmark variant: 선택 시 onSelect가 호출된다', () => {
    const onSelect = vi.fn()
    render(
      <ResultItem
        result={mockBookmarkResult}
        isSelected={false}
        onSelect={onSelect}
        onHover={vi.fn()}
        index={0}
      />,
    )
    fireEvent.mouseDown(screen.getByRole('option'))
    expect(onSelect).toHaveBeenCalledWith(0)
  })

  it('bookmark variant: isSelected=true 시 selected 클래스 적용', () => {
    render(
      <ResultItem
        result={mockBookmarkResult}
        isSelected={true}
        onSelect={vi.fn()}
        onHover={vi.fn()}
        index={0}
      />,
    )
    const item = screen.getByRole('option')
    expect(item).toHaveAttribute('aria-selected', 'true')
  })

  // --- 카테고리 variant ---

  it('category variant: 카테고리 이름이 렌더링된다', () => {
    render(
      <ResultItem
        result={mockCategoryResult}
        isSelected={false}
        onSelect={vi.fn()}
        onHover={vi.fn()}
        index={1}
      />,
    )
    const item = screen.getByRole('option')
    expect(item.textContent).toContain('Dev Tools')
  })

  it('category variant: 아이콘이 표시된다', () => {
    render(
      <ResultItem
        result={mockCategoryResult}
        isSelected={false}
        onSelect={vi.fn()}
        onHover={vi.fn()}
        index={1}
      />,
    )
    expect(screen.getByText('⚡')).toBeInTheDocument()
  })

  // --- 태그 variant ---

  it('tag variant: 태그 이름이 렌더링된다', () => {
    render(
      <ResultItem
        result={mockTagResult}
        isSelected={false}
        onSelect={vi.fn()}
        onHover={vi.fn()}
        index={2}
      />,
    )
    expect(screen.getByText(/ai/)).toBeInTheDocument()
  })

  it('tag variant: count가 표시된다', () => {
    render(
      <ResultItem
        result={mockTagResult}
        isSelected={false}
        onSelect={vi.fn()}
        onHover={vi.fn()}
        index={2}
      />,
    )
    expect(screen.getByText('5')).toBeInTheDocument()
  })

  // --- 액션 variant ---

  it('action variant: 액션 label이 렌더링된다', () => {
    render(
      <ResultItem
        result={mockActionResult}
        isSelected={false}
        onSelect={vi.fn()}
        onHover={vi.fn()}
        index={3}
      />,
    )
    const item = screen.getByRole('option')
    expect(item.textContent).toContain('테마 전환')
  })

  it('action variant: 아이콘이 표시된다', () => {
    render(
      <ResultItem
        result={mockActionResult}
        isSelected={false}
        onSelect={vi.fn()}
        onHover={vi.fn()}
        index={3}
      />,
    )
    expect(screen.getByText('🎨')).toBeInTheDocument()
  })

  // --- highlight ---

  it('matchedRanges에 따라 매칭 부분이 highlight 마크업을 가진다', () => {
    render(
      <ResultItem
        result={mockBookmarkResult}
        isSelected={false}
        onSelect={vi.fn()}
        onHover={vi.fn()}
        index={0}
      />,
    )
    // matchedRanges [[0,3]] → "Git" 부분이 강조되어야 함
    const highlighted = document.querySelector('.result-item-highlight')
    expect(highlighted).toBeInTheDocument()
  })

  // --- 마우스 이벤트 ---

  it('hover 시 onHover가 호출된다', () => {
    const onHover = vi.fn()
    render(
      <ResultItem
        result={mockBookmarkResult}
        isSelected={false}
        onSelect={vi.fn()}
        onHover={onHover}
        index={0}
      />,
    )
    fireEvent.mouseEnter(screen.getByRole('option'))
    expect(onHover).toHaveBeenCalledWith(0)
  })

  // --- ARIA ---

  it('role="option" 속성이 설정된다', () => {
    render(
      <ResultItem
        result={mockBookmarkResult}
        isSelected={false}
        onSelect={vi.fn()}
        onHover={vi.fn()}
        index={0}
      />,
    )
    expect(screen.getByRole('option')).toBeInTheDocument()
  })

  it('비활성 액션은 disabled 표시된다', () => {
    const disabledAction: SearchResult = {
      kind: 'action',
      action: {
        id: 'action-pivot',
        label: '피벗 모드 전환',
        keywords: ['pivot'],
        execute: vi.fn(),
        disabled: true,
        disabledReason: 'SPEC-UX-003 필요',
      },
      matchedRanges: [],
      score: 0.5,
    }
    render(
      <ResultItem
        result={disabledAction}
        isSelected={false}
        onSelect={vi.fn()}
        onHover={vi.fn()}
        index={0}
      />,
    )
    const item = screen.getByRole('option')
    expect(item).toHaveAttribute('aria-disabled', 'true')
  })

  // --- RAG variant (SPEC-SEARCH-RAG-001 REQ-012) ---

  const mockRagResult: SearchResult = {
    kind: 'rag',
    linkId: 'link-rag-1',
    categoryId: 'cat-1',
    score: 0.85,
    link: {
      id: 'link-rag-1',
      name: 'Ollama GitHub',
      url: 'https://github.com/ollama/ollama',
      tags: ['ai', 'llm'],
    },
    matchedRanges: [],
  }

  it('rag variant: 링크 이름이 렌더링된다', () => {
    render(
      <ResultItem
        result={mockRagResult}
        isSelected={false}
        onSelect={vi.fn()}
        onHover={vi.fn()}
        index={4}
      />,
    )
    const item = screen.getByRole('option')
    expect(item.textContent).toContain('Ollama GitHub')
  })

  it('rag variant: URL 도메인이 서브텍스트로 표시된다', () => {
    render(
      <ResultItem
        result={mockRagResult}
        isSelected={false}
        onSelect={vi.fn()}
        onHover={vi.fn()}
        index={4}
      />,
    )
    expect(screen.getByText(/github\.com/)).toBeInTheDocument()
  })

  it('rag variant: 유사도 점수가 2자리 소수점으로 표시된다', () => {
    render(
      <ResultItem
        result={mockRagResult}
        isSelected={false}
        onSelect={vi.fn()}
        onHover={vi.fn()}
        index={4}
      />,
    )
    // score=0.85 → "0.85"
    expect(screen.getByText('0.85')).toBeInTheDocument()
  })

  it('rag variant: 아이콘(✦)이 표시된다', () => {
    render(
      <ResultItem
        result={mockRagResult}
        isSelected={false}
        onSelect={vi.fn()}
        onHover={vi.fn()}
        index={4}
      />,
    )
    expect(screen.getByText('✦')).toBeInTheDocument()
  })

  it('rag variant: role="option" 속성이 설정된다', () => {
    render(
      <ResultItem
        result={mockRagResult}
        isSelected={false}
        onSelect={vi.fn()}
        onHover={vi.fn()}
        index={4}
      />,
    )
    expect(screen.getByRole('option')).toBeInTheDocument()
  })

  it('rag variant: isSelected=true 시 aria-selected="true"', () => {
    render(
      <ResultItem
        result={mockRagResult}
        isSelected={true}
        onSelect={vi.fn()}
        onHover={vi.fn()}
        index={4}
      />,
    )
    expect(screen.getByRole('option')).toHaveAttribute('aria-selected', 'true')
  })

  it('rag variant: 클릭 시 onSelect가 호출된다', () => {
    const onSelect = vi.fn()
    render(
      <ResultItem
        result={mockRagResult}
        isSelected={false}
        onSelect={onSelect}
        onHover={vi.fn()}
        index={4}
      />,
    )
    fireEvent.mouseDown(screen.getByRole('option'))
    expect(onSelect).toHaveBeenCalledWith(4)
  })

  it('rag variant: score badge에 aria-label이 있다', () => {
    render(
      <ResultItem
        result={mockRagResult}
        isSelected={false}
        onSelect={vi.fn()}
        onHover={vi.fn()}
        index={4}
      />,
    )
    const badge = screen.getByLabelText('유사도 점수 0.85')
    expect(badge).toBeInTheDocument()
  })
})
