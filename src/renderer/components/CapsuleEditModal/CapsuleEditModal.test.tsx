// @MX:NOTE: [AUTO] CapsuleEditModal 컴포넌트 단위 테스트
// @MX:SPEC: SPEC-CAPSULE-001 REQ-009, AC-014~AC-016
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import CapsuleEditModal from './CapsuleEditModal'
import type { Capsule } from '../../types/capsule'

// TagInput 모킹 (단순 렌더 확인)
vi.mock('../TagInput/TagInput', () => ({
  default: ({ tags, onChange }: { tags: string[]; onChange: (t: string[]) => void }) => (
    <div data-testid="tag-input">
      {tags.map((t) => (
        <span key={t}>{t}</span>
      ))}
      <button onClick={() => onChange([...tags, 'newtag'])}>태그추가</button>
    </div>
  ),
}))

// useTagStore 모킹
vi.mock('../../stores/tagStore', () => ({
  useTagStore: (selector: (s: { allTags: Array<{ tag: string }> }) => unknown) =>
    selector({ allTags: [] }),
}))

const makeCapsule = (overrides: Partial<Capsule> = {}): Capsule => ({
  id: 'cap-1',
  name: '기존 캡슐',
  emoji: '🔐',
  description: '테스트 설명',
  color: 'oklch(0.7 0.15 270)',
  bookmarkIds: [],
  todoIds: [],
  noteIds: [],
  tags: ['react', 'firebase'],
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

describe('CapsuleEditModal', () => {
  const mockOnSave = vi.fn()
  const mockOnClose = vi.fn()
  const mockOnDelete = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('신규 생성 모드 (capsule=null)', () => {
    it('모달이 렌더링된다', () => {
      render(<CapsuleEditModal capsule={null} onSave={mockOnSave} onClose={mockOnClose} />)
      expect(screen.getByTestId('capsule-edit-modal')).toBeInTheDocument()
    })

    it('"새 캡슐" 타이틀이 표시된다', () => {
      render(<CapsuleEditModal capsule={null} onSave={mockOnSave} onClose={mockOnClose} />)
      expect(screen.getByText('새 캡슐')).toBeInTheDocument()
    })

    it('삭제 버튼이 표시되지 않는다 (신규 생성 시)', () => {
      render(<CapsuleEditModal capsule={null} onSave={mockOnSave} onClose={mockOnClose} />)
      expect(screen.queryByText('삭제')).not.toBeInTheDocument()
    })
  })

  describe('편집 모드 (기존 캡슐 전달)', () => {
    it('기존 이름이 입력 필드에 채워진다', () => {
      render(
        <CapsuleEditModal capsule={makeCapsule()} onSave={mockOnSave} onClose={mockOnClose} onDelete={mockOnDelete} />,
      )
      const nameInput = screen.getByTestId('capsule-name-input')
      expect(nameInput).toHaveValue('기존 캡슐')
    })

    it('삭제 버튼이 표시된다', () => {
      render(
        <CapsuleEditModal capsule={makeCapsule()} onSave={mockOnSave} onClose={mockOnClose} onDelete={mockOnDelete} />,
      )
      expect(screen.getByText('삭제')).toBeInTheDocument()
    })

    it('삭제 버튼 클릭 시 onDelete 콜백이 호출된다', () => {
      const capsule = makeCapsule()
      render(
        <CapsuleEditModal capsule={capsule} onSave={mockOnSave} onClose={mockOnClose} onDelete={mockOnDelete} />,
      )
      fireEvent.click(screen.getByText('삭제'))
      expect(mockOnDelete).toHaveBeenCalledWith(capsule.id)
    })
  })

  describe('AC-014: 빈 이름 저장 방지', () => {
    it('이름이 빈 문자열이면 저장 버튼이 비활성화된다', () => {
      render(<CapsuleEditModal capsule={null} onSave={mockOnSave} onClose={mockOnClose} />)
      const nameInput = screen.getByTestId('capsule-name-input')
      // 기본값이 빈 문자열이어야 함
      fireEvent.change(nameInput, { target: { value: '' } })
      const saveButton = screen.getByTestId('capsule-save-btn')
      expect(saveButton).toBeDisabled()
    })

    it('빈 이름으로 저장 시도 시 에러 메시지가 표시된다', () => {
      render(<CapsuleEditModal capsule={null} onSave={mockOnSave} onClose={mockOnClose} />)
      const nameInput = screen.getByTestId('capsule-name-input')
      fireEvent.change(nameInput, { target: { value: '' } })
      // 저장 버튼은 disabled이므로 form submit 이벤트로 테스트
      const form = screen.getByTestId('capsule-edit-form')
      fireEvent.submit(form)
      expect(screen.getByText('이름은 필수입니다')).toBeInTheDocument()
      expect(mockOnSave).not.toHaveBeenCalled()
    })
  })

  describe('AC-015: 글자수 제한', () => {
    it('이름 60자 초과 시 저장 버튼이 비활성화된다', () => {
      render(<CapsuleEditModal capsule={null} onSave={mockOnSave} onClose={mockOnClose} />)
      const nameInput = screen.getByTestId('capsule-name-input')
      fireEvent.change(nameInput, { target: { value: 'a'.repeat(61) } })
      expect(screen.getByTestId('capsule-save-btn')).toBeDisabled()
    })

    it('이름 60자 초과 시 카운터가 빨간색 표시 클래스를 가진다', () => {
      render(<CapsuleEditModal capsule={null} onSave={mockOnSave} onClose={mockOnClose} />)
      const nameInput = screen.getByTestId('capsule-name-input')
      fireEvent.change(nameInput, { target: { value: 'a'.repeat(61) } })
      const counter = screen.getByTestId('name-counter')
      expect(counter).toHaveClass('error')
    })

    it('설명 200자 초과 시 저장 버튼이 비활성화된다', () => {
      render(<CapsuleEditModal capsule={null} onSave={mockOnSave} onClose={mockOnClose} />)
      const nameInput = screen.getByTestId('capsule-name-input')
      fireEvent.change(nameInput, { target: { value: '유효이름' } })
      const descInput = screen.getByTestId('capsule-desc-input')
      fireEvent.change(descInput, { target: { value: 'a'.repeat(201) } })
      expect(screen.getByTestId('capsule-save-btn')).toBeDisabled()
    })
  })

  describe('AC-016: 이모지 피커', () => {
    it('이모지 입력 필드에 값이 변경되면 미리보기가 즉시 반영된다', () => {
      render(<CapsuleEditModal capsule={null} onSave={mockOnSave} onClose={mockOnClose} />)
      const emojiInput = screen.getByTestId('capsule-emoji-input')
      fireEvent.change(emojiInput, { target: { value: '🚀' } })
      // 미리보기 요소에 새 이모지가 표시되어야 함
      expect(screen.getByTestId('capsule-emoji-preview')).toHaveTextContent('🚀')
    })

    it('이모지가 빈 문자열이면 기본값 📦이 미리보기에 표시된다', () => {
      render(<CapsuleEditModal capsule={null} onSave={mockOnSave} onClose={mockOnClose} />)
      const emojiInput = screen.getByTestId('capsule-emoji-input')
      fireEvent.change(emojiInput, { target: { value: '' } })
      expect(screen.getByTestId('capsule-emoji-preview')).toHaveTextContent('📦')
    })
  })

  describe('저장 및 취소', () => {
    it('유효한 이름 입력 후 저장 버튼이 활성화된다', () => {
      render(<CapsuleEditModal capsule={null} onSave={mockOnSave} onClose={mockOnClose} />)
      const nameInput = screen.getByTestId('capsule-name-input')
      fireEvent.change(nameInput, { target: { value: '새 캡슐 이름' } })
      expect(screen.getByTestId('capsule-save-btn')).not.toBeDisabled()
    })

    it('저장 버튼 클릭 시 onSave 콜백이 올바른 데이터와 함께 호출된다', () => {
      render(<CapsuleEditModal capsule={null} onSave={mockOnSave} onClose={mockOnClose} />)
      const nameInput = screen.getByTestId('capsule-name-input')
      fireEvent.change(nameInput, { target: { value: '새 캡슐' } })
      fireEvent.click(screen.getByTestId('capsule-save-btn'))
      expect(mockOnSave).toHaveBeenCalledOnce()
      const arg = mockOnSave.mock.calls[0][0] as Partial<Capsule>
      expect(arg.name).toBe('새 캡슐')
    })

    it('취소 버튼 클릭 시 onClose 콜백이 호출된다', () => {
      render(<CapsuleEditModal capsule={null} onSave={mockOnSave} onClose={mockOnClose} />)
      fireEvent.click(screen.getByText('취소'))
      expect(mockOnClose).toHaveBeenCalledOnce()
    })

    it('오버레이 클릭 시 onClose 콜백이 호출된다', () => {
      render(<CapsuleEditModal capsule={null} onSave={mockOnSave} onClose={mockOnClose} />)
      const overlay = screen.getByTestId('capsule-modal-overlay')
      fireEvent.click(overlay)
      expect(mockOnClose).toHaveBeenCalledOnce()
    })
  })
})
