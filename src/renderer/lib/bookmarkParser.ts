// @MX:NOTE: [AUTO] Chrome 북마크 HTML 파싱 유틸리티 — SPEC-IMPORT-001
// @MX:SPEC: SPEC-IMPORT-001
import type { Bookmark, Link } from '../types'

// 카테고리 이름 기반 이모지 키워드 매핑
const EMOJI_MAP: Array<[RegExp, string]> = [
  [/news|뉴스|신문/i, '📰'],
  [/dev|개발|github|code|코드/i, '💻'],
  [/work|업무|office|회사/i, '💼'],
  [/social|소셜|sns|twitter|instagram|facebook/i, '👥'],
  [/shop|쇼핑|mall|amazon/i, '🛍️'],
  [/video|유튜브|youtube|영상|watch/i, '🎬'],
  [/music|음악|spotify/i, '🎵'],
  [/travel|여행|trip/i, '✈️'],
  [/finance|금융|bank|invest|투자/i, '💰'],
  [/game|게임|gaming/i, '🎮'],
  [/food|음식|recipe|요리/i, '🍜'],
  [/photo|사진|image|photo/i, '📸'],
  [/book|독서|reading|library/i, '📚'],
]

export function getEmojiForCategory(name: string): string {
  for (const [pattern, emoji] of EMOJI_MAP) {
    if (pattern.test(name)) return emoji
  }
  return '🔖'
}

export interface ParseResult {
  categories: Bookmark[]
  totalLinks: number
  skippedEmpty: number
}

export function generateId(): string {
  return Math.random().toString(36).slice(2, 9)
}

/**
 * DL 요소에서 링크를 재귀적으로 수집
 * @param dl DL 요소
 * @returns Link 배열
 */
function collectLinks(dl: Element): Link[] {
  const links: Link[] = []

  const dtElements = dl.children
  for (let i = 0; i < dtElements.length; i++) {
    const dt = dtElements[i]
    if (dt.tagName !== 'DT') continue

    const children = dt.children
    for (let j = 0; j < children.length; j++) {
      const child = children[j]
      if (child.tagName === 'A') {
        // 직접 링크
        links.push({
          id: generateId(),
          name: child.textContent?.trim() ?? '',
          url: child.getAttribute('HREF') ?? child.getAttribute('href') ?? '',
        })
      } else if (child.tagName === 'H3') {
        // 중첩 폴더 — 다음 형제 DL에서 링크 수집
        const nextDl = dt.querySelector('DL, dl')
        if (nextDl !== null) {
          const nestedLinks = collectLinks(nextDl)
          links.push(...nestedLinks)
        }
      }
    }
  }

  return links
}

/**
 * Chrome 북마크 HTML 파일을 파싱하여 Bookmark 배열로 변환
 * @param html Chrome 북마크 내보내기 HTML 문자열
 * @returns ParseResult (categories, totalLinks, skippedEmpty)
 * @throws Error 유효하지 않은 북마크 파일인 경우
 */
export function parseChromeBookmarkHtml(html: string): ParseResult {
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')

  // Chrome 북마크 파일 유효성 검사: 최상위 DL 존재 여부
  const rootDl = doc.querySelector('DL, dl')
  if (rootDl === null) {
    throw new Error('유효한 크롬 북마크 파일이 아닙니다')
  }

  const categories: Bookmark[] = []
  let skippedEmpty = 0

  // 최상위 DL의 직접 자식 DT만 순회
  const topLevelDts = rootDl.children
  for (let i = 0; i < topLevelDts.length; i++) {
    const dt = topLevelDts[i]
    if (dt.tagName !== 'DT') continue

    const h3 = dt.querySelector(':scope > H3, :scope > h3')
    if (h3 === null) continue

    const categoryName = h3.textContent?.trim() ?? ''

    // 카테고리의 DL 찾기
    const categoryDl = dt.querySelector(':scope > DL, :scope > dl')

    let links: Link[] = []
    if (categoryDl !== null) {
      links = collectLinks(categoryDl)
    }

    // 빈 폴더 스킵
    if (links.length === 0) {
      skippedEmpty++
      continue
    }

    categories.push({
      id: generateId(),
      name: categoryName,
      icon: getEmojiForCategory(categoryName),
      links,
    })
  }

  const totalLinks = categories.reduce((sum, cat) => sum + cat.links.length, 0)

  return { categories, totalLinks, skippedEmpty }
}
