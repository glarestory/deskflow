// @MX:SPEC: SPEC-BOOKMARK-002
import { describe, it, expect } from 'vitest'
import { findDuplicates } from './bookmarkDedup'
import type { Bookmark } from '../types'

describe('findDuplicates', () => {
  it('중복이 없으면 빈 배열을 반환한다', () => {
    const categories: Bookmark[] = [
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
    const result = findDuplicates(categories)
    expect(result).toEqual([])
  })

  it('서로 다른 카테고리에 같은 URL이 있으면 감지한다', () => {
    const categories: Bookmark[] = [
      {
        id: 'cat-1',
        name: 'Work',
        icon: '💼',
        links: [
          { id: 'l1', name: 'GitHub', url: 'https://github.com' },
        ],
      },
      {
        id: 'cat-2',
        name: 'Dev',
        icon: '⚡',
        links: [
          { id: 'l2', name: 'GitHub (Dev)', url: 'https://github.com' },
        ],
      },
    ]
    const result = findDuplicates(categories)
    expect(result).toHaveLength(1)
    expect(result[0].url).toBe('https://github.com')
    expect(result[0].items).toHaveLength(2)
  })

  it('같은 카테고리 내에 같은 URL이 있으면 감지한다', () => {
    const categories: Bookmark[] = [
      {
        id: 'cat-1',
        name: 'Work',
        icon: '💼',
        links: [
          { id: 'l1', name: 'GitHub', url: 'https://github.com' },
          { id: 'l2', name: 'GitHub 복사본', url: 'https://github.com' },
        ],
      },
    ]
    const result = findDuplicates(categories)
    expect(result).toHaveLength(1)
    expect(result[0].url).toBe('https://github.com')
    expect(result[0].items).toHaveLength(2)
    // 두 항목 모두 같은 카테고리에 속함
    expect(result[0].items[0].categoryId).toBe('cat-1')
    expect(result[0].items[1].categoryId).toBe('cat-1')
  })

  it('각 중복 항목에 categoryId, categoryName, linkId, title 정보를 포함한다', () => {
    const categories: Bookmark[] = [
      {
        id: 'cat-1',
        name: 'Work',
        icon: '💼',
        links: [
          { id: 'l1', name: 'GitHub', url: 'https://github.com' },
        ],
      },
      {
        id: 'cat-2',
        name: 'Dev',
        icon: '⚡',
        links: [
          { id: 'l2', name: 'GitHub (Dev)', url: 'https://github.com' },
        ],
      },
    ]
    const result = findDuplicates(categories)
    const group = result[0]
    expect(group.items[0]).toMatchObject({
      categoryId: 'cat-1',
      categoryName: 'Work',
      linkId: 'l1',
      title: 'GitHub',
    })
    expect(group.items[1]).toMatchObject({
      categoryId: 'cat-2',
      categoryName: 'Dev',
      linkId: 'l2',
      title: 'GitHub (Dev)',
    })
  })

  it('URL 대소문자를 무시하고 중복을 감지한다', () => {
    const categories: Bookmark[] = [
      {
        id: 'cat-1',
        name: 'Work',
        icon: '💼',
        links: [
          { id: 'l1', name: 'GitHub', url: 'https://GITHUB.COM' },
          { id: 'l2', name: 'github', url: 'https://github.com' },
        ],
      },
    ]
    const result = findDuplicates(categories)
    expect(result).toHaveLength(1)
  })

  it('세 카테고리에 같은 URL이 있으면 하나의 그룹에 세 항목을 반환한다', () => {
    const categories: Bookmark[] = [
      {
        id: 'cat-1',
        name: 'A',
        icon: '🅰️',
        links: [{ id: 'l1', name: 'GitHub A', url: 'https://github.com' }],
      },
      {
        id: 'cat-2',
        name: 'B',
        icon: '🅱️',
        links: [{ id: 'l2', name: 'GitHub B', url: 'https://github.com' }],
      },
      {
        id: 'cat-3',
        name: 'C',
        icon: '🅲',
        links: [{ id: 'l3', name: 'GitHub C', url: 'https://github.com' }],
      },
    ]
    const result = findDuplicates(categories)
    expect(result).toHaveLength(1)
    expect(result[0].items).toHaveLength(3)
  })

  it('빈 카테고리 배열이면 빈 배열을 반환한다', () => {
    const result = findDuplicates([])
    expect(result).toEqual([])
  })
})
