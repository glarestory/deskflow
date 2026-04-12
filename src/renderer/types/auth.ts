// @MX:NOTE: [AUTO] auth 타입 정의 — Firebase User 기반 인증 상태
// @MX:SPEC: SPEC-AUTH-001

import type { User } from 'firebase/auth'

export interface AuthState {
  user: User | null
  loading: boolean
  error: string | null
}
