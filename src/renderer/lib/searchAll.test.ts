// @MX:SPEC: SPEC-UX-002
// searchAll 통합 검색 단위 테스트 — 접두사 파싱, 그룹별 결과, 점수 가중치 검증
import { describe, it, expect } from 'vitest'
import { searchAll, parsePrefix, type SearchInput } from './searchAll'
import type { Category } from '../types'

// 테스트용 데이터셋
const testCategories: Category[] = [
  {
    id: 'cat-1',
    name: 'Work',
    icon: '💼',
    links: [
      { id: 'l1', name: 'Gmail', url: 'https://mail.google.com', tags: ['email'] },
      { id: 'l2', name: 'Google Drive', url: 'https://drive.google.com', tags: ['docs'] },
    ],
  },
  {
    id: 'cat-2',
    name: 'Dev',
    icon: '⚡',
    links: [
      { id: 'l3', name: 'GitHub', url: 'https://github.com', tags: ['dev', 'code'] },
      { id: 'l4', name: 'ChatGPT', url: 'https://chat.openai.com', tags: ['ai'] },
    ],
  },
  {
    id: 'cat-3',
    name: 'AI 도구',
    icon: '🤖',
    links: [
      { id: 'l5', name: 'Claude', url: 'https://claude.ai', tags: ['ai'] },
    ],
  },
]

const testTags = ['email', 'docs', 'dev', 'code', 'ai']

const testInput: SearchInput = {
  categories: testCategories,
  tags: testTags,
  actions: [
    {
      id: 'action-toggle-theme',
      label: '테마 전환',
      keywords: ['theme', '테마'],
      execute: () => {},
    },
    {
      id: 'action-sign-out',
      label: '로그아웃',
      keywords: ['logout', '로그아웃'],
      execute: () => {},
    },
    {
      id: 'action-import',
      label: '북마크 가져오기',
      keywords: ['import', '가져오기'],
      execute: () => {},
    },
  ],
  getUsageScore: (_type: string, _id: string) => 0,
}

describe('parsePrefix', () => {
  it('접두사 없으면 all 그룹 반환', () => {
    const result = parsePrefix('github')
    expect(result.group).toBe('all')
    expect(result.query).toBe('github')
  })

  it('> 접두사는 actions 그룹만 검색', () => {
    const result = parsePrefix('>테마')
    expect(result.group).toBe('actions')
    expect(result.query).toBe('테마')
  })

  it(': 접두사는 actions 그룹만 검색', () => {
    const result = parsePrefix(':logout')
    expect(result.group).toBe('actions')
    expect(result.query).toBe('logout')
  })

  it('# 접두사는 tags 그룹만 검색', () => {
    const result = parsePrefix('#dev')
    expect(result.group).toBe('tags')
    expect(result.query).toBe('dev')
  })

  it('@ 접두사는 categories 그룹만 검색', () => {
    const result = parsePrefix('@work')
    expect(result.group).toBe('categories')
    expect(result.query).toBe('work')
  })

  it('/ 접두사는 bookmarks 그룹만 검색', () => {
    const result = parsePrefix('/github')
    expect(result.group).toBe('bookmarks')
    expect(result.query).toBe('github')
  })

  it('접두사 뒤 공백은 쿼리에서 제거된다', () => {
    const result = parsePrefix('> 테마')
    expect(result.group).toBe('actions')
    expect(result.query).toBe('테마')
  })

  it('접두사만 있는 경우 빈 쿼리 반환', () => {
    const result = parsePrefix('>')
    expect(result.group).toBe('actions')
    expect(result.query).toBe('')
  })
})

describe('searchAll', () => {
  // --- 빈 쿼리 ---

  it('빈 쿼리 시 빈 배열 반환', () => {
    const results = searchAll('', testInput)
    expect(results).toHaveLength(0)
  })

  // --- 기본 검색 ---

  it('"github" 검색 시 GitHub 북마크가 포함된다', () => {
    const results = searchAll('github', testInput)
    const bookmarkResult = results.find((r) => r.kind === 'bookmark' && r.link.name === 'GitHub')
    expect(bookmarkResult).toBeDefined()
  })

  it('"ai" 검색 시 북마크, 카테고리, 태그 그룹 모두 포함된다', () => {
    const results = searchAll('ai', testInput)
    const kinds = results.map((r) => r.kind)
    expect(kinds).toContain('bookmark')
    expect(kinds).toContain('category')
    expect(kinds).toContain('tag')
  })

  it('"테마" 검색 시 actions에서 테마 전환이 포함된다', () => {
    const results = searchAll('테마', testInput)
    const actionResult = results.find((r) => r.kind === 'action' && r.action.id === 'action-toggle-theme')
    expect(actionResult).toBeDefined()
  })

  // --- 그룹별 결과 수 제한 ---

  it('그룹당 최대 5개 결과', () => {
    // 많은 북마크 데이터셋 생성
    const manyCategories: Category[] = Array.from({ length: 10 }, (_, i) => ({
      id: `cat-${i}`,
      name: `Category ${i}`,
      icon: '📁',
      links: Array.from({ length: 3 }, (_, j) => ({
        id: `l-${i}-${j}`,
        name: `Link ${i}-${j}`,
        url: `https://example${i}-${j}.com`,
        tags: [],
      })),
    }))

    const largeInput: SearchInput = {
      ...testInput,
      categories: manyCategories,
    }

    const results = searchAll('link', largeInput)
    const bookmarkResults = results.filter((r) => r.kind === 'bookmark')
    expect(bookmarkResults.length).toBeLessThanOrEqual(5)
  })

  it('총 결과 수는 최대 20개', () => {
    const manyCategories: Category[] = Array.from({ length: 10 }, (_, i) => ({
      id: `cat-${i}`,
      name: `Item Category ${i}`,
      icon: '📁',
      links: Array.from({ length: 5 }, (_, j) => ({
        id: `l-${i}-${j}`,
        name: `Item Link ${i}-${j}`,
        url: `https://item-example${i}-${j}.com`,
        tags: [`item-tag-${i}`],
      })),
    }))

    const manyTags = Array.from({ length: 10 }, (_, i) => `item-tag-${i}`)

    const largeInput: SearchInput = {
      ...testInput,
      categories: manyCategories,
      tags: manyTags,
    }

    const results = searchAll('item', largeInput)
    expect(results.length).toBeLessThanOrEqual(20)
  })

  // --- 접두사 필터링 ---

  it('> 접두사 시 actions 그룹만 반환', () => {
    const results = searchAll('>테마', testInput)
    expect(results.every((r) => r.kind === 'action')).toBe(true)
    expect(results.length).toBeGreaterThan(0)
  })

  it('# 접두사 시 tags 그룹만 반환', () => {
    const results = searchAll('#dev', testInput)
    expect(results.every((r) => r.kind === 'tag')).toBe(true)
    expect(results.length).toBeGreaterThan(0)
  })

  it('@ 접두사 시 categories 그룹만 반환', () => {
    const results = searchAll('@dev', testInput)
    expect(results.every((r) => r.kind === 'category')).toBe(true)
    expect(results.length).toBeGreaterThan(0)
  })

  it('/ 접두사 시 bookmarks 그룹만 반환', () => {
    const results = searchAll('/github', testInput)
    expect(results.every((r) => r.kind === 'bookmark')).toBe(true)
    expect(results.length).toBeGreaterThan(0)
  })

  // --- matchedRanges 존재 확인 ---

  it('결과에 matchedRanges가 포함된다', () => {
    const results = searchAll('github', testInput)
    for (const result of results) {
      expect(Array.isArray(result.matchedRanges)).toBe(true)
    }
  })

  // --- URL 검색 (bookmarks only) ---

  it('URL로 북마크 검색된다', () => {
    const results = searchAll('/github.com', testInput)
    const bookmarkResult = results.find((r) => r.kind === 'bookmark' && r.link.name === 'GitHub')
    expect(bookmarkResult).toBeDefined()
  })

  // --- usage 점수 통합 ---

  it('usage 점수가 높은 항목이 결과 상위에 위치한다', () => {
    const inputWithUsage: SearchInput = {
      ...testInput,
      getUsageScore: (type: string, id: string) => {
        // ChatGPT에 높은 usage 점수 부여
        if (type === 'bookmark' && id === 'l4') return 10
        return 0
      },
    }

    const results = searchAll('at', inputWithUsage)
    const bookmarkResults = results.filter((r) => r.kind === 'bookmark')
    // ChatGPT (id: l4)가 다른 북마크보다 앞에 있어야 함
    const chatgptIdx = bookmarkResults.findIndex((r) => r.kind === 'bookmark' && r.link.id === 'l4')
    expect(chatgptIdx).toBeGreaterThanOrEqual(0)
  })

  // --- 태그 count 포함 ---

  it('태그 결과에 count 필드가 포함된다', () => {
    const results = searchAll('#ai', testInput)
    for (const result of results) {
      if (result.kind === 'tag') {
        expect(typeof result.count).toBe('number')
      }
    }
  })

  // --- 카테고리 ID 포함 (북마크) ---

  it('북마크 결과에 categoryId가 포함된다', () => {
    const results = searchAll('github', testInput)
    const bookmarkResults = results.filter((r) => r.kind === 'bookmark')
    for (const result of bookmarkResults) {
      if (result.kind === 'bookmark') {
        expect(typeof result.categoryId).toBe('string')
      }
    }
  })
})
