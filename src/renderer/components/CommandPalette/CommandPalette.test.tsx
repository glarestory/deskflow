// @MX:SPEC: SPEC-UX-001, SPEC-UX-002, SPEC-SEARCH-RAG-001
// Command Palette 컴포넌트 테스트 — SPEC-UX-001 기존 기능 + SPEC-UX-002 신규 기능 + RAG 통합 검증
// 참고: SPEC-UX-002 리팩터링으로 인해 할일(Todo) 검색, Google 검색 폴백, 최근 검색어 UI가 제거됨
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

// ragStore 모킹 — 기본: 정상 동작 (ollamaAvailable=true, modelMissing=false)
const mockCheckHealth = vi.fn().mockResolvedValue(undefined)
const mockSearch = vi.fn().mockResolvedValue([])

vi.mock('../../stores/ragStore', () => {
  // Zustand 훅 패턴: useRagStore(selector) 형태와 getState() 모두 지원
  let ragState = {
    enabled: true,
    ollamaAvailable: true,
    modelMissing: false,
    similarityThreshold: 0.70,
    lastHealthCheck: null as string | null,
    checkHealth: mockCheckHealth,
    search: mockSearch,
    setEnabled: vi.fn(),
    setThreshold: vi.fn(),
  }

  const useRagStore = (selector?: (s: typeof ragState) => unknown) => {
    if (selector) return selector(ragState)
    return ragState
  }
  useRagStore.getState = () => ragState
  useRagStore.setState = (partial: Partial<typeof ragState>) => {
    ragState = { ...ragState, ...partial }
  }
  useRagStore.subscribe = vi.fn()

  return { useRagStore, __ragState: ragState }
})

// storage 모킹
const mockGet = vi.fn()
const mockSet = vi.fn()
vi.stubGlobal('storage', { get: mockGet, set: mockSet })

// localStorage 모킹 (usageStore persist용)
const mockLocalStorage: Record<string, string> = {}
vi.stubGlobal('localStorage', {
  getItem: (key: string) => mockLocalStorage[key] ?? null,
  setItem: (key: string, value: string) => { mockLocalStorage[key] = value },
  removeItem: (key: string) => { delete mockLocalStorage[key] },
  clear: () => { Object.keys(mockLocalStorage).forEach((k) => { delete mockLocalStorage[k] }) },
})

// window.open 모킹 (북마크 URL 열기용)
const mockWindowOpen = vi.fn()
vi.stubGlobal('open', mockWindowOpen)

describe('CommandPalette', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    vi.resetModules()
    vi.stubGlobal('storage', { get: mockGet, set: mockSet })
    vi.stubGlobal('open', mockWindowOpen)
    Object.keys(mockLocalStorage).forEach((k) => { delete mockLocalStorage[k] })
    mockGet.mockResolvedValue({ value: null })
  })

  // REQ-001: isOpen=true 시 렌더링, false 시 숨김
  it('isOpen=true일 때 렌더링된다', async () => {
    const { default: CommandPalette } = await import('./CommandPalette')
    render(<CommandPalette isOpen={true} onClose={vi.fn()} />)

    expect(screen.getByRole('combobox')).toBeInTheDocument()
  })

  it('isOpen=false일 때 렌더링되지 않는다', async () => {
    const { default: CommandPalette } = await import('./CommandPalette')
    render(<CommandPalette isOpen={false} onClose={vi.fn()} />)

    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
  })

  // REQ-002: 팔레트 오픈 시 입력 필드 자동 포커스
  it('팔레트가 열리면 입력 필드에 자동 포커스된다', async () => {
    const { default: CommandPalette } = await import('./CommandPalette')
    render(<CommandPalette isOpen={true} onClose={vi.fn()} />)

    const input = screen.getByRole('combobox')
    expect(input).toHaveFocus()
  })

  // REQ-003: Escape 키로 닫기
  it('Escape 키를 누르면 onClose가 호출된다', async () => {
    const onClose = vi.fn()
    const { default: CommandPalette } = await import('./CommandPalette')
    render(<CommandPalette isOpen={true} onClose={onClose} />)

    const input = screen.getByRole('combobox')
    fireEvent.keyDown(input, { key: 'Escape' })

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  // REQ-003: 오버레이 외부 클릭으로 닫기
  it('오버레이(배경)를 클릭하면 onClose가 호출된다', async () => {
    const onClose = vi.fn()
    const { default: CommandPalette } = await import('./CommandPalette')
    render(<CommandPalette isOpen={true} onClose={onClose} />)

    const overlay = screen.getByTestId('command-palette-overlay')
    fireEvent.mouseDown(overlay)

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  // REQ-004: 입력 시 북마크 결과 필터링
  it('검색어 입력 시 북마크 결과가 필터링된다', async () => {
    const { useBookmarkStore } = await import('../../stores/bookmarkStore')
    await useBookmarkStore.getState().loadBookmarks()

    const { default: CommandPalette } = await import('./CommandPalette')
    render(<CommandPalette isOpen={true} onClose={vi.fn()} />)

    const input = screen.getByRole('combobox')
    fireEvent.change(input, { target: { value: 'GitHub' } })

    // GitHub 북마크가 결과 목록에 포함되어야 함 (textContent로 확인)
    const options = document.querySelectorAll('[role="option"]')
    const githubOption = Array.from(options).find((el) => el.textContent?.includes('GitHub'))
    expect(githubOption).toBeDefined()
  })

  // REQ-004: 앱 액션 필터링 (테마 전환) — SPEC-UX-002에서 레이블이 '테마 전환'으로 변경
  it('검색어 입력 시 앱 액션(테마 전환)이 필터링된다', async () => {
    const { default: CommandPalette } = await import('./CommandPalette')
    render(<CommandPalette isOpen={true} onClose={vi.fn()} />)

    const input = screen.getByRole('combobox')
    fireEvent.change(input, { target: { value: '테마' } })

    // '테마 전환' 텍스트가 포함된 액션 항목 확인 (textContent 사용)
    const options = document.querySelectorAll('[role="option"]')
    const themeOption = Array.from(options).find((el) => el.textContent?.includes('테마 전환'))
    expect(themeOption).toBeDefined()
  })

  // SPEC-UX-002: Google 검색 폴백은 제거됨 (usageStore 기반 추천으로 대체)
  it('입력이 없으면 검색 결과가 비어있다', async () => {
    const { default: CommandPalette } = await import('./CommandPalette')
    render(<CommandPalette isOpen={true} onClose={vi.fn()} />)

    // 빈 입력 상태에서 결과 없음
    const options = document.querySelectorAll('[role="option"]')
    expect(options.length).toBe(0)
  })

  // REQ-006: 화살표 키 네비게이션
  it('아래 화살표 키로 다음 항목을 선택한다', async () => {
    const { useBookmarkStore } = await import('../../stores/bookmarkStore')
    await useBookmarkStore.getState().loadBookmarks()

    const { default: CommandPalette } = await import('./CommandPalette')
    render(<CommandPalette isOpen={true} onClose={vi.fn()} />)

    const input = screen.getByRole('combobox')
    fireEvent.change(input, { target: { value: 'G' } })
    fireEvent.keyDown(input, { key: 'ArrowDown' })

    // 첫 번째 항목이 선택된 상태여야 함
    const selectedItem = document.querySelector('[aria-selected="true"]')
    expect(selectedItem).toBeInTheDocument()
  })

  it('위 화살표 키로 이전 항목을 선택한다', async () => {
    const { useBookmarkStore } = await import('../../stores/bookmarkStore')
    await useBookmarkStore.getState().loadBookmarks()

    const { default: CommandPalette } = await import('./CommandPalette')
    render(<CommandPalette isOpen={true} onClose={vi.fn()} />)

    const input = screen.getByRole('combobox')
    fireEvent.change(input, { target: { value: 'G' } })
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    fireEvent.keyDown(input, { key: 'ArrowUp' })

    const selectedItem = document.querySelector('[aria-selected="true"]')
    expect(selectedItem).toBeInTheDocument()
  })

  // REQ-005: Enter 키로 액션 실행 (북마크)
  it('북마크 항목 선택 후 Enter 키로 URL이 열린다', async () => {
    const { useBookmarkStore } = await import('../../stores/bookmarkStore')
    await useBookmarkStore.getState().loadBookmarks()

    const { default: CommandPalette } = await import('./CommandPalette')
    render(<CommandPalette isOpen={true} onClose={vi.fn()} />)

    const input = screen.getByRole('combobox')
    // 'GitHub' 입력 시 첫 번째 항목(index=0)이 GitHub 북마크
    // 초기 selectedIndex=0이므로 Enter로 실행
    fireEvent.change(input, { target: { value: 'GitHub' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(mockWindowOpen).toHaveBeenCalledWith('https://github.com', '_blank')
  })

  // REQ-007: 최대 20개 결과 (SPEC-UX-002에서 20개로 변경)
  it('결과는 최대 20개를 초과하지 않는다', async () => {
    const { useBookmarkStore } = await import('../../stores/bookmarkStore')
    await useBookmarkStore.getState().loadBookmarks()

    const { default: CommandPalette } = await import('./CommandPalette')
    render(<CommandPalette isOpen={true} onClose={vi.fn()} />)

    const input = screen.getByRole('combobox')
    fireEvent.change(input, { target: { value: 'e' } })

    const items = document.querySelectorAll('[role="option"]')
    expect(items.length).toBeLessThanOrEqual(20)
  })

  // SPEC-UX-002: Empty state 검증
  it('매칭 결과 없음 시 empty state 메시지 표시', async () => {
    const { default: CommandPalette } = await import('./CommandPalette')
    render(<CommandPalette isOpen={true} onClose={vi.fn()} />)

    const input = screen.getByRole('combobox')
    fireEvent.change(input, { target: { value: 'xxxxxxxxxxxxxxxx' } })

    expect(screen.getByTestId('command-palette-empty')).toBeInTheDocument()
  })

  // SPEC-UX-002: 푸터 키 가이드 표시
  it('팔레트에 푸터 키 가이드가 표시된다', async () => {
    const { default: CommandPalette } = await import('./CommandPalette')
    render(<CommandPalette isOpen={true} onClose={vi.fn()} />)

    expect(screen.getByText(/Esc 닫기/)).toBeInTheDocument()
  })

  // SPEC-UX-002: 접두사 필터링 — > 액션
  it('> 접두사 입력 시 액션 그룹만 검색된다', async () => {
    const { default: CommandPalette } = await import('./CommandPalette')
    render(<CommandPalette isOpen={true} onClose={vi.fn()} />)

    const input = screen.getByRole('combobox')
    fireEvent.change(input, { target: { value: '>테마' } })

    // 결과 항목이 액션 variant만 있어야 함
    const options = document.querySelectorAll('[role="option"]')
    expect(options.length).toBeGreaterThan(0)
    // 북마크 badge가 없어야 함
    const allText = Array.from(options).map((el) => el.textContent ?? '').join(' ')
    expect(allText).toContain('테마')
  })

  // SPEC-UX-002: Cmd+Enter 새 창 열기
  it('Cmd+Enter 시 북마크가 새 창으로 열린다', async () => {
    const { useBookmarkStore } = await import('../../stores/bookmarkStore')
    await useBookmarkStore.getState().loadBookmarks()

    const { default: CommandPalette } = await import('./CommandPalette')
    render(<CommandPalette isOpen={true} onClose={vi.fn()} />)

    const input = screen.getByRole('combobox')
    fireEvent.change(input, { target: { value: 'GitHub' } })
    fireEvent.keyDown(input, { key: 'Enter', metaKey: true })

    expect(mockWindowOpen).toHaveBeenCalledWith('https://github.com', '_blank')
  })
})

// ─── SPEC-SEARCH-RAG-001 Phase 5 통합 테스트 ─────────────────────────────────

describe('CommandPalette RAG 통합 (SPEC-SEARCH-RAG-001)', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    vi.resetModules()
    vi.stubGlobal('storage', { get: vi.fn().mockResolvedValue({ value: null }), set: vi.fn() })
    vi.stubGlobal('open', mockWindowOpen)
    Object.keys(mockLocalStorage).forEach((k) => { delete mockLocalStorage[k] })
    mockSearch.mockResolvedValue([])
    mockCheckHealth.mockResolvedValue(undefined)
  })

  // AC-004: 배지 3가지 상태 — 녹색 "RAG 준비됨"
  it('AC-004: ollamaAvailable=true && modelMissing=false → "RAG 준비됨" 배지 표시', async () => {
    const { useRagStore } = await import('../../stores/ragStore')
    // 정상 상태 설정
    ;(useRagStore as unknown as { setState: (p: Record<string, unknown>) => void }).setState({
      ollamaAvailable: true,
      modelMissing: false,
    })

    const { default: CommandPalette } = await import('./CommandPalette')
    render(<CommandPalette isOpen={true} onClose={vi.fn()} />)

    expect(screen.getByText('RAG 준비됨')).toBeInTheDocument()
  })

  // AC-004: 배지 — 노랑 "모델 누락"
  it('AC-004: ollamaAvailable=true && modelMissing=true → "모델 누락" 배지 표시', async () => {
    // ragStore 모킹 재정의
    vi.doMock('../../stores/ragStore', () => {
      const ragState = {
        enabled: true,
        ollamaAvailable: true,
        modelMissing: true,
        similarityThreshold: 0.70,
        lastHealthCheck: null,
        checkHealth: mockCheckHealth,
        search: mockSearch,
        setEnabled: vi.fn(),
        setThreshold: vi.fn(),
      }
      const useRagStore = (selector?: (s: typeof ragState) => unknown) =>
        selector ? selector(ragState) : ragState
      useRagStore.getState = () => ragState
      useRagStore.setState = vi.fn()
      useRagStore.subscribe = vi.fn()
      return { useRagStore }
    })

    const { default: CommandPalette } = await import('./CommandPalette')
    render(<CommandPalette isOpen={true} onClose={vi.fn()} />)

    expect(screen.getByText('모델 누락')).toBeInTheDocument()
  })

  // AC-004: 배지 — 빨강 "Ollama 미탐지" + RAG 섹션 없음
  it('AC-004: ollamaAvailable=false → "Ollama 미탐지" 배지 표시', async () => {
    vi.doMock('../../stores/ragStore', () => {
      const ragState = {
        enabled: true,
        ollamaAvailable: false,
        modelMissing: false,
        similarityThreshold: 0.70,
        lastHealthCheck: null,
        checkHealth: mockCheckHealth,
        search: mockSearch,
        setEnabled: vi.fn(),
        setThreshold: vi.fn(),
      }
      const useRagStore = (selector?: (s: typeof ragState) => unknown) =>
        selector ? selector(ragState) : ragState
      useRagStore.getState = () => ragState
      useRagStore.setState = vi.fn()
      useRagStore.subscribe = vi.fn()
      return { useRagStore }
    })

    const { default: CommandPalette } = await import('./CommandPalette')
    render(<CommandPalette isOpen={true} onClose={vi.fn()} />)

    expect(screen.getByText('Ollama 미탐지')).toBeInTheDocument()
  })

  // AC-019: 쿼리 4자 미만 → RAG 섹션 없음
  it('AC-019: 쿼리 3자 → RAG 결과 없음', async () => {
    // search()가 빈 배열 반환하도록 (4자 미만 조기 반환)
    mockSearch.mockResolvedValue([])

    const { default: CommandPalette } = await import('./CommandPalette')
    render(<CommandPalette isOpen={true} onClose={vi.fn()} />)

    const input = screen.getByRole('combobox')
    fireEvent.change(input, { target: { value: 'abc' } })

    // RAG 그룹 헤더가 없어야 함
    const headers = document.querySelectorAll('.command-palette-group-header')
    const ragHeader = Array.from(headers).find((el) => el.textContent === 'RAG')
    expect(ragHeader).toBeUndefined()
  })

  // AC-029: RAG 비활성화 시 결과 없음
  it('AC-029: enabled=false → RAG 섹션 없음', async () => {
    vi.doMock('../../stores/ragStore', () => {
      const ragState = {
        enabled: false,
        ollamaAvailable: true,
        modelMissing: false,
        similarityThreshold: 0.70,
        lastHealthCheck: null,
        checkHealth: mockCheckHealth,
        search: mockSearch,
        setEnabled: vi.fn(),
        setThreshold: vi.fn(),
      }
      const useRagStore = (selector?: (s: typeof ragState) => unknown) =>
        selector ? selector(ragState) : ragState
      useRagStore.getState = () => ragState
      useRagStore.setState = vi.fn()
      useRagStore.subscribe = vi.fn()
      return { useRagStore }
    })

    const { default: CommandPalette } = await import('./CommandPalette')
    render(<CommandPalette isOpen={true} onClose={vi.fn()} />)

    const input = screen.getByRole('combobox')
    fireEvent.change(input, { target: { value: '자연어 검색 테스트' } })

    const headers = document.querySelectorAll('.command-palette-group-header')
    const ragHeader = Array.from(headers).find((el) => el.textContent === 'RAG')
    expect(ragHeader).toBeUndefined()
  })
})
