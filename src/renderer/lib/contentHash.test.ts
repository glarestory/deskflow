// @MX:NOTE: [AUTO] SHA-256 해시 계산 단위 테스트 — Web Crypto API 검증
// @MX:SPEC: SPEC-SEARCH-RAG-001
import { describe, it, expect } from 'vitest'
import { sha256 } from './contentHash'

describe('sha256', () => {
  // 빈 문자열의 SHA-256 해시 (공개된 표준값)
  const EMPTY_SHA256 =
    'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'

  it('빈 문자열은 고정 SHA-256 해시를 반환한다', async () => {
    const result = await sha256('')
    expect(result).toBe(EMPTY_SHA256)
  })

  it('반환값은 항상 64자 소문자 16진수 문자열이다', async () => {
    const result = await sha256('hello world')
    expect(result).toHaveLength(64)
    expect(result).toMatch(/^[0-9a-f]{64}$/)
  })

  it('동일한 입력은 항상 동일한 해시를 반환한다 (결정적)', async () => {
    const text = 'React Docs\nURL: https://react.dev\n태그: react, docs\n설명: '
    const h1 = await sha256(text)
    const h2 = await sha256(text)
    expect(h1).toBe(h2)
  })

  it('1문자 차이는 완전히 다른 해시를 생성한다', async () => {
    const h1 = await sha256('hello')
    const h2 = await sha256('hellx')
    expect(h1).not.toBe(h2)
  })

  it('한국어 유니코드(안녕)에 대해 64자 16진수를 반환한다', async () => {
    const result = await sha256('안녕')
    expect(result).toHaveLength(64)
    expect(result).toMatch(/^[0-9a-f]{64}$/)
  })

  it('REQ-004 포맷 source text에 대해 64자 16진수를 반환한다', async () => {
    // DEC-003에서 정의한 임베딩 source 포맷
    const sourceText = [
      'React 19 공식 문서',
      'URL: https://react.dev',
      '태그: react, docs, frontend',
      '설명: React 최신 버전 공식 문서',
    ].join('\n')
    const result = await sha256(sourceText)
    expect(result).toHaveLength(64)
    expect(result).toMatch(/^[0-9a-f]{64}$/)
  })
})
