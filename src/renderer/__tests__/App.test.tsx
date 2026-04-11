import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import '@testing-library/jest-dom'

const mockGet = vi.fn()
const mockSet = vi.fn()
vi.stubGlobal('storage', { get: mockGet, set: mockSet })

describe('App', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    vi.resetModules()
    vi.stubGlobal('storage', { get: mockGet, set: mockSet })
    mockGet.mockResolvedValue({ value: null })
  })

  it('renders loading state initially before data loads', async () => {
    // storage.get가 pending 상태로 있을 때 로딩 UI 확인
    let resolveGet!: (value: { value: string | null }) => void
    mockGet.mockReturnValue(new Promise((resolve) => { resolveGet = resolve }))

    const { default: App } = await import('../App')
    render(<App />)

    expect(screen.getByText('로딩 중...')).toBeInTheDocument()

    // cleanup
    act(() => { resolveGet({ value: null }) })
  })

  it('renders main layout after data loads', async () => {
    mockGet.mockResolvedValue({ value: null })

    const { default: App } = await import('../App')

    await act(async () => {
      render(<App />)
    })

    // TopBar 로고
    expect(screen.getByText('My Hub')).toBeInTheDocument()
    // 카테고리 추가 버튼
    expect(screen.getByText('+ 카테고리')).toBeInTheDocument()
  })

  it('renders Clock widget after load', async () => {
    mockGet.mockResolvedValue({ value: null })

    const { default: App } = await import('../App')

    await act(async () => {
      render(<App />)
    })

    // Clock의 시간 표시 (HH:MM 형식)
    const timePattern = /\d{2}:\d{2}/
    expect(screen.getByText(timePattern)).toBeInTheDocument()
  })

  it('renders TodoWidget after load', async () => {
    mockGet.mockResolvedValue({ value: null })

    const { default: App } = await import('../App')

    await act(async () => {
      render(<App />)
    })

    expect(screen.getByText(/개 남음/)).toBeInTheDocument()
  })

  it('renders NotesWidget after load', async () => {
    mockGet.mockResolvedValue({ value: null })

    const { default: App } = await import('../App')

    await act(async () => {
      render(<App />)
    })

    expect(screen.getByText('빠른 메모')).toBeInTheDocument()
  })

  it('opens EditModal when + 카테고리 is clicked', async () => {
    mockGet.mockResolvedValue({ value: null })

    const { default: App } = await import('../App')

    await act(async () => {
      render(<App />)
    })

    const addBtn = screen.getByText('+ 카테고리')
    fireEvent.click(addBtn)

    expect(screen.getByText('카테고리 편집')).toBeInTheDocument()
  })

  it('toggles theme when theme button is clicked', async () => {
    mockGet.mockResolvedValue({ value: null })

    const { default: App } = await import('../App')

    await act(async () => {
      render(<App />)
    })

    // 테마 버튼이 존재해야 함
    const themeBtn = screen.getByTestId('theme-toggle')
    expect(themeBtn).toBeInTheDocument()

    fireEvent.click(themeBtn)
    // 토글 후에도 버튼이 여전히 존재
    expect(screen.getByTestId('theme-toggle')).toBeInTheDocument()
  })
})
