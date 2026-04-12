// @MX:ANCHOR: [AUTO] storage — Electron IPC vs localStorage vs Firestore 분기 추상화 진입점
// @MX:REASON: [AUTO] bookmarkStore, todoStore, themeStore, NotesWidget 등 4개 컴포넌트가 의존
// @MX:SPEC: SPEC-AUTH-001

type StorageBridge = {
  get: (key: string) => Promise<{ value: string | null }>
  set: (key: string, value: string) => Promise<void>
}

const isElectron = (): boolean =>
  typeof window !== 'undefined' &&
  typeof (window as Window & { storage?: unknown }).storage !== 'undefined'

// 기본 저장소: Electron IPC 또는 localStorage
const defaultStorage: StorageBridge = {
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

// Firestore 사용자 저장소 팩토리
export const createUserStorage = (uid: string): StorageBridge => ({
  async get(key: string): Promise<{ value: string | null }> {
    // Lazy import: firebase가 없는 환경(테스트 등)에서 안전하게 동작
    const { firestoreStorage } = await import('./firestoreStorage')
    return firestoreStorage.get(uid, key)
  },
  async set(key: string, value: string): Promise<void> {
    const { firestoreStorage } = await import('./firestoreStorage')
    return firestoreStorage.set(uid, key, value)
  },
})

// 현재 활성 저장소 (로그인 상태에 따라 전환)
let activeStorage: StorageBridge = defaultStorage

// 로그인/로그아웃 시 저장소를 전환한다
export const setUserStorage = (uid: string | null): void => {
  activeStorage = uid !== null ? createUserStorage(uid) : defaultStorage
}

// 기존 API를 유지하여 하위 호환성 보장
export const storage: StorageBridge = {
  get: (key: string) => activeStorage.get(key),
  set: (key: string, value: string) => activeStorage.set(key, value),
}
