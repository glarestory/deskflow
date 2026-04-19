/**
 * @MX:NOTE [AUTO] SHA-256 해시 계산 — 북마크 source text 변경 감지
 * @MX:SPEC SPEC-SEARCH-RAG-001
 */

/**
 * 문자열의 SHA-256 해시를 소문자 16진수 문자열(64자)로 반환한다.
 *
 * Web Crypto API(`crypto.subtle`)를 사용하므로 async이다.
 * jsdom 환경에서도 `crypto.subtle`이 제공된다.
 *
 * @param text - 해시할 UTF-8 문자열
 * @returns 소문자 16진수 문자열 (64자)
 */
export async function sha256(text: string): Promise<string> {
  // UTF-8로 인코딩
  const encoded = new TextEncoder().encode(text)

  // Web Crypto API로 SHA-256 다이제스트 계산
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoded)

  // ArrayBuffer → 소문자 16진수 문자열 변환
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}
