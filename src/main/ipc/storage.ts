// @MX:NOTE: [AUTO] electron-store IPC 브릿지 — Main 프로세스에서만 실행
// @MX:SPEC: SPEC-UI-001
// electron-store v10은 순수 ESM 패키지이므로 externalizeDepsPlugin()으로 require()할 때
// 모듈 네임스페이스({ default: Store })가 반환된다. .default fallback으로 처리.
import _ElectronStore from 'electron-store'
import type { IpcMain } from 'electron'

const StoreClass = (
  (_ElectronStore as unknown as { default: typeof _ElectronStore }).default ?? _ElectronStore
)
const store = new StoreClass<Record<string, string>>()

// @MX:ANCHOR: [AUTO] storage:get / storage:set IPC 핸들러 등록 진입점
// @MX:REASON: [AUTO] bookmarkStore, todoStore, themeStore, NotesWidget 등 다수 컴포넌트가 의존
export function registerStorageHandlers(ipcMain: IpcMain): void {
  ipcMain.handle('storage:get', (_event, key: string) => {
    const value = store.get(key)
    return { value: value !== undefined ? (value as string) : null }
  })

  ipcMain.handle('storage:set', (_event, key: string, value: string) => {
    store.set(key, value)
  })
}
