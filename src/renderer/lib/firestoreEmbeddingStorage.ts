// @MX:NOTE: [AUTO] Firestore 서브컬렉션 I/O — /users/{uid}/embeddings/{linkId}, NFR-003 1MB 제한 우회
// @MX:SPEC: SPEC-SEARCH-RAG-001

import { collection, doc, getDocs, setDoc, deleteDoc } from 'firebase/firestore'
import { db } from './firebase'
import type { BookmarkEmbedding } from '../types/embedding'

/**
 * Firestore 서브컬렉션 기반 임베딩 저장소.
 *
 * 경로: /users/{uid}/embeddings/{linkId}
 *
 * NFR-003: 임베딩 배열이 1MB를 초과할 수 있으므로 단일 doc 대신
 * 서브컬렉션 개별 문서 방식을 사용한다.
 */
export const firestoreEmbeddingStorage = {
  /** 사용자의 모든 임베딩을 배열로 반환한다 */
  async getAll(uid: string): Promise<BookmarkEmbedding[]> {
    const ref = collection(db, 'users', uid, 'embeddings')
    const snap = await getDocs(ref)
    return snap.docs.map((d) => d.data() as BookmarkEmbedding)
  },

  /** 단일 임베딩을 생성/갱신한다 */
  async upsert(uid: string, e: BookmarkEmbedding): Promise<void> {
    const ref = doc(db, 'users', uid, 'embeddings', e.linkId)
    await setDoc(ref, e)
  },

  /** 단일 임베딩을 삭제한다 */
  async remove(uid: string, linkId: string): Promise<void> {
    const ref = doc(db, 'users', uid, 'embeddings', linkId)
    await deleteDoc(ref)
  },

  /** 사용자의 모든 임베딩을 삭제한다 */
  async removeAll(uid: string): Promise<void> {
    const ref = collection(db, 'users', uid, 'embeddings')
    const snap = await getDocs(ref)
    await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)))
  },
}
