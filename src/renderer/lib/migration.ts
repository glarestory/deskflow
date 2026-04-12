// @MX:NOTE: [AUTO] migration — 최초 로그인 시 localStorage 데이터를 Firestore로 마이그레이션
// @MX:SPEC: SPEC-AUTH-001

import { firestoreStorage } from './firestoreStorage'

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

  // 마이그레이션 완료 플래그 저장
  localStorage.setItem(MIGRATION_FLAG, uid)
}
