// SortableLink 단위 테스트 — SPEC-UX-009 링크 핸들 슬롯 분리 검증
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DndContext } from '@dnd-kit/core'
import { SortableContext } from '@dnd-kit/sortable'
import '@testing-library/jest-dom'
import type { Link } from '../../types'

// usageStore 모킹
const mockRecordUsage = vi.fn()
vi.mock('../../stores/usageStore', () => ({
  useUsageStore: () => ({ recordUsage: mockRecordUsage }),
}))

const mockLink: Link = {
  id: 'link-1',
  name: 'GitHub',
  url: 'https://github.com',
  tags: [],
}

/** SortableLink 렌더링 헬퍼 — DndContext + SortableContext 래퍼 포함 */
async function renderLink(link = mockLink, isEditing = false) {
  const { default: SortableLink } = await import('./SortableLink')
  const onUsage = vi.fn()
  const result = render(
    <DndContext>
      <SortableContext items={[link.id]}>
        <SortableLink
          link={link}
          isEditing={isEditing}
          onUsage={onUsage}
          categoryId="cat-1"
        />
      </SortableContext>
    </DndContext>
  )
  return { onUsage, ...result }
}

describe('SortableLink (SPEC-UX-009 링크 핸들 분리)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // REQ-UX-009-005: data-link-handle 속성 요소가 정확히 1개 존재
  it('data-link-handle 요소가 1개 존재해야 한다 (REQ-UX-009-005, AC-005)', async () => {
    await renderLink(mockLink, true)
    const handles = document.querySelectorAll('[data-link-handle]')
    expect(handles).toHaveLength(1)
  })

  // REQ-UX-009-005: 링크 핸들이 링크 행의 첫 자식이어야 함
  it('링크 핸들이 링크 행의 첫 번째 자식이어야 한다 (REQ-UX-009-005)', async () => {
    await renderLink(mockLink, true)
    const handle = document.querySelector('[data-link-handle]')
    expect(handle).toBeInTheDocument()
    // 핸들의 부모 내에서 첫 번째 자식이어야 함
    const parent = handle?.parentElement
    expect(parent?.firstElementChild).toBe(handle)
  })

  // REQ-UX-009-011: 링크 핸들 aria-label 검증 (AC-016)
  it('링크 핸들 aria-label이 "링크 이동: {link.name}" 형식이어야 한다 (AC-016)', async () => {
    await renderLink(mockLink, true)
    const handle = document.querySelector('[data-link-handle]')
    expect(handle).toHaveAttribute('aria-label', `링크 이동: ${mockLink.name}`)
  })

  // REQ-UX-009-006: 편집 모드 OFF 시 링크 핸들 tabIndex=-1
  it('편집 모드 OFF 시 링크 핸들 tabIndex=-1이어야 한다 (REQ-UX-009-006, AC-006)', async () => {
    await renderLink(mockLink, false)
    const handle = document.querySelector('[data-link-handle]')
    expect(handle).toHaveAttribute('tabindex', '-1')
  })

  // REQ-UX-009-006: 편집 모드 ON 시 링크 핸들 tabIndex=0
  it('편집 모드 ON 시 링크 핸들 tabIndex=0이어야 한다 (REQ-UX-009-006, AC-007)', async () => {
    await renderLink(mockLink, true)
    const handle = document.querySelector('[data-link-handle]')
    expect(handle).toHaveAttribute('tabindex', '0')
  })

  // REQ-UX-009-008: 편집 모드 ON 시 링크 이름 클릭 — 새 탭 열기 안 됨 (SPEC-UX-006 REQ-UX-006-009 보존)
  it('편집 모드 ON 시 링크 이름 클릭으로 새 탭이 열리지 않아야 한다 (REQ-UX-009-008, AC-012)', async () => {
    await renderLink(mockLink, true)
    const anchor = screen.getByText('GitHub').closest('a')
    expect(anchor).not.toHaveAttribute('href')
    expect(anchor).not.toHaveAttribute('target', '_blank')
  })

  // REQ-UX-009-008: 편집 모드 OFF 시 링크 이름 클릭 — 새 탭 열기 가능 (AC-013)
  it('편집 모드 OFF 시 링크에 href와 target="_blank"가 있어야 한다 (AC-013)', async () => {
    await renderLink(mockLink, false)
    const anchor = screen.getByText('GitHub').closest('a')
    expect(anchor).toHaveAttribute('href', mockLink.url)
    expect(anchor).toHaveAttribute('target', '_blank')
  })

  // REQ-UX-009-008: 링크 이름 영역이 data-link-handle 영역 밖에 있어야 함
  it('링크 이름 span이 data-link-handle 영역 밖에 있어야 한다 (REQ-UX-009-008)', async () => {
    await renderLink(mockLink, true)
    const nameSpan = screen.getByText('GitHub')
    // 링크 이름 span의 부모가 [data-link-handle]이 아니어야 함
    expect(nameSpan.closest('[data-link-handle]')).toBeNull()
  })

  // 편집 모드 ON 시 링크 클릭 시 preventDefault 동작 (SPEC-UX-006 REQ-UX-006-009)
  it('편집 모드 ON 시 링크 클릭 시 preventDefault가 호출되어야 한다 (REQ-UX-009-008)', async () => {
    const { onUsage } = await renderLink(mockLink, true)
    const anchor = screen.getByText('GitHub').closest('a')
    const clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true })
    anchor?.dispatchEvent(clickEvent)
    // 편집 모드 ON: usage 기록 안 함
    expect(onUsage).not.toHaveBeenCalled()
  })

  // 편집 모드 OFF 시 클릭 — usage 기록
  it('편집 모드 OFF 시 링크 클릭 시 onUsage가 호출되어야 한다 (AC-013)', async () => {
    const { onUsage } = await renderLink(mockLink, false)
    const anchor = screen.getByText('GitHub').closest('a')
    fireEvent.click(anchor!)
    expect(onUsage).toHaveBeenCalledWith(mockLink.id)
  })
})
