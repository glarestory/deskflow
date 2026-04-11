// @MX:NOTE: [AUTO] window.storage IPC 브릿지 타입 선언
// @MX:SPEC: SPEC-UI-001
export {}

declare global {
  interface Window {
    storage: {
      get: (key: string) => Promise<{ value: string | null }>
      set: (key: string, value: string) => Promise<void>
    }
  }
}
