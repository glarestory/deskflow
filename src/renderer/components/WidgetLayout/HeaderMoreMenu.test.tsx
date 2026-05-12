// HeaderMoreMenu.test.tsx — 모바일 헤더 More 메뉴 컴포넌트 단위 테스트 (SPEC-UX-006 REQ-012)
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import HeaderMoreMenu from './HeaderMoreMenu'

const makeProps = () => ({
  handleAddCategory: vi.fn(),
  onOpenImport: vi.fn(),
  onOpenDedup: vi.fn(),
  onTogglePivotMode: vi.fn(),
  resetLayout: vi.fn(),
  signOut: vi.fn(),
  exportBookmarks: vi.fn(),
})

describe('HeaderMoreMenu (REQ-UX-006-012)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // AC-012: More 버튼이 렌더링되어야 한다
  it('More(⋯) 버튼이 렌더링된다', () => {
    render(<HeaderMoreMenu {...makeProps()} />)
    expect(screen.getByTestId('more-menu-btn')).toBeInTheDocument()
  })

  // AC-012: More 버튼 클릭 전에는 메뉴가 보이지 않는다
  it('초기 상태에서 메뉴 항목이 보이지 않는다', () => {
    render(<HeaderMoreMenu {...makeProps()} />)
    expect(screen.queryByTestId('more-menu-list')).not.toBeInTheDocument()
  })

  // AC-012: More 버튼 클릭 후 7개 액션이 표시된다
  it('More 버튼 클릭 시 메뉴 목록이 표시된다', () => {
    render(<HeaderMoreMenu {...makeProps()} />)
    fireEvent.click(screen.getByTestId('more-menu-btn'))
    expect(screen.getByTestId('more-menu-list')).toBeInTheDocument()
  })

  it('메뉴 열림 후 7개 항목이 표시된다', () => {
    render(<HeaderMoreMenu {...makeProps()} />)
    fireEvent.click(screen.getByTestId('more-menu-btn'))
    // 카테고리 추가, 가져오기, 내보내기, 중복 탐지, 레이아웃 초기화, Pivot 모드, 로그아웃
    expect(screen.getByTestId('more-add-category')).toBeInTheDocument()
    expect(screen.getByTestId('more-import')).toBeInTheDocument()
    expect(screen.getByTestId('more-export')).toBeInTheDocument()
    expect(screen.getByTestId('more-dedup')).toBeInTheDocument()
    expect(screen.getByTestId('more-reset-layout')).toBeInTheDocument()
    expect(screen.getByTestId('more-pivot')).toBeInTheDocument()
    expect(screen.getByTestId('more-logout')).toBeInTheDocument()
  })

  // 각 액션 버튼 클릭 시 핸들러 호출 + 메뉴 닫힘
  it('카테고리 추가 클릭 시 handleAddCategory 가 호출된다', () => {
    const props = makeProps()
    render(<HeaderMoreMenu {...props} />)
    fireEvent.click(screen.getByTestId('more-menu-btn'))
    fireEvent.click(screen.getByTestId('more-add-category'))
    expect(props.handleAddCategory).toHaveBeenCalledOnce()
  })

  it('가져오기 클릭 시 onOpenImport 가 호출된다', () => {
    const props = makeProps()
    render(<HeaderMoreMenu {...props} />)
    fireEvent.click(screen.getByTestId('more-menu-btn'))
    fireEvent.click(screen.getByTestId('more-import'))
    expect(props.onOpenImport).toHaveBeenCalledOnce()
  })

  it('내보내기 클릭 시 exportBookmarks 가 호출된다', () => {
    const props = makeProps()
    render(<HeaderMoreMenu {...props} />)
    fireEvent.click(screen.getByTestId('more-menu-btn'))
    fireEvent.click(screen.getByTestId('more-export'))
    expect(props.exportBookmarks).toHaveBeenCalledOnce()
  })

  it('중복 탐지 클릭 시 onOpenDedup 가 호출된다', () => {
    const props = makeProps()
    render(<HeaderMoreMenu {...props} />)
    fireEvent.click(screen.getByTestId('more-menu-btn'))
    fireEvent.click(screen.getByTestId('more-dedup'))
    expect(props.onOpenDedup).toHaveBeenCalledOnce()
  })

  it('레이아웃 초기화 클릭 시 resetLayout 이 호출된다', () => {
    const props = makeProps()
    render(<HeaderMoreMenu {...props} />)
    fireEvent.click(screen.getByTestId('more-menu-btn'))
    fireEvent.click(screen.getByTestId('more-reset-layout'))
    expect(props.resetLayout).toHaveBeenCalledOnce()
  })

  it('Pivot 모드 클릭 시 onTogglePivotMode 가 호출된다', () => {
    const props = makeProps()
    render(<HeaderMoreMenu {...props} />)
    fireEvent.click(screen.getByTestId('more-menu-btn'))
    fireEvent.click(screen.getByTestId('more-pivot'))
    expect(props.onTogglePivotMode).toHaveBeenCalledOnce()
  })

  it('로그아웃 클릭 시 signOut 이 호출된다', () => {
    const props = makeProps()
    render(<HeaderMoreMenu {...props} />)
    fireEvent.click(screen.getByTestId('more-menu-btn'))
    fireEvent.click(screen.getByTestId('more-logout'))
    expect(props.signOut).toHaveBeenCalledOnce()
  })

  // 메뉴 항목 클릭 후 메뉴가 닫힌다
  it('메뉴 항목 클릭 후 메뉴가 닫힌다', () => {
    const props = makeProps()
    render(<HeaderMoreMenu {...props} />)
    fireEvent.click(screen.getByTestId('more-menu-btn'))
    expect(screen.getByTestId('more-menu-list')).toBeInTheDocument()
    fireEvent.click(screen.getByTestId('more-add-category'))
    expect(screen.queryByTestId('more-menu-list')).not.toBeInTheDocument()
  })
})
