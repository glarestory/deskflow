import { contextBridge } from 'electron'

// IPC API는 향후 SPEC에서 여기에 추가
contextBridge.exposeInMainWorld('api', {})
