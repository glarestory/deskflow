// @MX:SPEC: SPEC-UX-003, SPEC-UX-005
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'

const mockToggleMode = vi.fn()
const mockSignOut = vi.fn()
const mockToggleViewMode = vi.fn()

vi.mock('../../stores/themeStore', () => ({
  useThemeStore: () => ({ mode: 'dark' as const, toggleMode: mockToggleMode }),
}))

vi.mock('../../stores/authStore', () => ({
  useAuthStore: () => ({
    user: { uid: 'u1', displayName: '테스트 유저', photoURL: null, email: 'test@example.com' },
    signOut: mockSignOut,
  }),
}))

vi.mock('../../stores/viewModeStore', () => ({
  useViewModeStore: () => ({
    mode: 'pivot' as const,
    loaded: true,
    toggleMode: mockToggleViewMode,
  }),
}))

describe('SidebarSettings (SPEC-UX-003)', () => {
  beforeEach(() => vi.clearAllMocks())

  it('테마 토글 버튼을 렌더링한다', async () => {
    const { SidebarSettings } = await import('./SidebarSettings')
    render(<SidebarSettings />)

    expect(screen.getByTestId('sidebar-theme-toggle')).toBeInTheDocument()
  })

  it('테마 토글 클릭 시 toggleMode를 호출한다', async () => {
    const { SidebarSettings } = await import('./SidebarSettings')
    render(<SidebarSettings />)

    fireEvent.click(screen.getByTestId('sidebar-theme-toggle'))
    expect(mockToggleMode).toHaveBeenCalled()
  })

  it('로그아웃 버튼을 렌더링한다', async () => {
    const { SidebarSettings } = await import('./SidebarSettings')
    render(<SidebarSettings />)

    expect(screen.getByTestId('sidebar-logout')).toBeInTheDocument()
  })

  it('로그아웃 버튼 클릭 시 signOut을 호출한다', async () => {
    const { SidebarSettings } = await import('./SidebarSettings')
    render(<SidebarSettings />)

    fireEvent.click(screen.getByTestId('sidebar-logout'))
    expect(mockSignOut).toHaveBeenCalled()
  })

  it('사용자 이름을 표시한다', async () => {
    const { SidebarSettings } = await import('./SidebarSettings')
    render(<SidebarSettings />)

    expect(screen.getByText('테스트 유저')).toBeInTheDocument()
  })

  it('접힌 상태에서 로그아웃 버튼을 숨긴다', async () => {
    const { SidebarSettings } = await import('./SidebarSettings')
    render(<SidebarSettings collapsed={true} />)

    expect(screen.queryByTestId('sidebar-logout')).not.toBeInTheDocument()
  })

  // T-006: SPEC-UX-005 — 위젯 모드 전환 버튼 렌더링
  it('위젯 모드 전환 버튼을 렌더링한다', async () => {
    const { SidebarSettings } = await import('./SidebarSettings')
    render(<SidebarSettings />)

    expect(screen.getByTestId('sidebar-widget-mode-btn')).toBeInTheDocument()
    expect(screen.getByText('위젯 모드로 전환')).toBeInTheDocument()
  })

  // T-006: 위젯 모드 전환 버튼 클릭 시 viewModeStore.toggleMode 호출
  it('위젯 모드 전환 버튼 클릭 시 toggleMode가 호출된다', async () => {
    const { SidebarSettings } = await import('./SidebarSettings')
    render(<SidebarSettings />)

    fireEvent.click(screen.getByTestId('sidebar-widget-mode-btn'))
    expect(mockToggleViewMode).toHaveBeenCalled()
  })
})
