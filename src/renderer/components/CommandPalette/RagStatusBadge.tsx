// @MX:NOTE: [AUTO] SPEC-SEARCH-RAG-001 REQ-003 — 3상태 배지 (ollama 연결 상태)
// @MX:SPEC: SPEC-SEARCH-RAG-001

/** RagStatusBadge props — 테스트 가능성을 위해 props 기반으로 설계 */
export interface RagStatusBadgeProps {
  /** Ollama 서버 연결 가능 여부 */
  ollamaAvailable: boolean
  /** nomic-embed-text 모델 누락 여부 (true = 모델 없음) */
  modelMissing: boolean
  /** 재시도 버튼 핸들러 — checkHealth() 호출 */
  onRetry: () => void
}

/** 유사도 점수를 2자리 소수점 문자열로 포맷 */
export function formatScore(n: number): string {
  return n.toFixed(2)
}

/**
 * RAG 상태 배지 — 3가지 상태를 시각적으로 표시.
 *
 * 상태 1: 녹색 "RAG 준비됨"    — ollamaAvailable && !modelMissing
 * 상태 2: 노랑 "모델 누락"     — ollamaAvailable && modelMissing
 * 상태 3: 빨강 "Ollama 미탐지" — !ollamaAvailable
 */
export default function RagStatusBadge({
  ollamaAvailable,
  modelMissing,
  onRetry,
}: RagStatusBadgeProps) {
  // 녹색: 준비됨
  if (ollamaAvailable && !modelMissing) {
    return (
      <div
        role="status"
        aria-live="polite"
        aria-label="RAG 상태: 준비됨"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '2px 8px',
          borderRadius: '999px',
          backgroundColor: '#dcfce7',
          color: '#15803d',
          fontSize: '11px',
          fontWeight: 600,
        }}
      >
        <span aria-hidden="true">●</span>
        RAG 준비됨
      </div>
    )
  }

  // 노랑: 모델 누락
  if (ollamaAvailable && modelMissing) {
    const command = 'ollama pull nomic-embed-text'

    const handleCopy = (): void => {
      navigator.clipboard.writeText(command).catch(() => {
        // clipboard API 미지원 환경에서는 조용히 무시
      })
    }

    return (
      <div
        role="status"
        aria-live="polite"
        aria-label="RAG 상태: 모델 누락"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '2px 8px',
          borderRadius: '999px',
          backgroundColor: '#fef3c7',
          color: '#92400e',
          fontSize: '11px',
          fontWeight: 600,
          flexWrap: 'wrap',
        }}
      >
        <span aria-hidden="true">⚠</span>
        모델 누락
        <code
          style={{
            fontSize: '10px',
            backgroundColor: 'rgba(0,0,0,0.08)',
            padding: '1px 4px',
            borderRadius: '3px',
          }}
        >
          {command}
        </code>
        <button
          type="button"
          onClick={handleCopy}
          aria-label="명령어 복사"
          style={{
            border: 'none',
            background: 'rgba(0,0,0,0.12)',
            borderRadius: '3px',
            cursor: 'pointer',
            padding: '1px 5px',
            fontSize: '10px',
            color: 'inherit',
          }}
        >
          복사
        </button>
      </div>
    )
  }

  // 빨강: Ollama 미탐지
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="RAG 상태: Ollama 미탐지"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '2px 8px',
        borderRadius: '999px',
        backgroundColor: '#fee2e2',
        color: '#991b1b',
        fontSize: '11px',
        fontWeight: 600,
      }}
    >
      <span aria-hidden="true">✕</span>
      Ollama 미탐지
      <a
        href="https://ollama.com"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Ollama 설치 사이트 열기"
        style={{ color: 'inherit', textDecoration: 'underline' }}
      >
        설치
      </a>
      <button
        type="button"
        onClick={onRetry}
        aria-label="Ollama 연결 재시도"
        style={{
          border: 'none',
          background: 'rgba(0,0,0,0.12)',
          borderRadius: '3px',
          cursor: 'pointer',
          padding: '1px 5px',
          fontSize: '10px',
          color: 'inherit',
        }}
      >
        재시도
      </button>
    </div>
  )
}
