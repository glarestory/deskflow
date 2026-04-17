// @MX:SPEC: SPEC-UX-002
// fuzzyMatch 라이브러리 단위 테스트 — subsequence 매칭 알고리즘 검증
import { describe, it, expect } from 'vitest'
import { fuzzyMatch } from './fuzzyMatch'

describe('fuzzyMatch', () => {
  // --- 기본 매칭 ---

  it('완전히 일치하는 문자열은 매칭된다', () => {
    const result = fuzzyMatch('github', 'github')
    expect(result).not.toBeNull()
    expect(result!.score).toBeGreaterThan(0)
  })

  it('빈 쿼리는 빈 ranges와 함께 매칭된다', () => {
    const result = fuzzyMatch('', 'GitHub')
    expect(result).not.toBeNull()
    expect(result!.ranges).toEqual([])
  })

  it('빈 후보 문자열에 비어있지 않은 쿼리는 매칭되지 않는다', () => {
    const result = fuzzyMatch('abc', '')
    expect(result).toBeNull()
  })

  it('subsequence 매칭 — "cha"는 "ChatGPT"에 매칭된다', () => {
    const result = fuzzyMatch('cha', 'ChatGPT')
    expect(result).not.toBeNull()
    expect(result!.ranges).toEqual([[0, 3]])
  })

  it('subsequence 매칭 — "ge"는 "GitHub Engineer"에 비연속 매칭된다', () => {
    const result = fuzzyMatch('ge', 'GitHub Engineer')
    expect(result).not.toBeNull()
    // 비연속 범위: 'G'(0,1) 와 'e'(8,9) 또는 유사한 위치
    expect(result!.ranges.length).toBeGreaterThan(0)
  })

  it('매칭 안되는 쿼리는 null 반환', () => {
    const result = fuzzyMatch('xyz', 'ChatGPT')
    expect(result).toBeNull()
  })

  it('쿼리가 후보보다 긴 경우 null 반환', () => {
    const result = fuzzyMatch('verylongquery', 'short')
    expect(result).toBeNull()
  })

  // --- 대소문자 무시 ---

  it('대소문자 무시 매칭 — "AI"는 "ai 도구"에 매칭된다', () => {
    const result = fuzzyMatch('AI', 'ai 도구')
    expect(result).not.toBeNull()
  })

  it('대소문자 무시 매칭 — "ai"는 "AI 도구"에 매칭된다', () => {
    const result = fuzzyMatch('ai', 'AI 도구')
    expect(result).not.toBeNull()
    expect(result!.ranges).toEqual([[0, 2]])
  })

  it('대소문자 무시 매칭 — "chat"은 "ChatGPT"에 매칭된다', () => {
    const result = fuzzyMatch('chat', 'ChatGPT')
    expect(result).not.toBeNull()
    expect(result!.ranges).toEqual([[0, 4]])
  })

  // --- 범위(ranges) 검증 ---

  it('연속 매칭 시 단일 범위로 병합된다', () => {
    const result = fuzzyMatch('abc', 'xabcy')
    expect(result).not.toBeNull()
    expect(result!.ranges).toEqual([[1, 4]])
  })

  it('비연속 매칭 시 여러 범위로 분리된다', () => {
    // "ac"는 "abcd"에서 비연속: a(0), c(2)
    const result = fuzzyMatch('ac', 'abcd')
    expect(result).not.toBeNull()
    expect(result!.ranges.length).toBeGreaterThan(1)
  })

  it('범위는 [start, end) 형식 — start <= end', () => {
    const result = fuzzyMatch('gh', 'GitHub')
    expect(result).not.toBeNull()
    for (const [start, end] of result!.ranges) {
      expect(start).toBeLessThanOrEqual(end)
    }
  })

  // --- 점수 가중치 ---

  it('접두사 매칭은 높은 점수를 받는다', () => {
    const prefixMatch = fuzzyMatch('git', 'GitHub')
    const nonPrefixMatch = fuzzyMatch('hub', 'GitHub')
    expect(prefixMatch).not.toBeNull()
    expect(nonPrefixMatch).not.toBeNull()
    expect(prefixMatch!.score).toBeGreaterThan(nonPrefixMatch!.score)
  })

  it('연속 문자 매칭은 비연속보다 높은 점수를 받는다', () => {
    // "abc"가 "abcdef"에서 연속 매칭 vs "aXbXc" 패턴에서 비연속 매칭
    const consecutive = fuzzyMatch('abc', 'abcdef')
    const nonConsecutive = fuzzyMatch('abc', 'aXbXc')
    expect(consecutive).not.toBeNull()
    expect(nonConsecutive).not.toBeNull()
    expect(consecutive!.score).toBeGreaterThan(nonConsecutive!.score)
  })

  it('단어 경계 매칭은 더 높은 점수를 받는다', () => {
    // "git" 이 "GitHub" 시작에서 매칭 vs "git" 이 "xyzgit"에서 매칭
    const wordBoundary = fuzzyMatch('git', 'GitHub')
    const nonBoundary = fuzzyMatch('git', 'xyzgit')
    expect(wordBoundary).not.toBeNull()
    expect(nonBoundary).not.toBeNull()
    expect(wordBoundary!.score).toBeGreaterThan(nonBoundary!.score)
  })

  it('완전 일치는 부분 매칭보다 높은 점수', () => {
    const exact = fuzzyMatch('github', 'github')
    const partial = fuzzyMatch('github', 'github extra long string')
    expect(exact).not.toBeNull()
    expect(partial).not.toBeNull()
    expect(exact!.score).toBeGreaterThan(partial!.score)
  })

  // --- 한글 지원 ---

  it('한글 문자열도 매칭된다', () => {
    const result = fuzzyMatch('도구', 'AI 도구 모음')
    expect(result).not.toBeNull()
    expect(result!.ranges.length).toBeGreaterThan(0)
  })

  it('한글 단일 자모는 매칭 없음 또는 오류 없이 처리된다', () => {
    // EDGE-001: 한글 자모 분리 입력은 오류 없이 처리
    expect(() => fuzzyMatch('ㅈ', '잠금화면')).not.toThrow()
  })

  // --- 반환 타입 ---

  it('FuzzyMatchResult는 score와 ranges를 포함한다', () => {
    const result = fuzzyMatch('git', 'GitHub')
    expect(result).not.toBeNull()
    expect(typeof result!.score).toBe('number')
    expect(Array.isArray(result!.ranges)).toBe(true)
  })

  it('score는 0 이상 1 이하의 값을 가진다', () => {
    const result = fuzzyMatch('git', 'GitHub')
    expect(result).not.toBeNull()
    expect(result!.score).toBeGreaterThanOrEqual(0)
    expect(result!.score).toBeLessThanOrEqual(1)
  })
})
