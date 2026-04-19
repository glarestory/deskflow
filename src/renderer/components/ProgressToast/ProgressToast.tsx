// @MX:NOTE: [AUTO] SPEC-SEARCH-RAG-001 AC-013 AC-014 — 인덱싱 진행률 Toast
// 인덱싱 진행 중: "{done}/{total} 인덱싱 중..." 표시
// 인덱싱 완료 후 3초: "{total}개 인덱스 완료" 후 자동 숨김
// @MX:SPEC: SPEC-SEARCH-RAG-001

import { useEffect, useState } from 'react'
import { useEmbeddingStore } from '../../stores/embeddingStore'

/**
 * 북마크 임베딩 인덱싱 진행률 Toast.
 * AC-013: 인덱싱 진행 중 진행률 표시
 * AC-014: 인덱싱 완료 후 3초간 완료 메시지 표시 후 자동 숨김
 */
export function ProgressToast() {
  const indexingInProgress = useEmbeddingStore((s) => s.indexingInProgress)
  const lastBatchProgress = useEmbeddingStore((s) => s.lastBatchProgress)

  // 완료 후 자동 숨김을 위한 가시성 상태
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (indexingInProgress) {
      // 진행 중이면 표시
      setVisible(true)
      return undefined
    }

    if (lastBatchProgress !== null) {
      // 완료 상태: 3초 후 자동 숨김
      setVisible(true)
      const timer = setTimeout(() => {
        setVisible(false)
      }, 3000)
      return () => { clearTimeout(timer) }
    }

    return undefined
  }, [indexingInProgress, lastBatchProgress])

  // 표시 조건 확인
  if (!visible) return null
  if (!indexingInProgress && lastBatchProgress === null) return null

  // 진행 중 텍스트
  const progressText = indexingInProgress && lastBatchProgress !== null
    ? `${lastBatchProgress.done}/${lastBatchProgress.total} 인덱싱 중...`
    : indexingInProgress
      ? '인덱싱 중...'
      : lastBatchProgress !== null
        ? `${lastBatchProgress.total}개 인덱스 완료`
        : null

  if (progressText === null) return null

  return (
    <div
      data-testid="progress-toast"
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        background: 'var(--card-bg, #1e2030)',
        border: '1px solid var(--border, #2a2d3e)',
        borderRadius: 10,
        padding: '10px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        zIndex: 9998,
        boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
        fontSize: 12,
        color: 'var(--text-primary, #e0e4f0)',
      }}
    >
      {/* 진행 중 애니메이션 인디케이터 */}
      {indexingInProgress && (
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: 'var(--accent, #7b8cde)',
            display: 'inline-block',
            animation: 'pulse 1s infinite',
          }}
        />
      )}
      <span>{progressText}</span>
    </div>
  )
}

export default ProgressToast
