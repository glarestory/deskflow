// @MX:SPEC: SPEC-UX-002
// CommandPalette 통합 테스트 — AC-001 ~ AC-015 검증
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'

// embeddingStore 모킹 (Phase 3 훅 의존 — bookmarkStore가 import함)
vi.mock('../../stores/embeddingStore', () => ({
  useEmbeddingStore: {
    getState: vi.fn(() => ({
      enqueueIndex: vi.fn(),
      removeEmbedding: vi.fn(),
    })),
  },
}))

// storage 모킹
vi.stubGlobal('storage', { get: vi.fn().mockResolvedValue({ value: null }), set: vi.fn() })

// localStorage 모킹
const mockLocalStorage: Record<string, string> = {}
vi.stubGlobal('localStorage', {
  getItem: (key: string) => mockLocalStorage[key] ?? null,
  setItem: (key: string, value: string) => { mockLocalStorage[key] = value },
  removeItem: (key: string) => { delete mockLocalStorage[key] },
  clear: () => { Object.keys(mockLocalStorage).forEach((k) => { delete mockLocalStorage[k] }) },
})

// window.open 모킹
const mockWindowOpen = vi.fn()
vi.stubGlobal('open', mockWindowOpen)

describe('CommandPalette 통합 테스트', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    vi.resetModules()
    vi.stubGlobal('storage', { get: vi.fn().mockResolvedValue({ value: null }), set: vi.fn() })
    vi.stubGlobal('open', mockWindowOpen)
    Object.keys(mockLocalStorage).forEach((k) => { delete mockLocalStorage[k] })

    // 북마크 로드
    const { useBookmarkStore } = await import('../../stores/bookmarkStore')
    await useBookmarkStore.getState().loadBookmarks()
  })

  // AC-001: Cmd+K 열기/닫기
  it('AC-001: onClose 콜백이 Escape로 호출된다', async () => {
    const onClose = vi.fn()
    const { default: CommandPalette } = await import('./CommandPalette')
    render(<CommandPalette isOpen={true} onClose={onClose} />)

    fireEvent.keyDown(screen.getByRole('combobox'), { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  // AC-003: 통합 fuzzy 검색 — "ai"로 북마크+카테고리+태그 동시 검색
  it('AC-003: "github" 검색 시 북마크 결과가 표시된다', async () => {
    const { default: CommandPalette } = await import('./CommandPalette')
    render(<CommandPalette isOpen={true} onClose={vi.fn()} />)

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'github' } })

    const options = document.querySelectorAll('[role="option"]')
    const githubOption = Array.from(options).find((el) => el.textContent?.includes('GitHub'))
    expect(githubOption).toBeDefined()
  })

  // AC-004: highlight 렌더링
  it('AC-004: 검색 결과에 highlight 마크업이 적용된다', async () => {
    const { default: CommandPalette } = await import('./CommandPalette')
    render(<CommandPalette isOpen={true} onClose={vi.fn()} />)

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'git' } })

    const highlighted = document.querySelectorAll('.result-item-highlight')
    expect(highlighted.length).toBeGreaterThan(0)
  })

  // AC-005: 키보드 네비게이션 — ↓ 3번 → 4번째 항목 선택
  it('AC-005: 아래 화살표 3번 누르면 3번째 인덱스 선택', async () => {
    const { default: CommandPalette } = await import('./CommandPalette')
    render(<CommandPalette isOpen={true} onClose={vi.fn()} />)

    const input = screen.getByRole('combobox')
    fireEvent.change(input, { target: { value: 'e' } })

    // 3번 아래 이동
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    fireEvent.keyDown(input, { key: 'ArrowDown' })

    // 인덱스 3 항목이 선택 상태
    const selectedItems = document.querySelectorAll('[aria-selected="true"]')
    expect(selectedItems.length).toBe(1)
    expect(selectedItems[0]).toHaveAttribute('data-index', '3')
  })

  // AC-006: Cmd+Enter 새 창 열기
  it('AC-006: Cmd+Enter 시 북마크가 새 창으로 열린다', async () => {
    const { default: CommandPalette } = await import('./CommandPalette')
    render(<CommandPalette isOpen={true} onClose={vi.fn()} />)

    const input = screen.getByRole('combobox')
    fireEvent.change(input, { target: { value: 'GitHub' } })
    fireEvent.keyDown(input, { key: 'Enter', metaKey: true })

    expect(mockWindowOpen).toHaveBeenCalledWith('https://github.com', '_blank')
  })

  // AC-007: Alt+Enter 편집
  it('AC-007: Alt+Enter 시 onEditBookmark 콜백이 호출된다', async () => {
    const onEditBookmark = vi.fn()
    const onClose = vi.fn()
    const { default: CommandPalette } = await import('./CommandPalette')
    render(
      <CommandPalette
        isOpen={true}
        onClose={onClose}
        onEditBookmark={onEditBookmark}
      />,
    )

    const input = screen.getByRole('combobox')
    fireEvent.change(input, { target: { value: 'GitHub' } })
    fireEvent.keyDown(input, { key: 'Enter', altKey: true })

    expect(onEditBookmark).toHaveBeenCalledWith('l5')
    expect(onClose).toHaveBeenCalled()
  })

  // AC-008: > 접두사 액션만 표시
  it('AC-008: > 접두사 검색 시 Actions 그룹만 표시된다', async () => {
    const { default: CommandPalette } = await import('./CommandPalette')
    render(<CommandPalette isOpen={true} onClose={vi.fn()} />)

    fireEvent.change(screen.getByRole('combobox'), { target: { value: '>테마' } })

    const options = document.querySelectorAll('[role="option"]')
    expect(options.length).toBeGreaterThan(0)
    // 모든 결과가 액션이어야 함 (북마크/카테고리/태그 없음)
    // 그룹 헤더에 '액션' 텍스트 확인
    const allText = document.querySelector('.command-palette-results')?.textContent ?? ''
    expect(allText).toContain('테마')
    expect(allText).not.toMatch(/Work|Dev|GitHub/)
  })

  // AC-009: # 접두사 태그만 표시
  it('AC-009: # 접두사 검색 시 Tags 그룹만 표시된다', async () => {
    // tagStore에 태그 데이터 준비 (bookmarks 기반으로 집계)
    const { useBookmarkStore } = await import('../../stores/bookmarkStore')
    const { useTagStore } = await import('../../stores/tagStore')
    const bookmarks = useBookmarkStore.getState().bookmarks
    useTagStore.getState().recomputeAllTags(bookmarks)

    const { default: CommandPalette } = await import('./CommandPalette')
    render(<CommandPalette isOpen={true} onClose={vi.fn()} />)

    fireEvent.change(screen.getByRole('combobox'), { target: { value: '#dev' } })

    const options = document.querySelectorAll('[role="option"]')
    expect(options.length).toBeGreaterThan(0)
    // 태그 그룹 헤더 확인
    const headerEl = document.querySelector('.command-palette-group-header')
    expect(headerEl?.textContent).toContain('태그')
  })

  // AC-010: Empty state
  it('AC-010: 매칭 결과 없음 시 empty state 메시지 표시', async () => {
    const { default: CommandPalette } = await import('./CommandPalette')
    render(<CommandPalette isOpen={true} onClose={vi.fn()} />)

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'xxxxxxxxxxxxxxxx' } })

    expect(screen.getByTestId('command-palette-empty')).toBeInTheDocument()
    expect(screen.getByText(/결과 없음/)).toBeInTheDocument()
  })

  // AC-012: ARIA combobox 패턴
  it('AC-012: ARIA combobox role이 설정된다', async () => {
    const { default: CommandPalette } = await import('./CommandPalette')
    render(<CommandPalette isOpen={true} onClose={vi.fn()} />)

    const combobox = screen.getByRole('combobox')
    expect(combobox).toHaveAttribute('aria-autocomplete', 'list')
    expect(combobox).toHaveAttribute('aria-haspopup', 'listbox')
  })

  // AC-013: 액션 실행 — 테마 전환
  it('AC-013: > 테마 검색 후 Enter로 onToggleTheme 호출', async () => {
    const onToggleTheme = vi.fn()
    const onClose = vi.fn()
    const { default: CommandPalette } = await import('./CommandPalette')
    render(
      <CommandPalette
        isOpen={true}
        onClose={onClose}
        onToggleTheme={onToggleTheme}
      />,
    )

    const input = screen.getByRole('combobox')
    fireEvent.change(input, { target: { value: '>테마' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(onToggleTheme).toHaveBeenCalled()
    expect(onClose).toHaveBeenCalled()
  })

  // EDGE-001: 한글 자모 분리 입력 처리
  it('EDGE-001: 한글 자모 입력 시 오류 없이 처리된다', async () => {
    const { default: CommandPalette } = await import('./CommandPalette')
    render(<CommandPalette isOpen={true} onClose={vi.fn()} />)

    expect(() => {
      fireEvent.change(screen.getByRole('combobox'), { target: { value: 'ㅈ' } })
    }).not.toThrow()
  })

  // EDGE-003: 매우 긴 검색어
  it('EDGE-003: 200자 검색어도 오류 없이 처리된다', async () => {
    const { default: CommandPalette } = await import('./CommandPalette')
    render(<CommandPalette isOpen={true} onClose={vi.fn()} />)

    const longQuery = 'a'.repeat(200)
    expect(() => {
      fireEvent.change(screen.getByRole('combobox'), { target: { value: longQuery } })
    }).not.toThrow()
  })

  // 푸터 키 가이드
  it('팔레트 하단에 키 가이드 텍스트가 표시된다', async () => {
    const { default: CommandPalette } = await import('./CommandPalette')
    render(<CommandPalette isOpen={true} onClose={vi.fn()} />)

    expect(screen.getByText(/↑↓ 이동/)).toBeInTheDocument()
    expect(screen.getByText(/↵ 실행/)).toBeInTheDocument()
    expect(screen.getByText(/Esc 닫기/)).toBeInTheDocument()
  })
})
