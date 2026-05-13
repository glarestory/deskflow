// 편집 히스토리 스토어 단위 테스트 — SPEC-UX-010 M1 (AC-001~005, EDGE-001)
import { describe, it, expect, beforeEach } from 'vitest'
import { useEditHistoryStore } from './editHistoryStore'
import type { HistorySnapshot } from './editHistoryStore'

// 각 테스트 전 스토어 초기화
function resetStore(): void {
  useEditHistoryStore.setState({ past: [], future: [] })
}

describe('editHistoryStore', () => {
  beforeEach(() => {
    resetStore()
  })

  // AC-001: 초기 상태 검증
  it('초기 상태는 past와 future가 모두 빈 배열이어야 한다', () => {
    const { past, future } = useEditHistoryStore.getState()
    expect(past).toEqual([])
    expect(future).toEqual([])
  })

  // AC-002: push 동작 검증
  it('push 호출 시 past에 snapshot이 추가되고 future는 초기화된다', () => {
    const snapshot: HistorySnapshot = {
      type: 'bookmarks',
      bookmarks: [{ id: 'A', name: 'A', icon: '', links: [] }, { id: 'B', name: 'B', icon: '', links: [] }],
    }
    useEditHistoryStore.getState().push(snapshot)
    const { past, future } = useEditHistoryStore.getState()
    expect(past).toHaveLength(1)
    expect(past[0]).toEqual(snapshot)
    expect(future).toEqual([])
  })

  // push 후 future가 있을 때 future가 무효화되는지 검증
  it('future가 있을 때 push하면 future가 비워져야 한다', () => {
    const snap1: HistorySnapshot = { type: 'bookmarks', bookmarks: [] }
    const snap2: HistorySnapshot = { type: 'bookmarks', bookmarks: [] }
    useEditHistoryStore.getState().push(snap1)
    // undo하여 future에 넣기
    useEditHistoryStore.getState().undo()
    expect(useEditHistoryStore.getState().future).toHaveLength(1)
    // 새 push → future 무효화
    useEditHistoryStore.getState().push(snap2)
    expect(useEditHistoryStore.getState().future).toEqual([])
  })

  // AC-003: 최대 깊이 10 + FIFO 만료
  it('push 11회 시 past 길이가 10으로 유지되고 가장 오래된 항목이 제거된다', () => {
    const snaps: HistorySnapshot[] = Array.from({ length: 11 }, (_, i) => ({
      type: 'bookmarks' as const,
      bookmarks: [{ id: `cat-${i}`, name: `Cat ${i}`, icon: '', links: [] }],
    }))
    snaps.forEach((s) => useEditHistoryStore.getState().push(s))
    const { past } = useEditHistoryStore.getState()
    expect(past).toHaveLength(10)
    // 가장 오래된 (index 0) 항목이 제거됨 — past[0]은 snaps[1]
    expect(past[0]).toEqual(snaps[1])
    // 마지막 항목은 snaps[10]
    expect(past[9]).toEqual(snaps[10])
  })

  // AC-004: undo 정상 동작
  it('undo 호출 시 past의 마지막 snapshot을 반환하고 future로 이동한다', () => {
    const s1: HistorySnapshot = { type: 'bookmarks', bookmarks: [{ id: 'S1', name: 'S1', icon: '', links: [] }] }
    const s2: HistorySnapshot = { type: 'bookmarks', bookmarks: [{ id: 'S2', name: 'S2', icon: '', links: [] }] }
    const s3: HistorySnapshot = { type: 'bookmarks', bookmarks: [{ id: 'S3', name: 'S3', icon: '', links: [] }] }
    useEditHistoryStore.setState({ past: [s1, s2, s3], future: [] })
    const result = useEditHistoryStore.getState().undo()
    expect(result).toEqual(s3)
    expect(useEditHistoryStore.getState().past).toEqual([s1, s2])
    expect(useEditHistoryStore.getState().future).toEqual([s3])
  })

  // AC-005: undo 빈 past 시 null 반환
  it('past가 비어있을 때 undo는 null을 반환하고 상태 변동이 없어야 한다', () => {
    useEditHistoryStore.setState({ past: [], future: [] })
    const result = useEditHistoryStore.getState().undo()
    expect(result).toBeNull()
    expect(useEditHistoryStore.getState().past).toEqual([])
    expect(useEditHistoryStore.getState().future).toEqual([])
  })

  // redo 정상 동작
  it('redo 호출 시 future의 마지막 snapshot을 반환하고 past로 이동한다', () => {
    const s1: HistorySnapshot = { type: 'bookmarks', bookmarks: [] }
    const s2: HistorySnapshot = { type: 'layout', layout: [] }
    useEditHistoryStore.setState({ past: [s1], future: [s2] })
    const result = useEditHistoryStore.getState().redo()
    expect(result).toEqual(s2)
    expect(useEditHistoryStore.getState().future).toEqual([])
    expect(useEditHistoryStore.getState().past).toEqual([s1, s2])
  })

  // redo 빈 future 시 null 반환
  it('future가 비어있을 때 redo는 null을 반환한다', () => {
    const result = useEditHistoryStore.getState().redo()
    expect(result).toBeNull()
  })

  // clear 동작
  it('clear 호출 시 past와 future가 모두 비워진다', () => {
    const s1: HistorySnapshot = { type: 'bookmarks', bookmarks: [] }
    useEditHistoryStore.setState({ past: [s1], future: [s1] })
    useEditHistoryStore.getState().clear()
    expect(useEditHistoryStore.getState().past).toEqual([])
    expect(useEditHistoryStore.getState().future).toEqual([])
  })

  // layout 타입 snapshot 지원
  it('layout 타입 snapshot도 정상적으로 push/undo된다', () => {
    const snap: HistorySnapshot = {
      type: 'layout',
      layout: [{ i: 'clock', x: 0, y: 0, w: 5, h: 2 }],
    }
    useEditHistoryStore.getState().push(snap)
    const result = useEditHistoryStore.getState().undo()
    expect(result).toEqual(snap)
    expect(result?.type).toBe('layout')
  })

  // EDGE-001: undo 후 새 변경 시 future 무효화
  it('undo 후 push 시 future가 비워져야 한다', () => {
    const s1: HistorySnapshot = { type: 'bookmarks', bookmarks: [] }
    const s2: HistorySnapshot = { type: 'bookmarks', bookmarks: [] }
    const s3: HistorySnapshot = { type: 'bookmarks', bookmarks: [] }
    useEditHistoryStore.getState().push(s1)
    useEditHistoryStore.getState().push(s2)
    useEditHistoryStore.getState().push(s3)
    // 3번 push 후 undo 1회
    useEditHistoryStore.getState().undo()
    expect(useEditHistoryStore.getState().future).toHaveLength(1)
    // 새 push → future 무효화
    const newSnap: HistorySnapshot = { type: 'bookmarks', bookmarks: [{ id: 'new', name: 'new', icon: '', links: [] }] }
    useEditHistoryStore.getState().push(newSnap)
    expect(useEditHistoryStore.getState().future).toEqual([])
    expect(useEditHistoryStore.getState().past).toHaveLength(3)
  })
})
