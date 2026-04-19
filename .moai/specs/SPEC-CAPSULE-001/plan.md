# Implementation Plan — SPEC-CAPSULE-001

## 개발 방법론

**TDD (RED-GREEN-REFACTOR)** — 신규 greenfield 도메인이므로 테스트 우선 접근.

## 구현 단계 (Phase)

총 6개 Phase, 각 Phase는 RED-GREEN-REFACTOR 1~3 사이클로 진행.

### Phase 1: 도메인 모델 & 스토어 기반

**목표**: Capsule 엔티티 + capsuleStore 기본 CRUD 완성

**RED** — 실패 테스트 작성
- `capsuleStore.test.ts`:
  - `createCapsule` 호출 시 id/createdAt/updatedAt/metrics 자동 설정
  - `updateCapsule` patch 병합 + updatedAt 갱신
  - `deleteCapsule` → capsules 배열에서 제거
  - `archiveCapsule(id, true)` → archived 플래그 갱신

**GREEN** — 최소 구현
- `src/renderer/types/capsule.ts`: 타입 정의
- `src/renderer/stores/capsuleStore.ts`: Zustand 스토어 기본 액션
- 저장소 연동 없이 메모리 상태만

**REFACTOR**
- uid 생성 헬퍼 추출 (기존 `App.tsx` uid 패턴 재사용)
- 불변성 보장: spread 대신 structured clone 또는 immer 패턴

**검증**: AC-001, AC-002

---

### Phase 2: 영속화 & 로드

**목표**: storage abstraction 연동 + 앱 시작 복원

**RED**
- `capsuleStore.test.ts`:
  - `loadCapsules` → mock storage → state 복원
  - create/update/delete 시 storage.set 호출 검증 (mock)
  - `active-capsule-id` 별도 저장/로드 검증

**GREEN**
- `getStorage()` 사용해 `capsules`, `active-capsule-id`, `capsule-settings` 키 저장
- `App.tsx`에 `loadCapsules()` 추가 (다른 load* 호출과 병렬)
- `loaded: boolean` 가드 추가

**REFACTOR**
- 저장 debounce (100ms) 도입 — 연속 업데이트 시 IO 최적화
- 마이그레이션 훅 `capsuleMigration.ts` 생성 (Firestore 업로드)
- `migration.ts`에 캡슐 포함

**검증**: AC-003, AC-004, AC-005, AC-006

---

### Phase 3: 활성화 & 복원 체인

**목표**: activateCapsule의 스토어 연쇄 호출 (viewMode + viewStore + pomodoro)

**RED**
- `capsuleStore.integration.test.ts`:
  - 활성화 시 viewModeStore.setMode 호출 검증
  - 활성화 시 viewStore.setContext 호출 검증
  - 활성화 시 pomodoroStore 값 갱신 검증
  - `activateCapsule(null)` → 모든 것 해제 검증
  - activationCount 증가 + lastActivatedAt 갱신 검증

**GREEN**
- `activateCapsule` 내부에서 다른 스토어의 `getState()`를 통해 직접 호출
  (순환 의존 방지: capsuleStore는 다른 스토어를 import하지만 역은 아님)
- `pomodoroStore.applyPreset` 메서드 추가 (없으면 신규)

**REFACTOR**
- 스토어 간 결합을 줄이기 위해 `capsuleRestoreService.ts` 추출 검토
- 스토어에서 직접 호출 대신 서비스 함수 호출

**검증**: AC-007 ~ AC-012, T-003

---

### Phase 4: 필터링 & 고아 처리 & 자동 추가

**목표**: 데이터 일관성 유지 + 자동 추가 로직

**RED**
- `capsuleStore.test.ts`:
  - `purgeOrphan('bookmark', 'bm-1')` → 모든 캡슐 배열에서 제거
  - `addBookmarkToCapsule` 중복 시 무시
  - 활성 캡슐 삭제 시 activeCapsuleId 자동 null
- `bookmarkStore.test.ts` (추가):
  - removeBookmark 호출 시 capsuleStore.purgeOrphan 호출 검증
  - addBookmark + autoAddToActive=true → capsuleStore.addBookmarkToCapsule 호출

**GREEN**
- `bookmarkStore.removeBookmark`, `todoStore.removeTodo`에 purgeOrphan 훅 삽입
- `bookmarkStore.addBookmark`, `todoStore.addTodo`에 auto-add 훅 삽입
- 설정 상태: `autoAddToActive`, `filterByCapsule` 토글
- `pomodoroStore` 세션 완료 시 `incrementMetric` 호출

**REFACTOR**
- 훅 로직을 스토어 외부 이벤트 리스너 패턴으로 분리 고려 (순환 방지)
- Node 없이도 테스트 가능하도록 스토어 간 의존성 mock화

**검증**: AC-013, AC-017 ~ AC-020, AC-029 ~ AC-035

---

### Phase 5: UI 컴포넌트

**목표**: CapsuleSwitcher + CapsuleEditModal + CapsuleListPanel 구현

**RED**
- `CapsuleSwitcher.test.tsx`:
  - 활성 캡슐 없을 때 "캡슐 없음" 표시
  - 활성 캡슐 있을 때 이모지 + 이름 표시
  - 드롭다운 열림 시 최근 5개 캡슐 렌더
  - `Ctrl+Shift+C` 단축키 트리거 검증
- `CapsuleEditModal.test.tsx`:
  - 빈 이름 저장 시 에러
  - 60자 초과 입력 방지
  - 이모지 피커 상호작용
- `CapsuleListPanel.test.tsx`:
  - 검색 필터링
  - 정렬 옵션
  - 보관 탭 분리

**GREEN**
- 세 컴포넌트 구현 (기존 EditModal/CommandPalette 패턴 참고)
- `App.tsx`에 CapsuleSwitcher, CapsuleEditModal, CapsuleListPanel 마운트
- Widget/Pivot 양쪽 TopBar에 Switcher 통합
- 테마 토큰 사용 (darkTheme / lightTheme에서 `--capsule-*` 변수 추가)

**REFACTOR**
- 드롭다운 UI를 EditModal의 포털 패턴과 일치시키기
- react-window 검토 (100개 넘어가면)

**검증**: AC-014 ~ AC-016, AC-020 ~ AC-028, T-001

---

### Phase 6: 통합 & 단축키 & Command Palette

**목표**: 최종 통합, 키보드 UX, 성능 측정

**RED**
- E2E 시나리오 T-001, T-004 자동화 (Vitest + RTL)
- Command Palette 캡슐 액션 렌더 테스트
- 단축키 테스트 (input focus 중 동작 안 함 포함)

**GREEN**
- `useCommandPalette` hook에 캡슐 액션 5개 주입
- 전역 단축키 핸들러 확장 (`useCommandPalette` 또는 별도 hook)
- BookmarkCard/TodoWidget/NotesWidget에 "캡슐에 추가" 컨텍스트 메뉴 추가

**REFACTOR**
- Command Palette 액션을 동적 주입 패턴으로 리팩토링 (기존 하드코딩 → provider 패턴)
- 단축키 레지스트리 통일

**검증**: AC-022 ~ AC-024, AC-036 ~ AC-040, T-001 ~ T-006

---

## MX 태그 계획

### 신규 파일 태그

- `src/renderer/types/capsule.ts`:
  - `@MX:NOTE: Capsule 엔티티 — SPEC-CAPSULE-001 중심 도메인 모델`
  - `@MX:SPEC: SPEC-CAPSULE-001`

- `src/renderer/stores/capsuleStore.ts`:
  - `@MX:ANCHOR: capsuleStore — Context Capsule 상태 관리 중심 진입점`
  - `@MX:REASON: App.tsx, CapsuleSwitcher, CapsuleEditModal, CapsuleListPanel, bookmarkStore, todoStore 다수 의존 (fan_in >= 3)`
  - `@MX:SPEC: SPEC-CAPSULE-001`

- `activateCapsule` 함수:
  - `@MX:WARN: 다중 스토어 연쇄 호출 — 순서 변경 시 복원 동작 깨짐`
  - `@MX:REASON: REQ-006 순서 보장 필요 (viewMode → pivotContext → pomodoro → metrics)`

### 수정 파일 태그

- `bookmarkStore.ts`, `todoStore.ts`: remove/add 호출부에
  - `@MX:NOTE: [AUTO] capsuleStore.purgeOrphan 훅 — SPEC-CAPSULE-001 REQ-017`

## 파일 변경 범위 추정

### 신규 (13개)
1. `src/renderer/types/capsule.ts`
2. `src/renderer/stores/capsuleStore.ts`
3. `src/renderer/stores/capsuleStore.test.ts`
4. `src/renderer/stores/capsuleStore.integration.test.ts`
5. `src/renderer/components/CapsuleSwitcher/CapsuleSwitcher.tsx`
6. `src/renderer/components/CapsuleSwitcher/CapsuleSwitcher.test.tsx`
7. `src/renderer/components/CapsuleSwitcher/CapsuleSwitcher.module.css` (반응형 미디어 쿼리)
8. `src/renderer/components/CapsuleEditModal/CapsuleEditModal.tsx`
9. `src/renderer/components/CapsuleEditModal/CapsuleEditModal.test.tsx`
10. `src/renderer/components/CapsuleListPanel/CapsuleListPanel.tsx`
11. `src/renderer/components/CapsuleListPanel/CapsuleListPanel.test.tsx`
12. `src/renderer/lib/capsuleMigration.ts`
13. `src/renderer/lib/colorAdjust.ts` (OKLCH lightness 자동 보정) + `.test.ts`

### 수정 (8개)
1. `src/renderer/App.tsx`
2. `src/renderer/components/CommandPalette/CommandPalette.tsx`
3. `src/renderer/components/BookmarkCard/BookmarkCard.tsx`
4. `src/renderer/components/TodoWidget/TodoWidget.tsx`
5. `src/renderer/components/NotesWidget/NotesWidget.tsx`
6. `src/renderer/stores/bookmarkStore.ts`
7. `src/renderer/stores/todoStore.ts`
8. `src/renderer/stores/pomodoroStore.ts`
9. `src/renderer/lib/migration.ts`
10. `src/renderer/styles/themes.ts` (캡슐 색상 토큰)
11. `README.md` (v0.7.0 현황)

## 리스크 & 완화 방안

| 리스크 | 심각도 | 완화 |
|--------|--------|------|
| 스토어 순환 의존 | High | `capsuleRestoreService.ts`로 복원 로직 격리, 단방향 호출만 허용 |
| Firestore 문서 크기 | Medium | AC-036 성능 테스트 통과 못 하면 서브컬렉션 전환 (후속) |
| 자동 추가 UX 혼란 | Medium | 첫 활성화 시 툴팁 + 설정에서 명확히 토글 제공 |
| 테마 색상 대비 | Low | OKLCH lightness 클램핑 유틸 추가 |
| 기존 테스트 회귀 | High | 각 Phase 완료 시 `npm test` 전체 실행 의무화 |

## 구현 순서 근거

1. **Model first**: 타입 없이는 다른 스토어가 참조 불가
2. **Persistence next**: 로드/저장이 되어야 다음 Phase 테스트 가능
3. **Activation chain**: 스토어 간 통합의 핵심, UI 전에 검증 필수
4. **Consistency hooks**: 데이터 무결성 — UI 노출 전에 확보
5. **UI after data**: 모든 백엔드 로직이 안정된 후 UI
6. **Integration last**: Command Palette + 단축키 + E2E

## Run Phase 착수 전 확인 사항

- [x] SPEC-CAPSULE-001/spec.md 사용자 리뷰 완료
- [x] acceptance.md 40개 AC 모두 구현 가능 여부 검토
- [x] 설계 결정 4가지 확정 (2026-04-19)
  - [x] DEC-001: `autoAddToActive` 기본값 = true + 툴팁 안내
  - [x] DEC-002: OKLCH lightness 자동 보정 (`colorAdjust.ts`)
  - [x] DEC-003: Firestore 배열 필드 단일 문서 (>500 경고, >1000 거부)
  - [x] DEC-004: CSS 미디어 쿼리 640px 반응형 (데스크톱=드롭다운, 모바일=Sheet)
- [x] `/moai run SPEC-CAPSULE-001` 실행 준비 (완료)

## Run Phase 결과 (2026-04-19)

### 구현 완료 현황

- **테스트**: 618개 → 729개 (+111)
  - Phase 1 (도메인 모델 & 스토어): capsuleStore.test.ts 32개
  - Phase 2 (영속화 & 로드): capsuleStore.integration.test.ts 24개
  - Phase 3~6: 컴포넌트 테스트, E2E 통합 테스트
- **새 파일**: 13개 (types, stores, components, lib helpers)
- **수정 파일**: 10개 (App, Command Palette, Widgets, Stores, Migration, Themes)
- **TypeScript**: 0 오류 (strict mode)
- **ESLint**: 0 오류 (flat config)
- **코드 커버리지**: 85% 이상

### AC 커버리지

- AC-001 ~ AC-040: 모두 구현 및 테스트 통과
- 테스트 시나리오 T-001 ~ T-006: 자동화 완료
- 엣지 케이스 EC-001 ~ EC-006: 처리 확인

### 설계 결정 적용

- DEC-001: autoAddToActive 기본 true + 첫 활성화 시 툴팁
- DEC-002: OKLCH lightness 자동 보정 (colorAdjust.ts 구현)
- DEC-003: Firestore 배열 필드 단일 문서 (MVP)
- DEC-004: CSS 미디어 쿼리 640px 반응형 전환

### 미구현 범위 (후속 SPEC)

- SPEC-CAPSULE-001.1: 아이템별 "캡슐에 추가" 컨텍스트 메뉴 대량 액션
- SPEC-CAPSULE-002: 주간 회고 리포트 UI
- SPEC-GIT-001: Git 브랜치 자동 전환
- SPEC-SEARCH-RAG-001: Capsule 전체 검색

## 작업 로그

### 2026-04-19 (Plan 작성)
- spec.md 초안 완성 (20 REQ + 4 NFR)
- acceptance.md 완성 (40 AC + 6 E2E 시나리오 + 6 엣지 케이스)
- plan.md 완성 (6 Phase + MX 계획 + 리스크)

### 2026-04-19 (Run Phase 완료)
- 6개 Phase TDD 구현 완료 (729개 테스트 통과)
- SPEC-CAPSULE-001 전체 AC 통과
- v0.7.0 릴리스 준비 완료
