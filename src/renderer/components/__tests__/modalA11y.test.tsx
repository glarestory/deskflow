// @MX:TEST: 모달 접근성 회귀 방지 — 4종 모달의 a11y 계약 검증.
// 일부 모달은 ARIA 속성이 아직 미구현인 상태이며, `it.todo` 로 누락 사항을 명시한다.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'

import EditModal from '../EditModal/EditModal'
import ImportModal from '../ImportModal/ImportModal'
import RecurrenceModal from '../RecurrenceModal/RecurrenceModal'
import CapsuleEditModal from '../CapsuleEditModal/CapsuleEditModal'
import type { Category } from '../../types'

// CapsuleEditModal 의존 — capsuleStore mock
vi.mock('../../stores/capsuleStore', () => ({
  useCapsuleStore: (selector?: (s: unknown) => unknown) => {
    const state = {
      capsules: [],
      createCapsule: vi.fn(),
      updateCapsule: vi.fn(),
    }
    return selector ? selector(state) : state
  },
}))

// EditModal 의존 — tagStore mock
vi.mock('../../stores/tagStore', () => ({
  useTagStore: (selector?: (s: unknown) => unknown) => {
    const state = { allTags: [] }
    return selector ? selector(state) : state
  },
}))

// ImportModal 의존 — bookmarkStore / parser mock
vi.mock('../../stores/bookmarkStore', () => ({
  useBookmarkStore: (selector?: (s: unknown) => unknown) => {
    const state = {
      bookmarks: [],
      importBookmarks: vi.fn(),
    }
    return selector ? selector(state) : state
  },
}))

const sampleCategory: Category = {
  id: 'cat-1',
  name: 'Work',
  icon: '💼',
  links: [{ id: 'l1', name: 'Gmail', url: 'https://mail.google.com', tags: [] }],
}

describe('CapsuleEditModal a11y', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('role="dialog" + aria-modal="true" 가 설정되어 보조 기술이 모달로 인식한다', () => {
    render(<CapsuleEditModal capsule={null} onClose={vi.fn()} />)

    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
  })

  it('aria-label 로 모달 목적이 명시된다 (신규/편집 분기)', () => {
    render(<CapsuleEditModal capsule={null} onClose={vi.fn()} />)
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-label', '새 캡슐')
  })

  it('취소 버튼이 접근 가능한 이름으로 노출된다', () => {
    const onClose = vi.fn()
    render(<CapsuleEditModal capsule={null} onClose={onClose} />)

    const cancelBtn = screen.getByRole('button', { name: /취소/ })
    fireEvent.click(cancelBtn)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('오버레이(다이얼로그 외부) 클릭으로 닫힌다', () => {
    const onClose = vi.fn()
    const { container } = render(<CapsuleEditModal capsule={null} onClose={onClose} />)

    // 다이얼로그의 부모(overlay)를 직접 클릭
    const overlay = container.firstChild as HTMLElement
    fireEvent.click(overlay)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it.todo('Escape 키로 닫혀야 한다 (현재 미구현 — 향후 추가 필요)')
  it.todo('첫 입력 필드에 자동 포커스되어야 한다 (focus management)')
  it.todo('Tab 순환이 모달 내부에 갇혀야 한다 (focus trap)')
  it.todo('닫힌 후 트리거 요소로 포커스가 복귀해야 한다 (focus return)')
})

describe('EditModal a11y', () => {
  it('취소/저장/삭제 버튼이 접근 가능한 이름으로 노출된다', () => {
    render(
      <EditModal
        category={sampleCategory}
        onSave={vi.fn()}
        onDelete={vi.fn()}
        onClose={vi.fn()}
      />,
    )

    expect(screen.getByRole('button', { name: /저장/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /취소/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /삭제/ })).toBeInTheDocument()
  })

  it('취소 버튼 클릭으로 onClose 가 호출된다', () => {
    const onClose = vi.fn()
    render(
      <EditModal
        category={sampleCategory}
        onSave={vi.fn()}
        onDelete={vi.fn()}
        onClose={onClose}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /취소/ }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('오버레이 클릭으로 닫힌다 (외부 영역 클릭 닫기 패턴)', () => {
    const onClose = vi.fn()
    render(
      <EditModal
        category={sampleCategory}
        onSave={vi.fn()}
        onDelete={vi.fn()}
        onClose={onClose}
      />,
    )

    const overlay = screen.getByTestId('modal-overlay')
    fireEvent.click(overlay)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it.todo('role="dialog" + aria-modal 속성이 추가되어야 한다 (현재 누락)')
  it.todo('aria-labelledby 로 제목과 연결되어야 한다 (현재 누락)')
  it.todo('Escape 키로 닫혀야 한다 (현재 미구현)')
})

describe('ImportModal a11y', () => {
  it('닫기 버튼이 접근 가능한 이름으로 노출된다', () => {
    render(<ImportModal onClose={vi.fn()} />)
    expect(screen.getByRole('button', { name: /닫기/ })).toBeInTheDocument()
  })

  it('닫기 버튼 클릭으로 onClose 가 호출된다', () => {
    const onClose = vi.fn()
    render(<ImportModal onClose={onClose} />)

    fireEvent.click(screen.getByRole('button', { name: /닫기/ }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it.todo('role="dialog" + aria-modal 속성이 추가되어야 한다 (현재 누락)')
  it.todo('Escape 키로 닫혀야 한다 (현재 미구현)')
  it.todo('파일 input 이 키보드만으로 트리거 가능해야 한다 (button label 명확화)')
})

describe('RecurrenceModal a11y', () => {
  it('isOpen=false 면 렌더되지 않는다 (스크린리더 노이즈 방지)', () => {
    const { container } = render(
      <RecurrenceModal isOpen={false} onClose={vi.fn()} onConfirm={vi.fn()} />,
    )
    expect(container.firstChild).toBeNull()
  })

  it('취소/확인 버튼이 접근 가능한 이름으로 노출된다', () => {
    render(<RecurrenceModal isOpen={true} onClose={vi.fn()} onConfirm={vi.fn()} />)

    expect(screen.getByRole('button', { name: /취소/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /확인|추가|저장/ })).toBeInTheDocument()
  })

  it('취소 버튼 클릭으로 onClose 가 호출된다', () => {
    const onClose = vi.fn()
    render(<RecurrenceModal isOpen={true} onClose={onClose} onConfirm={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: /취소/ }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it.todo('role="dialog" + aria-modal 속성이 추가되어야 한다 (현재 누락)')
  it.todo('요일 토글 버튼은 aria-pressed 로 선택 상태를 노출해야 한다')
  it.todo('Escape 키로 닫혀야 한다 (현재 미구현)')
})
