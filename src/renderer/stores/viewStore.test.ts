// @MX:SPEC: SPEC-UX-003
import { describe, it, expect, beforeEach } from 'vitest'

describe('viewStore', () => {
  beforeEach(async () => {
    // 각 테스트마다 모듈을 초기화해 스토어 상태를 리셋
    vi.resetModules()
  })

  it('초기 상태가 올바르다', async () => {
    const { useViewStore } = await import('./viewStore')
    const state = useViewStore.getState()

    expect(state.context).toEqual({ kind: 'all' })
    expect(state.searchQuery).toBe('')
    expect(state.viewMode).toBe('list')
    expect(state.density).toBe('comfortable')
    expect(state.sidebarCollapsed).toBe(false)
  })

  it('setContext — 카테고리 컨텍스트로 변경한다', async () => {
    const { useViewStore } = await import('./viewStore')
    const { setContext } = useViewStore.getState()

    setContext({ kind: 'category', categoryId: 'cat-1' })
    expect(useViewStore.getState().context).toEqual({ kind: 'category', categoryId: 'cat-1' })
  })

  it('setContext — 태그 컨텍스트로 변경한다', async () => {
    const { useViewStore } = await import('./viewStore')
    const { setContext } = useViewStore.getState()

    setContext({ kind: 'tag', tag: 'ai' })
    expect(useViewStore.getState().context).toEqual({ kind: 'tag', tag: 'ai' })
  })

  it('setContext — 즐겨찾기 컨텍스트로 변경한다', async () => {
    const { useViewStore } = await import('./viewStore')
    const { setContext } = useViewStore.getState()

    setContext({ kind: 'favorites' })
    expect(useViewStore.getState().context).toEqual({ kind: 'favorites' })
  })

  it('setContext — 전체 컨텍스트로 복귀한다', async () => {
    const { useViewStore } = await import('./viewStore')
    const { setContext } = useViewStore.getState()

    setContext({ kind: 'category', categoryId: 'cat-1' })
    setContext({ kind: 'all' })
    expect(useViewStore.getState().context).toEqual({ kind: 'all' })
  })

  it('setSearchQuery — 검색어를 설정한다', async () => {
    const { useViewStore } = await import('./viewStore')
    const { setSearchQuery } = useViewStore.getState()

    setSearchQuery('chat')
    expect(useViewStore.getState().searchQuery).toBe('chat')
  })

  it('setSearchQuery — 빈 문자열로 초기화한다', async () => {
    const { useViewStore } = await import('./viewStore')
    const { setSearchQuery } = useViewStore.getState()

    setSearchQuery('hello')
    setSearchQuery('')
    expect(useViewStore.getState().searchQuery).toBe('')
  })

  it('setViewMode — list 모드로 변경한다', async () => {
    const { useViewStore } = await import('./viewStore')
    const { setViewMode } = useViewStore.getState()

    setViewMode('list')
    expect(useViewStore.getState().viewMode).toBe('list')
  })

  it('setViewMode — grid 모드로 변경한다', async () => {
    const { useViewStore } = await import('./viewStore')
    const { setViewMode } = useViewStore.getState()

    setViewMode('grid')
    expect(useViewStore.getState().viewMode).toBe('grid')
  })

  it('setDensity — compact 밀도로 변경한다', async () => {
    const { useViewStore } = await import('./viewStore')
    const { setDensity } = useViewStore.getState()

    setDensity('compact')
    expect(useViewStore.getState().density).toBe('compact')
  })

  it('setDensity — comfortable 밀도로 변경한다', async () => {
    const { useViewStore } = await import('./viewStore')
    const { setDensity } = useViewStore.getState()

    setDensity('comfortable')
    expect(useViewStore.getState().density).toBe('comfortable')
  })

  it('setDensity — spacious 밀도로 변경한다', async () => {
    const { useViewStore } = await import('./viewStore')
    const { setDensity } = useViewStore.getState()

    setDensity('spacious')
    expect(useViewStore.getState().density).toBe('spacious')
  })

  it('toggleSidebar — 사이드바 접힘 상태를 토글한다', async () => {
    const { useViewStore } = await import('./viewStore')
    const { toggleSidebar } = useViewStore.getState()

    expect(useViewStore.getState().sidebarCollapsed).toBe(false)
    toggleSidebar()
    expect(useViewStore.getState().sidebarCollapsed).toBe(true)
    toggleSidebar()
    expect(useViewStore.getState().sidebarCollapsed).toBe(false)
  })

  it('setContext — 컨텍스트 변경 시 검색어를 초기화한다', async () => {
    const { useViewStore } = await import('./viewStore')
    const { setContext, setSearchQuery } = useViewStore.getState()

    setSearchQuery('test query')
    setContext({ kind: 'favorites' })
    expect(useViewStore.getState().searchQuery).toBe('')
  })

  it('DENSITY_ITEM_SIZE — 밀도별 행 높이 매핑을 제공한다', async () => {
    const { DENSITY_ITEM_SIZE } = await import('./viewStore')

    expect(DENSITY_ITEM_SIZE.compact).toBe(40)
    expect(DENSITY_ITEM_SIZE.comfortable).toBe(56)
    expect(DENSITY_ITEM_SIZE.spacious).toBe(72)
  })
})
