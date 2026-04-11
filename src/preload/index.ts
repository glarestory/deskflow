import { contextBridge, ipcRenderer } from 'electron'

// @MX:NOTE: [AUTO] Renderer에서 window.storage API 접근 진입점 — contextIsolation 환경 브릿지
// @MX:SPEC: SPEC-UI-001
contextBridge.exposeInMainWorld('api', {})

contextBridge.exposeInMainWorld('storage', {
  get: (key: string) => ipcRenderer.invoke('storage:get', key),
  set: (key: string, value: string) => ipcRenderer.invoke('storage:set', key, value),
})
