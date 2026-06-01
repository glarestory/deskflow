// BookmarkCard 단위 테스트 — SPEC-UX-006 + SPEC-UX-007 전역 편집 모드 통합
// REQ-UX-008-002: BookmarkCard 내부 DndContext 제거 후 외부 DndContext wrapper 필요
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DndContext } from '@dnd-kit/core'
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

// REQ-UX-008-002: BookmarkCard는 외부 DndContext 안에서 렌더링되어야 함
// BookmarkCard를 동적 import하는 헬퍼 (모킹 이후 로드 보장)
async function renderCard(category = mockCategory, isEditing = false) {
  mockIsEditing = isEditing
  const { default: BookmarkCard } = await import('./BookmarkCard')
  const onEdit = vi.fn()
  // 외부 DndContext wrapper — BookmarkCard 내부 DndContext 제거로 필요 (SPEC-UX-008 D1)
  const result = render(
    <DndContext>
      <BookmarkCard category={category} onEdit={onEdit} />
    </DndContext>
  )
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

  // REQ-UX-008-003: 링크 grid 영역의 min-height가 48px인지 확인
  it('링크 grid 영역의 min-height가 48px이어야 한다 (REQ-UX-008-003, D4)', async () => {
    await renderCard(mockCategory, true)
    // Gmail 링크의 부모 grid div를 찾아 스타일 확인
    const gmailEl = screen.getByText('Gmail').closest('a')
    const gridDiv = gmailEl?.parentElement
    expect(gridDiv).toHaveStyle({ minHeight: '48px' })
  })

  // ─── SPEC-UX-009: 그룹 핸들 분리 테스트 ─────────────────────────────────

  // REQ-UX-009-004: data-group-handle 속성 요소가 정확히 1개 존재
  it('data-group-handle 요소가 정확히 1개 존재해야 한다 (REQ-UX-009-004, AC-004)', async () => {
    await renderCard(mockCategory, true)
    const handles = document.querySelectorAll('[data-group-handle]')
    expect(handles).toHaveLength(1)
  })

  // REQ-UX-009-007: 카테고리 헤더 전체에 listeners가 아닌 핸들 슬롯에만 listeners 제한
  // — data-category-handle 영역에 listeners가 없어야 함 (핸들 슬롯이 별도 존재)
  it('카테고리 아이콘/이름 영역에 dnd-kit drag 속성이 없어야 한다 (REQ-UX-009-007)', async () => {
    await renderCard(mockCategory, true)
    // 카테고리 이름 span 요소 확인
    const nameSpan = screen.getByText('Work')
    // 카테고리 이름 span 자체 또는 그 부모에 role="button"이 없어야 함 (핸들 슬롯이 아님)
    expect(nameSpan.closest('[data-group-handle]')).toBeNull()
  })

  // REQ-UX-009-016: aria-label이 "카테고리 이동: {name}" 형식이어야 함 (AC-016)
  it('그룹 핸들 aria-label이 "카테고리 이동: {category.name}" 형식이어야 한다 (AC-016)', async () => {
    await renderCard(mockCategory, true)
    const handle = document.querySelector('[data-group-handle]')
    expect(handle).toHaveAttribute('aria-label', `카테고리 이동: ${mockCategory.name}`)
  })

  // REQ-UX-009-006: 편집 모드 OFF 시 그룹 핸들 tabIndex=-1
  it('편집 모드 OFF 시 그룹 핸들 tabIndex=-1이어야 한다 (REQ-UX-009-006, AC-006)', async () => {
    await renderCard(mockCategory, false)
    const handle = document.querySelector('[data-group-handle]')
    expect(handle).toHaveAttribute('tabindex', '-1')
  })

  // REQ-UX-009-006: 편집 모드 ON 시 그룹 핸들 tabIndex=0
  it('편집 모드 ON 시 그룹 핸들 tabIndex=0이어야 한다 (REQ-UX-009-006, AC-007)', async () => {
    await renderCard(mockCategory, true)
    const handle = document.querySelector('[data-group-handle]')
    expect(handle).toHaveAttribute('tabindex', '0')
  })

  // REQ-UX-009-004: 그룹 핸들이 헤더의 첫 자식이어야 함 (카테고리 아이콘 좌측)
  it('그룹 핸들이 카테고리 헤더의 첫 번째 자식이어야 한다 (REQ-UX-009-004)', async () => {
    await renderCard(mockCategory, true)
    const handle = document.querySelector('[data-group-handle]')
    // 핸들의 부모 요소의 첫 자식이 핸들이어야 함
    const parent = handle?.parentElement
    expect(parent?.firstElementChild).toBe(handle)
  })

  // ─── SPEC-UX-010 M5: 빈 그룹 placeholder ──────────────────────────────────

  // AC-029: 링크가 없는 카테고리에 empty placeholder가 표시된다
  it('링크가 없는 카테고리에 data-empty-placeholder 요소가 표시된다 (AC-029)', async () => {
    const emptyCategory: Category = { id: 'empty-1', name: '빈 카테고리', icon: '📂', links: [] }
    await renderCard(emptyCategory, false)
    expect(document.querySelector('[data-empty-placeholder]')).toBeInTheDocument()
  })

  // AC-030: 링크가 있는 카테고리에 empty placeholder가 없다
  it('링크가 있는 카테고리에는 data-empty-placeholder 요소가 없다 (AC-030)', async () => {
    await renderCard(mockCategory, false)
    expect(document.querySelector('[data-empty-placeholder]')).not.toBeInTheDocument()
  })

  // AC-031: 편집 모드 ON + 빈 카테고리 — placeholder 텍스트가 "여기로 드래그하여 추가"
  it('편집 모드 ON + 빈 카테고리 시 placeholder 텍스트가 표시된다 (AC-031)', async () => {
    const emptyCategory: Category = { id: 'empty-1', name: '빈 카테고리', icon: '📂', links: [] }
    await renderCard(emptyCategory, true)
    expect(screen.getByText('여기로 드래그하여 추가')).toBeInTheDocument()
  })

  // ─── SPEC-UX-011 회귀 테스트: 많은 링크 스크롤 컨테이너 구조 ──────────────

  // REG-001: 링크가 8개 이상인 카테고리에서 스크롤 컨테이너와 그리드가 분리되어 있어야 한다.
  // 문제: display:grid + flex:1 인 단일 div에 minHeight:48 이 있으면 flex 컨텍스트에서
  //       min-height:0 이 없어 암묵적 그리드 행들이 압축되어 텍스트가 겹친다.
  // 수정: 스크롤 래퍼(flex:1, min-height:0, overflow-y:auto)와
  //       내부 그리드(display:grid) 를 분리해야 한다.
  it('링크가 8개 이상인 카테고리에서 스크롤 컨테이너가 overflow-y:auto + min-height:0 이어야 한다 (REG-001)', async () => {
    const manyLinksCategory: Category = {
      id: 'many-1',
      name: '많은 링크',
      icon: '📚',
      links: Array.from({ length: 10 }, (_, i) => ({
        id: `link-${i}`,
        name: `링크 ${i + 1}`,
        url: `https://example.com/${i}`,
        tags: [],
      })),
    }
    await renderCard(manyLinksCategory, false)

    // data-scroll-wrapper 속성으로 스크롤 래퍼를 직접 선택 (DOM 탐색 깊이에 독립적)
    const scrollWrapper = document.querySelector('[data-scroll-wrapper]') as HTMLElement

    // 스크롤 래퍼 존재 확인
    expect(scrollWrapper).toBeInTheDocument()

    // 스크롤 래퍼: overflow-y:auto + min-height:0 (인라인 스타일로 확인)
    // jsdom은 window.getComputedStyle에서 인라인 스타일만 반영함
    expect(scrollWrapper.style.overflowY).toBe('auto')
    // React가 숫자 0을 인라인 스타일로 설정하면 jsdom은 '0'으로 반환 (단위 없음)
    expect(scrollWrapper.style.minHeight).toBe('0')

    // 스크롤 래퍼의 직계 자식이 그리드여야 함
    const gridDiv = scrollWrapper.firstElementChild as HTMLElement
    expect(gridDiv).not.toBeNull()
    expect(gridDiv.style.display).toBe('grid')

    // 그리드 자체에 overflow-y:auto 가 없어야 함 (스크롤이 래퍼에서만 발생)
    expect(gridDiv.style.overflowY).not.toBe('auto')
  })

  // REG-002: 스크롤 래퍼가 droppable ref(setDropRef)를 받으면서
  //          isOver 시각 상태(outline, background 등)를 포함해야 한다.
  it('링크 그리드의 스크롤 래퍼에 data-scroll-wrapper 속성이 있어야 한다 (REG-002)', async () => {
    const manyLinksCategory: Category = {
      id: 'many-2',
      name: '많은 링크2',
      icon: '📚',
      links: Array.from({ length: 8 }, (_, i) => ({
        id: `link2-${i}`,
        name: `링크A ${i + 1}`,
        url: `https://example.com/a/${i}`,
        tags: [],
      })),
    }
    await renderCard(manyLinksCategory, false)
    // 수정 후 스크롤 래퍼에 data-scroll-wrapper 속성이 붙어야 한다
    expect(document.querySelector('[data-scroll-wrapper]')).toBeInTheDocument()
  })
})
