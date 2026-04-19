// @MX:NOTE: [AUTO] Capsule 엔티티 — SPEC-CAPSULE-001 중심 도메인 모델
// @MX:SPEC: SPEC-CAPSULE-001
import type { SidebarContext } from '../stores/viewStore'
import type { ViewMode } from '../stores/viewModeStore'

// viewStore의 SidebarContext와 viewModeStore의 ViewMode를 재내보내기
// capsuleStore에서 직접 사용할 수 있도록
export type { SidebarContext, ViewMode }

/**
 * 포모도로 프리셋 — 캡슐별 타이머 설정을 저장한다.
 */
export interface PomodoroPreset {
  focusMinutes: number
  breakMinutes: number
  longBreakMinutes: number
  cyclesBeforeLongBreak: number
}

/**
 * 캡슐별 누적 사용 메트릭.
 * REQ-020: 집중 시간, 완료 Todo, 활성화 횟수 추적
 */
export interface CapsuleMetrics {
  focusMinutes: number
  completedTodos: number
  activationCount: number
}

/**
 * Context Capsule 엔티티.
 * 개발자의 작업 맥락(북마크·Todo·메모·뷰·포모도로 설정)을 하나로 묶는다.
 * REQ-001: 엔티티 필드 정의
 */
export interface Capsule {
  /** UUID-like 고유 식별자 */
  id: string
  /** 캡슐 이름 (최대 60자) */
  name: string
  /** 캡슐 이모지 (선택, 기본값 📦) */
  emoji?: string
  /** 캡슐 설명 (선택, 최대 200자) */
  description?: string
  /** 캡슐 색상 (OKLCH 형식, 선택) */
  color?: string
  /** 연결된 북마크 카테고리 ID 목록 */
  bookmarkIds: string[]
  /** 연결된 Todo ID 목록 */
  todoIds: string[]
  /** 연결된 메모 ID 목록 */
  noteIds: string[]
  /** 캡슐 분류 태그 */
  tags: string[]
  /** Pivot 레이아웃 컨텍스트 (null이면 복원하지 않음) */
  pivotContext: SidebarContext | null
  /** 뷰 모드 (null이면 복원하지 않음) */
  viewMode: ViewMode | null
  /** 포모도로 프리셋 (null이면 복원하지 않음) */
  pomodoroPreset: PomodoroPreset | null
  /** 생성 시각 (ISO-8601) */
  createdAt: string
  /** 최종 수정 시각 (ISO-8601) */
  updatedAt: string
  /** 마지막 활성화 시각 (ISO-8601, 한 번도 활성화 안 했으면 null) */
  lastActivatedAt: string | null
  /** 보관 상태 (기본 false) */
  archived: boolean
  /** 누적 사용 메트릭 */
  metrics: CapsuleMetrics
}
