// @MX:ANCHOR: [AUTO] searchAll — 북마크/카테고리/태그/액션/RAG 통합 검색 함수
// @MX:REASON: [AUTO] CommandPalette 컴포넌트에서 직접 호출되는 검색 진입점
// @MX:SPEC: SPEC-UX-002, SPEC-SEARCH-RAG-001
import { fuzzyMatch } from './fuzzyMatch'
import type { Category, Link } from '../types'

/** 검색 접두사 파싱 결과 */
export interface PrefixParseResult {
  group: 'all' | 'actions' | 'tags' | 'categories' | 'bookmarks'
  query: string
}

/** 팔레트 액션 정의 */
export interface PaletteAction {
  id: string
  label: string
  keywords: string[]
  execute: () => void
  icon?: string
  /** SPEC-UX-003/005에서 구현 예정 — true이면 비활성 표시 */
  disabled?: boolean
  /** 비활성 이유 (예: "SPEC-UX-003 필요") */
  disabledReason?: string
}

/** RAG 검색 결과 (SPEC-SEARCH-RAG-001 REQ-012) */
export interface RagSearchResult {
  kind: 'rag'
  linkId: string
  categoryId: string
  score: number
  /** 렌더링에 필요한 링크 전체 객체 (호출자가 lookup 비용 없이 사용 가능) */
  link: Link
  /** fuzzy 결과와 일관성을 위해 빈 배열로 채움 (RAG는 범위 매칭 없음) */
  matchedRanges: [number, number][]
}

/** 통합 검색 입력 */
export interface SearchInput {
  categories: Category[]
  tags: string[]
  actions: PaletteAction[]
  /** 항목의 usage 점수 반환 함수 (type: 'bookmark'|'category'|'tag'|'action') */
  getUsageScore: (type: string, id: string) => number
  /**
   * 사전 계산된 RAG 결과 (ragStore.search()가 비동기 반환)
   * 없거나 빈 배열이면 RAG 그룹 비활성
   */
  ragResults?: RagSearchResult[]
}

/** 북마크 검색 결과 */
export interface BookmarkResult {
  kind: 'bookmark'
  link: Link
  categoryId: string
  matchedRanges: [number, number][]
  score: number
}

/** 카테고리 검색 결과 */
export interface CategoryResult {
  kind: 'category'
  category: Category
  matchedRanges: [number, number][]
  score: number
}

/** 태그 검색 결과 */
export interface TagResult {
  kind: 'tag'
  tag: string
  count: number
  matchedRanges: [number, number][]
  score: number
}

/** 액션 검색 결과 */
export interface ActionResult {
  kind: 'action'
  action: PaletteAction
  matchedRanges: [number, number][]
  score: number
}

/** 통합 검색 결과 유니온 타입 */
export type SearchResult = BookmarkResult | CategoryResult | TagResult | ActionResult | RagSearchResult

// 그룹당 최대 결과 수 (SPEC REQ)
const MAX_PER_GROUP = 5
// 총 최대 결과 수 (SPEC REQ)
const MAX_TOTAL = 20

/**
 * 검색어 접두사를 파싱하여 검색 그룹과 실제 쿼리를 반환.
 * >, : → actions
 * # → tags
 * @ → categories
 * / → bookmarks
 */
export function parsePrefix(rawQuery: string): PrefixParseResult {
  if (rawQuery.length === 0) return { group: 'all', query: '' }

  const first = rawQuery[0]
  const rest = rawQuery.slice(1).trimStart()

  switch (first) {
    case '>':
    case ':':
      return { group: 'actions', query: rest }
    case '#':
      return { group: 'tags', query: rest }
    case '@':
      return { group: 'categories', query: rest }
    case '/':
      return { group: 'bookmarks', query: rest }
    default:
      return { group: 'all', query: rawQuery }
  }
}

/**
 * 태그별 북마크 사용 횟수를 계산한다.
 */
function computeTagCounts(categories: Category[]): Map<string, number> {
  const counts = new Map<string, number>()
  for (const cat of categories) {
    for (const link of cat.links) {
      // @MX:NOTE: [AUTO] 마이그레이션 전 데이터의 tags 누락 방어
      for (const tag of link.tags ?? []) {
        counts.set(tag, (counts.get(tag) ?? 0) + 1)
      }
    }
  }
  return counts
}

/**
 * 북마크 검색 수행.
 * link.name 과 link.url을 모두 검색.
 */
function searchBookmarks(
  query: string,
  categories: Category[],
  getUsageScore: (type: string, id: string) => number,
): BookmarkResult[] {
  const results: BookmarkResult[] = []

  for (const cat of categories) {
    for (const link of cat.links) {
      // 이름과 URL 모두 매칭 시도
      const nameMatch = fuzzyMatch(query, link.name)
      const urlMatch = fuzzyMatch(query, link.url)

      const best = nameMatch !== null && urlMatch !== null
        ? (nameMatch.score >= urlMatch.score ? nameMatch : urlMatch)
        : (nameMatch ?? urlMatch)

      if (best === null) continue

      // usage 점수를 최종 점수에 추가
      const usageScore = getUsageScore('bookmark', link.id)
      const finalScore = best.score + Math.min(usageScore * 0.1, 0.3)

      results.push({
        kind: 'bookmark',
        link,
        categoryId: cat.id,
        matchedRanges: (nameMatch ?? urlMatch)!.ranges,
        score: finalScore,
      })
    }
  }

  // 점수 내림차순 정렬 후 상위 MAX_PER_GROUP개 반환
  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_PER_GROUP)
}

/**
 * 카테고리 검색 수행.
 */
function searchCategories(
  query: string,
  categories: Category[],
  getUsageScore: (type: string, id: string) => number,
): CategoryResult[] {
  const results: CategoryResult[] = []

  for (const cat of categories) {
    const match = fuzzyMatch(query, cat.name)
    if (match === null) continue

    const usageScore = getUsageScore('category', cat.id)
    const finalScore = match.score + Math.min(usageScore * 0.1, 0.3)

    results.push({
      kind: 'category',
      category: cat,
      matchedRanges: match.ranges,
      score: finalScore,
    })
  }

  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_PER_GROUP)
}

/**
 * 태그 검색 수행.
 */
function searchTags(
  query: string,
  tags: string[],
  tagCounts: Map<string, number>,
  getUsageScore: (type: string, id: string) => number,
): TagResult[] {
  const results: TagResult[] = []

  for (const tag of tags) {
    const match = fuzzyMatch(query, tag)
    if (match === null) continue

    const usageScore = getUsageScore('tag', tag)
    const finalScore = match.score + Math.min(usageScore * 0.1, 0.3)

    results.push({
      kind: 'tag',
      tag,
      count: tagCounts.get(tag) ?? 0,
      matchedRanges: match.ranges,
      score: finalScore,
    })
  }

  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_PER_GROUP)
}

/**
 * 액션 검색 수행.
 * label과 keywords 모두 검색.
 */
function searchActions(
  query: string,
  actions: PaletteAction[],
  getUsageScore: (type: string, id: string) => number,
): ActionResult[] {
  const results: ActionResult[] = []

  for (const action of actions) {
    // label 매칭
    const labelMatch = fuzzyMatch(query, action.label)
    // keywords 매칭 (가장 좋은 것 선택)
    let bestKeywordMatch = null
    for (const kw of action.keywords) {
      const m = fuzzyMatch(query, kw)
      if (m !== null && (bestKeywordMatch === null || m.score > bestKeywordMatch.score)) {
        bestKeywordMatch = m
      }
    }

    const best = labelMatch !== null && bestKeywordMatch !== null
      ? (labelMatch.score >= bestKeywordMatch.score ? labelMatch : bestKeywordMatch)
      : (labelMatch ?? bestKeywordMatch)

    if (best === null) continue

    const usageScore = getUsageScore('action', action.id)
    const finalScore = best.score + Math.min(usageScore * 0.1, 0.3)

    results.push({
      kind: 'action',
      action,
      matchedRanges: labelMatch?.ranges ?? best.ranges,
      score: finalScore,
    })
  }

  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_PER_GROUP)
}

/**
 * 전체 검색 실행 함수.
 * 쿼리의 접두사에 따라 특정 그룹만 또는 전체 그룹을 검색.
 *
 * @param rawQuery - 원시 검색어 (접두사 포함 가능)
 * @param input - 검색 대상 데이터
 * @returns 검색 결과 배열 (그룹별 최대 5개, 총 최대 20개)
 */
export function searchAll(rawQuery: string, input: SearchInput): SearchResult[] {
  if (rawQuery.trim().length === 0) return []

  const { group, query } = parsePrefix(rawQuery)
  const tagCounts = computeTagCounts(input.categories)
  const results: SearchResult[] = []

  switch (group) {
    case 'bookmarks': {
      const bookmarkResults = searchBookmarks(query, input.categories, input.getUsageScore)
      results.push(...bookmarkResults)
      break
    }
    case 'categories': {
      const categoryResults = searchCategories(query, input.categories, input.getUsageScore)
      results.push(...categoryResults)
      break
    }
    case 'tags': {
      const tagResults = searchTags(query, input.tags, tagCounts, input.getUsageScore)
      results.push(...tagResults)
      break
    }
    case 'actions': {
      const actionResults = searchActions(query, input.actions, input.getUsageScore)
      results.push(...actionResults)
      break
    }
    case 'all': {
      // @MX:NOTE: [AUTO] SPEC-SEARCH-RAG-001 REQ-012 — RAG 결과 그룹 통합 (action < category < tag < RAG < bookmark)
      // 전체 그룹 검색 — 각 그룹 최대 5개씩, 총 20개
      const bookmarkResults = searchBookmarks(query, input.categories, input.getUsageScore)
      const categoryResults = searchCategories(query, input.categories, input.getUsageScore)
      const tagResults = searchTags(query, input.tags, tagCounts, input.getUsageScore)
      const actionResults = searchActions(query, input.actions, input.getUsageScore)

      // RAG 결과: 쿼리 4자 이상이고 ragResults가 제공된 경우에만 삽입
      // 순서: action → category → tag → RAG → bookmark (DEC-004)
      const ragResults = (input.ragResults && query.trim().length >= 4)
        ? input.ragResults.slice(0, MAX_PER_GROUP)
        : []

      results.push(...actionResults, ...categoryResults, ...tagResults, ...ragResults, ...bookmarkResults)
      break
    }
  }

  return results.slice(0, MAX_TOTAL)
}
