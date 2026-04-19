// @MX:SPEC: SPEC-CAPSULE-001
// Phase 1 & 2 & 4 단위 테스트 — RED-GREEN-REFACTOR

import { describe, it, expect, vi, beforeEach } from 'vitest'

// storage 모킹
const mockGet = vi.fn()
const mockSet = vi.fn()

vi.mock('../lib/storage', () => ({
  storage: {
    get: (...args: unknown[]) => mockGet(...args),
    set: (...args: unknown[]) => mockSet(...args),
  },
}))

// 다른 스토어 모킹 (Phase 3 통합 테스트에서만 실제 연결 확인)
vi.mock('./viewModeStore', () => ({
  useViewModeStore: {
    getState: vi.fn(() => ({ setMode: vi.fn(), mode: 'pivot' })),
  },
}))

vi.mock('./viewStore', () => ({
  useViewStore: {
    getState: vi.fn(() => ({ setContext: vi.fn(), context: { kind: 'all' } })),
  },
}))

vi.mock('./pomodoroStore', () => ({
  usePomodoroStore: {
    getState: vi.fn(() => ({
      updateSettings: vi.fn(),
      settings: { focusMinutes: 25, breakMinutes: 5, longBreakMinutes: 15 },
    })),
  },
}))

describe('capsuleStore — Phase 1: 도메인 모델 & 기본 CRUD (SPEC-CAPSULE-001)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    mockGet.mockResolvedValue({ value: null })
    mockSet.mockResolvedValue(undefined)
  })

  // ── AC-001: createCapsule ──────────────────────────────────────────────
  it('AC-001: createCapsule 시 id·createdAt·updatedAt·metrics가 자동 설정된다', async () => {
    const { useCapsuleStore } = await import('./capsuleStore')
    const capsule = useCapsuleStore.getState().createCapsule({ name: '테스트 캡슐' })

    expect(capsule.id).toBeTruthy()
    expect(capsule.id).toHaveLength(7) // Math.random().toString(36).slice(2, 9) 패턴
    expect(capsule.createdAt).toBeTruthy()
    expect(capsule.updatedAt).toBeTruthy()
    expect(capsule.metrics).toEqual({
      focusMinutes: 0,
      completedTodos: 0,
      activationCount: 0,
    })
  })

  it('AC-001: createCapsule 시 배열 필드가 빈 배열로 초기화된다', async () => {
    const { useCapsuleStore } = await import('./capsuleStore')
    const capsule = useCapsuleStore.getState().createCapsule({ name: '배열 초기화 테스트' })

    expect(capsule.bookmarkIds).toEqual([])
    expect(capsule.todoIds).toEqual([])
    expect(capsule.noteIds).toEqual([])
    expect(capsule.tags).toEqual([])
  })

  it('AC-001: createCapsule 시 archived=false, pivotContext=null, viewMode=null, pomodoroPreset=null', async () => {
    const { useCapsuleStore } = await import('./capsuleStore')
    const capsule = useCapsuleStore.getState().createCapsule({ name: '기본값 테스트' })

    expect(capsule.archived).toBe(false)
    expect(capsule.pivotContext).toBeNull()
    expect(capsule.viewMode).toBeNull()
    expect(capsule.pomodoroPreset).toBeNull()
    expect(capsule.lastActivatedAt).toBeNull()
  })

  it('createCapsule 시 스토어의 capsules 배열에 추가된다', async () => {
    const { useCapsuleStore } = await import('./capsuleStore')
    useCapsuleStore.setState({ capsules: [], loaded: true })

    useCapsuleStore.getState().createCapsule({ name: '스토어 추가 테스트' })

    expect(useCapsuleStore.getState().capsules).toHaveLength(1)
    expect(useCapsuleStore.getState().capsules[0].name).toBe('스토어 추가 테스트')
  })

  it('createCapsule 시 emoji 기본값은 📦이다', async () => {
    const { useCapsuleStore } = await import('./capsuleStore')
    const capsule = useCapsuleStore.getState().createCapsule({ name: '이모지 기본값 테스트' })

    expect(capsule.emoji).toBe('📦')
  })

  it('createCapsule 시 emoji를 커스텀으로 지정할 수 있다', async () => {
    const { useCapsuleStore } = await import('./capsuleStore')
    const capsule = useCapsuleStore.getState().createCapsule({ name: '커스텀 이모지', emoji: '🔐' })

    expect(capsule.emoji).toBe('🔐')
  })

  // ── AC-002: updateCapsule ─────────────────────────────────────────────
  it('AC-002: updateCapsule 시 updatedAt이 갱신된다', async () => {
    const { useCapsuleStore } = await import('./capsuleStore')
    useCapsuleStore.setState({ capsules: [], loaded: true })

    const capsule = useCapsuleStore.getState().createCapsule({ name: '수정 테스트' })
    const originalUpdatedAt = capsule.updatedAt

    // 1ms 대기 후 업데이트 (시각 차이 보장)
    await new Promise((resolve) => setTimeout(resolve, 1))
    useCapsuleStore.getState().updateCapsule(capsule.id, { name: '수정된 이름' })

    const updated = useCapsuleStore.getState().capsules.find((c) => c.id === capsule.id)
    expect(updated?.name).toBe('수정된 이름')
    expect(updated?.updatedAt).not.toBe(originalUpdatedAt)
  })

  it('updateCapsule 시 다른 필드는 유지된다', async () => {
    const { useCapsuleStore } = await import('./capsuleStore')
    useCapsuleStore.setState({ capsules: [], loaded: true })

    const capsule = useCapsuleStore.getState().createCapsule({
      name: '원본',
      emoji: '🎯',
      tags: ['react', 'typescript'],
    })

    useCapsuleStore.getState().updateCapsule(capsule.id, { name: '수정된 이름' })

    const updated = useCapsuleStore.getState().capsules.find((c) => c.id === capsule.id)
    expect(updated?.emoji).toBe('🎯')
    expect(updated?.tags).toEqual(['react', 'typescript'])
  })

  // ── deleteCapsule ─────────────────────────────────────────────────────
  it('deleteCapsule 시 capsules 배열에서 제거된다', async () => {
    const { useCapsuleStore } = await import('./capsuleStore')
    useCapsuleStore.setState({ capsules: [], loaded: true })

    const c1 = useCapsuleStore.getState().createCapsule({ name: '캡슐1' })
    const c2 = useCapsuleStore.getState().createCapsule({ name: '캡슐2' })

    useCapsuleStore.getState().deleteCapsule(c1.id)

    const capsules = useCapsuleStore.getState().capsules
    expect(capsules).toHaveLength(1)
    expect(capsules[0].id).toBe(c2.id)
  })

  it('AC-031: deleteCapsule 시 연결된 북마크/Todo/메모는 그대로 유지된다 (참조 해제만)', async () => {
    const { useCapsuleStore } = await import('./capsuleStore')
    useCapsuleStore.setState({ capsules: [], loaded: true })

    const capsule = useCapsuleStore.getState().createCapsule({
      name: '삭제 테스트',
      bookmarkIds: ['bm-1', 'bm-2'],
      todoIds: ['td-1'],
    })

    useCapsuleStore.getState().deleteCapsule(capsule.id)

    // 캡슐이 사라졌는지 확인
    expect(useCapsuleStore.getState().capsules.find((c) => c.id === capsule.id)).toBeUndefined()
    // 이 테스트에서 bookmarkStore/todoStore는 mock이므로 데이터 유지 여부는 통합 테스트에서 검증
  })

  // ── AC-032: 활성 캡슐 삭제 시 activeCapsuleId → null ─────────────────
  it('AC-032: 활성 캡슐을 삭제하면 activeCapsuleId가 null로 바뀐다', async () => {
    const { useCapsuleStore } = await import('./capsuleStore')
    useCapsuleStore.setState({ capsules: [], loaded: true })

    const capsule = useCapsuleStore.getState().createCapsule({ name: '활성 캡슐' })
    useCapsuleStore.setState({ activeCapsuleId: capsule.id })

    useCapsuleStore.getState().deleteCapsule(capsule.id)

    expect(useCapsuleStore.getState().activeCapsuleId).toBeNull()
  })

  it('비활성 캡슐을 삭제해도 activeCapsuleId가 변경되지 않는다', async () => {
    const { useCapsuleStore } = await import('./capsuleStore')
    useCapsuleStore.setState({ capsules: [], loaded: true })

    const c1 = useCapsuleStore.getState().createCapsule({ name: '활성 캡슐' })
    const c2 = useCapsuleStore.getState().createCapsule({ name: '비활성 캡슐' })
    useCapsuleStore.setState({ activeCapsuleId: c1.id })

    useCapsuleStore.getState().deleteCapsule(c2.id)

    expect(useCapsuleStore.getState().activeCapsuleId).toBe(c1.id)
  })

  // ── archiveCapsule ────────────────────────────────────────────────────
  it('archiveCapsule(id, true) 시 archived 플래그가 true로 갱신된다', async () => {
    const { useCapsuleStore } = await import('./capsuleStore')
    useCapsuleStore.setState({ capsules: [], loaded: true })

    const capsule = useCapsuleStore.getState().createCapsule({ name: '보관 테스트' })
    useCapsuleStore.getState().archiveCapsule(capsule.id, true)

    const archived = useCapsuleStore.getState().capsules.find((c) => c.id === capsule.id)
    expect(archived?.archived).toBe(true)
  })

  it('archiveCapsule(id, false) 시 archived 플래그가 false로 복원된다', async () => {
    const { useCapsuleStore } = await import('./capsuleStore')
    useCapsuleStore.setState({ capsules: [], loaded: true })

    const capsule = useCapsuleStore.getState().createCapsule({ name: '복원 테스트' })
    useCapsuleStore.getState().archiveCapsule(capsule.id, true)
    useCapsuleStore.getState().archiveCapsule(capsule.id, false)

    const restored = useCapsuleStore.getState().capsules.find((c) => c.id === capsule.id)
    expect(restored?.archived).toBe(false)
  })
})

describe('capsuleStore — Phase 2: 영속화 & 로드 (SPEC-CAPSULE-001)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    mockGet.mockResolvedValue({ value: null })
    mockSet.mockResolvedValue(undefined)
  })

  // ── AC-005: loadCapsules → state 복원 ────────────────────────────────
  it('AC-005: loadCapsules 후 capsules가 이전 세션 값으로 복원된다', async () => {
    const savedCapsules = [
      {
        id: 'cap-1',
        name: '저장된 캡슐',
        emoji: '📦',
        bookmarkIds: [],
        todoIds: [],
        noteIds: [],
        tags: [],
        pivotContext: null,
        viewMode: null,
        pomodoroPreset: null,
        createdAt: '2026-04-19T00:00:00.000Z',
        updatedAt: '2026-04-19T00:00:00.000Z',
        lastActivatedAt: null,
        archived: false,
        metrics: { focusMinutes: 0, completedTodos: 0, activationCount: 0 },
      },
    ]

    mockGet.mockImplementation((key: string) => {
      if (key === 'capsules') return Promise.resolve({ value: JSON.stringify(savedCapsules) })
      if (key === 'active-capsule-id') return Promise.resolve({ value: JSON.stringify(null) })
      if (key === 'capsule-settings') return Promise.resolve({ value: null })
      return Promise.resolve({ value: null })
    })

    const { useCapsuleStore } = await import('./capsuleStore')
    await useCapsuleStore.getState().loadCapsules()

    const state = useCapsuleStore.getState()
    expect(state.capsules).toHaveLength(1)
    expect(state.capsules[0].name).toBe('저장된 캡슐')
    expect(state.loaded).toBe(true)
  })

  it('AC-005: loadCapsules 후 activeCapsuleId가 복원된다', async () => {
    const savedCapsules = [
      {
        id: 'cap-1',
        name: '저장된 캡슐',
        emoji: '📦',
        bookmarkIds: [],
        todoIds: [],
        noteIds: [],
        tags: [],
        pivotContext: null,
        viewMode: null,
        pomodoroPreset: null,
        createdAt: '2026-04-19T00:00:00.000Z',
        updatedAt: '2026-04-19T00:00:00.000Z',
        lastActivatedAt: null,
        archived: false,
        metrics: { focusMinutes: 0, completedTodos: 0, activationCount: 0 },
      },
    ]

    mockGet.mockImplementation((key: string) => {
      if (key === 'capsules') return Promise.resolve({ value: JSON.stringify(savedCapsules) })
      if (key === 'active-capsule-id') return Promise.resolve({ value: JSON.stringify('cap-1') })
      if (key === 'capsule-settings') return Promise.resolve({ value: null })
      return Promise.resolve({ value: null })
    })

    const { useCapsuleStore } = await import('./capsuleStore')
    await useCapsuleStore.getState().loadCapsules()

    expect(useCapsuleStore.getState().activeCapsuleId).toBe('cap-1')
  })

  it('AC-005: loadCapsules 후 autoAddToActive·filterByCapsule 설정이 복원된다', async () => {
    mockGet.mockImplementation((key: string) => {
      if (key === 'capsules') return Promise.resolve({ value: JSON.stringify([]) })
      if (key === 'active-capsule-id') return Promise.resolve({ value: JSON.stringify(null) })
      if (key === 'capsule-settings')
        return Promise.resolve({
          value: JSON.stringify({ autoAddToActive: false, filterByCapsule: true }),
        })
      return Promise.resolve({ value: null })
    })

    const { useCapsuleStore } = await import('./capsuleStore')
    await useCapsuleStore.getState().loadCapsules()

    const state = useCapsuleStore.getState()
    expect(state.autoAddToActive).toBe(false)
    expect(state.filterByCapsule).toBe(true)
  })

  // ── AC-003: create/update/delete 시 storage.set 호출 ──────────────────
  it('AC-003: createCapsule 시 storage에 저장된다', async () => {
    const { useCapsuleStore } = await import('./capsuleStore')
    useCapsuleStore.setState({ capsules: [], loaded: true })

    useCapsuleStore.getState().createCapsule({ name: '저장 테스트' })

    expect(mockSet).toHaveBeenCalledWith('capsules', expect.any(String))
  })

  it('AC-003: updateCapsule 시 storage에 저장된다', async () => {
    const { useCapsuleStore } = await import('./capsuleStore')
    useCapsuleStore.setState({ capsules: [], loaded: true })

    const capsule = useCapsuleStore.getState().createCapsule({ name: '업데이트 테스트' })
    vi.clearAllMocks()

    useCapsuleStore.getState().updateCapsule(capsule.id, { name: '수정됨' })

    expect(mockSet).toHaveBeenCalledWith('capsules', expect.any(String))
  })

  it('AC-003: deleteCapsule 시 storage에 저장된다', async () => {
    const { useCapsuleStore } = await import('./capsuleStore')
    useCapsuleStore.setState({ capsules: [], loaded: true })

    const capsule = useCapsuleStore.getState().createCapsule({ name: '삭제 테스트' })
    vi.clearAllMocks()

    useCapsuleStore.getState().deleteCapsule(capsule.id)

    expect(mockSet).toHaveBeenCalledWith('capsules', expect.any(String))
  })

  it('active-capsule-id가 별도 키로 저장된다', async () => {
    const { useCapsuleStore } = await import('./capsuleStore')
    useCapsuleStore.setState({ capsules: [], loaded: true })

    const capsule = useCapsuleStore.getState().createCapsule({ name: '활성화 저장 테스트' })
    useCapsuleStore.setState({ activeCapsuleId: capsule.id })

    // activateCapsule 호출 시 active-capsule-id 저장 확인
    await useCapsuleStore.getState().activateCapsule(capsule.id)

    expect(mockSet).toHaveBeenCalledWith('active-capsule-id', expect.any(String))
  })

  it('loadCapsules 실패 시 기본 빈 상태로 loaded=true', async () => {
    mockGet.mockRejectedValue(new Error('storage error'))

    const { useCapsuleStore } = await import('./capsuleStore')
    await useCapsuleStore.getState().loadCapsules()

    const state = useCapsuleStore.getState()
    expect(state.capsules).toEqual([])
    expect(state.loaded).toBe(true)
  })
})

describe('capsuleStore — Phase 4: 데이터 일관성 (SPEC-CAPSULE-001)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    mockGet.mockResolvedValue({ value: null })
    mockSet.mockResolvedValue(undefined)
  })

  // ── AC-029/030: purgeOrphan ───────────────────────────────────────────
  it('AC-029: purgeOrphan("bookmark", "bm-1") 시 모든 캡슐 bookmarkIds에서 제거된다', async () => {
    const { useCapsuleStore } = await import('./capsuleStore')

    const cap1 = {
      id: 'cap-1',
      name: 'A',
      emoji: '📦',
      bookmarkIds: ['bm-1', 'bm-2'],
      todoIds: [],
      noteIds: [],
      tags: [],
      pivotContext: null as null,
      viewMode: null as null,
      pomodoroPreset: null as null,
      createdAt: '2026-04-19T00:00:00.000Z',
      updatedAt: '2026-04-19T00:00:00.000Z',
      lastActivatedAt: null as null,
      archived: false,
      metrics: { focusMinutes: 0, completedTodos: 0, activationCount: 0 },
    }
    const cap2 = { ...cap1, id: 'cap-2', name: 'B', bookmarkIds: ['bm-1', 'bm-3'] }

    useCapsuleStore.setState({ capsules: [cap1, cap2], loaded: true })

    useCapsuleStore.getState().purgeOrphan('bookmark', 'bm-1')

    const state = useCapsuleStore.getState()
    expect(state.capsules.find((c) => c.id === 'cap-1')?.bookmarkIds).toEqual(['bm-2'])
    expect(state.capsules.find((c) => c.id === 'cap-2')?.bookmarkIds).toEqual(['bm-3'])
  })

  it('AC-030: purgeOrphan("todo", "td-1") 시 모든 캡슐 todoIds에서 제거된다', async () => {
    const { useCapsuleStore } = await import('./capsuleStore')

    const cap = {
      id: 'cap-1',
      name: 'A',
      emoji: '📦',
      bookmarkIds: [],
      todoIds: ['td-1', 'td-2'],
      noteIds: [],
      tags: [],
      pivotContext: null as null,
      viewMode: null as null,
      pomodoroPreset: null as null,
      createdAt: '2026-04-19T00:00:00.000Z',
      updatedAt: '2026-04-19T00:00:00.000Z',
      lastActivatedAt: null as null,
      archived: false,
      metrics: { focusMinutes: 0, completedTodos: 0, activationCount: 0 },
    }

    useCapsuleStore.setState({ capsules: [cap], loaded: true })
    useCapsuleStore.getState().purgeOrphan('todo', 'td-1')

    expect(useCapsuleStore.getState().capsules[0].todoIds).toEqual(['td-2'])
  })

  // ── AC-017: addBookmarkToCapsule 중복 무시 ────────────────────────────
  it('AC-017: addBookmarkToCapsule 중복 id는 무시된다', async () => {
    const { useCapsuleStore } = await import('./capsuleStore')

    const cap = {
      id: 'cap-1',
      name: 'A',
      emoji: '📦',
      bookmarkIds: ['bm-1'],
      todoIds: [],
      noteIds: [],
      tags: [],
      pivotContext: null as null,
      viewMode: null as null,
      pomodoroPreset: null as null,
      createdAt: '2026-04-19T00:00:00.000Z',
      updatedAt: '2026-04-19T00:00:00.000Z',
      lastActivatedAt: null as null,
      archived: false,
      metrics: { focusMinutes: 0, completedTodos: 0, activationCount: 0 },
    }

    useCapsuleStore.setState({ capsules: [cap], loaded: true })

    useCapsuleStore.getState().addBookmarkToCapsule('cap-1', 'bm-1')

    expect(useCapsuleStore.getState().capsules[0].bookmarkIds).toEqual(['bm-1'])
  })

  it('addBookmarkToCapsule 새 id 추가 시 배열에 포함된다', async () => {
    const { useCapsuleStore } = await import('./capsuleStore')

    const cap = {
      id: 'cap-1',
      name: 'A',
      emoji: '📦',
      bookmarkIds: ['bm-1'],
      todoIds: [],
      noteIds: [],
      tags: [],
      pivotContext: null as null,
      viewMode: null as null,
      pomodoroPreset: null as null,
      createdAt: '2026-04-19T00:00:00.000Z',
      updatedAt: '2026-04-19T00:00:00.000Z',
      lastActivatedAt: null as null,
      archived: false,
      metrics: { focusMinutes: 0, completedTodos: 0, activationCount: 0 },
    }

    useCapsuleStore.setState({ capsules: [cap], loaded: true })

    useCapsuleStore.getState().addBookmarkToCapsule('cap-1', 'bm-2')

    expect(useCapsuleStore.getState().capsules[0].bookmarkIds).toEqual(['bm-1', 'bm-2'])
  })

  // ── AC-033/034/035: incrementMetric ──────────────────────────────────
  it('AC-033: incrementMetric("focusMinutes", 25) 시 metrics.focusMinutes 증가', async () => {
    const { useCapsuleStore } = await import('./capsuleStore')
    useCapsuleStore.setState({ capsules: [], loaded: true })

    const capsule = useCapsuleStore.getState().createCapsule({ name: '메트릭 테스트' })
    useCapsuleStore.getState().incrementMetric(capsule.id, 'focusMinutes', 25)

    const updated = useCapsuleStore.getState().capsules.find((c) => c.id === capsule.id)
    expect(updated?.metrics.focusMinutes).toBe(25)
  })

  it('AC-034: incrementMetric("completedTodos", 1) 시 metrics.completedTodos 증가', async () => {
    const { useCapsuleStore } = await import('./capsuleStore')
    useCapsuleStore.setState({ capsules: [], loaded: true })

    const capsule = useCapsuleStore.getState().createCapsule({ name: '할 일 메트릭 테스트' })
    useCapsuleStore.getState().incrementMetric(capsule.id, 'completedTodos', 1)

    const updated = useCapsuleStore.getState().capsules.find((c) => c.id === capsule.id)
    expect(updated?.metrics.completedTodos).toBe(1)
  })

  // ── toggleAutoAdd / toggleFilterByCapsule ─────────────────────────────
  it('toggleAutoAdd 시 autoAddToActive가 토글된다', async () => {
    const { useCapsuleStore } = await import('./capsuleStore')
    useCapsuleStore.setState({ autoAddToActive: true })

    useCapsuleStore.getState().toggleAutoAdd()
    expect(useCapsuleStore.getState().autoAddToActive).toBe(false)

    useCapsuleStore.getState().toggleAutoAdd()
    expect(useCapsuleStore.getState().autoAddToActive).toBe(true)
  })

  it('toggleFilterByCapsule 시 filterByCapsule이 토글된다', async () => {
    const { useCapsuleStore } = await import('./capsuleStore')
    useCapsuleStore.setState({ filterByCapsule: false })

    useCapsuleStore.getState().toggleFilterByCapsule()
    expect(useCapsuleStore.getState().filterByCapsule).toBe(true)

    useCapsuleStore.getState().toggleFilterByCapsule()
    expect(useCapsuleStore.getState().filterByCapsule).toBe(false)
  })

  // ── removeItemFromCapsule ─────────────────────────────────────────────
  it('removeItemFromCapsule("bookmark", id) 시 해당 id만 제거된다', async () => {
    const { useCapsuleStore } = await import('./capsuleStore')

    const cap = {
      id: 'cap-1',
      name: 'A',
      emoji: '📦',
      bookmarkIds: ['bm-1', 'bm-2', 'bm-3'],
      todoIds: ['td-1'],
      noteIds: [],
      tags: [],
      pivotContext: null as null,
      viewMode: null as null,
      pomodoroPreset: null as null,
      createdAt: '2026-04-19T00:00:00.000Z',
      updatedAt: '2026-04-19T00:00:00.000Z',
      lastActivatedAt: null as null,
      archived: false,
      metrics: { focusMinutes: 0, completedTodos: 0, activationCount: 0 },
    }

    useCapsuleStore.setState({ capsules: [cap], loaded: true })
    useCapsuleStore.getState().removeItemFromCapsule('cap-1', 'bookmark', 'bm-2')

    const updated = useCapsuleStore.getState().capsules[0]
    expect(updated.bookmarkIds).toEqual(['bm-1', 'bm-3'])
    expect(updated.todoIds).toEqual(['td-1']) // 다른 배열은 영향 없음
  })

  // ── DEC-003: bookmarkIds > 500 경고 ──────────────────────────────────
  it('DEC-003: bookmarkIds.length > 1000인 경우 저장을 거부한다', async () => {
    const { useCapsuleStore } = await import('./capsuleStore')

    const largeBookmarkIds = Array.from({ length: 1001 }, (_, i) => `bm-${i}`)
    const cap = {
      id: 'cap-1',
      name: 'A',
      emoji: '📦',
      bookmarkIds: largeBookmarkIds,
      todoIds: [],
      noteIds: [],
      tags: [],
      pivotContext: null as null,
      viewMode: null as null,
      pomodoroPreset: null as null,
      createdAt: '2026-04-19T00:00:00.000Z',
      updatedAt: '2026-04-19T00:00:00.000Z',
      lastActivatedAt: null as null,
      archived: false,
      metrics: { focusMinutes: 0, completedTodos: 0, activationCount: 0 },
    }

    useCapsuleStore.setState({ capsules: [cap], loaded: true })

    // 1001번째 id 추가 시 거부 (에러 throw 또는 무시)
    expect(() => {
      useCapsuleStore.getState().addBookmarkToCapsule('cap-1', 'bm-9999')
    }).toThrow()
  })
})
