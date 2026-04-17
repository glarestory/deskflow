// @MX:SPEC: SPEC-UX-003, SPEC-UX-005
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'

// 하위 컴포넌트 모킹
vi.mock('./Sidebar', () => ({
  Sidebar: () => <div data-testid="sidebar" />,
}))
vi.mock('./MainView', () => ({
  MainView: () => <div data-testid="main-view" />,
}))

// viewStore 모킹
vi.mock('../../stores/viewStore', () => ({
  useViewStore: () => ({
    sidebarCollapsed: false,
  }),
}))

// layoutStore 모킹 (firstPivotIntroSeen 확인용)
vi.mock('../../stores/layoutStore', () => ({
  useLayoutStore: () => ({
    layout: [],
    loaded: true,
  }),
}))

// localStorage 모킹
const localStorageMock: Record<string, string> = {}
vi.stubGlobal('localStorage', {
  getItem: (key: string) => localStorageMock[key] ?? null,
  setItem: (key: string, value: string) => { localStorageMock[key] = value },
  removeItem: (key: string) => { delete localStorageMock[key] },
  clear: () => { Object.keys(localStorageMock).forEach((k) => { delete localStorageMock[k] }) },
})

describe('PivotLayout (SPEC-UX-003)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock['pivot-intro-seen'] = undefined!
    delete localStorageMock['pivot-intro-seen']
  })

  it('Sidebar와 MainView를 함께 렌더링한다', async () => {
    const { PivotLayout } = await import('./PivotLayout')
    render(<PivotLayout />)

    expect(screen.getByTestId('sidebar')).toBeInTheDocument()
    expect(screen.getByTestId('main-view')).toBeInTheDocument()
  })

  it('2-column 레이아웃으로 구성된다', async () => {
    const { PivotLayout } = await import('./PivotLayout')
    const { container } = render(<PivotLayout />)

    const root = container.firstChild as HTMLElement
    expect(root.style.display).toBe('flex')
  })

  it('data-testid="pivot-layout"이 있다', async () => {
    const { PivotLayout } = await import('./PivotLayout')
    render(<PivotLayout />)

    expect(screen.getByTestId('pivot-layout')).toBeInTheDocument()
  })
})

// T-008b: firstPivotIntroSeen 통합 테스트
describe('PivotLayout 첫 진입 안내 (SPEC-UX-005)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // pivot-intro-seen 초기화
    delete localStorageMock['pivot-intro-seen']
  })

  // AC-008: 신규 사용자 (layoutStore에 데이터 없음) — 안내 미표시
  it('신규 사용자 (레이아웃 데이터 없음)는 안내 토스트를 표시하지 않는다', async () => {
    // layout이 빈 배열 (신규 사용자)
    const { PivotLayout } = await import('./PivotLayout')
    render(<PivotLayout />)
    // IntroToast는 표시되지 않아야 함
    expect(screen.queryByTestId('intro-toast')).not.toBeInTheDocument()
  })
})
