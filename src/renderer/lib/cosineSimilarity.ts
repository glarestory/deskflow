/**
 * @MX:NOTE [AUTO] 벡터 유사도 계산 — 수치 안정성 주의 (norm 0 체크)
 * @MX:SPEC SPEC-SEARCH-RAG-001
 */

/**
 * 두 벡터 간의 코사인 유사도를 계산한다.
 *
 * 반환값 범위: [-1, 1]
 * - 1.0 : 완전히 같은 방향
 * - 0.0 : 직교
 * - -1.0: 완전히 반대 방향
 *
 * 수치 안정성:
 * - 영벡터(norm = 0)가 입력되면 0을 반환한다 (NaN 방지).
 *   임베딩 벡터는 실제로 영벡터가 되지 않지만 방어적으로 처리한다.
 *
 * @throws {Error} 두 벡터의 길이가 다를 때
 */
export function cosine(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(
      `벡터 길이 불일치: a.length=${a.length}, b.length=${b.length}`,
    )
  }

  let dot = 0
  let normA = 0
  let normB = 0

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }

  // 영벡터 처리 — norm이 0이면 유사도를 0으로 반환
  if (normA === 0 || normB === 0) {
    return 0
  }

  return dot / (Math.sqrt(normA) * Math.sqrt(normB))
}
