// @MX:SPEC: SPEC-UX-002
// usageStore 단위 테스트 — 빈도/최근 사용 기반 점수 계산 검증
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'

// localStorage 모킹
const mockStorage: Record<string, string> = {}
vi.stubGlobal('localStorage', {
  getItem: (key: string) => mockStorage[key] ?? null,
  setItem: (key: string, value: string) => { mockStorage[key] = value },
  removeItem: (key: string) => { delete mockStorage[key] },
  clear: () => { Object.keys(mockStorage).forEach((k) => { delete mockStorage[k] }) },
})

describe('usageStore', () => {
  beforeEach(async () => {
    // 각 테스트 전 스토어와 스토리지 초기화
    vi.clearAllMocks()
    Object.keys(mockStorage).forEach((k) => { delete mockStorage[k] })
    // 모듈 캐시 초기화 (persist 상태 리셋)
    vi.resetModules()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('초기 상태는 빈 entries', async () => {
    const { useUsageStore } = await import('./usageStore')
    const state = useUsageStore.getState()
    expect(state.entries.size).toBe(0)
  })

  it('recordUsage 호출 시 항목이 생성된다', async () => {
    const { useUsageStore } = await import('./usageStore')
    const { recordUsage } = useUsageStore.getState()

    recordUsage('bookmark', 'link-1')

    const state = useUsageStore.getState()
    expect(state.entries.size).toBe(1)
  })

  it('동일 항목 recordUsage 반복 호출 시 timestamps 배열에 추가된다', async () => {
    const { useUsageStore } = await import('./usageStore')
    const { recordUsage } = useUsageStore.getState()

    recordUsage('bookmark', 'link-1')
    recordUsage('bookmark', 'link-1')
    recordUsage('bookmark', 'link-1')

    const state = useUsageStore.getState()
    const entry = state.entries.get('bookmark:link-1')
    expect(entry).toBeDefined()
    expect(entry!.timestamps.length).toBe(3)
  })

  it('timestamp는 현재 시각(밀리초) 기준으로 저장된다', async () => {
    vi.useFakeTimers()
    const now = new Date('2026-04-13T12:00:00Z').getTime()
    vi.setSystemTime(now)

    const { useUsageStore } = await import('./usageStore')
    const { recordUsage } = useUsageStore.getState()

    recordUsage('bookmark', 'link-1')

    const state = useUsageStore.getState()
    const entry = state.entries.get('bookmark:link-1')
    expect(entry!.timestamps[0]).toBe(now)
  })

  it('timestamps 슬라이딩 윈도우 — 최대 50개 유지', async () => {
    const { useUsageStore } = await import('./usageStore')
    const { recordUsage } = useUsageStore.getState()

    // 60번 호출
    for (let i = 0; i < 60; i++) {
      recordUsage('bookmark', 'link-1')
    }

    const state = useUsageStore.getState()
    const entry = state.entries.get('bookmark:link-1')
    expect(entry!.timestamps.length).toBeLessThanOrEqual(50)
  })

  it('entries 최대 200개 유지 — 초과 시 오래된 것 삭제', async () => {
    const { useUsageStore } = await import('./usageStore')
    const { recordUsage } = useUsageStore.getState()

    // 220개 항목 생성
    for (let i = 0; i < 220; i++) {
      recordUsage('bookmark', `link-${i}`)
    }

    const state = useUsageStore.getState()
    expect(state.entries.size).toBeLessThanOrEqual(200)
  })

  it('getScore — 사용 기록 없는 항목은 0 반환', async () => {
    const { useUsageStore } = await import('./usageStore')
    const { getScore } = useUsageStore.getState()

    const score = getScore('bookmark', 'nonexistent')
    expect(score).toBe(0)
  })

  it('getScore — 최근 사용 항목은 양수 점수 반환', async () => {
    vi.useFakeTimers()
    const now = Date.now()
    vi.setSystemTime(now)

    const { useUsageStore } = await import('./usageStore')
    const { recordUsage, getScore } = useUsageStore.getState()

    recordUsage('bookmark', 'link-1')

    const score = getScore('bookmark', 'link-1')
    expect(score).toBeGreaterThan(0)
  })

  it('getScore — 더 오래된 항목은 더 낮은 점수 (지수 감쇠)', async () => {
    vi.useFakeTimers()

    // τ = 7일
    const TAU_MS = 7 * 24 * 60 * 60 * 1000

    // 최근 사용 항목
    const now = Date.now()
    vi.setSystemTime(now)
    const { useUsageStore } = await import('./usageStore')
    const { recordUsage } = useUsageStore.getState()
    recordUsage('bookmark', 'recent')

    // 14일 전 항목 시뮬레이션 — 시간을 뒤로 돌린 후 기록
    vi.setSystemTime(now - TAU_MS * 2)
    recordUsage('bookmark', 'old')

    // 현재 시간으로 복귀
    vi.setSystemTime(now)

    const { getScore } = useUsageStore.getState()
    const recentScore = getScore('bookmark', 'recent')
    const oldScore = getScore('bookmark', 'old')

    expect(recentScore).toBeGreaterThan(oldScore)
  })

  it('getScore 공식: score = freq × exp(-Δt / τ) 누적', async () => {
    vi.useFakeTimers()
    const now = Date.now()
    vi.setSystemTime(now)

    const { useUsageStore } = await import('./usageStore')
    const { recordUsage, getScore } = useUsageStore.getState()

    // 1회 기록
    recordUsage('action', 'action-1')

    const score1 = getScore('action', 'action-1')
    // τ = 0, exp(0) = 1, score = 1
    expect(score1).toBeCloseTo(1, 2)
  })

  it('동일 type과 id를 가진 항목은 동일 key로 관리된다', async () => {
    const { useUsageStore } = await import('./usageStore')
    const { recordUsage } = useUsageStore.getState()

    recordUsage('bookmark', 'link-1')
    recordUsage('category', 'link-1') // 같은 id지만 다른 type

    const state = useUsageStore.getState()
    expect(state.entries.size).toBe(2)
  })

  it('EntryType은 bookmark, category, tag, action을 지원한다', async () => {
    const { useUsageStore } = await import('./usageStore')
    const { recordUsage } = useUsageStore.getState()

    recordUsage('bookmark', 'b1')
    recordUsage('category', 'c1')
    recordUsage('tag', 't1')
    recordUsage('action', 'a1')

    const state = useUsageStore.getState()
    expect(state.entries.size).toBe(4)
  })
})
