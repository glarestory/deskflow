// @MX:NOTE: [AUTO] CapsuleSwitcher 컴포넌트 단위 테스트
// @MX:SPEC: SPEC-CAPSULE-001 REQ-012, AC-020, AC-021
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import CapsuleSwitcher from './CapsuleSwitcher'
import type { Capsule } from '../../types/capsule'

// useCapsuleStore 모킹
const mockActivateCapsule = vi.fn()
const mockCapsuleStore = {
  capsules: [] as Capsule[],
  activeCapsuleId: null as string | null,
  activateCapsule: mockActivateCapsule,
}

vi.mock('../../stores/capsuleStore', () => ({
  useCapsuleStore: (selector: (state: typeof mockCapsuleStore) => unknown) =>
    selector(mockCapsuleStore),
}))

// CSS 모듈 모킹
vi.mock('./CapsuleSwitcher.module.css', () => ({
  default: {
    trigger: 'trigger',
    dropdown: 'dropdown',
    sheet: 'sheet',
    item: 'item',
    section: 'section',
  },
}))

const makeCapsule = (overrides: Partial<Capsule> = {}): Capsule => ({
  id: 'cap-1',
  name: '테스트 캡슐',
  emoji: '🔐',
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

interface SwitcherProps {
  onOpenList?: () => void
  onOpenCreate?: () => void
}

const renderSwitcher = (props: SwitcherProps = {}) =>
  render(
    <CapsuleSwitcher
      onOpenList={props.onOpenList ?? vi.fn()}
      onOpenCreate={props.onOpenCreate ?? vi.fn()}
    />,
  )

describe('CapsuleSwitcher', () => {
  beforeEach(() => {
    mockCapsuleStore.capsules = []
    mockCapsuleStore.activeCapsuleId = null
    vi.clearAllMocks()
  })

  describe('AC-021: 활성 캡슐이 없을 때', () => {
    it('트리거 라벨이 "캡슐 없음"으로 표시된다', () => {
      renderSwitcher()
      expect(screen.getByRole('button', { name: /캡슐 없음/i })).toBeInTheDocument()
    })

    it('트리거를 클릭하면 드롭다운이 열린다', () => {
      renderSwitcher()
      const trigger = screen.getByRole('button', { name: /캡슐 없음/i })
      fireEvent.click(trigger)
      expect(screen.getByTestId('capsule-switcher-panel')).toBeInTheDocument()
    })

    it('"캡슐 해제" 항목은 보이지 않는다', () => {
      renderSwitcher()
      fireEvent.click(screen.getByRole('button', { name: /캡슐 없음/i }))
      expect(screen.queryByText('캡슐 해제')).not.toBeInTheDocument()
    })
  })

  describe('AC-020: 활성 캡슐이 있을 때', () => {
    beforeEach(() => {
      const capsule = makeCapsule({ id: 'cap-1', name: 'auth-refactor', emoji: '🔐' })
      mockCapsuleStore.capsules = [capsule]
      mockCapsuleStore.activeCapsuleId = 'cap-1'
    })

    it('트리거에 이모지와 이름이 표시된다', () => {
      renderSwitcher()
      expect(screen.getByRole('button', { name: /🔐 auth-refactor/i })).toBeInTheDocument()
    })

    it('드롭다운 열림 시 "캡슐 해제" 항목이 표시된다', () => {
      renderSwitcher()
      fireEvent.click(screen.getByRole('button', { name: /🔐 auth-refactor/i }))
      expect(screen.getByText('캡슐 해제')).toBeInTheDocument()
    })

    it('"캡슐 해제" 클릭 시 activateCapsule(null)이 호출된다', () => {
      renderSwitcher()
      fireEvent.click(screen.getByRole('button', { name: /🔐 auth-refactor/i }))
      fireEvent.click(screen.getByText('캡슐 해제'))
      expect(mockActivateCapsule).toHaveBeenCalledWith(null)
    })
  })

  describe('AC-020: 최근 5개 캡슐 표시 (lastActivatedAt DESC)', () => {
    it('최근 활성화된 캡슐이 먼저 표시된다', () => {
      const now = Date.now()
      const capsules = [
        makeCapsule({ id: 'c1', name: '캡슐1', lastActivatedAt: new Date(now - 1000).toISOString() }),
        makeCapsule({ id: 'c2', name: '캡슐2', lastActivatedAt: new Date(now - 500).toISOString() }),
        makeCapsule({ id: 'c3', name: '캡슐3', lastActivatedAt: new Date(now - 2000).toISOString() }),
      ]
      mockCapsuleStore.capsules = capsules
      mockCapsuleStore.activeCapsuleId = null

      renderSwitcher()
      fireEvent.click(screen.getByRole('button', { name: /캡슐 없음/i }))

      const items = screen.getAllByTestId('capsule-recent-item')
      // 캡슐2(500ms전)가 캡슐1(1000ms전)보다 먼저 표시되어야 함
      expect(items[0]).toHaveTextContent('캡슐2')
      expect(items[1]).toHaveTextContent('캡슐1')
    })

    it('최대 5개까지만 표시한다', () => {
      const now = Date.now()
      const capsules = Array.from({ length: 7 }, (_, i) =>
        makeCapsule({
          id: `c${i}`,
          name: `캡슐${i}`,
          lastActivatedAt: new Date(now - i * 100).toISOString(),
        }),
      )
      mockCapsuleStore.capsules = capsules
      mockCapsuleStore.activeCapsuleId = null

      renderSwitcher()
      fireEvent.click(screen.getByRole('button', { name: /캡슐 없음/i }))

      const items = screen.getAllByTestId('capsule-recent-item')
      expect(items).toHaveLength(5)
    })

    it('보관된 캡슐은 최근 목록에서 제외된다', () => {
      const now = Date.now()
      const capsules = [
        makeCapsule({ id: 'c1', name: '보관캡슐', archived: true, lastActivatedAt: new Date(now - 100).toISOString() }),
        makeCapsule({ id: 'c2', name: '일반캡슐', archived: false, lastActivatedAt: new Date(now - 200).toISOString() }),
      ]
      mockCapsuleStore.capsules = capsules

      renderSwitcher()
      fireEvent.click(screen.getByRole('button', { name: /캡슐 없음/i }))

      expect(screen.queryByText('보관캡슐')).not.toBeInTheDocument()
      expect(screen.getByTestId('capsule-recent-item')).toHaveTextContent('일반캡슐')
    })
  })

  describe('드롭다운 네비게이션', () => {
    it('"모든 캡슐 보기…" 클릭 시 onOpenList 콜백을 호출한다', () => {
      const onOpenList = vi.fn()
      renderSwitcher({ onOpenList })
      fireEvent.click(screen.getByRole('button', { name: /캡슐 없음/i }))
      fireEvent.click(screen.getByText('모든 캡슐 보기…'))
      expect(onOpenList).toHaveBeenCalledOnce()
    })

    it('"새 캡슐 만들기" 클릭 시 onOpenCreate 콜백을 호출한다', () => {
      const onOpenCreate = vi.fn()
      renderSwitcher({ onOpenCreate })
      fireEvent.click(screen.getByRole('button', { name: /캡슐 없음/i }))
      fireEvent.click(screen.getByText('새 캡슐 만들기'))
      expect(onOpenCreate).toHaveBeenCalledOnce()
    })

    it('Escape 키 입력 시 드롭다운이 닫힌다', () => {
      renderSwitcher()
      fireEvent.click(screen.getByRole('button', { name: /캡슐 없음/i }))
      expect(screen.getByTestId('capsule-switcher-panel')).toBeInTheDocument()
      fireEvent.keyDown(document, { key: 'Escape' })
      expect(screen.queryByTestId('capsule-switcher-panel')).not.toBeInTheDocument()
    })
  })
})
