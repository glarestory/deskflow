// @MX:NOTE: [AUTO] useIsMobile — 640px 기준 모바일 viewport 감지 훅
// @MX:SPEC: SPEC-MOBILE-RESPONSIVE-001
import { useSyncExternalStore } from 'react'

/**
 * 모바일 breakpoint — CapsuleSwitcher.module.css 의 @media (max-width: 640px) 와 동일.
 * 단일 진실원으로 사용한다.
 */
export const MOBILE_BREAKPOINT = 640

const QUERY = `(max-width: ${MOBILE_BREAKPOINT}px)`

const subscribe = (callback: () => void): (() => void) => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return () => {
      // SSR / 비-브라우저 환경: no-op
    }
  }
  const mql = window.matchMedia(QUERY)
  // addEventListener 가 호환성 표준 — 구형 Safari (<14) fallback 은 addListener
  if (typeof mql.addEventListener === 'function') {
    mql.addEventListener('change', callback)
    return () => mql.removeEventListener('change', callback)
  }
  // @ts-expect-error: 구형 브라우저 fallback
  mql.addListener(callback)
  return () => {
    // @ts-expect-error: 구형 브라우저 fallback
    mql.removeListener(callback)
  }
}

const getSnapshot = (): boolean => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false
  }
  return window.matchMedia(QUERY).matches
}

// SSR 안전 — 서버에서는 항상 데스크톱(false) 가정
const getServerSnapshot = (): boolean => false

/**
 * 현재 viewport 가 모바일(<= 640px) 인지 반환.
 * matchMedia 변화에 자동 반응 — useEffect 불필요.
 *
 * @example
 * const isMobile = useIsMobile()
 * return <Sidebar style={{ width: isMobile ? '80vw' : 250 }} />
 */
export function useIsMobile(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
