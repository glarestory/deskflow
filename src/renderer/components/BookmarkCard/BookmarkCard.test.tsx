import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import BookmarkCard from './BookmarkCard'
import type { Category } from '../../types'

const mockCategory: Category = {
  id: 'cat-1',
  name: 'Work',
  icon: '💼',
  links: [
    { id: 'l1', name: 'Gmail', url: 'https://mail.google.com' },
    { id: 'l2', name: 'Drive', url: 'https://drive.google.com' },
  ],
}

describe('BookmarkCard', () => {
  it('renders category name and icon', () => {
    const onEdit = vi.fn()
    render(<BookmarkCard category={mockCategory} onEdit={onEdit} />)

    expect(screen.getByText('Work')).toBeInTheDocument()
    expect(screen.getByText('💼')).toBeInTheDocument()
  })

  it('renders all links in 2-column grid', () => {
    const onEdit = vi.fn()
    render(<BookmarkCard category={mockCategory} onEdit={onEdit} />)

    expect(screen.getByText('Gmail')).toBeInTheDocument()
    expect(screen.getByText('Drive')).toBeInTheDocument()
  })

  it('links open in new tab', () => {
    const onEdit = vi.fn()
    render(<BookmarkCard category={mockCategory} onEdit={onEdit} />)

    const gmailLink = screen.getByText('Gmail').closest('a')
    expect(gmailLink).toHaveAttribute('href', 'https://mail.google.com')
    expect(gmailLink).toHaveAttribute('target', '_blank')
  })

  it('calls onEdit with category when settings button is clicked', () => {
    const onEdit = vi.fn()
    render(<BookmarkCard category={mockCategory} onEdit={onEdit} />)

    const settingsBtn = screen.getByRole('button')
    fireEvent.click(settingsBtn)

    expect(onEdit).toHaveBeenCalledWith(mockCategory)
  })
})
