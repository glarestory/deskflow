// @MX:NOTE: [AUTO] 중복 URL 탐지 유틸리티 — 카테고리 간 동일 URL 그룹화
// @MX:SPEC: SPEC-BOOKMARK-002
import type { Bookmark } from '../types'

/** 중복 그룹 내 개별 항목 정보 */
export interface DuplicateItem {
  categoryId: string
  categoryName: string
  linkId: string
  title: string
}

/** 동일 URL을 공유하는 중복 그룹 */
export interface DuplicateGroup {
  url: string
  items: DuplicateItem[]
}

/**
 * 카테고리 배열에서 중복 URL 그룹을 탐지
 * URL 비교는 소문자 정규화 후 수행 (대소문자 무시)
 */
export function findDuplicates(categories: Bookmark[]): DuplicateGroup[] {
  // URL(소문자) → DuplicateItem[] 매핑
  const urlMap = new Map<string, DuplicateItem[]>()

  for (const category of categories) {
    for (const link of category.links) {
      const normalizedUrl = link.url.toLowerCase()
      const item: DuplicateItem = {
        categoryId: category.id,
        categoryName: category.name,
        linkId: link.id,
        title: link.name,
      }
      const existing = urlMap.get(normalizedUrl)
      if (existing !== undefined) {
        existing.push(item)
      } else {
        urlMap.set(normalizedUrl, [item])
      }
    }
  }

  // 2개 이상 항목이 있는 그룹만 반환
  const groups: DuplicateGroup[] = []
  for (const [normalizedUrl, items] of urlMap.entries()) {
    if (items.length >= 2) {
      groups.push({ url: normalizedUrl, items })
    }
  }

  return groups
}
