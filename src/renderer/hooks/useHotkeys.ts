// @MX:NOTE: [AUTO] useHotkeys — Pivot 레이아웃 키보드 단축키 훅
// @MX:SPEC: SPEC-UX-003
import { useEffect } from 'react'
import { useViewStore } from '../stores/viewStore'
import { useCommandStore } from '../stores/commandStore'
import { useBookmarkStore } from '../stores/bookmarkStore'

interface UseHotkeysOptions {
  /** SearchInput의 ref — / 키로 포커스 이동 */
  searchInputRef: React.RefObject<HTMLInputElement | null>
  /** 현재 선택된 북마크 인덱스 (j/k 탐색용) */
  selectedIndex?: number
  onSelectIndexChange?: (index: number) => void
  /** 현재 표시 중인 링크 목록 */
  links?: { id: string; url: string }[]
}

/**
 * Pivot 레이아웃 키보드 단축키.
 * REQ-015:
 * - j/k: 리스트 항목 위/아래
 * - Enter: 선택 항목 열기
 * - e: 편집
 * - f: 즐겨찾기 토글
 * - 1~9: 사이드바 N번째 카테고리 이동
 * - /: 검색바 포커스
 *
 * CommandPalette가 열려 있을 때는 비활성화.
 */
export function useHotkeys({
  searchInputRef,
  selectedIndex = 0,
  onSelectIndexChange,
  links = [],
}: UseHotkeysOptions): void {
  const { setContext } = useViewStore()
  const { isOpen: isCommandOpen } = useCommandStore()
  const bookmarks = useBookmarkStore((s) => s.bookmarks)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      // CommandPalette가 열려 있으면 비활성화
      if (isCommandOpen) return

      // input, textarea에 포커스가 있으면 일부 단축키 비활성화 (/, Enter, j/k, f, e 제외)
      const activeEl = document.activeElement
      const isInputFocused = activeEl instanceof HTMLInputElement || activeEl instanceof HTMLTextAreaElement

      switch (e.key) {
        case '/': {
          // 검색바 포커스 — input에 이미 포커스가 있으면 무시
          if (!isInputFocused) {
            e.preventDefault()
            searchInputRef.current?.focus()
          }
          break
        }

        case 'j': {
          if (isInputFocused) break
          // 다음 항목으로 이동
          const nextIndex = Math.min(selectedIndex + 1, links.length - 1)
          onSelectIndexChange?.(nextIndex)
          break
        }

        case 'k': {
          if (isInputFocused) break
          // 이전 항목으로 이동
          const prevIndex = Math.max(selectedIndex - 1, 0)
          onSelectIndexChange?.(prevIndex)
          break
        }

        case 'Enter': {
          if (isInputFocused) break
          // 선택 항목 열기
          const link = links[selectedIndex]
          if (link !== undefined) {
            window.open(link.url, '_blank')
          }
          break
        }

        default: {
          if (isInputFocused) break
          // 1~9 키: 사이드바 카테고리 이동
          const digit = parseInt(e.key, 10)
          if (!isNaN(digit) && digit >= 1 && digit <= 9) {
            const targetCat = bookmarks[digit - 1]
            if (targetCat !== undefined) {
              setContext({ kind: 'category', categoryId: targetCat.id })
            }
          }
          break
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isCommandOpen, bookmarks, setContext, searchInputRef, selectedIndex, onSelectIndexChange, links])
}

export default useHotkeys
