// @MX:TEST: SPEC-A11Y-MODAL-001
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useRef } from 'react'

import { useModalA11y } from './useModalA11y'

const setupContainer = (): { container: HTMLDivElement; cleanup: () => void } => {
  const container = document.createElement('div')
  container.innerHTML = `
    <button data-testid="btn-1">B1</button>
    <input data-testid="input-1" />
    <button data-testid="btn-2">B2</button>
  `
  document.body.appendChild(container)
  return {
    container,
    cleanup: () => {
      container.remove()
    },
  }
}

const dispatchKey = (key: string, opts: { shiftKey?: boolean } = {}): void => {
  const e = new KeyboardEvent('keydown', {
    key,
    shiftKey: opts.shiftKey ?? false,
    bubbles: true,
    cancelable: true,
  })
  document.dispatchEvent(e)
}

describe('useModalA11y (SPEC-A11Y-MODAL-001)', () => {
  let testCleanup: (() => void) | null = null

  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    testCleanup?.()
    testCleanup = null
  })

  describe('Escape 닫기', () => {
    it('isOpen=true 일 때 Escape 입력 시 onClose 호출', () => {
      const { container, cleanup } = setupContainer()
      testCleanup = cleanup
      const onClose = vi.fn()

      renderHook(() => {
        const ref = useRef(container)
        useModalA11y({ isOpen: true, onClose, containerRef: ref })
      })

      act(() => dispatchKey('Escape'))
      expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('isOpen=false 일 때 Escape 무시', () => {
      const { container, cleanup } = setupContainer()
      testCleanup = cleanup
      const onClose = vi.fn()

      renderHook(() => {
        const ref = useRef(container)
        useModalA11y({ isOpen: false, onClose, containerRef: ref })
      })

      act(() => dispatchKey('Escape'))
      expect(onClose).not.toHaveBeenCalled()
    })

    it('enableEscape=false 일 때 Escape 무시', () => {
      const { container, cleanup } = setupContainer()
      testCleanup = cleanup
      const onClose = vi.fn()

      renderHook(() => {
        const ref = useRef(container)
        useModalA11y({ isOpen: true, onClose, containerRef: ref, enableEscape: false })
      })

      act(() => dispatchKey('Escape'))
      expect(onClose).not.toHaveBeenCalled()
    })

    it('Escape 외 키는 무시', () => {
      const { container, cleanup } = setupContainer()
      testCleanup = cleanup
      const onClose = vi.fn()

      renderHook(() => {
        const ref = useRef(container)
        useModalA11y({ isOpen: true, onClose, containerRef: ref })
      })

      act(() => {
        dispatchKey('Enter')
        dispatchKey(' ')
        dispatchKey('a')
      })
      expect(onClose).not.toHaveBeenCalled()
    })
  })

  describe('자동 포커스', () => {
    it('isOpen=true 시 첫 포커스 가능 요소로 이동', () => {
      const { container, cleanup } = setupContainer()
      testCleanup = cleanup

      renderHook(() => {
        const ref = useRef(container)
        useModalA11y({ isOpen: true, onClose: vi.fn(), containerRef: ref })
      })

      const firstButton = container.querySelector('[data-testid="btn-1"]')
      expect(document.activeElement).toBe(firstButton)
    })

    it('enableAutoFocus=false 일 때 포커스 이동 안 함', () => {
      const { container, cleanup } = setupContainer()
      testCleanup = cleanup
      const externalBtn = document.createElement('button')
      externalBtn.textContent = 'Outside'
      document.body.appendChild(externalBtn)
      externalBtn.focus()

      renderHook(() => {
        const ref = useRef(container)
        useModalA11y({
          isOpen: true,
          onClose: vi.fn(),
          containerRef: ref,
          enableAutoFocus: false,
        })
      })

      expect(document.activeElement).toBe(externalBtn)
    })
  })

  describe('focus return', () => {
    it('isOpen=true → false 전환 시 트리거 요소로 포커스 복귀', () => {
      const { container, cleanup } = setupContainer()
      testCleanup = cleanup
      const trigger = document.createElement('button')
      trigger.textContent = 'Trigger'
      document.body.appendChild(trigger)
      trigger.focus()

      const { rerender } = renderHook(
        ({ open }: { open: boolean }) => {
          const ref = useRef(container)
          useModalA11y({ isOpen: open, onClose: vi.fn(), containerRef: ref })
        },
        { initialProps: { open: true } },
      )

      // 자동 포커스로 모달 내부 요소가 활성화됨
      expect(document.activeElement).not.toBe(trigger)

      rerender({ open: false })

      // 트리거로 복귀
      expect(document.activeElement).toBe(trigger)
    })
  })

  describe('focus trap', () => {
    it('마지막 요소에서 Tab 시 첫 요소로 wrap', () => {
      const { container, cleanup } = setupContainer()
      testCleanup = cleanup

      renderHook(() => {
        const ref = useRef(container)
        useModalA11y({ isOpen: true, onClose: vi.fn(), containerRef: ref })
      })

      const last = container.querySelector<HTMLElement>('[data-testid="btn-2"]')
      const first = container.querySelector<HTMLElement>('[data-testid="btn-1"]')
      last?.focus()
      expect(document.activeElement).toBe(last)

      act(() => dispatchKey('Tab'))

      expect(document.activeElement).toBe(first)
    })

    it('첫 요소에서 Shift+Tab 시 마지막 요소로 wrap', () => {
      const { container, cleanup } = setupContainer()
      testCleanup = cleanup

      renderHook(() => {
        const ref = useRef(container)
        useModalA11y({ isOpen: true, onClose: vi.fn(), containerRef: ref })
      })

      const first = container.querySelector<HTMLElement>('[data-testid="btn-1"]')
      const last = container.querySelector<HTMLElement>('[data-testid="btn-2"]')
      first?.focus()

      act(() => dispatchKey('Tab', { shiftKey: true }))

      expect(document.activeElement).toBe(last)
    })

    it('enableFocusTrap=false 일 때 Tab 가로채지 않음', () => {
      const { container, cleanup } = setupContainer()
      testCleanup = cleanup
      const externalBtn = document.createElement('button')
      document.body.appendChild(externalBtn)

      renderHook(() => {
        const ref = useRef(container)
        useModalA11y({
          isOpen: true,
          onClose: vi.fn(),
          containerRef: ref,
          enableFocusTrap: false,
        })
      })

      const last = container.querySelector<HTMLElement>('[data-testid="btn-2"]')
      last?.focus()

      // 가로채지 않으면 preventDefault 안 됨 — 실제 동작은 브라우저 위임
      // 여기서는 focus 가 wrap 되지 않음만 확인
      const eventBefore = document.activeElement
      act(() => dispatchKey('Tab'))

      // trap 비활성이므로 first 로 강제 wrap 되지 않아야 함
      expect(document.activeElement).toBe(eventBefore)
    })
  })

  describe('cleanup', () => {
    it('unmount 시 keydown 리스너 제거', () => {
      const { container, cleanup } = setupContainer()
      testCleanup = cleanup
      const onClose = vi.fn()

      const { unmount } = renderHook(() => {
        const ref = useRef(container)
        useModalA11y({ isOpen: true, onClose, containerRef: ref })
      })

      unmount()
      act(() => dispatchKey('Escape'))
      expect(onClose).not.toHaveBeenCalled()
    })
  })
})
