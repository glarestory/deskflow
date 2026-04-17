// @MX:NOTE: [AUTO] useCommandPalette — Cmd+K/Ctrl+K 단축키 등록, commandStore 기반 상태 관리
// @MX:SPEC: SPEC-UX-001, SPEC-UX-002
import { useEffect } from 'react'
import { useCommandStore } from '../stores/commandStore'

interface UseCommandPaletteReturn {
  isOpen: boolean
  openPalette: () => void
  closePalette: () => void
}

// @MX:ANCHOR: [AUTO] useCommandPalette — Cmd+K/Ctrl+K 단축키를 앱 전역에서 등록하는 단일 진입점
// @MX:REASON: [AUTO] App.tsx에서만 사용되지만, commandStore를 통해 여러 컴포넌트가 상태 공유
export function useCommandPalette(): UseCommandPaletteReturn {
  const { isOpen, open, close, toggle } = useCommandStore()

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      // Cmd+K (macOS) 또는 Ctrl+K (Windows/Linux)
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        toggle()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [toggle])

  return { isOpen, openPalette: open, closePalette: close }
}
