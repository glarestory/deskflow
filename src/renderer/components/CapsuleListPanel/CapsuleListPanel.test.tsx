// @MX:NOTE: [AUTO] CapsuleListPanel 컴포넌트 단위 테스트
// @MX:SPEC: SPEC-CAPSULE-001 REQ-015, REQ-016, AC-025~AC-028
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import CapsuleListPanel from './CapsuleListPanel'
import type { Capsule } from '../../types/capsule'

const mockActivateCapsule = vi.fn()
const mockArchiveCapsule = vi.fn()
const mockDeleteCapsule = vi.fn()
const mockCapsuleStore = {
  capsules: [] as Capsule[],
  activeCapsuleId: null as string | null,
  activateCapsule: mockActivateCapsule,
  archiveCapsule: mockArchiveCapsule,
  deleteCapsule: mockDeleteCapsule,
}

vi.mock('../../stores/capsuleStore', () => ({
  useCapsuleStore: (selector: (state: typeof mockCapsuleStore) => unknown) =>
    selector(mockCapsuleStore),
}))

const makeCapsule = (overrides: Partial<Capsule> = {}): Capsule => ({
  id: 'cap-1',
  name: '테스트 캡슐',
  emoji: '📦',
  description: '',
  bookmarkIds: [],
  todoIds: [],
  noteIds: [],
  tags: [],
  pivotContext: null,
  viewMode: null,
  pomodoroPreset: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  lastActivatedAt: null,
  archived: false,
  metrics: { focusMinutes: 0, completedTodos: 0, activationCount: 0 },
  ...overrides,
})

interface PanelProps {
  onEdit?: (capsule: Capsule) => void
  onClose?: () => void
}

const renderPanel = (props: PanelProps = {}) =>
  render(
    <CapsuleListPanel
      onEdit={props.onEdit ?? vi.fn()}
      onClose={props.onClose ?? vi.fn()}
    />,
  )

describe('CapsuleListPanel', () => {
  beforeEach(() => {
    mockCapsuleStore.capsules = []
    mockCapsuleStore.activeCapsuleId = null
    vi.clearAllMocks()
  })

  describe('기본 렌더링', () => {
    it('패널이 렌더링된다', () => {
      renderPanel()
      expect(screen.getByTestId('capsule-list-panel')).toBeInTheDocument()
    })

    it('"활성" 탭이 기본 선택 상태이다', () => {
      renderPanel()
      const activeTab = screen.getByRole('tab', { name: '활성' })
      expect(activeTab).toHaveAttribute('aria-selected', 'true')
    })

    it('"보관" 탭이 표시된다', () => {
      renderPanel()
      expect(screen.getByRole('tab', { name: /보관/ })).toBeInTheDocument()
    })
  })

  describe('AC-025: 행 포맷', () => {
    it('캡슐 행에 이모지·이름·항목수·최근 활성 정보가 표시된다', () => {
      const capsule = makeCapsule({
        id: 'c1',
        name: 'auth-refactor',
        emoji: '🔐',
        bookmarkIds: ['b1', 'b2', 'b3'],
        todoIds: ['t1'],
        noteIds: ['n1', 'n2'],
        lastActivatedAt: '2026-04-19T10:30:00.000Z',
      })
      mockCapsuleStore.capsules = [capsule]
      renderPanel()
      const row = screen.getByTestId('capsule-row-c1')
      expect(row).toHaveTextContent('🔐')
      expect(row).toHaveTextContent('auth-refactor')
      // 북마크 3개
      expect(row).toHaveTextContent('3')
      // Todo 1개
      expect(row).toHaveTextContent('1')
      // 메모 2개
      expect(row).toHaveTextContent('2')
    })
  })

  describe('AC-026: 보관 탭 분리', () => {
    it('"활성" 탭에서 archived 캡슐은 표시되지 않는다', () => {
      mockCapsuleStore.capsules = [
        makeCapsule({ id: 'c1', name: '일반', archived: false }),
        makeCapsule({ id: 'c2', name: '보관된것', archived: true }),
      ]
      renderPanel()
      expect(screen.getByText('일반')).toBeInTheDocument()
      expect(screen.queryByText('보관된것')).not.toBeInTheDocument()
    })

    it('"보관" 탭에서 archived 캡슐만 표시된다', () => {
      mockCapsuleStore.capsules = [
        makeCapsule({ id: 'c1', name: '일반', archived: false }),
        makeCapsule({ id: 'c2', name: '보관된것', archived: true }),
      ]
      renderPanel()
      fireEvent.click(screen.getByRole('tab', { name: /보관/ }))
      expect(screen.queryByText('일반')).not.toBeInTheDocument()
      expect(screen.getByText('보관된것')).toBeInTheDocument()
    })
  })

  describe('AC-027: 검색 필터링', () => {
    beforeEach(() => {
      mockCapsuleStore.capsules = [
        makeCapsule({ id: 'c1', name: 'Auth Refactor', tags: ['react'] }),
        makeCapsule({ id: 'c2', name: '버그 수정', tags: ['auth'] }),
        makeCapsule({ id: 'c3', name: '기능 개발', description: 'authentication' }),
      ]
    })

    it('"auth" 검색 시 이름에 auth 포함하는 캡슐이 필터링된다', () => {
      renderPanel()
      fireEvent.change(screen.getByTestId('capsule-search-input'), {
        target: { value: 'auth' },
      })
      // 대소문자 무시
      expect(screen.getByText('Auth Refactor')).toBeInTheDocument()
      // 태그에 auth 포함
      expect(screen.getByText('버그 수정')).toBeInTheDocument()
      // description에 authentication 포함
      expect(screen.getByText('기능 개발')).toBeInTheDocument()
    })

    it('검색결과가 없으면 빈 상태 메시지를 표시한다', () => {
      renderPanel()
      fireEvent.change(screen.getByTestId('capsule-search-input'), {
        target: { value: 'xxxxxxxxnotexist' },
      })
      expect(screen.getByText('검색 결과 없음')).toBeInTheDocument()
    })
  })

  describe('AC-028: 정렬', () => {
    it('이름 정렬 변경 시 로케일 순으로 정렬된다', () => {
      mockCapsuleStore.capsules = [
        makeCapsule({ id: 'c1', name: 'beta', lastActivatedAt: '2026-01-02T00:00:00.000Z' }),
        makeCapsule({ id: 'c2', name: 'alpha', lastActivatedAt: '2026-01-03T00:00:00.000Z' }),
        makeCapsule({ id: 'c3', name: 'charlie', lastActivatedAt: '2026-01-01T00:00:00.000Z' }),
      ]
      renderPanel()

      // 정렬 전 (최근 활성 기준) — c2(alpha)가 가장 최근이어서 앞에 와야 함
      const beforeRows = screen.getAllByTestId(/^capsule-row-/)
      expect(beforeRows[0]).toHaveTextContent('alpha')

      fireEvent.change(screen.getByTestId('capsule-sort-select'), {
        target: { value: 'name' },
      })

      // 이름 정렬 후 — alpha, beta, charlie 순이어야 함
      const afterRows = screen.getAllByTestId(/^capsule-row-/)
      expect(afterRows[0]).toHaveTextContent('alpha')
      expect(afterRows[1]).toHaveTextContent('beta')
      expect(afterRows[2]).toHaveTextContent('charlie')
    })

    it('최근 활성 정렬 시 lastActivatedAt DESC 순서로 정렬된다', () => {
      const now = Date.now()
      mockCapsuleStore.capsules = [
        makeCapsule({ id: 'c1', name: '오래됨', lastActivatedAt: new Date(now - 3000).toISOString() }),
        makeCapsule({ id: 'c2', name: '최신', lastActivatedAt: new Date(now - 100).toISOString() }),
      ]
      renderPanel()

      // 기본 정렬이 최근 활성이어야 함
      const rows = screen.getAllByTestId(/^capsule-row-/)
      expect(rows[0]).toHaveTextContent('최신')
    })
  })

  describe('행 액션', () => {
    it('"편집" 클릭 시 onEdit 콜백이 해당 캡슐과 함께 호출된다', () => {
      const onEdit = vi.fn()
      const capsule = makeCapsule({ id: 'c1', name: '편집할캡슐' })
      mockCapsuleStore.capsules = [capsule]
      renderPanel({ onEdit })
      fireEvent.click(screen.getByTestId('capsule-edit-btn-c1'))
      expect(onEdit).toHaveBeenCalledWith(capsule)
    })

    it('"보관" 클릭 시 archiveCapsule이 호출된다', () => {
      mockCapsuleStore.capsules = [makeCapsule({ id: 'c1' })]
      renderPanel()
      fireEvent.click(screen.getByTestId('capsule-archive-btn-c1'))
      expect(mockArchiveCapsule).toHaveBeenCalledWith('c1', true)
    })

    it('"활성화" 클릭 시 activateCapsule이 호출된다', () => {
      mockCapsuleStore.capsules = [makeCapsule({ id: 'c1' })]
      renderPanel()
      fireEvent.click(screen.getByTestId('capsule-activate-btn-c1'))
      expect(mockActivateCapsule).toHaveBeenCalledWith('c1')
    })
  })
})
