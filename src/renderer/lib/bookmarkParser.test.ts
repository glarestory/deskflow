import { describe, it, expect } from 'vitest'
import { parseChromeBookmarkHtml, getEmojiForCategory } from './bookmarkParser'

const SAMPLE_HTML = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>Bookmarks</TITLE>
<H1>Bookmarks bar</H1>
<DL><p>
  <DT><H3>개발 도구</H3>
  <DL><p>
    <DT><A HREF="https://github.com">GitHub</A>
    <DT><A HREF="https://vscode.dev">VSCode</A>
  </DL><p>
  <DT><H3>빈 폴더</H3>
  <DL><p>
  </DL><p>
  <DT><H3>뉴스</H3>
  <DL><p>
    <DT><A HREF="https://news.ycombinator.com">Hacker News</A>
  </DL><p>
</DL><p>`

const NESTED_HTML = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>Bookmarks</TITLE>
<H1>Bookmarks bar</H1>
<DL><p>
  <DT><H3>개발</H3>
  <DL><p>
    <DT><H3>프론트엔드</H3>
    <DL><p>
      <DT><A HREF="https://react.dev">React</A>
      <DT><A HREF="https://vuejs.org">Vue</A>
    </DL><p>
    <DT><A HREF="https://github.com">GitHub</A>
  </DL><p>
</DL><p>`

const INVALID_HTML = `<html><body><p>일반 HTML 파일입니다.</p></body></html>`

describe('parseChromeBookmarkHtml', () => {
  it('parses 2 categories (skips empty folder), correct link count', () => {
    const result = parseChromeBookmarkHtml(SAMPLE_HTML)
    expect(result.categories.length).toBe(2)
    expect(result.totalLinks).toBe(3)
  })

  it('category "개발 도구" gets 💻 icon', () => {
    const result = parseChromeBookmarkHtml(SAMPLE_HTML)
    const devCategory = result.categories.find((c) => c.name === '개발 도구')
    expect(devCategory).toBeDefined()
    expect(devCategory?.icon).toBe('💻')
  })

  it('category "뉴스" gets 📰 icon', () => {
    const result = parseChromeBookmarkHtml(SAMPLE_HTML)
    const newsCategory = result.categories.find((c) => c.name === '뉴스')
    expect(newsCategory).toBeDefined()
    expect(newsCategory?.icon).toBe('📰')
  })

  it('unknown category gets 🔖 icon (default)', () => {
    const unknownHtml = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<DL><p>
  <DT><H3>기타링크모음</H3>
  <DL><p>
    <DT><A HREF="https://example.com">Example</A>
  </DL><p>
</DL><p>`
    const result = parseChromeBookmarkHtml(unknownHtml)
    const cat = result.categories.find((c) => c.name === '기타링크모음')
    expect(cat?.icon).toBe('🔖')
  })

  it('skips empty folders and reports skippedEmpty count', () => {
    const result = parseChromeBookmarkHtml(SAMPLE_HTML)
    expect(result.skippedEmpty).toBe(1)
  })

  it('throws on invalid HTML (no DL structure)', () => {
    expect(() => parseChromeBookmarkHtml(INVALID_HTML)).toThrow('유효한 크롬 북마크 파일이 아닙니다')
  })

  it('parses links correctly for each category', () => {
    const result = parseChromeBookmarkHtml(SAMPLE_HTML)
    const devCategory = result.categories.find((c) => c.name === '개발 도구')
    expect(devCategory?.links.length).toBe(2)
    expect(devCategory?.links[0].name).toBe('GitHub')
    expect(devCategory?.links[0].url).toBe('https://github.com')
    expect(devCategory?.links[1].name).toBe('VSCode')
    expect(devCategory?.links[1].url).toBe('https://vscode.dev')
  })

  it('handles nested folders — links are correctly assigned to parent category', () => {
    const result = parseChromeBookmarkHtml(NESTED_HTML)
    // 개발 카테고리는 직접 링크(GitHub) + 중첩 폴더(프론트엔드)에서의 링크(React, Vue)를 포함
    const devCategory = result.categories.find((c) => c.name === '개발')
    expect(devCategory).toBeDefined()
    // 총 3개 링크 (React, Vue, GitHub)
    expect(devCategory?.links.length).toBe(3)
  })
})

describe('getEmojiForCategory', () => {
  it('returns 💻 for dev keywords', () => {
    expect(getEmojiForCategory('dev tools')).toBe('💻')
    expect(getEmojiForCategory('개발')).toBe('💻')
    expect(getEmojiForCategory('github repos')).toBe('💻')
  })

  it('returns 📰 for news keywords', () => {
    expect(getEmojiForCategory('뉴스')).toBe('📰')
    expect(getEmojiForCategory('news feed')).toBe('📰')
  })

  it('returns 💼 for work keywords', () => {
    expect(getEmojiForCategory('work')).toBe('💼')
    expect(getEmojiForCategory('업무')).toBe('💼')
  })

  it('returns 🎬 for video keywords', () => {
    expect(getEmojiForCategory('youtube')).toBe('🎬')
    expect(getEmojiForCategory('video')).toBe('🎬')
  })

  it('returns 🔖 for unknown keywords', () => {
    expect(getEmojiForCategory('기타')).toBe('🔖')
    expect(getEmojiForCategory('random stuff')).toBe('🔖')
  })
})
