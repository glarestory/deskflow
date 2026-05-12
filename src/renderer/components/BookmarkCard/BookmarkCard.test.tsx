// BookmarkCard 단위 테스트 — SPEC-UX-006 + SPEC-UX-007 전역 편집 모드 통합
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import type { Category } from '../../types'

// usageStore 모킹
vi.mock('../../stores/usageStore', () => ({
  useUsageStore: () => ({ recordUsage: vi.fn() }),
}))

// bookmarkStore 모킹 — updateBookmark 검증용
const mockUpdateBookmark = vi.fn()
vi.mock('../../stores/bookmarkStore', () => ({
  useBookmarkStore: () => ({ updateBookmark: mockUpdateBookmark }),
}))

// SPEC-UX-007: editModeStore 모킹 — isEditing 제어
let mockIsEditing = false
const mockToggle = vi.fn()
const mockSet = vi.fn()
vi.mock('../../stores/editModeStore', () => ({
  useEditMode: () => ({ isEditing: mockIsEditing, toggle: mockToggle, set: mockSet }),
  useEditModeStore: () => ({ isEditing: mockIsEditing, toggle: mockToggle, set: mockSet }),
}))

const mockCategory: Category = {
  id: 'cat-1',
  name: 'Work',
  icon: '💼',
  links: [
    { id: 'l1', name: 'Gmail', url: 'https://mail.google.com', tags: [] },
    { id: 'l2', name: 'Drive', url: 'https://drive.google.com', tags: [] },
  ],
}

// BookmarkCard를 동적 import하는 헬퍼 (모킹 이후 로드 보장)
async function renderCard(category = mockCategory, isEditing = false) {
  mockIsEditing = isEditing
  const { default: BookmarkCard } = await import('./BookmarkCard')
  const onEdit = vi.fn()
  const result = render(<BookmarkCard category={category} onEdit={onEdit} />)
  return { onEdit, ...result }
}

describe('BookmarkCard (SPEC-UX-006 + SPEC-UX-007)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockIsEditing = false
  })

  it('카테고리 이름과 아이콘이 렌더링된다', async () => {
    await renderCard()
    expect(screen.getByText('Work')).toBeInTheDocument()
    expect(screen.getByText('💼')).toBeInTheDocument()
  })

  it('링크 목록이 모두 렌더링된다', async () => {
    await renderCard()
    expect(screen.getByText('Gmail')).toBeInTheDocument()
    expect(screen.getByText('Drive')).toBeInTheDocument()
  })

  it('편집 모드 OFF 상태에서 링크에 href가 있다', async () => {
    await renderCard(mockCategory, false)
    const gmailLink = screen.getByText('Gmail').closest('a')
    expect(gmailLink).toHaveAttribute('href', 'https://mail.google.com')
    expect(gmailLink).toHaveAttribute('target', '_blank')
  })

  // SPEC-UX-007 AC-015: ⚙️ 버튼 — 편집 모드 OFF 시 opacity 0 (REQ-UX-007-015)
  it('편집 모드 OFF일 때 ⚙️ 버튼 opacity가 0이어야 한다 (AC-015)', async () => {
    await renderCard(mockCategory, false)
    const settingsBtn = screen.getByTestId('bookmark-edit-btn')
    expect(settingsBtn).toHaveStyle({ opacity: '0' })
  })

  // SPEC-UX-007 AC-015: ⚙️ 버튼 — 편집 모드 ON 시 opacity 1 (REQ-UX-007-015)
  it('편집 모드 ON일 때 ⚙️ 버튼 opacity가 1이어야 한다 (AC-015)', async () => {
    await renderCard(mockCategory, true)
    const settingsBtn = screen.getByTestId('bookmark-edit-btn')
    expect(settingsBtn).toHaveStyle({ opacity: '1' })
  })

  // SPEC-UX-007 AC-015: ⚙️ 버튼 onClick은 onEdit(category)만 호출 (setIsEditing 호출 없음)
  it('⚙️ 버튼 클릭 시 onEdit(category)만 호출되어야 한다 (AC-015)', async () => {
    const { onEdit } = await renderCard(mockCategory, true)
    const settingsBtn = screen.getByTestId('bookmark-edit-btn')
    fireEvent.click(settingsBtn)
    expect(onEdit).toHaveBeenCalledWith(mockCategory)
    // toggle이나 set은 호출되지 않음 (로컬 상태 토글 제거)
    expect(mockToggle).not.toHaveBeenCalled()
    expect(mockSet).not.toHaveBeenCalled()
  })

  // SPEC-UX-007 REQ-UX-007-016: 카드 외부 클릭 useEffect가 없어야 함 (REQ-UX-007-016)
  it('카드 외부 클릭 시 편집 모드가 변경되지 않아야 한다 (REQ-UX-007-016)', async () => {
    await renderCard(mockCategory, true)
    // 외부 영역 클릭
    fireEvent.mouseDown(document.body)
    // editModeStore의 set이 호출되지 않아야 함
    expect(mockSet).not.toHaveBeenCalled()
  })
})
