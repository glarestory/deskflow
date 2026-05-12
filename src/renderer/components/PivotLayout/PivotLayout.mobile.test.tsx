// @MX:TEST: SPEC-MOBILE-RESPONSIVE-001 — Sidebar/PivotLayout 의 모바일 분기 검증
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import '@testing-library/jest-dom'

// 하위 컴포넌트 모킹 (Sidebar 내부)
vi.mock('./SidebarCategoryList', () => ({
  SidebarCategoryList: () => <div data-testid="sidebar-category-list" />,
}))
vi.mock('./SidebarTagList', () => ({
  SidebarTagList: () => <div data-testid="sidebar-tag-list" />,
}))
vi.mock('./SidebarSettings', () => ({
  SidebarSettings: () => <div data-testid="sidebar-settings" />,
}))
vi.mock('./MainView', () => ({
  MainView: () => <div data-testid="main-view" />,
}))
vi.mock('../CapsuleSwitcher/CapsuleSwitcher', () => ({
  default: () => <div data-testid="capsule-switcher" />,
}))

// viewStore mock — 모듈 스코프 상태로 토글 액션이 실제로 반영되도록 한다
const mockToggleSidebar = vi.fn()
let mockCollapsed = false

vi.mock('../../stores/viewStore', () => ({
  useViewStore: (selector?: (s: unknown) => unknown) => {
    const state = {
      context: { kind: 'all' as const },
      sidebarCollapsed: mockCollapsed,
      setContext: vi.fn(),
      toggleSidebar: mockToggleSidebar,
    }
    return selector ? selector(state) : state
  },
}))

vi.mock('../../stores/bookmarkStore', () => ({
  useBookmarkStore: () => ({ bookmarks: [] }),
}))

// matchMedia mock — 동적으로 모바일/데스크톱 전환
type Listener = (e: MediaQueryListEvent) => void
const listeners = new Set<Listener>()
let currentMatches = false
const dispatchChange = (matches: boolean): void => {
  currentMatches = matches
  listeners.forEach((cb) => cb({ matches } as MediaQueryListEvent))
}

const setupMatchMedia = (): void => {
  window.matchMedia = vi.fn(
    () =>
      ({
        matches: currentMatches,
        media: '(max-width: 640px)',
        addEventListener: (_t: string, cb: Listener) => listeners.add(cb),
        removeEventListener: (_t: string, cb: Listener) => listeners.delete(cb),
      }) as unknown as MediaQueryList,
  )
}

import { Sidebar } from './Sidebar'
import { PivotLayout } from './PivotLayout'

describe('Sidebar (SPEC-MOBILE-RESPONSIVE-001)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    listeners.clear()
    currentMatches = false
    mockCollapsed = false
    setupMatchMedia()
  })

  it('데스크톱(>640px) 에서는 position: relative 로 인라인 배치된다', () => {
    currentMatches = false
    render(<Sidebar />)
    const aside = screen.getByTestId('sidebar')
    expect(aside).toHaveAttribute('data-mobile', 'false')
    expect(aside.style.position).toBe('relative')
    expect(aside.style.transform).toBe('none')
  })

  it('모바일(<=640px) 에서는 position: fixed 로 오버레이로 동작한다', () => {
    currentMatches = true
    render(<Sidebar />)
    const aside = screen.getByTestId('sidebar')
    expect(aside).toHaveAttribute('data-mobile', 'true')
    expect(aside.style.position).toBe('fixed')
    expect(aside.style.zIndex).toBe('100')
  })

  it('모바일에서 collapsed 일 때 화면 밖으로 슬라이드 아웃된다 (translateX(-100%))', () => {
    currentMatches = true
    mockCollapsed = true
    render(<Sidebar />)
    const aside = screen.getByTestId('sidebar')
    expect(aside.style.transform).toBe('translateX(-100%)')
  })

  it('모바일에서 sidebar-toggle 버튼이 44x44 (Apple HIG 권장)', () => {
    currentMatches = true
    render(<Sidebar />)
    const btn = screen.getByTestId('sidebar-toggle')
    expect(btn.style.width).toBe('44px')
    expect(btn.style.height).toBe('44px')
  })

  it('데스크톱에서 sidebar-toggle 버튼은 26x26 유지 (디자인 토큰 정렬, commit 795503c)', () => {
    currentMatches = false
    render(<Sidebar />)
    const btn = screen.getByTestId('sidebar-toggle')
    expect(btn.style.width).toBe('26px')
    expect(btn.style.height).toBe('26px')
  })
})

describe('PivotLayout (SPEC-MOBILE-RESPONSIVE-001)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    listeners.clear()
    currentMatches = false
    mockCollapsed = false
    setupMatchMedia()
  })

  it('데스크톱에서는 햄버거 버튼과 backdrop 이 렌더되지 않는다', () => {
    currentMatches = false
    render(<PivotLayout onOpenCapsuleList={vi.fn()} onOpenCreateCapsule={vi.fn()} />)
    expect(screen.queryByTestId('mobile-menu-btn')).not.toBeInTheDocument()
    expect(screen.queryByTestId('sidebar-backdrop')).not.toBeInTheDocument()
  })

  it('모바일에서는 햄버거 버튼이 노출된다 (44x44)', () => {
    currentMatches = true
    render(<PivotLayout />)
    const btn = screen.getByTestId('mobile-menu-btn')
    expect(btn).toBeInTheDocument()
    expect(btn.style.width).toBe('44px')
    expect(btn.style.height).toBe('44px')
    expect(btn).toHaveAttribute('aria-label', '메뉴 열기')
  })

  it('모바일에서 사이드바가 열려있을 때 backdrop 이 표시되고 클릭 시 toggleSidebar 호출', () => {
    currentMatches = true
    mockCollapsed = false
    render(<PivotLayout />)
    const backdrop = screen.getByTestId('sidebar-backdrop')
    expect(backdrop).toBeInTheDocument()
    // 자동 collapse useEffect 의 호출은 무시 — backdrop 클릭 자체의 효과만 검증
    mockToggleSidebar.mockClear()
    fireEvent.click(backdrop)
    expect(mockToggleSidebar).toHaveBeenCalledTimes(1)
  })

  it('모바일에서 사이드바가 collapsed 일 때 backdrop 이 표시되지 않는다', () => {
    currentMatches = true
    mockCollapsed = true
    render(<PivotLayout />)
    expect(screen.queryByTestId('sidebar-backdrop')).not.toBeInTheDocument()
  })

  it('데스크톱→모바일 전환 시 자동으로 collapse 된다 (한 번만)', () => {
    currentMatches = false
    mockCollapsed = false
    render(<PivotLayout />)
    expect(mockToggleSidebar).not.toHaveBeenCalled()

    // viewport 가 모바일로 변경됨
    act(() => {
      dispatchChange(true)
    })

    expect(mockToggleSidebar).toHaveBeenCalledTimes(1)
  })

  it('모바일 햄버거 버튼 클릭 시 toggleSidebar 호출', () => {
    currentMatches = true
    mockCollapsed = true // backdrop 충돌 방지
    render(<PivotLayout />)
    fireEvent.click(screen.getByTestId('mobile-menu-btn'))
    expect(mockToggleSidebar).toHaveBeenCalledTimes(1)
  })
})
