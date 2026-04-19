// @MX:NOTE: [AUTO] migration — 최초 로그인 시 localStorage 데이터를 Firestore로 마이그레이션
// @MX:NOTE: [AUTO] SPEC-BOOKMARK-003: backfillMissingTags — tags 없는 기존 링크에 자동 태그 채우기
// @MX:NOTE: [AUTO] SPEC-UX-003: backfillMissingCreatedAt — createdAt 없는 기존 링크에 현재 시각 부여
// @MX:SPEC: SPEC-AUTH-001, SPEC-BOOKMARK-003, SPEC-UX-003, SPEC-CAPSULE-001, SPEC-SEARCH-RAG-001

import { firestoreStorage } from './firestoreStorage'
import { firestoreEmbeddingStorage } from './firestoreEmbeddingStorage'
import type { Bookmark } from '../types'
import type { BookmarkEmbedding } from '../types/embedding'
import { extractTags } from './extractTags'
import { migrateCapsulesToFirestore } from './capsuleMigration'

const MIGRATION_FLAG = 'hub-migrated'
const DATA_KEYS = ['hub-bookmarks', 'hub-todos', 'hub-theme', 'hub-notes']

// 로컬 데이터를 Firestore로 일괄 업로드한다 (최초 1회만 실행)
export const migrateLocalToFirestore = async (uid: string): Promise<void> => {
  // 이미 마이그레이션된 경우 스킵
  const migrated = localStorage.getItem(MIGRATION_FLAG)
  if (migrated === uid) return

  for (const key of DATA_KEYS) {
    const localValue = localStorage.getItem(key)
    if (localValue !== null) {
      await firestoreStorage.set(uid, key, localValue)
    }
  }

  // REQ-004: 캡슐 데이터도 함께 마이그레이션
  await migrateCapsulesToFirestore(uid)

  // @MX:NOTE: [AUTO] SPEC-SEARCH-RAG-001 REQ-008 - embedding 은 서브컬렉션으로 개별 업로드
  const rawEmbeddings = localStorage.getItem('rag-embeddings')
  if (rawEmbeddings !== null) {
    try {
      const embeddings = JSON.parse(rawEmbeddings) as BookmarkEmbedding[]
      for (const e of embeddings) {
        await firestoreEmbeddingStorage.upsert(uid, e)
      }
    } catch {
      console.warn('[migration] rag-embeddings 파싱 실패, 임베딩 마이그레이션 스킵')
    }
  }

  // 마이그레이션 완료 플래그 저장
  localStorage.setItem(MIGRATION_FLAG, uid)
}

/**
 * createdAt 필드가 없는 기존 링크에 현재 시각(Date.now())을 부여한다.
 * - idempotent: 이미 createdAt이 있는 링크는 변경하지 않음
 * - SPEC-UX-003: backfillMissingTags 패턴과 동일한 구조
 */
export function backfillMissingCreatedAt(bookmarks: Bookmark[]): Bookmark[] {
  const now = Date.now()
  return bookmarks.map((bookmark) => ({
    ...bookmark,
    links: bookmark.links.map((link) => {
      // 이미 createdAt이 있으면 그대로 유지 (idempotent)
      if (link.createdAt !== undefined) return link
      return { ...link, createdAt: now }
    }),
  }))
}

/**
 * tags 필드가 없거나 빈 배열인 기존 링크에 자동 태그를 채운다.
 * - idempotent: 이미 태그가 있는 링크는 그대로 유지
 * - tags 필드 없는 링크(legacy): 자동 태그 추출 후 할당
 * - tags 빈 배열: 자동 태그로 채움
 * - 자동+기존 태그 중복 제거 (EDGE-004)
 */
export function backfillMissingTags(bookmarks: Bookmark[]): Bookmark[] {
  return bookmarks.map((bookmark) => ({
    ...bookmark,
    links: bookmark.links.map((link) => {
      // tags 필드가 없거나(undefined) 빈 배열이면 자동 태그 추출
      const existingTags: string[] = (link.tags as string[] | undefined) ?? []
      const autoTags = extractTags(link.url)
      // 기존 태그 + 자동 태그 병합 (중복 제거)
      const merged = [...new Set([...existingTags, ...autoTags])]
      return { ...link, tags: merged }
    }),
  }))
}
