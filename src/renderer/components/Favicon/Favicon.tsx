// @MX:NOTE: [AUTO] Favicon — DuckDuckGo favicon API + onError fallback 원형 컴포넌트
// @MX:SPEC: SPEC-UX-003
import { useState } from 'react'

/**
 * 모듈 수준 실패 도메인 캐시.
 * 한번 favicon 로드에 실패한 도메인은 같은 세션 동안 재시도하지 않는다.
 * @MX:NOTE: [AUTO] 가상화 리스트 스크롤 시 같은 도메인을 반복 mount 하는 경우 네트워크 절약
 */
const failedDomains = new Set<string>()

/**
 * URL에서 도메인을 추출한다.
 * 파싱 실패 또는 hostname이 비어 있으면 null 반환.
 * @MX:NOTE: [AUTO] mailto:, tel: 등은 hostname이 빈 문자열이므로 null로 처리
 */
function extractDomain(url: string): string | null {
  if (typeof url !== 'string' || url.length === 0) return null
  try {
    const host = new URL(url).hostname
    return host.length > 0 ? host : null
  } catch {
    return null
  }
}

/**
 * 안전한 fallback 글자 추출.
 * 도메인 → URL → '?' 순으로 시도하며, 어떤 경우에도 빈 값을 반환하지 않는다.
 */
function getFallbackChar(domain: string | null, url: string): string {
  if (domain !== null && domain.length > 0) return domain[0]!.toUpperCase()
  if (typeof url === 'string' && url.length > 0) return url[0]!.toUpperCase()
  return '?'
}

/**
 * Favicon URL 생성.
 * @MX:NOTE: [AUTO] DuckDuckGo favicon API 사용
 * - Google s2 API는 favicon이 없을 때 404 응답 → 콘솔 노이즈
 * - DuckDuckGo는 favicon이 없을 때도 generic icon을 200으로 반환 → 콘솔 깨끗
 * - size 파라미터는 고정 ico (DDG는 size 옵션 없음, 브라우저가 width/height로 스케일)
 */
function getFaviconUrl(domain: string, _size: number): string {
  return `https://icons.duckduckgo.com/ip3/${domain}.ico`
}

/**
 * 외부 favicon API로 가져올 수 없는 호스트인지 판별.
 * - localhost, 127.x, 사설 IP 대역, .local TLD
 * - 외부 favicon 서비스는 이런 호스트에 대해 404를 반환하므로 콘솔 노이즈를 줄인다.
 * @MX:NOTE: [AUTO] 사용자 환경의 dr-t.kt.co.kr 같은 사내 도메인도 잡히지 않으나
 * onError fallback이 정상 동작하므로 무해
 */
function isUnreachableHost(host: string): boolean {
  if (host === 'localhost') return true
  if (host.endsWith('.local')) return true
  // IPv4 사설 대역
  if (/^127\./.test(host)) return true
  if (/^10\./.test(host)) return true
  if (/^192\.168\./.test(host)) return true
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(host)) return true
  return false
}

interface FaviconProps {
  /** 북마크 URL — 도메인 추출에 사용 */
  url: string
  /** 파비콘 크기 (px): 16 | 24 | 32 (기본값 32) */
  size?: 16 | 24 | 32
  /** 추가 스타일 */
  style?: React.CSSProperties
}

/**
 * Favicon 컴포넌트.
 * - Google s2 API로 파비콘을 로드한다.
 * - 이미지 로드 실패 시 도메인 첫 글자 대문자 원형으로 fallback.
 * - URL 파싱 실패 시 즉시 fallback 표시.
 */
export function Favicon({ url, size = 32, style }: FaviconProps): JSX.Element {
  const domain = extractDomain(url)
  // 도메인이 없거나, 사설 호스트이거나, 이전에 실패한 도메인이면 즉시 fallback
  const cannotFetch =
    domain === null ||
    isUnreachableHost(domain) ||
    failedDomains.has(domain)
  const [error, setError] = useState<boolean>(cannotFetch)

  const fallbackChar = getFallbackChar(domain, url)

  const handleImageError = (): void => {
    if (domain !== null) failedDomains.add(domain)
    setError(true)
  }

  if (error) {
    return (
      <div
        data-testid="favicon-fallback"
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          background: 'var(--accent, #6c63ff)',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: size * 0.5,
          fontWeight: 700,
          flexShrink: 0,
          userSelect: 'none',
          ...style,
        }}
      >
        {fallbackChar}
      </div>
    )
  }

  return (
    <img
      src={getFaviconUrl(domain!, size)}
      alt={`${domain} favicon`}
      width={size}
      height={size}
      onError={handleImageError}
      style={{
        borderRadius: 4,
        flexShrink: 0,
        objectFit: 'contain',
        ...style,
      }}
    />
  )
}

export default Favicon
