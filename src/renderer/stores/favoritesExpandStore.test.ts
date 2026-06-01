// favoritesExpandStore 단위 테스트 — SPEC-UX-012: 즐겨찾기 확장 상태 store
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act } from 'react'

// localStorage 모킹
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value }),
    removeItem: vi.fn((key: string) => { delete store[key] }),
    clear: vi.fn(() => { store = {} }),
  }
})()

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true,
})

describe('useFavoritesExpandStore (SPEC-UX-012)', () => {
  beforeEach(async () => {
    localStorageMock.clear()
    vi.clearAllMocks()
    // 각 테스트 전 모듈 캐시 초기화 — store 상태 완전 리셋
    vi.resetModules()
    // localStorage mock을 빈 상태로 초기화 (getItem이 null 반환)
    localStorageMock.getItem.mockReturnValue(null)
  })

  // AC-005: 최초 실행 기본 = 모두 펼침
  it('localStorage에 키가 없으면 모든 카테고리를 펼침으로 반환한다 (AC-005)', async () => {
    const { useFavoritesExpandStore } = await import('./favoritesExpandStore')
    const state = useFavoritesExpandStore.getState()
    expect(state.isExpanded('cat-1')).toBe(true)
    expect(state.isExpanded('cat-2')).toBe(true)
    expect(state.isExpanded('any-unknown-id')).toBe(true)
  })

  // AC-006: 영속화 map에 없는 신규 카테고리 = 펼침
  it('영속화된 map에 없는 카테고리 id는 펼침(true)을 반환한다 (AC-006)', async () => {
    // A: false, B: true만 저장된 상태
    localStorageMock.getItem.mockReturnValue(JSON.stringify({ 'A': false, 'B': true }))
    const { useFavoritesExpandStore } = await import('./favoritesExpandStore')
    const state = useFavoritesExpandStore.getState()
    expect(state.isExpanded('A')).toBe(false)
    expect(state.isExpanded('B')).toBe(true)
    // D는 map에 없으므로 기본값 true
    expect(state.isExpanded('D')).toBe(true)
  })

  // AC-004: 확장 상태 localStorage 영속화
  it('toggleExpand 호출 시 localStorage에 저장한다 (AC-004)', async () => {
    const { useFavoritesExpandStore } = await import('./favoritesExpandStore')
    act(() => {
      useFavoritesExpandStore.getState().toggleExpand('cat-1')
    })
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'favorites-expanded',
      expect.stringContaining('"cat-1":false')
    )
    expect(useFavoritesExpandStore.getState().isExpanded('cat-1')).toBe(false)
  })

  // 재토글 시 true 복원
  it('접힌 카테고리를 다시 toggleExpand하면 펼침(true)으로 복원된다', async () => {
    const { useFavoritesExpandStore } = await import('./favoritesExpandStore')
    act(() => { useFavoritesExpandStore.getState().toggleExpand('cat-1') })
    expect(useFavoritesExpandStore.getState().isExpanded('cat-1')).toBe(false)
    act(() => { useFavoritesExpandStore.getState().toggleExpand('cat-1') })
    expect(useFavoritesExpandStore.getState().isExpanded('cat-1')).toBe(true)
  })

  // AC-003: 멀티 확장 — 한 카테고리 토글이 다른 카테고리에 영향 없음
  it('한 카테고리를 접어도 다른 카테고리는 펼침 상태를 유지한다 (AC-003)', async () => {
    const { useFavoritesExpandStore } = await import('./favoritesExpandStore')
    // 초기 상태 확인 (모두 true)
    expect(useFavoritesExpandStore.getState().isExpanded('A')).toBe(true)
    expect(useFavoritesExpandStore.getState().isExpanded('B')).toBe(true)
    expect(useFavoritesExpandStore.getState().isExpanded('C')).toBe(true)
    // B만 토글 → false
    act(() => { useFavoritesExpandStore.getState().toggleExpand('B') })
    expect(useFavoritesExpandStore.getState().isExpanded('B')).toBe(false)
    // A, C는 expanded map에 없으므로 여전히 기본값 true
    // (toggleExpand는 해당 id만 map에 추가하므로 A, C 키 없음 → true)
    const expandedMap = useFavoritesExpandStore.getState().expanded
    expect('A' in expandedMap).toBe(false)
    expect('C' in expandedMap).toBe(false)
    expect(useFavoritesExpandStore.getState().isExpanded('A')).toBe(true)
    expect(useFavoritesExpandStore.getState().isExpanded('C')).toBe(true)
  })

  // EDGE-001: localStorage JSON 파싱 실패 시 graceful fallback
  it('손상된 JSON이 있어도 에러 없이 빈 map으로 초기화된다 (EDGE-001)', async () => {
    localStorageMock.getItem.mockReturnValue('not-json-value')
    const { useFavoritesExpandStore } = await import('./favoritesExpandStore')
    // 파싱 실패 → {} → 모든 id 펼침
    expect(useFavoritesExpandStore.getState().isExpanded('any')).toBe(true)
  })

  // setExpanded 직접 설정
  it('setExpanded로 특정 카테고리의 확장 상태를 직접 설정할 수 있다', async () => {
    const { useFavoritesExpandStore } = await import('./favoritesExpandStore')
    act(() => { useFavoritesExpandStore.getState().setExpanded('cat-X', false) })
    expect(useFavoritesExpandStore.getState().isExpanded('cat-X')).toBe(false)
    act(() => { useFavoritesExpandStore.getState().setExpanded('cat-X', true) })
    expect(useFavoritesExpandStore.getState().isExpanded('cat-X')).toBe(true)
  })

  // localStorage 복원 — 영속화된 상태 재초기화
  it('localStorage에 저장된 상태를 초기화 시 복원한다 (AC-004)', async () => {
    // 미리 A=false로 저장
    localStorageMock.getItem.mockReturnValue(JSON.stringify({ 'A': false }))
    const { useFavoritesExpandStore } = await import('./favoritesExpandStore')
    expect(useFavoritesExpandStore.getState().isExpanded('A')).toBe(false)
    // B는 없으므로 true
    expect(useFavoritesExpandStore.getState().isExpanded('B')).toBe(true)
  })
})
