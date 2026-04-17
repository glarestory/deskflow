// @MX:ANCHOR: [AUTO] extractTags — URL에서 자동 태그를 추출하는 공개 API
// @MX:REASON: [AUTO] bookmarkStore.addLink, bookmarkStore.importBookmarks, migration에서 참조
// @MX:SPEC: SPEC-BOOKMARK-003

import { DOMAIN_TAG_MAP } from './domainTagMap'

/**
 * URL에서 도메인을 파싱하고 DOMAIN_TAG_MAP 기반으로 자동 태그를 추출한다.
 * - 매칭 없는 도메인: 빈 배열 반환
 * - 파싱 불가 URL (EDGE-001): 오류 없이 빈 배열 반환
 * - 반환 태그: 소문자, 중복 없음
 */
export function extractTags(url: string): string[] {
  if (!url) return []

  let hostname: string
  try {
    hostname = new URL(url).hostname.toLowerCase()
  } catch {
    // EDGE-001: 파싱 불가한 URL은 빈 배열 반환
    return []
  }

  // 전체 hostname으로 먼저 검색 (subdomain 포함)
  if (DOMAIN_TAG_MAP[hostname] !== undefined) {
    return [...new Set(DOMAIN_TAG_MAP[hostname])]
  }

  // www. 제거 후 검색
  const withoutWww = hostname.startsWith('www.') ? hostname.slice(4) : hostname
  if (DOMAIN_TAG_MAP[withoutWww] !== undefined) {
    return [...new Set(DOMAIN_TAG_MAP[withoutWww])]
  }

  // 루트 도메인(2단계) 추출 후 검색
  // 예: sub.github.com → github.com
  const parts = withoutWww.split('.')
  if (parts.length >= 2) {
    const rootDomain = parts.slice(-2).join('.')
    if (DOMAIN_TAG_MAP[rootDomain] !== undefined) {
      return [...new Set(DOMAIN_TAG_MAP[rootDomain])]
    }
  }

  return []
}
