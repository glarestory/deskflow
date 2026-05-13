// @MX:NOTE: [AUTO] haptic 유틸리티 — 모바일 햅틱 피드백 (SPEC-UX-010 M6)
// @MX:SPEC: SPEC-UX-010

/**
 * 햅틱 피드백 트리거 유틸리티.
 * - navigator.vibrate가 없거나 prefers-reduced-motion: reduce인 경우 무시된다.
 * - REQ-UX-010-012: DnD 드래그 시작 시 10ms 진동
 *
 * @param duration - 진동 지속 시간 (ms)
 */
export function tryHaptic(duration: number): void {
  // prefers-reduced-motion: reduce 설정 시 햅틱 비활성화 (접근성)
  try {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  } catch {
    // matchMedia 미지원 환경 — 무시하고 계속
  }

  // navigator.vibrate 미지원 환경 — graceful fallback
  if (typeof navigator.vibrate !== 'function') return

  try {
    navigator.vibrate(duration)
  } catch {
    // 진동 API 호출 실패 — 무시
  }
}
