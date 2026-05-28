// @MX:TEST: SPEC-WIDGET-TOGGLE-001
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'

// widgetVisibilityStore mock — toggle 호출만 검증 + 상태 동기적 변경
const mockToggleWidget = vi.fn()
const mockShowAllWidgets = vi.fn()
let mockHidden = new Set<string>()

vi.mock('../../stores/widgetVisibilityStore', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../stores/widgetVisibilityStore')>()
  return {
    ...original,
    useWidgetVisibility: () => ({
      hiddenWidgets: mockHidden,
      loaded: true,
      loadVisibility: vi.fn(),
      toggleWidget: mockToggleWidget,
      hideWidget: vi.fn(),
      showWidget: vi.fn(),
      showAllWidgets: mockShowAllWidgets,
    }),
  }
})

import WidgetVisibilityMenu from './WidgetVisibilityMenu'

describe('WidgetVisibilityMenu — desktop variant (SPEC-WIDGET-TOGGLE-001)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockHidden = new Set<string>()
  })

  it('트리거 버튼이 표시되며 초기 카운트가 6/6 (모두 표시)', () => {
    render(<WidgetVisibilityMenu variant="desktop" />)
    const trigger = screen.getByTestId('widget-visibility-trigger')
    expect(trigger).toHaveTextContent('6/6')
  })

  it('일부 위젯이 숨겨져 있으면 카운트가 가시 개수를 반영한다 (2 숨김 → 4/6)', () => {
    mockHidden = new Set(['feed', 'notes'])
    render(<WidgetVisibilityMenu variant="desktop" />)
    expect(screen.getByTestId('widget-visibility-trigger')).toHaveTextContent('4/6')
  })

  it('트리거 클릭 시 드롭다운이 열린다', () => {
    render(<WidgetVisibilityMenu variant="desktop" />)
    expect(screen.queryByTestId('widget-visibility-dropdown')).not.toBeInTheDocument()
    fireEvent.click(screen.getByTestId('widget-visibility-trigger'))
    expect(screen.getByTestId('widget-visibility-dropdown')).toBeInTheDocument()
  })

  it('드롭다운에 6개 위젯 토글이 모두 표시된다', () => {
    render(<WidgetVisibilityMenu variant="desktop" />)
    fireEvent.click(screen.getByTestId('widget-visibility-trigger'))

    for (const key of ['clock', 'search', 'bookmarks', 'todo', 'notes', 'feed']) {
      expect(screen.getByTestId(`widget-toggle-${key}`)).toBeInTheDocument()
    }
  })

  it('토글 클릭 시 toggleWidget(key) 가 호출된다', () => {
    render(<WidgetVisibilityMenu variant="desktop" />)
    fireEvent.click(screen.getByTestId('widget-visibility-trigger'))
    fireEvent.click(screen.getByTestId('widget-toggle-feed'))

    expect(mockToggleWidget).toHaveBeenCalledWith('feed')
  })

  it('숨김 위젯은 aria-checked=false, 표시 위젯은 aria-checked=true', () => {
    mockHidden = new Set(['feed'])
    render(<WidgetVisibilityMenu variant="desktop" />)
    fireEvent.click(screen.getByTestId('widget-visibility-trigger'))

    expect(screen.getByTestId('widget-toggle-feed')).toHaveAttribute(
      'aria-checked',
      'false',
    )
    expect(screen.getByTestId('widget-toggle-clock')).toHaveAttribute(
      'aria-checked',
      'true',
    )
  })

  it('숨긴 위젯이 없으면 "모두 표시" 버튼이 노출되지 않는다', () => {
    mockHidden = new Set<string>()
    render(<WidgetVisibilityMenu variant="desktop" />)
    fireEvent.click(screen.getByTestId('widget-visibility-trigger'))
    expect(screen.queryByTestId('widget-show-all')).not.toBeInTheDocument()
  })

  it('숨긴 위젯이 있을 때 "모두 표시" 버튼이 노출된다', () => {
    mockHidden = new Set(['feed', 'notes'])
    render(<WidgetVisibilityMenu variant="desktop" />)
    fireEvent.click(screen.getByTestId('widget-visibility-trigger'))
    expect(screen.getByTestId('widget-show-all')).toBeInTheDocument()
  })

  it('"모두 표시" 클릭 시 showAllWidgets 호출 + 드롭다운 닫힘', () => {
    mockHidden = new Set(['feed'])
    render(<WidgetVisibilityMenu variant="desktop" />)
    fireEvent.click(screen.getByTestId('widget-visibility-trigger'))

    fireEvent.click(screen.getByTestId('widget-show-all'))

    expect(mockShowAllWidgets).toHaveBeenCalledTimes(1)
    expect(screen.queryByTestId('widget-visibility-dropdown')).not.toBeInTheDocument()
  })
})

describe('WidgetVisibilityMenu — compact variant (모바일 More 메뉴 내부)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockHidden = new Set<string>()
  })

  it('compact 변형은 트리거 없이 인라인으로 6개 토글이 노출된다', () => {
    render(<WidgetVisibilityMenu variant="compact" />)
    // 트리거가 없어야 함
    expect(screen.queryByTestId('widget-visibility-trigger')).not.toBeInTheDocument()
    // 6개 인라인 토글 노출
    for (const key of ['clock', 'search', 'bookmarks', 'todo', 'notes', 'feed']) {
      expect(screen.getByTestId(`widget-toggle-compact-${key}`)).toBeInTheDocument()
    }
  })

  it('compact 토글 클릭 시 toggleWidget 호출 + aria-pressed 반영', () => {
    mockHidden = new Set(['feed'])
    render(<WidgetVisibilityMenu variant="compact" />)

    const feedBtn = screen.getByTestId('widget-toggle-compact-feed')
    expect(feedBtn).toHaveAttribute('aria-pressed', 'false')

    const clockBtn = screen.getByTestId('widget-toggle-compact-clock')
    expect(clockBtn).toHaveAttribute('aria-pressed', 'true')

    fireEvent.click(feedBtn)
    expect(mockToggleWidget).toHaveBeenCalledWith('feed')
  })
})
