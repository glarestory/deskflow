// @MX:SPEC: SPEC-SEARCH-RAG-001
// RagStatusBadge 컴포넌트 단위 테스트 — AC-004 3가지 상태 검증
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import RagStatusBadge, { formatScore } from './RagStatusBadge'

describe('RagStatusBadge', () => {
  // --- 상태 1: 녹색 "RAG 준비됨" ---

  it('ollamaAvailable=true && modelMissing=false → "RAG 준비됨" 표시', () => {
    render(
      <RagStatusBadge
        ollamaAvailable={true}
        modelMissing={false}
        onRetry={vi.fn()}
      />,
    )
    expect(screen.getByText('RAG 준비됨')).toBeInTheDocument()
  })

  it('녹색 배지는 role="status"를 가진다', () => {
    render(
      <RagStatusBadge
        ollamaAvailable={true}
        modelMissing={false}
        onRetry={vi.fn()}
      />,
    )
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('녹색 배지는 aria-live="polite"를 가진다', () => {
    render(
      <RagStatusBadge
        ollamaAvailable={true}
        modelMissing={false}
        onRetry={vi.fn()}
      />,
    )
    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite')
  })

  // --- 상태 2: 노랑 "모델 누락" ---

  it('ollamaAvailable=true && modelMissing=true → "모델 누락" 표시', () => {
    render(
      <RagStatusBadge
        ollamaAvailable={true}
        modelMissing={true}
        onRetry={vi.fn()}
      />,
    )
    expect(screen.getByText('모델 누락')).toBeInTheDocument()
  })

  it('모델 누락 배지에 ollama pull 명령어가 표시된다', () => {
    render(
      <RagStatusBadge
        ollamaAvailable={true}
        modelMissing={true}
        onRetry={vi.fn()}
      />,
    )
    expect(screen.getByText('ollama pull nomic-embed-text')).toBeInTheDocument()
  })

  it('모델 누락 배지의 "복사" 버튼 클릭 시 navigator.clipboard.writeText가 호출된다', () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { clipboard: { writeText } })

    render(
      <RagStatusBadge
        ollamaAvailable={true}
        modelMissing={true}
        onRetry={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: '명령어 복사' }))
    expect(writeText).toHaveBeenCalledWith('ollama pull nomic-embed-text')
  })

  it('모델 누락 배지의 "복사" 버튼이 접근 가능한 aria-label을 가진다', () => {
    render(
      <RagStatusBadge
        ollamaAvailable={true}
        modelMissing={true}
        onRetry={vi.fn()}
      />,
    )
    expect(screen.getByRole('button', { name: '명령어 복사' })).toBeInTheDocument()
  })

  // --- 상태 3: 빨강 "Ollama 미탐지" ---

  it('ollamaAvailable=false → "Ollama 미탐지" 표시', () => {
    render(
      <RagStatusBadge
        ollamaAvailable={false}
        modelMissing={false}
        onRetry={vi.fn()}
      />,
    )
    expect(screen.getByText('Ollama 미탐지')).toBeInTheDocument()
  })

  it('Ollama 미탐지 배지에 설치 링크가 있다', () => {
    render(
      <RagStatusBadge
        ollamaAvailable={false}
        modelMissing={false}
        onRetry={vi.fn()}
      />,
    )
    const link = screen.getByRole('link', { name: 'Ollama 설치 사이트 열기' })
    expect(link).toHaveAttribute('href', 'https://ollama.com')
    expect(link).toHaveAttribute('target', '_blank')
  })

  it('Ollama 미탐지 배지의 "재시도" 버튼 클릭 시 onRetry가 호출된다', () => {
    const onRetry = vi.fn()
    render(
      <RagStatusBadge
        ollamaAvailable={false}
        modelMissing={false}
        onRetry={onRetry}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Ollama 연결 재시도' }))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('Ollama 미탐지 배지의 "재시도" 버튼이 접근 가능한 aria-label을 가진다', () => {
    render(
      <RagStatusBadge
        ollamaAvailable={false}
        modelMissing={false}
        onRetry={vi.fn()}
      />,
    )
    expect(screen.getByRole('button', { name: 'Ollama 연결 재시도' })).toBeInTheDocument()
  })

  // --- modelMissing=true이지만 ollamaAvailable=false인 경우 ---

  it('ollamaAvailable=false && modelMissing=true → "Ollama 미탐지" 상태 우선', () => {
    render(
      <RagStatusBadge
        ollamaAvailable={false}
        modelMissing={true}
        onRetry={vi.fn()}
      />,
    )
    // ollamaAvailable=false가 우선: "Ollama 미탐지" 표시
    expect(screen.getByText('Ollama 미탐지')).toBeInTheDocument()
    expect(screen.queryByText('모델 누락')).not.toBeInTheDocument()
  })

  // --- aria 접근성 ---

  it('배지 컨테이너에 aria-label이 상태를 설명한다', () => {
    const { rerender } = render(
      <RagStatusBadge ollamaAvailable={true} modelMissing={false} onRetry={vi.fn()} />,
    )
    expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'RAG 상태: 준비됨')

    rerender(<RagStatusBadge ollamaAvailable={true} modelMissing={true} onRetry={vi.fn()} />)
    expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'RAG 상태: 모델 누락')

    rerender(<RagStatusBadge ollamaAvailable={false} modelMissing={false} onRetry={vi.fn()} />)
    expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'RAG 상태: Ollama 미탐지')
  })
})

// --- formatScore 유틸 테스트 ---

describe('formatScore', () => {
  it('0.85 → "0.85"', () => {
    expect(formatScore(0.85)).toBe('0.85')
  })

  it('0.7 → "0.70"', () => {
    expect(formatScore(0.7)).toBe('0.70')
  })

  it('1 → "1.00"', () => {
    expect(formatScore(1)).toBe('1.00')
  })

  it('0.123 → "0.12" (소수점 2자리 반올림)', () => {
    expect(formatScore(0.123)).toBe('0.12')
  })
})

// beforeEach: 각 테스트 후 모킹 초기화
describe('RagStatusBadge clipboard 실패 처리', () => {
  beforeEach(() => {
    // clipboard가 없는 환경 시뮬레이션
    vi.stubGlobal('navigator', {
      clipboard: {
        writeText: vi.fn().mockRejectedValue(new Error('clipboard not supported')),
      },
    })
  })

  it('clipboard writeText 실패 시 예외가 발생하지 않는다', async () => {
    render(
      <RagStatusBadge
        ollamaAvailable={true}
        modelMissing={true}
        onRetry={vi.fn()}
      />,
    )
    // 클릭해도 컴포넌트가 크래시되지 않아야 함
    expect(() => {
      fireEvent.click(screen.getByRole('button', { name: '명령어 복사' }))
    }).not.toThrow()
  })
})
