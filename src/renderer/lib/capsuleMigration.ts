// @MX:NOTE: [AUTO] capsuleMigration — 캡슐 데이터 로컬 → Firestore 마이그레이션
// @MX:SPEC: SPEC-CAPSULE-001
import { firestoreStorage } from './firestoreStorage'

const CAPSULES_KEY = 'capsules'
const ACTIVE_CAPSULE_ID_KEY = 'active-capsule-id'
const CAPSULE_SETTINGS_KEY = 'capsule-settings'

const CAPSULE_DATA_KEYS = [CAPSULES_KEY, ACTIVE_CAPSULE_ID_KEY, CAPSULE_SETTINGS_KEY]

/**
 * 미로그인 상태에서 생성된 캡슐 데이터를 Firestore에 업로드한다.
 * REQ-004: 기존 migrateLocalToFirestore 파이프라인에 캡슐 포함
 * - idempotent: 동일 uid에 대해 중복 실행해도 안전
 */
export const migrateCapsulesToFirestore = async (uid: string): Promise<void> => {
  for (const key of CAPSULE_DATA_KEYS) {
    const localValue = localStorage.getItem(key)
    if (localValue !== null) {
      await firestoreStorage.set(uid, key, localValue)
    }
  }
}
