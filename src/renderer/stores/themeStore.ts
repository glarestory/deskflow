// @MX:NOTE: [AUTO] themeStore — 다크/라이트 테마 모드 상태 관리
// @MX:SPEC: SPEC-UI-001
import { create } from 'zustand'
import type { ThemeMode } from '../types'
import { storage } from '../lib/storage'

interface ThemeState {
  mode: ThemeMode
  loaded: boolean
  loadTheme: () => Promise<void>
  toggleMode: () => void
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  mode: 'dark',
  loaded: false,

  loadTheme: async () => {
    try {
      const result = await storage.get('hub-theme')
      const mode = result.value ? (JSON.parse(result.value) as ThemeMode) : 'dark'
      set({ mode, loaded: true })
    } catch {
      set({ mode: 'dark', loaded: true })
    }
  },

  toggleMode: () => {
    const newMode: ThemeMode = get().mode === 'dark' ? 'light' : 'dark'
    set({ mode: newMode })
    const { loaded } = get()
    if (loaded) {
      void storage.set('hub-theme', JSON.stringify(newMode))
    }
  },
}))
