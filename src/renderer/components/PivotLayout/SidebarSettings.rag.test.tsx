// @MX:SPEC: SPEC-SEARCH-RAG-001
// SidebarSettings RAG 섹션 테스트 — TDD RED-GREEN-REFACTOR (Phase 6D)
// AC-030, AC-031, AC-005: RAG 토글 + 임계값 슬라이더 + 재시도 버튼

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'

const mockSetEnabled = vi.fn()
const mockSetThreshold = vi.fn()
const mockCheckHealth = vi.fn()

vi.mock('../../stores/themeStore', () => ({
  useThemeStore: () => ({ mode: 'dark' as const, toggleMode: vi.fn() }),
}))

vi.mock('../../stores/authStore', () => ({
  useAuthStore: () => ({
    user: { uid: 'u1', displayName: '테스트 유저', photoURL: null, email: 'test@example.com' },
    signOut: vi.fn(),
  }),
}))

vi.mock('../../stores/viewModeStore', () => ({
  useViewModeStore: () => ({
    mode: 'pivot' as const,
    loaded: true,
    toggleMode: vi.fn(),
  }),
}))

vi.mock('../../stores/ragStore', () => ({
  useRagStore: () => ({
    enabled: true,
    similarityThreshold: 0.70,
    ollamaAvailable: true,
    modelMissing: false,
    lastHealthCheck: '2026-04-19T00:03:00.000Z',
    setEnabled: mockSetEnabled,
    setThreshold: mockSetThreshold,
    checkHealth: mockCheckHealth,
  }),
}))

describe('SidebarSettings — RAG 섹션 (AC-030, AC-031, AC-005)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // 테스트 1: RAG 섹션이 렌더링된다
  it('RAG 검색 섹션이 렌더링된다', async () => {
    const { SidebarSettings } = await import('./SidebarSettings')
    render(<SidebarSettings />)

    expect(screen.getByTestId('rag-settings-section')).toBeInTheDocument()
    expect(screen.getByText('RAG 검색')).toBeInTheDocument()
  })

  // 테스트 2: 토글 클릭 시 setEnabled가 호출된다 (AC-030)
  it('RAG 활성화 토글 클릭 시 setEnabled(!enabled)를 호출한다 (AC-030)', async () => {
    const { SidebarSettings } = await import('./SidebarSettings')
    render(<SidebarSettings />)

    fireEvent.click(screen.getByTestId('rag-enabled-toggle'))
    expect(mockSetEnabled).toHaveBeenCalledWith(false) // enabled=true → setEnabled(false)
  })

  // 테스트 3: 슬라이더 변경 시 setThreshold가 호출된다 (AC-031)
  it('유사도 임계값 슬라이더 변경 시 setThreshold를 올바른 값으로 호출한다 (AC-031)', async () => {
    const { SidebarSettings } = await import('./SidebarSettings')
    render(<SidebarSettings />)

    const slider = screen.getByTestId('rag-threshold-slider')
    fireEvent.change(slider, { target: { value: '0.85' } })
    expect(mockSetThreshold).toHaveBeenCalledWith(0.85)
  })

  // 테스트 4: 재시도 버튼 클릭 시 checkHealth가 호출된다 (AC-005)
  it('재시도 버튼 클릭 시 checkHealth를 호출한다 (AC-005)', async () => {
    mockCheckHealth.mockResolvedValue(undefined)
    const { SidebarSettings } = await import('./SidebarSettings')
    render(<SidebarSettings />)

    fireEvent.click(screen.getByTestId('rag-retry-btn'))
    expect(mockCheckHealth).toHaveBeenCalled()
  })

  // 테스트 5: Ollama 상태 텍스트 표시 (준비됨)
  it('ollamaAvailable=true이고 modelMissing=false이면 "준비됨"을 표시한다', async () => {
    const { SidebarSettings } = await import('./SidebarSettings')
    render(<SidebarSettings />)

    expect(screen.getByText(/준비됨/)).toBeInTheDocument()
  })

  // 테스트 6: collapsed=true이면 RAG 섹션이 숨겨진다
  it('collapsed=true이면 RAG 섹션이 렌더링되지 않는다', async () => {
    const { SidebarSettings } = await import('./SidebarSettings')
    render(<SidebarSettings collapsed={true} />)

    expect(screen.queryByTestId('rag-settings-section')).not.toBeInTheDocument()
  })
})
