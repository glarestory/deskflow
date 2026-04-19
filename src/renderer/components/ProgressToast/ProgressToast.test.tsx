// @MX:SPEC: SPEC-SEARCH-RAG-001
// ProgressToast 컴포넌트 테스트 — TDD RED-GREEN-REFACTOR (Phase 6C)
// AC-013, AC-014: 인덱싱 진행률 Toast

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import '@testing-library/jest-dom'

// ── embeddingStore 모킹 ──────────────────────────────────────────────────────
type EmbeddingStoreSelector = (state: {
  indexingInProgress: boolean
  lastBatchProgress: { done: number; total: number } | null
}) => unknown

let mockState = {
  indexingInProgress: false,
  lastBatchProgress: null as { done: number; total: number } | null,
}

vi.mock('../../stores/embeddingStore', () => ({
  useEmbeddingStore: (selector: EmbeddingStoreSelector) => {
    // selector가 함수로 호출될 경우 현재 상태 반환
    return selector(mockState)
  },
}))

describe('ProgressToast — AC-013, AC-014', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useRealTimers()
    mockState = { indexingInProgress: false, lastBatchProgress: null }
  })

  // 테스트 1: indexingInProgress=true이면 진행 중 텍스트를 렌더링한다 (AC-013)
  it('indexingInProgress=true이면 "{done}/{total} 인덱싱 중..." 텍스트를 렌더링한다 (AC-013)', async () => {
    mockState = {
      indexingInProgress: true,
      lastBatchProgress: { done: 3, total: 10 },
    }
    const { ProgressToast } = await import('./ProgressToast')
    render(<ProgressToast />)

    expect(screen.getByTestId('progress-toast')).toBeInTheDocument()
    expect(screen.getByText(/3\/10 인덱싱 중/)).toBeInTheDocument()
  })

  // 테스트 2: indexingInProgress=false이고 progress가 null이면 렌더링하지 않는다
  it('indexingInProgress=false이고 lastBatchProgress=null이면 렌더링하지 않는다', async () => {
    mockState = { indexingInProgress: false, lastBatchProgress: null }
    const { ProgressToast } = await import('./ProgressToast')
    render(<ProgressToast />)

    expect(screen.queryByTestId('progress-toast')).not.toBeInTheDocument()
  })

  // 테스트 3: done === total이면 완료 텍스트를 표시한다 (AC-014)
  it('인덱싱 완료 후(indexingInProgress=false, progress 있음) "{total}개 인덱스 완료" 텍스트를 표시한다 (AC-014)', async () => {
    mockState = {
      indexingInProgress: false,
      lastBatchProgress: { done: 5, total: 5 },
    }
    const { ProgressToast } = await import('./ProgressToast')
    render(<ProgressToast />)

    expect(screen.getByTestId('progress-toast')).toBeInTheDocument()
    expect(screen.getByText(/5개 인덱스 완료/)).toBeInTheDocument()
  })

  // 테스트 4: 완료 후 3초가 지나면 자동 숨김된다 (AC-014)
  it('완료 후 3초가 지나면 Toast가 사라진다 (AC-014)', async () => {
    vi.useFakeTimers()
    mockState = {
      indexingInProgress: false,
      lastBatchProgress: { done: 5, total: 5 },
    }
    const { ProgressToast } = await import('./ProgressToast')
    render(<ProgressToast />)

    // 처음엔 표시됨
    expect(screen.getByTestId('progress-toast')).toBeInTheDocument()

    // 3초 경과
    act(() => { vi.advanceTimersByTime(3100) })

    // 3초 후 사라짐
    expect(screen.queryByTestId('progress-toast')).not.toBeInTheDocument()
  })
})
