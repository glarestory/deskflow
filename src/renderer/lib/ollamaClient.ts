/**
 * @MX:NOTE [AUTO] Ollama HTTP 클라이언트 — localhost:11434 health/embed 호출 단일 진입점
 * @MX:SPEC SPEC-SEARCH-RAG-001
 */

/**
 * Ollama 서버 기본 URL.
 * 환경변수 VITE_OLLAMA_URL로 재정의 가능 (개발/테스트용).
 */
export const OLLAMA_BASE_URL: string =
  (typeof import.meta !== 'undefined' &&
    (import.meta as { env?: Record<string, string> }).env?.VITE_OLLAMA_URL) ||
  'http://localhost:11434'

/**
 * Ollama API 통신 오류를 나타내는 커스텀 에러 클래스.
 *
 * code 값:
 * - 'TIMEOUT'       : AbortController 타임아웃
 * - 'HTTP_ERROR'    : 4xx / 5xx HTTP 상태 코드
 * - 'NETWORK_ERROR' : 네트워크 연결 실패
 * - 'PARSE_ERROR'   : 응답 파싱 실패 (예: embedding 필드 누락)
 */
export class OllamaError extends Error {
  code: string

  constructor(message: string, code: string) {
    super(message)
    this.name = 'OllamaError'
    this.code = code
  }
}

/**
 * Ollama 서버 health check.
 * GET /api/tags에 2초 타임아웃으로 요청하고 200 응답이면 true를 반환한다.
 * 타임아웃, 네트워크 오류, 비-200 응답 모두 false를 반환하며 절대 throw하지 않는다.
 */
export async function checkHealth(): Promise<boolean> {
  const controller = new AbortController()
  const timerId = setTimeout(() => controller.abort(), 2000)

  try {
    const res = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
      signal: controller.signal,
    })
    return res.status === 200
  } catch {
    return false
  } finally {
    clearTimeout(timerId)
  }
}

/**
 * 설치된 Ollama 모델 목록을 반환한다.
 * GET /api/tags 응답에서 models[].name 배열을 추출한다.
 *
 * @throws {OllamaError} HTTP 오류 또는 네트워크 오류 시
 */
export async function listModels(): Promise<string[]> {
  let res: Response

  try {
    res = await fetch(`${OLLAMA_BASE_URL}/api/tags`)
  } catch (err) {
    const isAbort =
      err instanceof DOMException && err.name === 'AbortError'
    throw new OllamaError(
      isAbort ? 'Ollama 요청 타임아웃' : `네트워크 오류: ${String(err)}`,
      isAbort ? 'TIMEOUT' : 'NETWORK_ERROR',
    )
  }

  if (!res.ok) {
    throw new OllamaError(
      `Ollama HTTP 오류: ${res.status}`,
      'HTTP_ERROR',
    )
  }

  const data = (await res.json()) as { models: Array<{ name: string }> }
  return data.models.map((m) => m.name)
}

/**
 * 텍스트를 Ollama 임베딩 벡터로 변환한다.
 * POST /api/embeddings에 5초 타임아웃으로 요청한다.
 *
 * @param text  - 임베딩할 텍스트
 * @param model - 사용할 모델 (기본값: 'nomic-embed-text')
 * @returns float 배열 (nomic-embed-text 기준 384차원)
 * @throws {OllamaError} 타임아웃, HTTP 오류, 네트워크 오류, 파싱 실패 시
 */
export async function embed(
  text: string,
  model: string = 'nomic-embed-text',
): Promise<number[]> {
  const controller = new AbortController()
  const timerId = setTimeout(() => controller.abort(), 5000)

  let res: Response

  try {
    res = await fetch(`${OLLAMA_BASE_URL}/api/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, prompt: text }),
      signal: controller.signal,
    })
  } catch (err) {
    const isAbort =
      err instanceof DOMException && err.name === 'AbortError'
    throw new OllamaError(
      isAbort ? 'Ollama embed 타임아웃 (5초)' : `네트워크 오류: ${String(err)}`,
      isAbort ? 'TIMEOUT' : 'NETWORK_ERROR',
    )
  } finally {
    // 타임아웃 타이머는 fetch 완료 또는 오류 시 항상 해제
    clearTimeout(timerId)
  }

  if (!res.ok) {
    throw new OllamaError(
      `Ollama embed HTTP 오류: ${res.status}`,
      'HTTP_ERROR',
    )
  }

  const data = (await res.json()) as { embedding?: number[] }

  if (!Array.isArray(data.embedding)) {
    throw new OllamaError(
      '응답에 embedding 필드가 없음',
      'PARSE_ERROR',
    )
  }

  return data.embedding
}
