// @MX:NOTE: [AUTO] useModalA11y — 모달 공통 a11y 패턴 훅
// @MX:SPEC: SPEC-A11Y-MODAL-001
import { useEffect, useRef } from 'react'

interface UseModalA11yOptions {
  /** 모달이 열려 있는지 */
  isOpen: boolean
  /** 닫기 콜백 — Escape 키 입력 또는 외부 트리거 시 호출 */
  onClose: () => void
  /** 모달 콘텐츠 컨테이너 ref — focus trap 범위 결정 */
  containerRef: React.RefObject<HTMLElement | null>
  /** Escape 닫기 활성화 여부 (default true) */
  enableEscape?: boolean
  /** focus trap 활성화 여부 (default true) */
  enableFocusTrap?: boolean
  /** 모달 열림 시 자동 포커스 활성화 여부 (default true) */
  enableAutoFocus?: boolean
}

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'textarea:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

const getFocusableElements = (root: HTMLElement): HTMLElement[] => {
  // offsetParent 체크는 jsdom 환경에서 항상 null 이라 사용 불가.
  // disabled/aria-hidden 만 필터하고, 실제 가시성은 브라우저에 위임한다.
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (el) => el.getAttribute('aria-hidden') !== 'true',
  )
}

/**
 * 모달의 표준 a11y 동작을 일괄 적용하는 훅.
 *
 * - **Escape 닫기**: document.keydown 'Escape' 시 onClose 호출
 * - **focus trap**: Tab/Shift+Tab 이 모달 내부에서만 순환
 * - **자동 포커스**: 열릴 때 첫 포커스 가능 요소로 이동
 * - **focus return**: 닫힐 때 열기 직전 활성 요소로 포커스 복귀
 *
 * 사용처: EditModal, ImportModal, RecurrenceModal, CapsuleEditModal
 */
export function useModalA11y({
  isOpen,
  onClose,
  containerRef,
  enableEscape = true,
  enableFocusTrap = true,
  enableAutoFocus = true,
}: UseModalA11yOptions): void {
  // 트리거 요소 (모달 열기 직전 활성 요소) — focus return 대상
  const triggerRef = useRef<HTMLElement | null>(null)

  // Escape 닫기
  useEffect(() => {
    if (!isOpen || !enableEscape) return
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, enableEscape, onClose])

  // 자동 포커스 + 트리거 기억
  useEffect(() => {
    if (!isOpen) return

    // 열기 직전 활성 요소 기억
    triggerRef.current = document.activeElement as HTMLElement | null

    if (enableAutoFocus && containerRef.current !== null) {
      const focusables = getFocusableElements(containerRef.current)
      const first = focusables[0]
      if (first !== undefined) {
        first.focus()
      }
    }

    // unmount / isOpen=false 전환 시 트리거로 포커스 복귀
    return () => {
      const trigger = triggerRef.current
      if (trigger !== null && typeof trigger.focus === 'function') {
        // setTimeout 없이 동기 focus — React 가 모달 DOM 을 정리한 후 호출됨
        trigger.focus()
      }
    }
  }, [isOpen, enableAutoFocus, containerRef])

  // focus trap (Tab 순환)
  useEffect(() => {
    if (!isOpen || !enableFocusTrap) return
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key !== 'Tab') return
      const root = containerRef.current
      if (root === null) return
      const focusables = getFocusableElements(root)
      if (focusables.length === 0) return

      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      const active = document.activeElement as HTMLElement | null

      if (e.shiftKey) {
        // Shift+Tab on first element → wrap to last
        if (active === first || active === root || !root.contains(active)) {
          e.preventDefault()
          last.focus()
        }
      } else {
        // Tab on last element → wrap to first
        if (active === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, enableFocusTrap, containerRef])
}
