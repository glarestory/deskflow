// @MX:SPEC: SPEC-UX-002
// 성능 측정 테스트 — 1000개 북마크 검색 < 100ms 검증
import { describe, it, expect } from 'vitest'
import { searchAll } from './searchAll'
import type { SearchInput, PaletteAction } from './searchAll'
import type { Category } from '../types'

// 1000개 북마크 데이터셋 생성
function generateLargeDataset(): Category[] {
  const categories: Category[] = []
  for (let i = 0; i < 100; i++) {
    const links = Array.from({ length: 10 }, (_, j) => ({
      id: `link-${i}-${j}`,
      name: `Bookmark ${i * 10 + j} ${['GitHub', 'Google', 'ChatGPT', 'Notion', 'Slack'][j % 5]}`,
      url: `https://example${i}-${j}.com/path/${['dev', 'ai', 'work', 'tool', 'news'][j % 5]}`,
      tags: [['dev', 'ai', 'work', 'tool', 'news'][j % 5]],
    }))
    categories.push({
      id: `cat-${i}`,
      name: `Category ${i} ${['Work', 'Dev', 'AI', 'Media', 'Tools'][i % 5]}`,
      icon: '📁',
      links,
    })
  }
  return categories
}

const actions: PaletteAction[] = [
  { id: 'a1', label: '테마 전환', keywords: ['theme'], execute: () => {} },
  { id: 'a2', label: '로그아웃', keywords: ['logout'], execute: () => {} },
  { id: 'a3', label: '레이아웃 초기화', keywords: ['reset'], execute: () => {} },
]

describe('검색 성능', () => {
  it('1000개 북마크 검색이 100ms 이내에 완료된다', () => {
    const categories = generateLargeDataset()
    const tags = ['dev', 'ai', 'work', 'tool', 'news']

    const input: SearchInput = {
      categories,
      tags,
      actions,
      getUsageScore: () => 0,
    }

    const start = performance.now()
    const results = searchAll('github', input)
    const elapsed = performance.now() - start

    expect(results.length).toBeGreaterThan(0)
    expect(elapsed).toBeLessThan(100)
  })

  it('100개 카테고리 + 100개 태그 + 100개 액션 검색이 100ms 이내에 완료된다', () => {
    const categories = generateLargeDataset()
    const tags = Array.from({ length: 100 }, (_, i) => `tag-${i}`)
    const manyActions: PaletteAction[] = Array.from({ length: 100 }, (_, i) => ({
      id: `action-${i}`,
      label: `Action ${i}`,
      keywords: [`keyword-${i}`],
      execute: () => {},
    }))

    const input: SearchInput = {
      categories,
      tags,
      actions: manyActions,
      getUsageScore: () => 0,
    }

    const start = performance.now()
    const results = searchAll('dev', input)
    const elapsed = performance.now() - start

    expect(results.length).toBeLessThanOrEqual(20)
    expect(elapsed).toBeLessThan(100)
  })

  it('반복 타이핑 시뮬레이션 — 10번 연속 검색이 총 200ms 이내에 완료된다', () => {
    const categories = generateLargeDataset()
    const input: SearchInput = {
      categories,
      tags: ['dev', 'ai'],
      actions,
      getUsageScore: () => 0,
    }

    const queries = ['g', 'gi', 'git', 'gith', 'githu', 'github', 'gi', 'g', 'ch', 'chat']

    const start = performance.now()
    for (const q of queries) {
      searchAll(q, input)
    }
    const elapsed = performance.now() - start

    expect(elapsed).toBeLessThan(200)
  })
})
