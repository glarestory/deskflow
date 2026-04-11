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
    { id: 'l1', name: 'Gmail', url: 'https://mail.google.com' },
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
})
