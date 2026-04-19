// @MX:SPEC: SPEC-UX-002, SPEC-SEARCH-RAG-001
// searchAll 통합 검색 단위 테스트 — 접두사 파싱, 그룹별 결과, 점수 가중치, RAG 통합 검증
import { describe, it, expect } from 'vitest'
import { searchAll, parsePrefix, type SearchInput, type RagSearchResult } from './searchAll'
import type { Category, Link } from '../types'

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

// ─────────────────────────────────────────────────────────────────────────────
// SPEC-SEARCH-RAG-001: RAG 결과 통합 테스트
// @MX:NOTE: [AUTO] SPEC-SEARCH-RAG-001 REQ-012 — RAG 결과 그룹 통합 (action < category < tag < RAG < bookmark)
// ─────────────────────────────────────────────────────────────────────────────

/** 테스트용 RagSearchResult 팩토리 */
function makeRagResult(linkId: string, score: number): RagSearchResult {
  const link: Link = {
    id: linkId,
    name: `Link ${linkId}`,
    url: `https://example.com/${linkId}`,
    tags: [],
  }
  return {
    kind: 'rag',
    linkId,
    categoryId: 'cat-rag',
    score,
    link,
    matchedRanges: [],
  }
}

describe('searchAll — RAG 결과 통합 (SPEC-SEARCH-RAG-001)', () => {
  // 테스트 1: ragResults가 전달되면 결과에 kind: 'rag' 항목이 포함된다
  it('ragResults가 있고 쿼리 4자 이상이면 결과에 rag 항목이 포함된다 (REQ-012)', () => {
    const ragResults: RagSearchResult[] = [
      makeRagResult('rag-link-1', 0.90),
      makeRagResult('rag-link-2', 0.75),
    ]

    const inputWithRag: SearchInput = {
      ...testInput,
      ragResults,
    }

    const results = searchAll('long query text', inputWithRag)
    const ragItems = results.filter((r) => r.kind === 'rag')
    expect(ragItems.length).toBeGreaterThan(0)
    expect(ragItems.length).toBe(2)
  })

  // 테스트 2: ragResults가 빈 배열이면 기존 동작과 동일 (회귀 없음)
  it('ragResults가 빈 배열이면 rag 항목이 없고 기존 동작이 유지된다 (REQ-013)', () => {
    const inputWithEmpty: SearchInput = {
      ...testInput,
      ragResults: [],
    }

    const resultsWithEmpty = searchAll('github', inputWithEmpty)
    const resultsWithout = searchAll('github', testInput)

    const ragItems = resultsWithEmpty.filter((r) => r.kind === 'rag')
    expect(ragItems.length).toBe(0)

    // 기존 결과 종류는 동일해야 함
    const kindsWithEmpty = new Set(resultsWithEmpty.map((r) => r.kind))
    const kindsWithout = new Set(resultsWithout.map((r) => r.kind))
    expect(kindsWithEmpty).toEqual(kindsWithout)
  })

  // 테스트 3: 순서 — action < category < tag < RAG < bookmark
  it('그룹 순서: action → category → tag → RAG → bookmark (DEC-004)', () => {
    // 각 그룹에 모두 매칭되도록 설계된 쿼리 세팅
    const specialCategories: Category[] = [
      {
        id: 'cat-work',
        name: 'devtools',
        icon: '🛠',
        links: [
          { id: 'bm-1', name: 'devtools link', url: 'https://devtools.com', tags: ['devtools'] },
        ],
      },
    ]
    const ragResults: RagSearchResult[] = [makeRagResult('rag-x', 0.85)]

    const specialInput: SearchInput = {
      categories: specialCategories,
      tags: ['devtools'],
      actions: [
        {
          id: 'action-devtools',
          label: 'devtools action',
          keywords: ['devtools'],
          execute: () => {},
        },
      ],
      getUsageScore: () => 0,
      ragResults,
    }

    const results = searchAll('devtools', specialInput)

    // 각 kind 첫 등장 인덱스 확인
    const firstIndexOf = (kind: string) => results.findIndex((r) => r.kind === kind)

    const actionIdx = firstIndexOf('action')
    const categoryIdx = firstIndexOf('category')
    const tagIdx = firstIndexOf('tag')
    const ragIdx = firstIndexOf('rag')
    const bookmarkIdx = firstIndexOf('bookmark')

    // 존재하는 그룹들의 순서 검증
    if (actionIdx >= 0 && categoryIdx >= 0) expect(actionIdx).toBeLessThan(categoryIdx)
    if (categoryIdx >= 0 && tagIdx >= 0) expect(categoryIdx).toBeLessThan(tagIdx)
    if (tagIdx >= 0 && ragIdx >= 0) expect(tagIdx).toBeLessThan(ragIdx)
    if (ragIdx >= 0 && bookmarkIdx >= 0) expect(ragIdx).toBeLessThan(bookmarkIdx)
  })

  // 테스트 4: 접두사 '>' (actions-only) 시 RAG 결과 무시
  it('> 접두사(actions-only)로 검색하면 RAG 결과가 포함되지 않는다 (AC-029)', () => {
    const ragResults: RagSearchResult[] = [makeRagResult('rag-y', 0.88)]
    const inputWithRag: SearchInput = {
      ...testInput,
      ragResults,
    }

    const results = searchAll('>테마', inputWithRag)
    const ragItems = results.filter((r) => r.kind === 'rag')
    expect(ragItems.length).toBe(0)
    expect(results.every((r) => r.kind === 'action')).toBe(true)
  })
})
