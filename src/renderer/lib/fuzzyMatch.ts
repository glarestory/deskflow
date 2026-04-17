// @MX:ANCHOR: [AUTO] fuzzyMatch — SPEC-UX-002 전역 검색의 핵심 subsequence 매칭 함수
// @MX:REASON: [AUTO] searchAll, CommandPalette, ResultItem 등 다수 모듈이 의존하는 공개 API
// @MX:SPEC: SPEC-UX-002

/**
 * fuzzy 매칭 결과 타입.
 * score: 0~1 사이 값 (1에 가까울수록 더 좋은 매칭)
 * ranges: 매칭된 문자의 [start, end) 범위 배열 (highlight 렌더링에 사용)
 */
export interface FuzzyMatchResult {
  score: number
  ranges: [number, number][]
}

/**
 * subsequence 기반 fuzzy 매칭.
 * 쿼리의 모든 문자가 후보 문자열에 순서대로 존재하면 매칭 성공.
 * 점수 가중치: 접두사 매칭 > 단어 경계 매칭 > 연속 매칭 > 일반 매칭
 *
 * @param query - 검색어
 * @param candidate - 검색 대상 문자열
 * @returns 매칭 결과 또는 null (매칭 실패)
 */
export function fuzzyMatch(query: string, candidate: string): FuzzyMatchResult | null {
  // 빈 쿼리는 항상 매칭 (빈 ranges 반환)
  if (query.length === 0) {
    return { score: 0, ranges: [] }
  }

  // 후보가 비어있으면 매칭 실패
  if (candidate.length === 0) {
    return null
  }

  const queryLower = query.toLowerCase()
  const candidateLower = candidate.toLowerCase()

  // subsequence 매칭 수행 — 매칭 위치 수집
  const matchPositions: number[] = []
  let candidateIdx = 0

  for (let qi = 0; qi < queryLower.length; qi++) {
    // 현재 쿼리 문자와 일치하는 위치를 후보에서 찾음
    let found = false
    while (candidateIdx < candidateLower.length) {
      if (candidateLower[candidateIdx] === queryLower[qi]) {
        matchPositions.push(candidateIdx)
        candidateIdx++
        found = true
        break
      }
      candidateIdx++
    }
    // 일치하는 문자를 찾지 못하면 매칭 실패
    if (!found) return null
  }

  // 연속 범위로 병합: [0,1,2,5,6] -> [[0,3],[5,7]]
  const ranges = buildRanges(matchPositions)

  // 점수 계산
  const score = computeScore(matchPositions, query, candidate)

  return { score, ranges }
}

/**
 * 매칭 위치 배열을 연속 [start, end) 범위 배열로 변환.
 * 예: [0,1,2,5,6] -> [[0,3],[5,7]]
 */
function buildRanges(positions: number[]): [number, number][] {
  if (positions.length === 0) return []

  const ranges: [number, number][] = []
  let rangeStart = positions[0]
  let prev = positions[0]

  for (let i = 1; i < positions.length; i++) {
    if (positions[i] === prev + 1) {
      // 연속 위치 — 현재 범위 연장
      prev = positions[i]
    } else {
      // 비연속 — 이전 범위 닫고 새 범위 시작
      ranges.push([rangeStart, prev + 1])
      rangeStart = positions[i]
      prev = positions[i]
    }
  }
  // 마지막 범위 추가
  ranges.push([rangeStart, prev + 1])

  return ranges
}

/**
 * 매칭 점수 계산.
 * 가중치 요소:
 * 1. 접두사 매칭 보너스 (+0.3)
 * 2. 단어 경계 매칭 보너스 (평균 +0.2)
 * 3. 연속 문자 비율 보너스
 * 4. 완전 일치 길이 보너스
 */
function computeScore(positions: number[], query: string, candidate: string): number {
  if (positions.length === 0) return 0

  let score = 0
  const candidateLower = candidate.toLowerCase()

  // 기본 점수: 쿼리 길이 / 후보 길이 비율
  const coverageScore = query.length / candidate.length
  score += coverageScore * 0.3

  // 접두사 매칭 보너스: 첫 매칭 위치가 0인 경우
  if (positions[0] === 0) {
    score += 0.35
  }

  // 단어 경계 보너스: 각 매칭 위치가 단어 시작에 있는 경우
  let boundaryBonus = 0
  for (const pos of positions) {
    if (isWordBoundary(candidateLower, pos)) {
      boundaryBonus += 0.2 / positions.length
    }
  }
  score += boundaryBonus

  // 연속 문자 비율 보너스
  let consecutiveCount = 0
  for (let i = 1; i < positions.length; i++) {
    if (positions[i] === positions[i - 1] + 1) {
      consecutiveCount++
    }
  }
  const consecutiveRatio = positions.length > 1 ? consecutiveCount / (positions.length - 1) : 1
  score += consecutiveRatio * 0.2

  // 완전 일치 보너스
  if (query.length === candidate.length) {
    score += 0.15
  }

  // 0~1 범위로 정규화
  return Math.min(1, Math.max(0, score))
}

/**
 * 주어진 위치가 단어 경계인지 확인.
 * 단어 경계: 문자열 시작, 공백/특수문자 다음 위치, 대문자로 시작하는 위치(camelCase)
 */
function isWordBoundary(str: string, pos: number): boolean {
  if (pos === 0) return true

  const prev = str[pos - 1]
  // 공백 또는 특수문자 뒤
  if (/[\s\-_./]/.test(prev)) return true

  // camelCase 경계: 이전 문자가 소문자이고 현재 문자가 대문자
  const curr = str[pos]
  if (curr !== undefined && curr >= 'a' && curr <= 'z') {
    const originalPrev = str[pos - 1]
    if (originalPrev !== undefined && originalPrev >= 'A' && originalPrev <= 'Z') {
      return true
    }
  }

  return false
}
