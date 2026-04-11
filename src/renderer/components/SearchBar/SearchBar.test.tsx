import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import SearchBar from './SearchBar'

describe('SearchBar', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('renders search input and submit button', () => {
    render(<SearchBar />)
    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })

  it('opens Google search URL on form submit', () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null)

    render(<SearchBar />)
    const input = screen.getByRole('textbox')

    fireEvent.change(input, { target: { value: 'vitest testing' } })
    fireEvent.submit(input.closest('form')!)

    expect(openSpy).toHaveBeenCalledWith(
      'https://www.google.com/search?q=vitest%20testing',
      '_blank',
    )
  })

  it('ignores empty query on submit', () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null)

    render(<SearchBar />)
    const input = screen.getByRole('textbox')

    fireEvent.change(input, { target: { value: '' } })
    fireEvent.submit(input.closest('form')!)

    expect(openSpy).not.toHaveBeenCalled()
  })

  it('ignores whitespace-only query on submit', () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null)

    render(<SearchBar />)
    const input = screen.getByRole('textbox')

    fireEvent.change(input, { target: { value: '   ' } })
    fireEvent.submit(input.closest('form')!)

    expect(openSpy).not.toHaveBeenCalled()
  })

  it('encodes special characters in search query', () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null)

    render(<SearchBar />)
    const input = screen.getByRole('textbox')

    fireEvent.change(input, { target: { value: 'hello world & more' } })
    fireEvent.submit(input.closest('form')!)

    expect(openSpy).toHaveBeenCalledWith(
      'https://www.google.com/search?q=hello%20world%20%26%20more',
      '_blank',
    )
  })
})
