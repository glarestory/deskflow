// @MX:NOTE: [AUTO] 코사인 유사도 함수 단위 테스트 — 벡터 수학 경계 조건 검증
// @MX:SPEC: SPEC-SEARCH-RAG-001
import { describe, it, expect } from 'vitest'
import { cosine } from './cosineSimilarity'

describe('cosine', () => {
  const EPSILON = 1e-9

  // 동일 벡터 → 1.0
  it('동일한 벡터는 유사도 1.0을 반환한다', () => {
    const v = [1, 2, 3, 4]
    expect(cosine(v, v)).toBeCloseTo(1.0, 10)
  })

  // 직교 벡터 → 0.0
  it('직교 벡터([1,0], [0,1])는 유사도 0.0을 반환한다', () => {
    expect(cosine([1, 0], [0, 1])).toBeCloseTo(0.0, 10)
  })

  // 반대 방향 벡터 → -1.0
  it('반대 방향 벡터([1,0], [-1,0])는 유사도 -1.0을 반환한다', () => {
    expect(cosine([1, 0], [-1, 0])).toBeCloseTo(-1.0, 10)
  })

  // 스케일된 벡터 — 크기와 무관하게 동일한 유사도
  it('스케일이 달라도 같은 방향이면 유사도 1.0이다', () => {
    const a = [1, 2, 3]
    const b = [2, 4, 6] // a × 2
    expect(cosine(a, b)).toBeCloseTo(1.0, 10)
  })

  it('a를 2배 스케일해도 b와의 유사도가 스케일 전과 동일하다', () => {
    const a = [1, 2, 3]
    const b = [4, 5, 6]
    const scoreOriginal = cosine(a, b)
    const scoreScaled = cosine([2, 4, 6], b)
    expect(Math.abs(scoreOriginal - scoreScaled)).toBeLessThan(EPSILON)
  })

  // 길이 불일치 → Error
  it('길이가 다른 벡터는 오류를 던진다', () => {
    expect(() => cosine([1, 2, 3], [1, 2])).toThrowError()
  })

  // 영벡터 → 0 반환 (NaN 방지)
  it('영벡터가 입력되면 0을 반환한다 (NaN 아님)', () => {
    const result = cosine([0, 0, 0], [1, 2, 3])
    expect(result).toBe(0)
    expect(Number.isNaN(result)).toBe(false)
  })

  it('양쪽 모두 영벡터이면 0을 반환한다', () => {
    const result = cosine([0, 0, 0], [0, 0, 0])
    expect(result).toBe(0)
    expect(Number.isNaN(result)).toBe(false)
  })

  // 384차원 현실적 벡터 — 손계산으로 검증 가능한 케이스
  it('384차원 벡터에서도 올바른 유사도를 계산한다', () => {
    // a[i] = (i % 10) / 10, b[i] = a[i] (동일) → 유사도 1.0
    const dim = 384
    const a = Array.from({ length: dim }, (_, i) => (i % 10) / 10 + 0.01)
    const b = [...a]
    expect(cosine(a, b)).toBeCloseTo(1.0, 10)
  })

  it('384차원 직교 벡터 근사는 유사도가 낮다', () => {
    const dim = 384
    // a: 짝수 인덱스에만 1, b: 홀수 인덱스에만 1 → 완전 직교
    const a = Array.from({ length: dim }, (_, i) => (i % 2 === 0 ? 1 : 0))
    const b = Array.from({ length: dim }, (_, i) => (i % 2 === 1 ? 1 : 0))
    expect(cosine(a, b)).toBeCloseTo(0.0, 10)
  })

  // 결과는 항상 [-1, 1] 범위
  it('반환값은 항상 [-1, 1] 범위 안에 있다', () => {
    const a = [3, -1, 2]
    const b = [-2, 4, 1]
    const result = cosine(a, b)
    expect(result).toBeGreaterThanOrEqual(-1)
    expect(result).toBeLessThanOrEqual(1)
  })
})
