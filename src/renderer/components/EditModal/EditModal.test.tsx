import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import EditModal from './EditModal'
import type { Category } from '../../types'

const mockCategory: Category = {
  id: 'cat-1',
  name: 'Work',
  icon: '💼',
  links: [
    { id: 'l1', name: 'Gmail', url: 'https://mail.google.com', tags: [] },
  ],
}

describe('EditModal', () => {
  it('renders modal with category name', () => {
    const onSave = vi.fn()
    const onDelete = vi.fn()
    const onClose = vi.fn()

    render(
      <EditModal
        category={mockCategory}
        onSave={onSave}
        onDelete={onDelete}
        onClose={onClose}
      />,
    )

    expect(screen.getByDisplayValue('Work')).toBeInTheDocument()
    expect(screen.getByDisplayValue('💼')).toBeInTheDocument()
  })

  it('renders existing links', () => {
    const onSave = vi.fn()
    const onDelete = vi.fn()
    const onClose = vi.fn()

    render(
      <EditModal
        category={mockCategory}
        onSave={onSave}
        onDelete={onDelete}
        onClose={onClose}
      />,
    )

    expect(screen.getByDisplayValue('Gmail')).toBeInTheDocument()
    expect(screen.getByDisplayValue('https://mail.google.com')).toBeInTheDocument()
  })

  it('calls onSave with updated category when save button is clicked', () => {
    const onSave = vi.fn()
    const onDelete = vi.fn()
    const onClose = vi.fn()

    render(
      <EditModal
        category={mockCategory}
        onSave={onSave}
        onDelete={onDelete}
        onClose={onClose}
      />,
    )

    const saveBtn = screen.getByText('저장')
    fireEvent.click(saveBtn)

    expect(onSave).toHaveBeenCalledTimes(1)
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ id: 'cat-1', name: 'Work' }))
  })

  it('calls onDelete with category id when delete button is clicked', () => {
    const onSave = vi.fn()
    const onDelete = vi.fn()
    const onClose = vi.fn()

    render(
      <EditModal
        category={mockCategory}
        onSave={onSave}
        onDelete={onDelete}
        onClose={onClose}
      />,
    )

    const deleteBtn = screen.getByText('삭제')
    fireEvent.click(deleteBtn)

    expect(onDelete).toHaveBeenCalledWith('cat-1')
  })

  it('calls onClose when cancel button is clicked', () => {
    const onSave = vi.fn()
    const onDelete = vi.fn()
    const onClose = vi.fn()

    render(
      <EditModal
        category={mockCategory}
        onSave={onSave}
        onDelete={onDelete}
        onClose={onClose}
      />,
    )

    const cancelBtn = screen.getByText('취소')
    fireEvent.click(cancelBtn)

    expect(onClose).toHaveBeenCalled()
  })

  it('calls onClose when clicking outside the modal', () => {
    const onSave = vi.fn()
    const onDelete = vi.fn()
    const onClose = vi.fn()

    render(
      <EditModal
        category={mockCategory}
        onSave={onSave}
        onDelete={onDelete}
        onClose={onClose}
      />,
    )

    const overlay = screen.getByTestId('modal-overlay')
    fireEvent.click(overlay)

    expect(onClose).toHaveBeenCalled()
  })

  it('adds a new link when "+ 링크 추가" is clicked', () => {
    const onSave = vi.fn()
    const onDelete = vi.fn()
    const onClose = vi.fn()

    render(
      <EditModal
        category={mockCategory}
        onSave={onSave}
        onDelete={onDelete}
        onClose={onClose}
      />,
    )

    const addLinkBtn = screen.getByText('+ 링크 추가')
    fireEvent.click(addLinkBtn)

    // 새 링크가 추가되어 이름 input이 하나 더 생겨야 함
    const nameInputs = screen.getAllByPlaceholderText('이름')
    expect(nameInputs.length).toBe(2)
  })

  // SPEC-BOOKMARK-003: TagInput 통합
  it('각 링크에 TagInput이 렌더링되어야 한다', () => {
    const onSave = vi.fn()
    const onDelete = vi.fn()
    const onClose = vi.fn()

    render(
      <EditModal
        category={mockCategory}
        onSave={onSave}
        onDelete={onDelete}
        onClose={onClose}
      />,
    )

    // TagInput 컴포넌트의 placeholder가 보여야 함
    expect(screen.getByPlaceholderText('태그 입력...')).toBeInTheDocument()
  })

  it('저장 시 링크 태그가 포함된 카테고리를 반환해야 한다', () => {
    const onSave = vi.fn()
    const mockCategoryWithTags: Category = {
      id: 'cat-1',
      name: 'Work',
      icon: '💼',
      links: [
        { id: 'l1', name: 'Gmail', url: 'https://mail.google.com', tags: ['email'] },
      ],
    }

    render(
      <EditModal
        category={mockCategoryWithTags}
        onSave={onSave}
        onDelete={vi.fn()}
        onClose={vi.fn()}
      />,
    )

    const saveBtn = screen.getByText('저장')
    fireEvent.click(saveBtn)

    const saved = onSave.mock.calls[0][0] as Category
    expect(saved.links[0].tags).toContain('email')
  })
})
