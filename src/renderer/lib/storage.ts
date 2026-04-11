// @MX:ANCHOR: [AUTO] storage — Electron IPC vs localStorage 분기 추상화 진입점
// @MX:REASON: [AUTO] bookmarkStore, todoStore, themeStore, NotesWidget 등 4개 컴포넌트가 의존
// @MX:SPEC: SPEC-WEB-001

type StorageBridge = {
  get: (key: string) => Promise<{ value: string | null }>
  set: (key: string, value: string) => Promise<void>
}

const isElectron = (): boolean =>
  typeof window !== 'undefined' &&
  typeof (window as Window & { storage?: unknown }).storage !== 'undefined'

export const storage = {
  async get(key: string): Promise<{ value: string | null }> {
    if (isElectron()) {
      return (window as Window & { storage: StorageBridge }).storage.get(key)
    }
    const value = localStorage.getItem(key)
    return { value }
  },

  async set(key: string, value: string): Promise<void> {
    if (isElectron()) {
      await (window as Window & { storage: StorageBridge }).storage.set(key, value)
      return
    }
    localStorage.setItem(key, value)
  },
}
