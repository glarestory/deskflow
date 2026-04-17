// @MX:NOTE: [AUTO] firstPivotIntroSeen — Pivot 첫 진입 안내 토스트 표시 여부 localStorage 플래그
// @MX:SPEC: SPEC-UX-005

/** localStorage에서 사용하는 키 */
const KEY = 'pivot-intro-seen'

/**
 * 사용자가 Pivot 첫 진입 안내를 본 적 있는지 확인한다.
 * REQ-011: 1회성 안내 토스트 표시 여부 판단
 */
export function hasSeenPivotIntro(): boolean {
  return localStorage.getItem(KEY) === '1'
}

/**
 * Pivot 첫 진입 안내를 본 것으로 표시한다. (멱등적)
 * REQ-011: 안내 표시 후 flag 저장
 */
export function markPivotIntroAsSeen(): void {
  localStorage.setItem(KEY, '1')
}
