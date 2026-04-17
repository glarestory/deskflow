// @MX:SPEC: SPEC-BOOKMARK-003
import { describe, it, expect } from 'vitest'
import { extractTags } from './extractTags'

describe('extractTags', () => {
  // AC-001: github.com → dev, code
  it('github.com URL에서 dev, code 태그를 추출해야 한다', () => {
    expect(extractTags('https://github.com/anthropics/claude')).toEqual(
      expect.arrayContaining(['dev', 'code']),
    )
  })

  it('gitlab.com URL에서 dev, code 태그를 추출해야 한다', () => {
    expect(extractTags('https://gitlab.com/myproject')).toEqual(
      expect.arrayContaining(['dev', 'code']),
    )
  })

  it('bitbucket.org URL에서 dev, code 태그를 추출해야 한다', () => {
    expect(extractTags('https://bitbucket.org/myteam')).toEqual(
      expect.arrayContaining(['dev', 'code']),
    )
  })

  // video 도메인
  it('youtube.com URL에서 video 태그를 추출해야 한다', () => {
    expect(extractTags('https://youtube.com/watch?v=abc')).toContain('video')
  })

  it('vimeo.com URL에서 video 태그를 추출해야 한다', () => {
    expect(extractTags('https://vimeo.com/123')).toContain('video')
  })

  it('twitch.tv URL에서 video 태그를 추출해야 한다', () => {
    expect(extractTags('https://twitch.tv/streamer')).toContain('video')
  })

  // AI 도메인
  it('openai.com URL에서 ai 태그를 추출해야 한다', () => {
    expect(extractTags('https://openai.com')).toContain('ai')
  })

  it('anthropic.com URL에서 ai 태그를 추출해야 한다', () => {
    expect(extractTags('https://anthropic.com')).toContain('ai')
  })

  it('claude.ai URL에서 ai 태그를 추출해야 한다', () => {
    expect(extractTags('https://claude.ai')).toContain('ai')
  })

  // 이메일
  it('gmail.com URL에서 email 태그를 추출해야 한다', () => {
    expect(extractTags('https://mail.google.com')).toContain('email')
  })

  // 노트
  it('notion.so URL에서 notes 태그를 추출해야 한다', () => {
    expect(extractTags('https://notion.so')).toContain('notes')
  })

  // 디자인
  it('figma.com URL에서 design 태그를 추출해야 한다', () => {
    expect(extractTags('https://figma.com/file/abc')).toContain('design')
  })

  it('dribbble.com URL에서 design 태그를 추출해야 한다', () => {
    expect(extractTags('https://dribbble.com')).toContain('design')
  })

  // 개발 학습
  it('stackoverflow.com URL에서 dev, learn 태그를 추출해야 한다', () => {
    const tags = extractTags('https://stackoverflow.com/questions/123')
    expect(tags).toContain('dev')
    expect(tags).toContain('learn')
  })

  // 블로그
  it('medium.com URL에서 blog, read 태그를 추출해야 한다', () => {
    const tags = extractTags('https://medium.com/article')
    expect(tags).toContain('blog')
    expect(tags).toContain('read')
  })

  it('substack.com URL에서 blog, read 태그를 추출해야 한다', () => {
    const tags = extractTags('https://substack.com/feed')
    expect(tags).toContain('blog')
    expect(tags).toContain('read')
  })

  // AC-002: 매칭 없는 도메인은 빈 배열
  it('매칭되지 않는 도메인은 빈 배열을 반환해야 한다', () => {
    expect(extractTags('https://my-private-site.internal')).toEqual([])
  })

  // EDGE-001: 잘못된 URL
  it('파싱 불가한 URL은 오류 없이 빈 배열을 반환해야 한다', () => {
    expect(extractTags('not-a-url')).toEqual([])
  })

  it('빈 문자열은 빈 배열을 반환해야 한다', () => {
    expect(extractTags('')).toEqual([])
  })

  // 중복 태그 없이 반환
  it('반환 태그에 중복이 없어야 한다', () => {
    const tags = extractTags('https://github.com')
    expect(tags.length).toBe(new Set(tags).size)
  })

  // 소문자 정규화 확인
  it('반환 태그는 소문자여야 한다', () => {
    const tags = extractTags('https://github.com')
    tags.forEach((tag) => {
      expect(tag).toBe(tag.toLowerCase())
    })
  })

  // 소셜/커뮤니티
  it('twitter.com URL에서 social 태그를 추출해야 한다', () => {
    expect(extractTags('https://twitter.com/user')).toContain('social')
  })

  it('x.com URL에서 social 태그를 추출해야 한다', () => {
    expect(extractTags('https://x.com/user')).toContain('social')
  })

  it('linkedin.com URL에서 social 태그를 추출해야 한다', () => {
    expect(extractTags('https://linkedin.com/in/user')).toContain('social')
  })

  it('reddit.com URL에서 social 태그를 추출해야 한다', () => {
    expect(extractTags('https://reddit.com/r/programming')).toContain('social')
  })

  // docs
  it('docs.google.com URL에서 docs 태그를 추출해야 한다', () => {
    expect(extractTags('https://docs.google.com/document')).toContain('docs')
  })

  it('drive.google.com URL에서 docs 태그를 추출해야 한다', () => {
    expect(extractTags('https://drive.google.com/drive')).toContain('docs')
  })

  // npm / dev
  it('npmjs.com URL에서 dev 태그를 추출해야 한다', () => {
    expect(extractTags('https://npmjs.com/package/react')).toContain('dev')
  })

  // Jira
  it('jira.com URL에서 dev 태그를 추출해야 한다', () => {
    expect(extractTags('https://myteam.atlassian.net/jira')).toContain('dev')
  })
})
