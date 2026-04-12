// @MX:ANCHOR: [AUTO] firestoreStorage — Firestore 사용자 데이터 읽기/쓰기 진입점
// @MX:REASON: [AUTO] storage.ts의 createUserStorage와 migration.ts가 의존하는 외부 저장소 인터페이스
// @MX:SPEC: SPEC-AUTH-001

import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from './firebase'

export const firestoreStorage = {
  async get(uid: string, key: string): Promise<{ value: string | null }> {
    const ref = doc(db, 'users', uid, 'data', key)
    const snap = await getDoc(ref)
    if (!snap.exists()) return { value: null }
    const data = snap.data() as { value: string }
    return { value: data.value ?? null }
  },

  async set(uid: string, key: string, value: string): Promise<void> {
    const ref = doc(db, 'users', uid, 'data', key)
    await setDoc(ref, { value })
  },
}
