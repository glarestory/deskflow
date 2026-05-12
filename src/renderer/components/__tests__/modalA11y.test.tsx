// @MX:TEST: SPEC-A11Y-MODAL-001 — 4종 모달 a11y 계약 종합 검증.
// 이전엔 일부 ARIA/Escape/focus 항목이 it.todo 였으나, useModalA11y 훅 도입과
// role/aria-modal 적용으로 모두 활성화됨.
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

const dispatchEscape = (): void => {
  fireEvent.keyDown(document, { key: 'Escape' })
}

describe('CapsuleEditModal a11y (SPEC-A11Y-MODAL-001)', () => {
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
    fireEvent.click(screen.getByRole('button', { name: /취소/ }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('오버레이(다이얼로그 외부) 클릭으로 닫힌다', () => {
    const onClose = vi.fn()
    const { container } = render(<CapsuleEditModal capsule={null} onClose={onClose} />)
    const overlay = container.firstChild as HTMLElement
    fireEvent.click(overlay)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('Escape 키로 닫힌다', () => {
    const onClose = vi.fn()
    render(<CapsuleEditModal capsule={null} onClose={onClose} />)
    dispatchEscape()
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('첫 입력 필드(이모지 또는 이름)에 자동 포커스된다', () => {
    render(<CapsuleEditModal capsule={null} onClose={vi.fn()} />)
    // 모달 내부 첫 포커스 가능 요소가 활성화되어야 함
    const dialog = screen.getByRole('dialog')
    expect(dialog.contains(document.activeElement)).toBe(true)
  })

  it('Tab 순환이 모달 내부에 갇힌다 (마지막 → 첫 요소 wrap)', () => {
    render(<CapsuleEditModal capsule={null} onClose={vi.fn()} />)
    const dialog = screen.getByRole('dialog')
    const focusables = Array.from(
      dialog.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    )
    expect(focusables.length).toBeGreaterThan(0)

    // 마지막 요소 포커스 후 Tab → 첫 요소로 wrap
    const last = focusables[focusables.length - 1]
    last.focus()
    fireEvent.keyDown(document, { key: 'Tab' })
    expect(document.activeElement).toBe(focusables[0])
  })

  it('닫힌 후 트리거 요소로 포커스가 복귀한다', () => {
    // 트리거 버튼 사전 배치
    const trigger = document.createElement('button')
    trigger.textContent = 'Open'
    document.body.appendChild(trigger)
    trigger.focus()
    expect(document.activeElement).toBe(trigger)

    const { unmount } = render(<CapsuleEditModal capsule={null} onClose={vi.fn()} />)
    // 모달 마운트 시 자동 포커스로 활성 요소가 변경됨
    expect(document.activeElement).not.toBe(trigger)

    unmount()
    expect(document.activeElement).toBe(trigger)
    trigger.remove()
  })
})

describe('EditModal a11y (SPEC-A11Y-MODAL-001)', () => {
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

  it('role="dialog" + aria-modal 속성이 설정된다', () => {
    render(
      <EditModal
        category={sampleCategory}
        onSave={vi.fn()}
        onDelete={vi.fn()}
        onClose={vi.fn()}
      />,
    )
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
  })

  it('aria-labelledby 로 제목과 연결된다', () => {
    render(
      <EditModal
        category={sampleCategory}
        onSave={vi.fn()}
        onDelete={vi.fn()}
        onClose={vi.fn()}
      />,
    )
    const dialog = screen.getByRole('dialog')
    const labelledBy = dialog.getAttribute('aria-labelledby')
    expect(labelledBy).toBeTruthy()
    const titleEl = document.getElementById(labelledBy as string)
    expect(titleEl).toHaveTextContent('카테고리 편집')
  })

  it('Escape 키로 닫힌다', () => {
    const onClose = vi.fn()
    render(
      <EditModal
        category={sampleCategory}
        onSave={vi.fn()}
        onDelete={vi.fn()}
        onClose={onClose}
      />,
    )
    dispatchEscape()
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})

describe('ImportModal a11y (SPEC-A11Y-MODAL-001)', () => {
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

  it('role="dialog" + aria-modal 속성이 설정된다', () => {
    render(<ImportModal onClose={vi.fn()} />)
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
  })

  it('Escape 키로 닫힌다', () => {
    const onClose = vi.fn()
    render(<ImportModal onClose={onClose} />)
    dispatchEscape()
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('파일 선택 트리거 버튼이 접근 가능한 이름으로 노출된다 (키보드 트리거 가능)', () => {
    render(<ImportModal onClose={vi.fn()} />)
    // 파일 선택 버튼 (handleFileButtonClick) — 키보드 enter/space 로 활성화 가능한 버튼
    const fileBtn = screen.getByRole('button', { name: /파일|선택|HTML/ })
    expect(fileBtn).toBeInTheDocument()
  })
})

describe('RecurrenceModal a11y (SPEC-A11Y-MODAL-001)', () => {
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

  it('role="dialog" + aria-modal 속성이 설정된다', () => {
    render(<RecurrenceModal isOpen={true} onClose={vi.fn()} onConfirm={vi.fn()} />)
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
  })

  it('요일 토글 버튼이 aria-pressed 로 선택 상태를 노출한다', () => {
    render(<RecurrenceModal isOpen={true} onClose={vi.fn()} onConfirm={vi.fn()} />)

    // '매주' 모드로 전환
    fireEvent.click(screen.getByRole('button', { name: /매주/ }))

    // 모든 요일 버튼이 aria-pressed 속성을 가져야 함 (초기 false)
    const dayButtons = screen.getAllByRole('button', { pressed: false })
    expect(dayButtons.length).toBeGreaterThanOrEqual(7)

    // 월요일 토글 후 aria-pressed=true 확인
    const mondayBtn = screen.getByRole('button', { name: /월요일/ })
    fireEvent.click(mondayBtn)
    expect(mondayBtn).toHaveAttribute('aria-pressed', 'true')
  })

  it('Escape 키로 닫힌다', () => {
    const onClose = vi.fn()
    render(<RecurrenceModal isOpen={true} onClose={onClose} onConfirm={vi.fn()} />)
    dispatchEscape()
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
