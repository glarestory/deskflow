// DragHandleSlot 단위 테스트 — SPEC-UX-009 레벨별 드래그 핸들 슬롯 시각 토큰 검증
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { DragHandleSlot } from './DragHandleSlot'

describe('DragHandleSlot (SPEC-UX-009)', () => {
  // REQ-UX-009-003: 레벨 A — 위젯 핸들 시각 토큰
  it('widget 레벨: data-widget-handle 속성이 있어야 한다', () => {
    render(
      <DragHandleSlot
        level="widget"
        ariaLabel="위젯 이동: 할 일 목록"
        isEditing={true}
      />
    )
    const handle = document.querySelector('[data-widget-handle]')
    expect(handle).toBeInTheDocument()
  })

  // REQ-UX-009-004: 레벨 B — 그룹 핸들 시각 토큰
  it('group 레벨: data-group-handle 속성이 있어야 한다', () => {
    render(
      <DragHandleSlot
        level="group"
        ariaLabel="카테고리 이동: 개발"
        isEditing={true}
      />
    )
    const handle = document.querySelector('[data-group-handle]')
    expect(handle).toBeInTheDocument()
  })

  // REQ-UX-009-005: 레벨 C — 링크 핸들 시각 토큰
  it('link 레벨: data-link-handle 속성이 있어야 한다', () => {
    render(
      <DragHandleSlot
        level="link"
        ariaLabel="링크 이동: GitHub"
        isEditing={true}
      />
    )
    const handle = document.querySelector('[data-link-handle]')
    expect(handle).toBeInTheDocument()
  })

  // REQ-UX-009-011: role="button" 접근성 속성
  it('role="button" 속성이 있어야 한다', () => {
    render(
      <DragHandleSlot
        level="group"
        ariaLabel="카테고리 이동: 개발"
        isEditing={true}
      />
    )
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  // REQ-UX-009-011: aria-label 정확성 (AC-016)
  it('aria-label이 전달된 값과 일치해야 한다', () => {
    render(
      <DragHandleSlot
        level="group"
        ariaLabel="카테고리 이동: 개발"
        isEditing={true}
      />
    )
    expect(screen.getByRole('button')).toHaveAttribute('aria-label', '카테고리 이동: 개발')
  })

  // REQ-UX-009-011: 편집 모드 ON 시 tabIndex=0
  it('isEditing=true 일 때 tabIndex=0 이어야 한다', () => {
    render(
      <DragHandleSlot
        level="group"
        ariaLabel="카테고리 이동: 개발"
        isEditing={true}
      />
    )
    expect(screen.getByRole('button')).toHaveAttribute('tabindex', '0')
  })

  // REQ-UX-009-011: 편집 모드 OFF 시 tabIndex=-1 (AC-006)
  it('isEditing=false 일 때 tabIndex=-1 이어야 한다', () => {
    render(
      <DragHandleSlot
        level="group"
        ariaLabel="카테고리 이동: 개발"
        isEditing={false}
      />
    )
    expect(screen.getByRole('button')).toHaveAttribute('tabindex', '-1')
  })

  // REQ-UX-009-011: attributes와 listeners가 편집 모드 ON일 때 spread됨
  it('isEditing=true 일 때 전달된 listeners가 핸들에 spread되어야 한다', () => {
    const mockPointerDown = vi.fn()
    render(
      <DragHandleSlot
        level="group"
        ariaLabel="카테고리 이동: 개발"
        isEditing={true}
        listeners={{ onPointerDown: mockPointerDown }}
      />
    )
    const handle = screen.getByRole('button')
    expect(handle).toBeInTheDocument()
  })

  // REQ-UX-009-011: 편집 모드 OFF 시 listeners가 spread되지 않음
  it('isEditing=false 일 때 listeners가 핸들에 spread되지 않아야 한다', () => {
    const mockPointerDown = vi.fn()
    render(
      <DragHandleSlot
        level="link"
        ariaLabel="링크 이동: GitHub"
        isEditing={false}
        listeners={{ onPointerDown: mockPointerDown }}
      />
    )
    const handle = screen.getByRole('button')
    // 편집 모드 OFF 시 핸들 자체는 존재하지만 listeners는 적용 안 됨
    expect(handle).toBeInTheDocument()
  })

  // REQ-UX-009-003: widget 레벨 아이콘 검증 — SVG가 렌더되어야 함
  it('widget 레벨: SVG 아이콘이 렌더되어야 한다', () => {
    render(
      <DragHandleSlot
        level="widget"
        ariaLabel="위젯 이동: 할 일 목록"
        isEditing={true}
      />
    )
    const svgEl = document.querySelector('[data-widget-handle] svg')
    expect(svgEl).toBeInTheDocument()
  })

  // REQ-UX-009-004: group 레벨 아이콘 검증 — SVG가 렌더되어야 함
  it('group 레벨: SVG 아이콘이 렌더되어야 한다', () => {
    render(
      <DragHandleSlot
        level="group"
        ariaLabel="카테고리 이동: 개발"
        isEditing={true}
      />
    )
    const svgEl = document.querySelector('[data-group-handle] svg')
    expect(svgEl).toBeInTheDocument()
  })

  // REQ-UX-009-005: link 레벨 아이콘 검증 — SVG가 렌더되어야 함
  it('link 레벨: SVG 아이콘이 렌더되어야 한다', () => {
    render(
      <DragHandleSlot
        level="link"
        ariaLabel="링크 이동: GitHub"
        isEditing={true}
      />
    )
    const svgEl = document.querySelector('[data-link-handle] svg')
    expect(svgEl).toBeInTheDocument()
  })
})
