// editModeStore의 전역 편집 모드 상태를 검증하는 단위 테스트 (SPEC-UX-007, SPEC-UX-010)
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useEditModeStore } from './editModeStore'

// localStorage 모킹 — SPEC-UX-010 영속화 검증용
const mockSetItem = vi.fn()
const mockGetItem = vi.fn(() => null)
Object.defineProperty(window, 'localStorage', {
  value: {
    setItem: mockSetItem,
    getItem: mockGetItem,
    removeItem: vi.fn(),
    clear: vi.fn(),
  },
  writable: true,
})

// AC-001: 초기값 false
// AC-002: toggle / set 동작
// REQ-UX-007-001, REQ-UX-007-020

describe('editModeStore', () => {
  beforeEach(() => {
    // 각 테스트 전 스토어를 초기 상태로 리셋
    useEditModeStore.setState({ isEditing: false, autoExitEnabled: true, hideEmptyCategories: false })
    mockSetItem.mockClear()
    mockGetItem.mockReturnValue(null)
  })

  it('초기값은 false여야 한다 (AC-001)', () => {
    const { isEditing } = useEditModeStore.getState()
    expect(isEditing).toBe(false)
  })

  it('toggle 호출 시 isEditing이 true로 반전되어야 한다 (AC-002)', () => {
    const { toggle } = useEditModeStore.getState()
    toggle()
    expect(useEditModeStore.getState().isEditing).toBe(true)
  })

  it('toggle을 두 번 호출하면 다시 false로 돌아와야 한다 (AC-002)', () => {
    const { toggle } = useEditModeStore.getState()
    toggle()
    toggle()
    expect(useEditModeStore.getState().isEditing).toBe(false)
  })

  it('set(true) 호출 시 isEditing === true이어야 한다 (AC-002)', () => {
    const { set } = useEditModeStore.getState()
    set(true)
    expect(useEditModeStore.getState().isEditing).toBe(true)
  })

  it('set(false) 호출 시 isEditing === false이어야 한다 (AC-002)', () => {
    const { set } = useEditModeStore.getState()
    set(true)
    set(false)
    expect(useEditModeStore.getState().isEditing).toBe(false)
  })

  it('set(false)는 이미 false인 상태에서 idempotent이어야 한다', () => {
    const { set } = useEditModeStore.getState()
    set(false)
    expect(useEditModeStore.getState().isEditing).toBe(false)
  })

  // SPEC-UX-010 REQ-UX-010-008: autoExitEnabled 초기값 및 영속화
  it('autoExitEnabled 초기값은 true여야 한다', () => {
    const { autoExitEnabled } = useEditModeStore.getState()
    expect(autoExitEnabled).toBe(true)
  })

  it('setAutoExitEnabled(false) 호출 시 autoExitEnabled가 false가 된다', () => {
    useEditModeStore.getState().setAutoExitEnabled(false)
    expect(useEditModeStore.getState().autoExitEnabled).toBe(false)
  })

  it('setAutoExitEnabled 호출 시 localStorage.setItem이 호출된다', () => {
    useEditModeStore.getState().setAutoExitEnabled(false)
    expect(mockSetItem).toHaveBeenCalledWith('edit-mode-auto-exit', 'false')
  })

  // SPEC-UX-010 REQ-UX-010-011: hideEmptyCategories 초기값 및 영속화
  it('hideEmptyCategories 초기값은 false여야 한다', () => {
    const { hideEmptyCategories } = useEditModeStore.getState()
    expect(hideEmptyCategories).toBe(false)
  })

  it('setHideEmptyCategories(true) 호출 시 hideEmptyCategories가 true가 된다', () => {
    useEditModeStore.getState().setHideEmptyCategories(true)
    expect(useEditModeStore.getState().hideEmptyCategories).toBe(true)
  })

  it('setHideEmptyCategories 호출 시 localStorage.setItem이 호출된다', () => {
    useEditModeStore.getState().setHideEmptyCategories(true)
    expect(mockSetItem).toHaveBeenCalledWith('hide-empty-categories', 'true')
  })
})
