// @MX:TEST: SPEC-CAPSULE-001
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockSet = vi.fn()
vi.mock('./firestoreStorage', () => ({
  firestoreStorage: {
    get: vi.fn(),
    set: (...args: unknown[]) => mockSet(...args),
  },
}))

import { migrateCapsulesToFirestore } from './capsuleMigration'

const CAPSULE_KEYS = ['capsules', 'active-capsule-id', 'capsule-settings'] as const

describe('migrateCapsulesToFirestore (SPEC-CAPSULE-001 REQ-004)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('localStorage에 캡슐 데이터가 있으면 Firestore로 업로드한다', async () => {
    const capsulesJson = JSON.stringify([{ id: 'c1', name: 'Frontend' }])
    const settingsJson = JSON.stringify({ autoAddToActive: true })
    localStorage.setItem('capsules', capsulesJson)
    localStorage.setItem('active-capsule-id', 'c1')
    localStorage.setItem('capsule-settings', settingsJson)

    await migrateCapsulesToFirestore('uid-1')

    expect(mockSet).toHaveBeenCalledTimes(3)
    expect(mockSet).toHaveBeenCalledWith('uid-1', 'capsules', capsulesJson)
    expect(mockSet).toHaveBeenCalledWith('uid-1', 'active-capsule-id', 'c1')
    expect(mockSet).toHaveBeenCalledWith('uid-1', 'capsule-settings', settingsJson)
  })

  it('localStorage가 완전히 비어 있으면 Firestore에 아무것도 쓰지 않는다', async () => {
    await migrateCapsulesToFirestore('uid-1')
    expect(mockSet).not.toHaveBeenCalled()
  })

  it('일부 키만 존재하면 그 키만 업로드한다 (부분 마이그레이션)', async () => {
    localStorage.setItem('capsules', '[]')
    // active-capsule-id, capsule-settings는 의도적으로 미설정

    await migrateCapsulesToFirestore('uid-2')

    expect(mockSet).toHaveBeenCalledTimes(1)
    expect(mockSet).toHaveBeenCalledWith('uid-2', 'capsules', '[]')
  })

  it('빈 문자열도 null이 아니므로 업로드 대상이다 (REQ-004 보존 시맨틱)', async () => {
    localStorage.setItem('capsules', '')

    await migrateCapsulesToFirestore('uid-3')

    expect(mockSet).toHaveBeenCalledWith('uid-3', 'capsules', '')
  })

  it('동일 uid로 중복 호출해도 멱등이다 (REQ-004 idempotent)', async () => {
    localStorage.setItem('capsules', '[{"id":"c1"}]')

    await migrateCapsulesToFirestore('uid-1')
    await migrateCapsulesToFirestore('uid-1')

    // 두 번째 호출은 동일 페이로드로 set을 다시 호출 — 결과적으로 Firestore 상태는 동일
    expect(mockSet).toHaveBeenCalledTimes(2)
    expect(mockSet).toHaveBeenNthCalledWith(1, 'uid-1', 'capsules', '[{"id":"c1"}]')
    expect(mockSet).toHaveBeenNthCalledWith(2, 'uid-1', 'capsules', '[{"id":"c1"}]')
  })

  it('uid가 다르면 각각 독립적으로 업로드한다 (사용자 데이터 격리)', async () => {
    localStorage.setItem('capsules', '[{"id":"c1"}]')

    await migrateCapsulesToFirestore('uid-A')
    await migrateCapsulesToFirestore('uid-B')

    expect(mockSet).toHaveBeenNthCalledWith(1, 'uid-A', 'capsules', '[{"id":"c1"}]')
    expect(mockSet).toHaveBeenNthCalledWith(2, 'uid-B', 'capsules', '[{"id":"c1"}]')
  })

  it('Firestore set 실패 시 예외를 호출자에게 전파한다 (silent swallow 금지)', async () => {
    localStorage.setItem('capsules', '[]')
    mockSet.mockRejectedValueOnce(new Error('Firestore unavailable'))

    await expect(migrateCapsulesToFirestore('uid-err')).rejects.toThrow(
      'Firestore unavailable',
    )
  })

  it('정의된 3개 키만 처리하고 무관한 localStorage 키는 건드리지 않는다', async () => {
    localStorage.setItem('capsules', '[]')
    localStorage.setItem('hub-bookmarks', '[]') // 캡슐 외 데이터
    localStorage.setItem('hub-todos', '[]') // 캡슐 외 데이터

    await migrateCapsulesToFirestore('uid-1')

    const writtenKeys = mockSet.mock.calls.map((c) => c[1])
    expect(writtenKeys).toEqual(expect.arrayContaining(['capsules']))
    expect(writtenKeys).not.toContain('hub-bookmarks')
    expect(writtenKeys).not.toContain('hub-todos')
  })

  it('3개 키가 모두 존재하면 정의된 순서로 업로드한다 (capsules → active → settings)', async () => {
    localStorage.setItem('capsules', 'A')
    localStorage.setItem('active-capsule-id', 'B')
    localStorage.setItem('capsule-settings', 'C')

    await migrateCapsulesToFirestore('uid-1')

    const orderedKeys = mockSet.mock.calls.map((c) => c[1])
    expect(orderedKeys).toEqual(CAPSULE_KEYS)
  })
})
