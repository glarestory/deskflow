---
id: SPEC-CAPSULE-001
version: 0.1.0
status: implemented
created: 2026-04-19
updated: 2026-04-19
author: ZeroJuneK
priority: high
issue_number: 0
---

# SPEC-CAPSULE-001: Context Capsule — 개발자 작업 맥락 스냅샷

## HISTORY

| 버전 | 날짜 | 작성자 | 변경 내용 |
|------|------|--------|-----------|
| 0.1.0 | 2026-04-19 | ZeroJuneK | 최초 작성 (Deskflow Signature 기능 제안) |

## 개요

**Context Capsule**은 개발자가 동시에 여러 작업 맥락(이슈/PR/브랜치/학습 주제)을 오갈 때, 각 맥락에 속한 **북마크 · Todo · 메모 · 태그 · 포모도로 세션 · 뷰 컨텍스트**를 하나의 "캡슐"로 묶어 저장하고 즉시 복원할 수 있게 한다.

Deskflow를 "정리 도구"에서 **"개발자의 Context Brain"**으로 승격시키는 시그니처 기능이다.

**분류**: SPEC (신규 기능)
**성격**: Greenfield -- 신규 도메인 모델·스토어·UI 추가
**선행 SPEC**: SPEC-AUTH-001 (Firestore 동기화), SPEC-UX-003 (Pivot 컨텍스트), SPEC-UX-005 (View Mode), SPEC-LAYOUT-001 (Widget Layout)
**후속 SPEC 예정**: SPEC-GIT-001 (Git 브랜치 자동 전환), SPEC-SEARCH-RAG-001 (Capsule 전체 검색)

## 사용자 스토리

**주 페르소나**: "3개의 오픈소스 PR, 1개의 회사 프로젝트 이슈, 개인 학습 Rust 튜토리얼을 번갈아 하는 풀타임 개발자"

1. 아침에 Deskflow를 열어 `auth-refactor` 캡슐을 로드 → 관련 북마크 · Todo · 메모가 즉시 한 화면에 복원
2. 팀장이 급한 버그 보고 → `hotfix-bug-203` 캡슐 신규 생성 → 관련 링크 몇 개 드래그앤드롭으로 담기
3. 30분 후 원래 작업 복귀 → 캡슐 전환 1클릭
4. 캡슐별 누적 Focus 시간·완료 Todo 수 리포트 확인 (주간 회고)

## 요구사항

### 모델 & 저장

#### REQ-001: Capsule 엔티티 정의

**[Ubiquitous]** 시스템은 **항상** 다음 필드를 가진 `Capsule` 엔티티를 보유해야 한다:
- `id` (string, UUID-like)
- `name` (string, 최대 60자)
- `emoji` (string, 선택, 기본 📦)
- `description` (string, 선택, 최대 200자)
- `color` (string, OKLCH 또는 테마 토큰, 선택)
- `bookmarkIds` (string[])
- `todoIds` (string[])
- `noteIds` (string[])
- `tags` (string[])
- `pivotContext` (SidebarContext | null)
- `viewMode` ('pivot' | 'widgets' | null)
- `pomodoroPreset` (PomodoroPreset | null)
- `createdAt` (ISO-8601 string)
- `updatedAt` (ISO-8601 string)
- `lastActivatedAt` (ISO-8601 string | null)
- `archived` (boolean, 기본 false)
- `metrics` (focusMinutes, completedTodos, activationCount)

#### REQ-002: 캡슐 영속화

**[Event-Driven]** **When** 사용자가 캡슐을 생성·수정·삭제하면, 시스템은 즉시 storage adapter를 통해 저장**해야 한다** (인증 사용자: Firestore `capsules` 컬렉션 / 미인증: electron-store `capsules` 키).

#### REQ-003: 앱 시작 시 캡슐 복원

**[Event-Driven]** **When** 앱이 시작되어 사용자 데이터를 로드할 때, 저장된 캡슐 목록을 `capsuleStore`에 로드**해야 한다**.

#### REQ-004: 로컬 → Firestore 마이그레이션

**[Event-Driven]** **When** 미로그인 상태에서 생성된 캡슐이 있고 사용자가 로그인하면, 기존 `migrateLocalToFirestore` 파이프라인이 캡슐 데이터도 함께 업로드**해야 한다**.

### 활성 캡슐 & 복원

#### REQ-005: 활성 캡슐 개념

**[Ubiquitous]** 시스템은 **항상** 0개 또는 1개의 "활성(active) 캡슐"을 보유해야 한다. 활성 캡슐은 `capsuleStore.activeCapsuleId`에 저장된다.

#### REQ-006: 캡슐 활성화 복원 액션

**[Event-Driven]** **When** 사용자가 캡슐을 활성화하면, 시스템은 순서대로 다음을 수행**해야 한다**:
1. `capsuleStore.activeCapsuleId`를 해당 캡슐 ID로 설정
2. `capsule.viewMode`가 존재하면 `viewModeStore.setMode` 호출
3. `capsule.pivotContext`가 존재하면 `viewStore.setContext` 호출
4. `capsule.pomodoroPreset`이 존재하면 `pomodoroStore`의 focus/break 설정 갱신
5. `lastActivatedAt`을 현재 ISO 시각으로 갱신 후 저장
6. `metrics.activationCount`를 1 증가

#### REQ-007: 활성 캡슐 기반 필터링

**[State-Driven]** **While** 활성 캡슐이 있고 "캡슐 필터 모드"(`filterByCapsule=true`)가 켜져 있는 동안, BookmarkList·TodoWidget·NotesWidget은 활성 캡슐의 `bookmarkIds` / `todoIds` / `noteIds`에 속한 항목만 표시**해야 한다**.

#### REQ-008: 캡슐 해제 (None 상태)

**[Event-Driven]** **When** 사용자가 "캡슐 해제"를 실행하면, `activeCapsuleId`는 null이 되고 모든 항목이 복원**되어야 한다** (기존 SPEC-UX-003 컨텍스트 유지).

### 캡슐 편집 UI

#### REQ-009: 캡슐 편집 모달

**[Ubiquitous]** 시스템은 **항상** 캡슐 편집 모달을 제공해야 한다. 모달에서 사용자는 이름·이모지·색상·설명·태그·포모도로 프리셋을 편집할 수 있다. 항목 추가/제거는 별도 컨텍스트 메뉴로 수행한다.

#### REQ-010: 북마크/Todo/메모 → 캡슐 추가 액션

**[Event-Driven]** **When** 사용자가 북마크·Todo·메모의 컨텍스트 메뉴(우클릭 또는 `…` 아이콘)에서 "캡슐에 추가"를 선택하면, 시스템은 캡슐 선택 서브메뉴를 표시**해야 한다**. 선택 시 해당 id가 캡슐의 해당 배열에 추가된다.

#### REQ-011: 빠른 "활성 캡슐에 추가"

**[Event-Driven]** **When** 활성 캡슐이 있는 상태에서 사용자가 북마크·Todo·메모를 생성하면, `capsule.autoAddToActive` 설정이 true일 때 시스템은 자동으로 해당 id를 활성 캡슐에 추가**해야 한다** (기본값 true, 설정에서 토글 가능).

### 전환 UI

#### REQ-012: CapsuleSwitcher UI

**[Ubiquitous]** 시스템은 **항상** 상단 바(Pivot/Widget 양쪽) 좌측에 현재 활성 캡슐을 표시하는 CapsuleSwitcher 드롭다운을 렌더링**해야 한다**. 드롭다운은 다음을 포함한다:
- 현재 활성 캡슐(이모지 + 이름, 없으면 "캡슐 없음")
- 최근 5개 캡슐 바로가기 (lastActivatedAt 내림차순)
- "모든 캡슐 보기…" (전체 목록 패널)
- "새 캡슐 만들기"
- "캡슐 해제" (활성 캡슐 있을 때만)

#### REQ-013: Command Palette 통합

**[Ubiquitous]** Command Palette(SPEC-UX-002)는 **항상** 다음 액션을 포함해야 한다:
- "캡슐: 활성화 <이름>" (캡슐 1개당 1항목)
- "캡슐: 새로 만들기"
- "캡슐: 편집" (활성 캡슐 있을 때만)
- "캡슐: 해제" (활성 캡슐 있을 때만)
- "캡슐: 보관(archive)" / "복원"

#### REQ-014: 키보드 단축키

**[Event-Driven]** **When** 사용자가 `Ctrl/Cmd + Shift + C`를 누르면, 시스템은 CapsuleSwitcher를 열**어야 한다**. **When** `Ctrl/Cmd + Shift + N`을 누르면, 새 캡슐 생성 모달을 열**어야 한다**.

### 캡슐 전체 목록 패널

#### REQ-015: 캡슐 목록 패널

**[Ubiquitous]** 시스템은 **항상** 전체 캡슐 목록 패널을 제공해야 한다. 각 행은 이모지·이름·항목 수(북마크 N개·Todo N개·메모 N개)·최근 활성 시각을 표시한다. 보관(archived) 캡슐은 별도 탭으로 분리한다.

#### REQ-016: 캡슐 검색 & 정렬

**[Event-Driven]** **When** 사용자가 목록 패널 상단 검색창에 문자를 입력하면, 시스템은 이름·설명·태그로 클라이언트 사이드 필터링**해야 한다**. 정렬 옵션: 최근 활성 / 이름 / 생성일.

### 데이터 일관성

#### REQ-017: 고아 참조 처리

**[Event-Driven]** **When** 북마크·Todo·메모가 삭제되면, 시스템은 해당 id를 참조하는 모든 캡슐의 해당 배열에서 id를 제거**해야 한다** (bookmarkStore/todoStore 삭제 액션에서 `capsuleStore.purgeOrphan` 호출).

#### REQ-018: 캡슐 삭제 동작

**[Event-Driven]** **When** 사용자가 캡슐을 영구 삭제하면, 시스템은 캡슐 엔티티만 제거하고 연결된 북마크·Todo·메모는 그대로 유지**해야 한다** (참조 해제만).

#### REQ-019: 활성 캡슐 삭제 시 해제

**[Event-Driven]** **When** 사용자가 현재 활성 캡슐을 삭제하면, 시스템은 `activeCapsuleId`를 null로 설정**해야 한다**.

### 메트릭

#### REQ-020: 캡슐별 사용 메트릭

**[Ubiquitous]** 시스템은 **항상** 캡슐별로 다음 메트릭을 누적 저장해야 한다:
- `focusMinutes` (캡슐 활성 중 완료된 포모도로 분 합계)
- `completedTodos` (캡슐 활성 중 완료된 Todo 수)
- `activationCount` (활성화 횟수)

`usageStore`와 연동 가능. 주간 리포트 UI는 이 SPEC 범위 외(SPEC-CAPSULE-002)로 분리한다.

## 비기능 요구사항

### NFR-001: 회귀 방지

기존 SPEC-AUTH-001 / SPEC-UX-003 / SPEC-UX-005 / SPEC-LAYOUT-001 / SPEC-WIDGET-* 테스트 100% 통과. `capsule.autoAddToActive` 기본 true이지만 활성 캡슐이 없으면 기존 동작과 동일.

### NFR-002: 성능

- 캡슐 수 0~100개 범위에서 CapsuleSwitcher 오픈 < 50ms
- 캡슐 활성화 → 화면 반영 < 200ms (필터 + 재렌더)
- 저장된 캡슐 메모리 풋프린트: 캡슐당 평균 < 2KB

### NFR-003: 스토리지 확장 안전성

기존 storage abstraction(`setUserStorage`, `getStorage`)를 재사용한다. 신규 스토리지 키:
- `capsules` (Map<string, Capsule> 직렬화 또는 Capsule[])
- `active-capsule-id` (string | null)
- `capsule-settings` ({ autoAddToActive: boolean, filterByCapsule: boolean })

### NFR-004: 테스트 커버리지

- capsuleStore unit: 모든 액션 분기 (생성/수정/삭제/활성화/해제/고아제거/메트릭)
- 활성화 복원 통합 테스트: viewModeStore + viewStore + pomodoroStore 연쇄 호출 검증
- CapsuleSwitcher 렌더 테스트: React Testing Library
- 전체 커버리지 85% 이상 유지

## 제약사항

- React 19, TypeScript strict, Zustand 5
- Electron renderer/web 양쪽 동작 (storage abstraction 통해)
- Firestore 문서 경로: `/users/{uid}/capsules/{capsuleId}`
- OKLCH 색상값은 CSS 변수 매핑 테이블을 통해서만 사용 (직접 하드코딩 금지)

## 데이터 스키마

```typescript
// src/renderer/types/capsule.ts (신규)
import type { SidebarContext } from '../stores/viewStore'
import type { ViewMode } from '../stores/viewModeStore'

export interface PomodoroPreset {
  focusMinutes: number
  breakMinutes: number
  longBreakMinutes: number
  cyclesBeforeLongBreak: number
}

export interface CapsuleMetrics {
  focusMinutes: number
  completedTodos: number
  activationCount: number
}

export interface Capsule {
  id: string
  name: string
  emoji?: string
  description?: string
  color?: string
  bookmarkIds: string[]
  todoIds: string[]
  noteIds: string[]
  tags: string[]
  pivotContext: SidebarContext | null
  viewMode: ViewMode | null
  pomodoroPreset: PomodoroPreset | null
  createdAt: string
  updatedAt: string
  lastActivatedAt: string | null
  archived: boolean
  metrics: CapsuleMetrics
}

// src/renderer/stores/capsuleStore.ts (신규)
export interface CapsuleState {
  capsules: Capsule[]
  activeCapsuleId: string | null
  autoAddToActive: boolean
  filterByCapsule: boolean
  loaded: boolean

  loadCapsules: () => Promise<void>
  createCapsule: (input: Partial<Capsule>) => Capsule
  updateCapsule: (id: string, patch: Partial<Capsule>) => void
  deleteCapsule: (id: string) => void
  archiveCapsule: (id: string, archived: boolean) => void
  activateCapsule: (id: string | null) => void  // null = 해제
  addBookmarkToCapsule: (capsuleId: string, bookmarkId: string) => void
  addTodoToCapsule: (capsuleId: string, todoId: string) => void
  addNoteToCapsule: (capsuleId: string, noteId: string) => void
  removeItemFromCapsule: (capsuleId: string, kind: 'bookmark' | 'todo' | 'note', itemId: string) => void
  purgeOrphan: (kind: 'bookmark' | 'todo' | 'note', itemId: string) => void
  incrementMetric: (capsuleId: string, key: keyof CapsuleMetrics, delta: number) => void

  toggleAutoAdd: () => void
  toggleFilterByCapsule: () => void
}
```

## 스토어 간 연동 다이어그램

```
capsuleStore.activateCapsule(id)
  ├── viewModeStore.setMode(capsule.viewMode)        [REQ-006.2]
  ├── viewStore.setContext(capsule.pivotContext)     [REQ-006.3]
  ├── pomodoroStore.applyPreset(capsule.pomodoroPreset) [REQ-006.4]
  └── updateCapsule(id, { lastActivatedAt: now, metrics.activationCount++ }) [REQ-006.5,6]

bookmarkStore.removeBookmark(id)
  └── capsuleStore.purgeOrphan('bookmark', id)       [REQ-017]

todoStore.addTodo(...)  [활성 캡슐 + autoAddToActive=true]
  └── capsuleStore.addTodoToCapsule(activeId, newTodoId) [REQ-011]

pomodoroStore (세션 완료)
  └── capsuleStore.incrementMetric(activeId, 'focusMinutes', minutes) [REQ-020]

todoStore (완료 체크)
  └── capsuleStore.incrementMetric(activeId, 'completedTodos', 1) [REQ-020]
```

## UI 구조

```
App.tsx
 ├── WidgetLayout / PivotLayout
 │    └── TopBar (확장)
 │         └── CapsuleSwitcher  ← 신규 컴포넌트
 ├── CapsuleEditModal          ← 신규 컴포넌트
 ├── CapsuleListPanel          ← 신규 컴포넌트 (모달 or 드로어)
 └── CommandPalette (캡슐 액션 추가)
```

### 신규 파일
- `src/renderer/types/capsule.ts`
- `src/renderer/stores/capsuleStore.ts` + `.test.ts` + `.integration.test.ts`
- `src/renderer/components/CapsuleSwitcher/CapsuleSwitcher.tsx` + `.test.tsx`
- `src/renderer/components/CapsuleEditModal/CapsuleEditModal.tsx` + `.test.tsx`
- `src/renderer/components/CapsuleListPanel/CapsuleListPanel.tsx` + `.test.tsx`
- `src/renderer/lib/capsuleMigration.ts` (로컬 → Firestore 마이그레이션 훅)

### 수정 파일
- `src/renderer/App.tsx` (스토어 로드 + 복원 연결)
- `src/renderer/components/CommandPalette/CommandPalette.tsx` (캡슐 액션)
- `src/renderer/components/BookmarkCard/*`, `TodoWidget/*`, `NotesWidget/*` (컨텍스트 메뉴 "캡슐에 추가")
- `src/renderer/stores/bookmarkStore.ts`, `todoStore.ts` (삭제 시 purgeOrphan 훅, 생성 시 auto-add 훅)
- `src/renderer/stores/pomodoroStore.ts` (세션 완료 시 incrementMetric 훅)
- `src/renderer/lib/migration.ts` (캡슐 데이터 포함)

## Exclusions (What NOT to Build)

- **Git 브랜치 자동 전환**: 별도 SPEC-GIT-001로 분리
- **Capsule 전체 검색(RAG)**: SPEC-SEARCH-RAG-001로 분리
- **Capsule 공유/협업**: 공유 캡슐은 장기 로드맵 (v1.0+)
- **Capsule 템플릿 마켓플레이스**: 범위 외
- **주간 회고 리포트 UI**: 메트릭만 누적, 리포트 UI는 SPEC-CAPSULE-002
- **브라우저 탭 복원**: 범위 외 (Electron custom URL scheme 필요, 후속)
- **Capsule 간 드래그앤드롭 이동**: 범위 외 (개별 컨텍스트 메뉴만)
- **중첩 캡슐(Nested)**: 평면 구조만 지원, 계층은 태그로 표현

## 설계 결정 사항 (확정됨 2026-04-19)

### DEC-001: autoAddToActive 기본값 = true

**결정**: `capsule.autoAddToActive`의 초기값을 `true`로 설정.

**근거**: 활성 캡슐이 없으면 동작하지 않으므로 기존 UX에 영향 없음. 활성 캡슐 사용 시 자동 포함이 사용자 의도에 가장 부합.

**완화 조치**: 첫 캡슐 활성화 시 1회성 툴팁 표시 ("새로 추가하는 항목이 자동으로 이 캡슐에 포함됩니다. 설정에서 끌 수 있어요."). 설정은 CapsuleSwitcher 드롭다운 하단 토글로 상시 접근 가능.

### DEC-002: OKLCH 자동 lightness 보정

**결정**: 캡슐 색상은 OKLCH 색 공간에 저장하되, 테마에 따라 lightness를 자동 조정하여 렌더링.

**구현**:
- 사용자가 입력한 색상은 OKLCH 원본(`oklch(0.7 0.15 270)`)으로 저장
- 렌더링 시 테마별 lightness 클램핑:
  - 다크 테마: `L` 범위 `[0.55, 0.80]`로 클램프 (배경 #0f1117 대비 WCAG AA 보장)
  - 라이트 테마: `L` 범위 `[0.30, 0.60]`로 클램프
- Chroma와 Hue는 보존하여 "같은 색 계열"이라는 인지 유지
- 헬퍼: `src/renderer/lib/colorAdjust.ts` (`adjustLightnessForTheme(oklch, theme)`)

**근거**: 사용자가 한 번 설정한 색을 두 테마에서 각각 맞추지 않아도 되고, 가독성을 강제 보장.

### DEC-003: Firestore 스키마 — 배열 필드 + 단일 문서 (MVP)

**결정**: `bookmarkIds`, `todoIds`, `noteIds`를 `Capsule` 문서의 배열 필드로 저장.

**경로**: `/users/{uid}/capsules/{capsuleId}` (1 문서 = 1 캡슐 전체)

**근거**:
- Firestore 문서 제한 1MB ≈ 10만 개 UUID 수용 가능. 일반 사용자 캡슐은 <100 아이템
- 배열 쓰기는 원자적 — 동시성 관리 단순
- 서브컬렉션은 쿼리·쓰기 횟수 증가(비용·지연) + SDK 복잡도 상승
- MVP 단계에서는 단순함이 우선

**한계 & 완화**:
- `bookmarkIds.length > 500` 도달 시 UI 경고 토스트 표시 (EC-004)
- `> 1000` 시 저장 거부 + "캡슐 분할 또는 대용량 캡슐은 차기 버전에서 지원" 안내
- 향후 실사용자 중 대용량 패턴 발견 시 SPEC-CAPSULE-003에서 서브컬렉션으로 마이그레이션

### DEC-004: 웹 빌드 CapsuleSwitcher 반응형 — CSS 미디어 쿼리 기반 전환

**결정**: 640px breakpoint에서 UI 형태 자동 전환.

**구현**:
- `@media (min-width: 641px)` — 기존 드롭다운 (absolute position, 상단 바 좌측 앵커)
- `@media (max-width: 640px)` — Bottom Sheet (position: fixed, bottom 0, 100vw, slide-up 애니메이션 200ms)
- 동일 React 컴포넌트 + 조건부 클래스(`data-mode="dropdown" | "sheet"`)
- JavaScript 뷰포트 감지 없음 — CSS만으로 전환 (성능·접근성 우수)

**근거**:
- Electron 데스크톱 빌드는 사실상 항상 데스크톱 폭 → 드롭다운 경로
- 웹 빌드는 태블릿/모바일까지 커버해야 함 → Sheet가 터치 친화적
- Media query 기반은 회전·리사이즈에도 즉시 대응
- 컴포넌트 로직 1개로 두 UI 모두 만족 — 유지보수 단순
