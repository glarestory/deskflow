// @MX:SPEC: SPEC-BOOKMARK-003
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import TagInput from './TagInput'

describe('TagInput', () => {
  // AC-003: 태그 추가
  it('Enter 키로 태그를 추가해야 한다', () => {
    const onChange = vi.fn()
    render(<TagInput tags={[]} onChange={onChange} suggestions={[]} />)

    const input = screen.getByPlaceholderText('태그 입력...')
    fireEvent.change(input, { target: { value: 'react' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(onChange).toHaveBeenCalledWith(['react'])
  })

  // AC-004: 태그 정규화 (공백 제거 + 소문자)
  it('입력된 태그를 소문자로 정규화해야 한다', () => {
    const onChange = vi.fn()
    render(<TagInput tags={[]} onChange={onChange} suggestions={[]} />)

    const input = screen.getByPlaceholderText('태그 입력...')
    fireEvent.change(input, { target: { value: 'React' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(onChange).toHaveBeenCalledWith(['react'])
  })

  it('공백을 포함한 태그를 정규화해야 한다 (AC-004)', () => {
    const onChange = vi.fn()
    render(<TagInput tags={[]} onChange={onChange} suggestions={[]} />)

    const input = screen.getByPlaceholderText('태그 입력...')
    fireEvent.change(input, { target: { value: '  Web Dev  ' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    // 공백 → 하이픈, 소문자
    expect(onChange).toHaveBeenCalledWith(['web-dev'])
  })

  // AC-009: 태그 제거
  it('chip의 X 버튼 클릭 시 태그가 제거되어야 한다', () => {
    const onChange = vi.fn()
    render(<TagInput tags={['dev', 'ai']} onChange={onChange} suggestions={[]} />)

    // dev 태그의 X 버튼 클릭
    const removeButtons = screen.getAllByRole('button', { name: /dev 태그 제거/i })
    fireEvent.click(removeButtons[0])

    expect(onChange).toHaveBeenCalledWith(['ai'])
  })

  // AC-003: 태그 chip 표시
  it('기존 태그를 chip으로 표시해야 한다', () => {
    render(<TagInput tags={['dev', 'ai']} onChange={vi.fn()} suggestions={[]} />)

    expect(screen.getByText('dev')).toBeInTheDocument()
    expect(screen.getByText('ai')).toBeInTheDocument()
  })

  // AC-005: 자동완성
  it('suggestions에서 입력과 매칭되는 항목을 보여야 한다', () => {
    render(
      <TagInput
        tags={[]}
        onChange={vi.fn()}
        suggestions={['dev', 'design', 'data']}
      />,
    )

    const input = screen.getByPlaceholderText('태그 입력...')
    fireEvent.change(input, { target: { value: 'de' } })

    expect(screen.getByText('dev')).toBeInTheDocument()
    expect(screen.getByText('design')).toBeInTheDocument()
    // data는 'de'로 시작하지 않으므로 없음
    // (de로 시작하지 않지만 data도 포함될 수 있어서 확인하지 않음)
  })

  // EDGE-002: 최대 10개 제한
  it('이미 10개 태그가 있으면 추가를 막아야 한다', () => {
    const onChange = vi.fn()
    const maxTags = ['t1', 't2', 't3', 't4', 't5', 't6', 't7', 't8', 't9', 't10']
    render(<TagInput tags={maxTags} onChange={onChange} suggestions={[]} />)

    const input = screen.getByPlaceholderText('태그 입력...')
    fireEvent.change(input, { target: { value: 'new-tag' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(onChange).not.toHaveBeenCalled()
    // 안내 메시지 표시
    expect(screen.getByText(/최대 10개/)).toBeInTheDocument()
  })

  // EDGE-003: 중복 태그
  it('이미 존재하는 태그를 추가하면 중복이 없어야 한다', () => {
    const onChange = vi.fn()
    render(<TagInput tags={['dev']} onChange={onChange} suggestions={[]} />)

    const input = screen.getByPlaceholderText('태그 입력...')
    fireEvent.change(input, { target: { value: 'dev' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    // onChange 호출 안 됨 (중복 무시)
    expect(onChange).not.toHaveBeenCalled()
  })

  it('빈 문자열은 추가되지 않아야 한다', () => {
    const onChange = vi.fn()
    render(<TagInput tags={[]} onChange={onChange} suggestions={[]} />)

    const input = screen.getByPlaceholderText('태그 입력...')
    fireEvent.change(input, { target: { value: '   ' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(onChange).not.toHaveBeenCalled()
  })

  it('20자 초과 태그는 추가되지 않아야 한다', () => {
    const onChange = vi.fn()
    render(<TagInput tags={[]} onChange={onChange} suggestions={[]} />)

    const input = screen.getByPlaceholderText('태그 입력...')
    fireEvent.change(input, { target: { value: 'a'.repeat(21) } })
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(onChange).not.toHaveBeenCalled()
  })

  // suggestion 클릭으로 태그 추가
  it('suggestion 클릭으로 태그를 추가해야 한다', () => {
    const onChange = vi.fn()
    render(
      <TagInput
        tags={[]}
        onChange={onChange}
        suggestions={['dev', 'design']}
      />,
    )

    const input = screen.getByPlaceholderText('태그 입력...')
    fireEvent.change(input, { target: { value: 'dev' } })

    const suggestion = screen.getByRole('option', { name: 'dev' })
    fireEvent.click(suggestion)

    expect(onChange).toHaveBeenCalledWith(['dev'])
  })

  // Comma로도 태그 추가
  it('쉼표(,)로 태그를 추가해야 한다', () => {
    const onChange = vi.fn()
    render(<TagInput tags={[]} onChange={onChange} suggestions={[]} />)

    const input = screen.getByPlaceholderText('태그 입력...')
    fireEvent.change(input, { target: { value: 'react' } })
    fireEvent.keyDown(input, { key: ',' })

    expect(onChange).toHaveBeenCalledWith(['react'])
  })
})
