// layoutStore 단위 테스트 — REQ-003, REQ-004, REQ-005, REQ-006, REQ-007 검증
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGet = vi.fn()
const mockSet = vi.fn()

vi.mock('../lib/storage', () => ({
  storage: {
    get: mockGet,
    set: mockSet,
  },
}))

describe('layoutStore', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    vi.resetModules()
    // storage 모킹 재설정
    vi.mock('../lib/storage', () => ({
      storage: {
        get: mockGet,
        set: mockSet,
      },
    }))
  })

  // REQ-007: 12열 그리드 기반 (SPEC-WIDGET-003 feed 위젯 포함하여 6개)
  it('기본 레이아웃에 6개 위젯이 포함되어야 한다', async () => {
    mockGet.mockResolvedValue({ value: null })
    const { useLayoutStore } = await import('./layoutStore')
    const { layout } = useLayoutStore.getState()
    expect(layout).toHaveLength(6)
  })

  it('기본 레이아웃 위젯 ID가 올바르게 설정되어야 한다', async () => {
    mockGet.mockResolvedValue({ value: null })
    const { useLayoutStore } = await import('./layoutStore')
    const { layout } = useLayoutStore.getState()
    const ids = layout.map((l) => l.i)
    expect(ids).toContain('clock')
    expect(ids).toContain('search')
    expect(ids).toContain('bookmarks')
    expect(ids).toContain('todo')
    expect(ids).toContain('notes')
    // SPEC-WIDGET-003: RSS 피드 위젯
    expect(ids).toContain('feed')
  })

  // REQ-006: 최소 크기 제약 적용
  it('clock 위젯의 기본 위치와 크기가 SPEC과 일치해야 한다', async () => {
    mockGet.mockResolvedValue({ value: null })
    const { useLayoutStore } = await import('./layoutStore')
    const { layout } = useLayoutStore.getState()
    const clock = layout.find((l) => l.i === 'clock')
    expect(clock).toBeDefined()
    expect(clock?.x).toBe(0)
    expect(clock?.y).toBe(0)
    expect(clock?.w).toBe(5)
    expect(clock?.h).toBe(2)
    expect(clock?.minW).toBe(3)
    expect(clock?.minH).toBe(2)
  })

  it('search 위젯의 기본 위치와 크기가 SPEC과 일치해야 한다', async () => {
    mockGet.mockResolvedValue({ value: null })
    const { useLayoutStore } = await import('./layoutStore')
    const { layout } = useLayoutStore.getState()
    const search = layout.find((l) => l.i === 'search')
    expect(search).toBeDefined()
    expect(search?.x).toBe(5)
    expect(search?.y).toBe(0)
    expect(search?.w).toBe(7)
    expect(search?.h).toBe(2)
    expect(search?.minW).toBe(4)
    expect(search?.minH).toBe(2)
  })

  it('bookmarks 위젯의 기본 위치와 크기가 SPEC과 일치해야 한다', async () => {
    mockGet.mockResolvedValue({ value: null })
    const { useLayoutStore } = await import('./layoutStore')
    const { layout } = useLayoutStore.getState()
    const bookmarks = layout.find((l) => l.i === 'bookmarks')
    expect(bookmarks).toBeDefined()
    expect(bookmarks?.x).toBe(0)
    expect(bookmarks?.y).toBe(2)
    expect(bookmarks?.w).toBe(8)
    expect(bookmarks?.h).toBe(5)
    expect(bookmarks?.minW).toBe(4)
    expect(bookmarks?.minH).toBe(4)
  })

  it('todo 위젯의 기본 위치와 크기가 SPEC과 일치해야 한다', async () => {
    mockGet.mockResolvedValue({ value: null })
    const { useLayoutStore } = await import('./layoutStore')
    const { layout } = useLayoutStore.getState()
    const todo = layout.find((l) => l.i === 'todo')
    expect(todo).toBeDefined()
    expect(todo?.x).toBe(8)
    expect(todo?.y).toBe(2)
    expect(todo?.w).toBe(4)
    expect(todo?.h).toBe(5)
    expect(todo?.minW).toBe(3)
    expect(todo?.minH).toBe(3)
  })

  it('notes 위젯의 기본 위치와 크기가 SPEC과 일치해야 한다', async () => {
    mockGet.mockResolvedValue({ value: null })
    const { useLayoutStore } = await import('./layoutStore')
    const { layout } = useLayoutStore.getState()
    const notes = layout.find((l) => l.i === 'notes')
    expect(notes).toBeDefined()
    expect(notes?.x).toBe(8)
    expect(notes?.y).toBe(7)
    expect(notes?.w).toBe(4)
    expect(notes?.h).toBe(4)
    expect(notes?.minW).toBe(3)
    expect(notes?.minH).toBe(3)
  })

  // REQ-003: 레이아웃 변경 저장
  it('updateLayout 실행 시 레이아웃이 업데이트되어야 한다', async () => {
    mockGet.mockResolvedValue({ value: null })
    mockSet.mockResolvedValue(undefined)
    const { useLayoutStore } = await import('./layoutStore')

    const newLayout = [{ i: 'clock', x: 1, y: 1, w: 5, h: 3 }]
    useLayoutStore.getState().updateLayout(newLayout)

    const { layout } = useLayoutStore.getState()
    expect(layout).toEqual(newLayout)
  })

  it('updateLayout 실행 시 storage에 저장해야 한다', async () => {
    mockGet.mockResolvedValue({ value: null })
    mockSet.mockResolvedValue(undefined)
    const { useLayoutStore } = await import('./layoutStore')

    const newLayout = [{ i: 'clock', x: 1, y: 1, w: 5, h: 3 }]
    useLayoutStore.getState().updateLayout(newLayout)

    // 비동기 저장 대기
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(mockSet).toHaveBeenCalledWith('widget-layout', JSON.stringify(newLayout))
  })

  // REQ-004: 저장된 레이아웃 복원
  it('loadLayout 실행 시 storage에서 레이아웃을 불러와야 한다', async () => {
    const savedLayout = [
      { i: 'clock', x: 2, y: 2, w: 6, h: 4, minW: 3, minH: 2 },
    ]
    mockGet.mockResolvedValue({ value: JSON.stringify(savedLayout) })
    const { useLayoutStore } = await import('./layoutStore')
    await useLayoutStore.getState().loadLayout()

    expect(useLayoutStore.getState().layout).toEqual(savedLayout)
    expect(useLayoutStore.getState().loaded).toBe(true)
  })

  it('loadLayout에서 storage 값이 없으면 기본 레이아웃을 사용해야 한다', async () => {
    mockGet.mockResolvedValue({ value: null })
    const { DEFAULT_LAYOUT, useLayoutStore } = await import('./layoutStore')
    await useLayoutStore.getState().loadLayout()

    expect(useLayoutStore.getState().layout).toEqual(DEFAULT_LAYOUT)
    expect(useLayoutStore.getState().loaded).toBe(true)
  })

  // REQ-005: 레이아웃 초기화
  it('resetLayout 실행 시 기본 레이아웃으로 복귀해야 한다', async () => {
    mockGet.mockResolvedValue({ value: null })
    mockSet.mockResolvedValue(undefined)
    const { DEFAULT_LAYOUT, useLayoutStore } = await import('./layoutStore')

    // 먼저 레이아웃을 변경
    useLayoutStore.getState().updateLayout([{ i: 'clock', x: 5, y: 5, w: 2, h: 2 }])
    expect(useLayoutStore.getState().layout).not.toEqual(DEFAULT_LAYOUT)

    // 초기화
    useLayoutStore.getState().resetLayout()
    expect(useLayoutStore.getState().layout).toEqual(DEFAULT_LAYOUT)
  })

  it('resetLayout 실행 시 storage를 기본값으로 초기화해야 한다', async () => {
    mockGet.mockResolvedValue({ value: null })
    mockSet.mockResolvedValue(undefined)
    const { DEFAULT_LAYOUT, useLayoutStore } = await import('./layoutStore')

    mockSet.mockClear()
    useLayoutStore.getState().resetLayout()

    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(mockSet).toHaveBeenCalledWith('widget-layout', JSON.stringify(DEFAULT_LAYOUT))
  })
})
