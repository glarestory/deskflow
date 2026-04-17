// @MX:SPEC: SPEC-UX-003
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'

describe('ContextMenu (SPEC-UX-003)', () => {
  it('isOpen=true일 때 메뉴를 표시한다', async () => {
    const { ContextMenu } = await import('./ContextMenu')
    const onClose = vi.fn()
    render(
      <ContextMenu
        isOpen={true}
        x={100}
        y={100}
        linkId="l1"
        onClose={onClose}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    )

    expect(screen.getByTestId('context-menu')).toBeInTheDocument()
  })

  it('isOpen=false일 때 메뉴를 숨긴다', async () => {
    const { ContextMenu } = await import('./ContextMenu')
    render(
      <ContextMenu
        isOpen={false}
        x={100}
        y={100}
        linkId="l1"
        onClose={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    )

    expect(screen.queryByTestId('context-menu')).not.toBeInTheDocument()
  })

  it('편집 버튼이 있다', async () => {
    const { ContextMenu } = await import('./ContextMenu')
    render(
      <ContextMenu
        isOpen={true}
        x={0}
        y={0}
        linkId="l1"
        onClose={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    )

    expect(screen.getByTestId('context-menu-edit')).toBeInTheDocument()
  })

  it('삭제 버튼이 있다', async () => {
    const { ContextMenu } = await import('./ContextMenu')
    render(
      <ContextMenu
        isOpen={true}
        x={0}
        y={0}
        linkId="l1"
        onClose={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    )

    expect(screen.getByTestId('context-menu-delete')).toBeInTheDocument()
  })

  it('편집 클릭 시 onEdit을 호출한다', async () => {
    const { ContextMenu } = await import('./ContextMenu')
    const onEdit = vi.fn()
    const onClose = vi.fn()
    render(
      <ContextMenu
        isOpen={true}
        x={0}
        y={0}
        linkId="l1"
        onClose={onClose}
        onEdit={onEdit}
        onDelete={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByTestId('context-menu-edit'))
    expect(onEdit).toHaveBeenCalledWith('l1')
    expect(onClose).toHaveBeenCalled()
  })
})
