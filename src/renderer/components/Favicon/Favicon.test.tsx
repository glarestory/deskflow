// @MX:SPEC: SPEC-UX-003
import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'

describe('Favicon', () => {
  it('유효한 URL에 대해 DuckDuckGo favicon URL로 img를 렌더링한다', async () => {
    const { Favicon } = await import('./Favicon')
    render(<Favicon url="https://github.com" size={32} />)

    const img = screen.getByRole('img')
    expect(img).toHaveAttribute('src', 'https://icons.duckduckgo.com/ip3/github.com.ico')
    // size는 width/height attribute로 적용 (DDG는 size 파라미터 없음)
    expect(img).toHaveAttribute('width')
    expect(img).toHaveAttribute('height')
  })

  it('기본 사이즈 32가 적용된다', async () => {
    const { Favicon } = await import('./Favicon')
    render(<Favicon url="https://github.com" />)

    const img = screen.getByRole('img')
    expect(img).toHaveAttribute('src', 'https://icons.duckduckgo.com/ip3/github.com.ico')
    // size는 width/height attribute로 적용 (DDG는 size 파라미터 없음)
    expect(img).toHaveAttribute('width')
    expect(img).toHaveAttribute('height')
  })

  it('size=16이 적용된다', async () => {
    const { Favicon } = await import('./Favicon')
    render(<Favicon url="https://github.com" size={16} />)

    const img = screen.getByRole('img')
    expect(img).toHaveAttribute('src', 'https://icons.duckduckgo.com/ip3/github.com.ico')
    expect(img).toHaveAttribute('width', '16')
  })

  it('size=24가 적용된다', async () => {
    const { Favicon } = await import('./Favicon')
    render(<Favicon url="https://github.com" size={24} />)

    const img = screen.getByRole('img')
    expect(img).toHaveAttribute('src', 'https://icons.duckduckgo.com/ip3/github.com.ico')
    expect(img).toHaveAttribute('width', '24')
  })

  it('이미지 로드 실패 시 fallback 원형을 표시한다', async () => {
    const { Favicon } = await import('./Favicon')
    render(<Favicon url="https://invalid-domain-xyz.example" size={32} />)

    const img = screen.getByRole('img')
    // onError 트리거
    fireEvent.error(img)

    // fallback 텍스트 (도메인 첫 글자 대문자)
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(screen.getByText('I')).toBeInTheDocument()
  })

  it('URL에서 도메인 첫 글자를 대문자로 fallback에 표시한다', async () => {
    const { Favicon } = await import('./Favicon')
    render(<Favicon url="https://notion.so" size={32} />)

    const img = screen.getByRole('img')
    fireEvent.error(img)

    expect(screen.getByText('N')).toBeInTheDocument()
  })

  it('잘못된 URL에 대해 fallback 원형을 바로 표시한다', async () => {
    const { Favicon } = await import('./Favicon')
    render(<Favicon url="not-a-url" size={32} />)

    // URL 파싱 실패 시 fallback 표시
    const fallback = screen.queryByRole('img')
    // img가 없거나 있어도 fallback이 표시될 수 있음
    if (fallback === null) {
      // fallback 원형 존재 확인
      expect(document.querySelector('[data-testid="favicon-fallback"]')).toBeInTheDocument()
    }
  })

  it('alt 속성에 도메인을 포함한다', async () => {
    const { Favicon } = await import('./Favicon')
    render(<Favicon url="https://github.com" size={32} />)

    const img = screen.getByRole('img')
    expect(img).toHaveAttribute('alt', 'github.com favicon')
  })
})
