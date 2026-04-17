// @MX:SPEC: SPEC-BOOKMARK-002
import { describe, it, expect, vi, afterEach, beforeAll } from 'vitest'
import { generateNetscapeHTML, downloadBookmarks, getExportFilename } from './bookmarkExporter'
import type { Bookmark } from '../types'

// jsdom 환경에서 URL.createObjectURL 모킹
const mockCreateObjectURL = vi.fn().mockReturnValue('blob:mock-url')
const mockRevokeObjectURL = vi.fn()
beforeAll(() => {
  global.URL.createObjectURL = mockCreateObjectURL
  global.URL.revokeObjectURL = mockRevokeObjectURL
})

// DOM 환경에서 <a> 태그 클릭 모킹
const mockClick = vi.fn()

afterEach(() => {
  vi.clearAllMocks()
  // mockReturnValue는 clearAllMocks로 초기화되므로 재설정
  mockCreateObjectURL.mockReturnValue('blob:mock-url')
})

const SAMPLE_CATEGORIES: Bookmark[] = [
  {
    id: 'cat-1',
    name: 'Work',
    icon: '💼',
    links: [
      { id: 'l1', name: 'Gmail', url: 'https://mail.google.com' },
      { id: 'l2', name: 'Notion', url: 'https://notion.so' },
    ],
  },
  {
    id: 'cat-2',
    name: 'Dev',
    icon: '⚡',
    links: [
      { id: 'l3', name: 'GitHub', url: 'https://github.com' },
    ],
  },
]

describe('generateNetscapeHTML', () => {
  it('Netscape 형식의 DOCTYPE 헤더를 포함한다', () => {
    const html = generateNetscapeHTML(SAMPLE_CATEGORIES)
    expect(html).toContain('<!DOCTYPE NETSCAPE-Bookmark-file-1>')
  })

  it('각 카테고리에 대한 H3 폴더 태그를 생성한다', () => {
    const html = generateNetscapeHTML(SAMPLE_CATEGORIES)
    expect(html).toContain('<H3>Work</H3>')
    expect(html).toContain('<H3>Dev</H3>')
  })

  it('각 링크에 대한 A 태그를 생성한다', () => {
    const html = generateNetscapeHTML(SAMPLE_CATEGORIES)
    expect(html).toContain('<A HREF="https://mail.google.com">Gmail</A>')
    expect(html).toContain('<A HREF="https://notion.so">Notion</A>')
    expect(html).toContain('<A HREF="https://github.com">GitHub</A>')
  })

  it('빈 카테고리 배열이면 링크 없는 HTML을 반환한다', () => {
    const html = generateNetscapeHTML([])
    expect(html).toContain('<!DOCTYPE NETSCAPE-Bookmark-file-1>')
    // 링크가 없어야 함
    expect(html).not.toContain('<A HREF=')
  })

  it('제목에 HTML 특수문자가 있어도 이스케이프 처리한다', () => {
    const categories: Bookmark[] = [
      {
        id: 'cat-1',
        name: 'Work & Dev',
        icon: '💼',
        links: [
          { id: 'l1', name: '<Script> & "Test"', url: 'https://example.com?a=1&b=2' },
        ],
      },
    ]
    const html = generateNetscapeHTML(categories)
    // URL에서 & 이스케이프
    expect(html).toContain('&amp;')
  })

  it('표준 Netscape DL/DT 구조를 사용한다', () => {
    const html = generateNetscapeHTML(SAMPLE_CATEGORIES)
    expect(html).toContain('<DL>')
    expect(html).toContain('<DT>')
  })
})

describe('getExportFilename', () => {
  it('deskflow-bookmarks-YYYY-MM-DD.html 형식을 반환한다', () => {
    const filename = getExportFilename(new Date('2026-04-12'))
    expect(filename).toBe('deskflow-bookmarks-2026-04-12.html')
  })

  it('인수가 없으면 오늘 날짜 형식을 사용한다', () => {
    const filename = getExportFilename()
    // YYYY-MM-DD 형식 검증
    expect(filename).toMatch(/^deskflow-bookmarks-\d{4}-\d{2}-\d{2}\.html$/)
  })
})

describe('downloadBookmarks', () => {
  it('<a download> 요소를 생성하고 클릭한다', () => {
    const mockAnchor = {
      href: '',
      download: '',
      click: mockClick,
    } as unknown as HTMLAnchorElement

    const mockCreateElement = vi.spyOn(document, 'createElement').mockReturnValueOnce(mockAnchor)
    vi.spyOn(document.body, 'appendChild').mockImplementationOnce(() => document.body)
    vi.spyOn(document.body, 'removeChild').mockImplementationOnce(() => mockAnchor)

    downloadBookmarks('<html></html>', 'test-file.html')

    expect(mockCreateElement).toHaveBeenCalledWith('a')
    expect(mockAnchor.download).toBe('test-file.html')
    expect(mockClick).toHaveBeenCalled()

    mockCreateElement.mockRestore()
  })

  it('Blob URL을 생성하고 href에 할당한다', () => {
    const mockAnchor = {
      href: '',
      download: '',
      click: mockClick,
    } as unknown as HTMLAnchorElement

    const mockCreateElement = vi.spyOn(document, 'createElement').mockReturnValueOnce(mockAnchor)
    vi.spyOn(document.body, 'appendChild').mockImplementationOnce(() => document.body)
    vi.spyOn(document.body, 'removeChild').mockImplementationOnce(() => mockAnchor)

    downloadBookmarks('<html>content</html>', 'test.html')

    expect(mockCreateObjectURL).toHaveBeenCalled()
    expect(mockAnchor.href).toBe('blob:mock-url')

    mockCreateElement.mockRestore()
  })
})
