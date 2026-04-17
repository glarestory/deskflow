// @MX:SPEC: SPEC-UX-002
// commandStore 단위 테스트 — 팔레트 열기/닫기/쿼리/선택 인덱스 상태 관리
import { describe, it, expect, beforeEach, vi } from 'vitest'

describe('commandStore', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('초기 상태: isOpen=false, query="", selectedIndex=0', async () => {
    const { useCommandStore } = await import('./commandStore')
    const state = useCommandStore.getState()
    expect(state.isOpen).toBe(false)
    expect(state.query).toBe('')
    expect(state.selectedIndex).toBe(0)
  })

  it('open() 호출 시 isOpen=true', async () => {
    const { useCommandStore } = await import('./commandStore')
    useCommandStore.getState().open()
    expect(useCommandStore.getState().isOpen).toBe(true)
  })

  it('close() 호출 시 isOpen=false', async () => {
    const { useCommandStore } = await import('./commandStore')
    useCommandStore.getState().open()
    useCommandStore.getState().close()
    expect(useCommandStore.getState().isOpen).toBe(false)
  })

  it('close() 호출 시 query와 selectedIndex가 초기화된다', async () => {
    const { useCommandStore } = await import('./commandStore')
    const store = useCommandStore.getState()
    store.open()
    store.setQuery('test')
    store.setSelectedIndex(3)
    store.close()

    const state = useCommandStore.getState()
    expect(state.query).toBe('')
    expect(state.selectedIndex).toBe(0)
  })

  it('setQuery() 호출 시 query 업데이트', async () => {
    const { useCommandStore } = await import('./commandStore')
    useCommandStore.getState().setQuery('github')
    expect(useCommandStore.getState().query).toBe('github')
  })

  it('setQuery() 호출 시 selectedIndex가 0으로 리셋된다', async () => {
    const { useCommandStore } = await import('./commandStore')
    const store = useCommandStore.getState()
    store.setSelectedIndex(5)
    store.setQuery('new query')
    expect(useCommandStore.getState().selectedIndex).toBe(0)
  })

  it('setSelectedIndex() 호출 시 selectedIndex 업데이트', async () => {
    const { useCommandStore } = await import('./commandStore')
    useCommandStore.getState().setSelectedIndex(3)
    expect(useCommandStore.getState().selectedIndex).toBe(3)
  })

  it('toggle() 호출 시 isOpen 반전', async () => {
    const { useCommandStore } = await import('./commandStore')
    const store = useCommandStore.getState()

    expect(store.isOpen).toBe(false)
    store.toggle()
    expect(useCommandStore.getState().isOpen).toBe(true)
    store.toggle()
    expect(useCommandStore.getState().isOpen).toBe(false)
  })

  it('reset() 호출 시 모든 상태 초기화', async () => {
    const { useCommandStore } = await import('./commandStore')
    const store = useCommandStore.getState()
    store.open()
    store.setQuery('test')
    store.setSelectedIndex(5)
    store.reset()

    const state = useCommandStore.getState()
    expect(state.isOpen).toBe(false)
    expect(state.query).toBe('')
    expect(state.selectedIndex).toBe(0)
  })
})
