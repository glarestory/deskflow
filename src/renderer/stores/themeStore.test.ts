import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGet = vi.fn()
const mockSet = vi.fn()
vi.stubGlobal('storage', { get: mockGet, set: mockSet })

describe('themeStore', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    vi.resetModules()
    vi.stubGlobal('storage', { get: mockGet, set: mockSet })
  })

  it('has dark mode by default', async () => {
    mockGet.mockResolvedValue({ value: null })
    const { useThemeStore } = await import('./themeStore')
    expect(useThemeStore.getState().mode).toBe('dark')
  })

  it('loadTheme loads from storage when data exists', async () => {
    mockGet.mockResolvedValue({ value: JSON.stringify('light') })

    const { useThemeStore } = await import('./themeStore')
    await useThemeStore.getState().loadTheme()

    expect(useThemeStore.getState().mode).toBe('light')
    expect(useThemeStore.getState().loaded).toBe(true)
  })

  it('toggleMode switches dark to light', async () => {
    mockGet.mockResolvedValue({ value: null })
    const { useThemeStore } = await import('./themeStore')
    await useThemeStore.getState().loadTheme()

    // loaded 설정 후 토글
    useThemeStore.getState().toggleMode()
    expect(useThemeStore.getState().mode).toBe('light')
  })

  it('toggleMode switches light to dark', async () => {
    mockGet.mockResolvedValue({ value: JSON.stringify('light') })
    const { useThemeStore } = await import('./themeStore')
    await useThemeStore.getState().loadTheme()

    useThemeStore.getState().toggleMode()
    expect(useThemeStore.getState().mode).toBe('dark')
  })
})
