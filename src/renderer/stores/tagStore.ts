// @MX:ANCHOR: [AUTO] tagStore — 태그 선택/집계 상태 관리 중심 진입점
// @MX:REASON: [AUTO] App, BookmarkCard, EditModal, CommandPalette 등 다수 컴포넌트가 의존 예정
// @MX:SPEC: SPEC-BOOKMARK-003

import { create } from 'zustand'
import type { Bookmark } from '../types'

/** 태그와 사용 횟수 */
export interface TagCount {
  tag: string
  count: number
}

interface TagState {
  /** 현재 선택된 태그 목록 (AND 필터링에 사용) */
  selectedTags: string[]
  /** 전체 북마크에서 집계된 태그별 사용 횟수 (count 내림차순) */
  allTags: TagCount[]

  /** 태그를 선택 목록에 추가 (중복 방지) */
  selectTag: (tag: string) => void
  /** 태그를 선택 목록에서 제거 */
  deselectTag: (tag: string) => void
  /** 선택 목록 초기화 */
  clearTags: () => void
  /**
   * 전체 북마크를 순회해 태그별 사용 횟수를 재집계한다.
   * bookmarkStore가 변경될 때마다 호출해야 한다.
   */
  recomputeAllTags: (bookmarks: Bookmark[]) => void
  /**
   * selectedTags 기준으로 북마크를 AND 필터링한다.
   * selectedTags가 비어 있으면 모든 북마크를 반환한다.
   * 태그 매칭은 링크(Link) 단위로 이루어진다.
   */
  filterBookmarksByTags: (bookmarks: Bookmark[]) => Bookmark[]
}

export const useTagStore = create<TagState>((set, get) => ({
  selectedTags: [],
  allTags: [],

  selectTag: (tag) => {
    set((state) => {
      // 중복 방지
      if (state.selectedTags.includes(tag)) return state
      return { selectedTags: [...state.selectedTags, tag] }
    })
  },

  deselectTag: (tag) => {
    set((state) => ({
      selectedTags: state.selectedTags.filter((t) => t !== tag),
    }))
  },

  clearTags: () => {
    set({ selectedTags: [] })
  },

  recomputeAllTags: (bookmarks) => {
    // 모든 링크의 tags를 순회해 Map으로 집계 (O(n))
    const countMap = new Map<string, number>()
    for (const bookmark of bookmarks) {
      for (const link of bookmark.links) {
        // @MX:NOTE: [AUTO] 마이그레이션 전 데이터 방어
        for (const tag of link.tags ?? []) {
          countMap.set(tag, (countMap.get(tag) ?? 0) + 1)
        }
      }
    }

    // count 내림차순 정렬
    const allTags: TagCount[] = Array.from(countMap.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)

    set({ allTags })
  },

  filterBookmarksByTags: (bookmarks) => {
    const { selectedTags } = get()

    // 선택된 태그가 없으면 전체 반환
    if (selectedTags.length === 0) return bookmarks

    // 각 북마크에서 선택된 모든 태그를 포함하는 링크만 필터링
    const result: Bookmark[] = []
    for (const bookmark of bookmarks) {
      const matchingLinks = bookmark.links.filter((link) =>
        // @MX:NOTE: [AUTO] tags 누락 방어
        selectedTags.every((tag) => (link.tags ?? []).includes(tag)),
      )
      if (matchingLinks.length > 0) {
        result.push({ ...bookmark, links: matchingLinks })
      }
    }
    return result
  },
}))
