# Acceptance Criteria — SPEC-CAPSULE-001

## 수락 기준(AC) 체크리스트

### A. 엔티티 & 저장

- **AC-001**: 새 캡슐 생성 시 id·createdAt·updatedAt·metrics가 자동 설정되고, 모든 배열 필드는 빈 배열(`[]`)로 초기화된다.
- **AC-002**: 캡슐 수정 시 `updatedAt`이 ISO 현재 시각으로 갱신된다.
- **AC-003**: 미인증 상태: `electron-store`의 `capsules` 키에 저장 + `active-capsule-id` 별도 저장.
- **AC-004**: 인증 상태: Firestore `/users/{uid}/capsules/{id}` 경로에 문서 upsert.
- **AC-005**: 앱 재시작 후 `loadCapsules`가 완료되면 `capsules`·`activeCapsuleId`·`autoAddToActive`·`filterByCapsule`이 이전 세션 값으로 복원된다.
- **AC-006**: 미로그인 → 로그인 전환 시 로컬 캡슐이 Firestore에 업로드되고, 로컬 복제본은 유지된다 (migration 멱등성).

### B. 활성화 & 복원

- **AC-007**: `activateCapsule(id)` 호출 시 `activeCapsuleId = id` 즉시 반영.
- **AC-008**: 활성화 시 `capsule.viewMode === 'pivot'`이면 `viewModeStore.mode`가 `'pivot'`으로 변경된다.
- **AC-009**: 활성화 시 `capsule.pivotContext = { kind: 'tag', tag: 'react' }`라면 `viewStore.context`가 동일 값으로 설정된다.
- **AC-010**: 활성화 시 `capsule.pomodoroPreset`이 존재하면 `pomodoroStore`의 focus/break 값이 프리셋으로 갱신된다.
- **AC-011**: 활성화 시 `lastActivatedAt`이 갱신되고 `metrics.activationCount`가 1 증가하며 저장소에 persist된다.
- **AC-012**: `activateCapsule(null)` 호출 시 `activeCapsuleId = null`이 되고, viewModeStore/viewStore는 이전 값 유지 (리셋 아님).
- **AC-013**: `filterByCapsule=true`이고 활성 캡슐이 있을 때 BookmarkList는 `bookmarkIds`에 없는 북마크를 렌더하지 않는다 (DOM 검증).

### C. 편집 UI

- **AC-014**: CapsuleEditModal 열림 상태에서 이름 `''`(빈 문자열) 저장 시 "이름은 필수" 에러 표시, 저장되지 않음.
- **AC-015**: 이름 > 60자, 설명 > 200자 입력 시 저장 버튼 비활성화 + 문자수 표시.
- **AC-016**: 이모지 피커에서 선택 시 미리보기에 즉시 반영.
- **AC-017**: 컨텍스트 메뉴 "캡슐에 추가" → 서브메뉴에서 캡슐 선택 → 해당 id가 `bookmarkIds`에 append되고 중복 시 무시.
- **AC-018**: `autoAddToActive=true` + 활성 캡슐 존재 상태에서 신규 북마크/Todo/메모 추가 → 활성 캡슐의 해당 배열에 자동 포함.
- **AC-019**: `autoAddToActive=false`로 토글 후 신규 북마크 추가 → 활성 캡슐에 자동 추가되지 않음.

### D. 전환 UI

- **AC-020**: CapsuleSwitcher 클릭 시 드롭다운이 열리고 최근 5개 캡슐이 `lastActivatedAt DESC` 정렬로 표시된다.
- **AC-021**: 활성 캡슐이 없을 때 Switcher 트리거 라벨은 "캡슐 없음"이며, "캡슐 해제" 항목은 숨김 처리.
- **AC-022**: `Ctrl/Cmd + Shift + C` 입력 시 CapsuleSwitcher가 열린다 (단, 입력 필드 포커스 중에는 동작 안 함).
- **AC-023**: `Ctrl/Cmd + Shift + N` 입력 시 빈 CapsuleEditModal이 열린다.
- **AC-024**: Command Palette에서 "캡슐:" 접두사로 검색 시 5개 이상의 캡슐 관련 액션이 필터링되어 보인다.

### E. 목록 패널

- **AC-025**: CapsuleListPanel에서 각 행은 "📦 이름 · 🔖N · ✅N · 📝N · 최근 활성: YYYY-MM-DD HH:mm" 포맷으로 표시.
- **AC-026**: "보관" 탭에는 `archived=true` 캡슐만 표시되고, 기본 탭에서는 제외된다.
- **AC-027**: 검색창에 "auth" 입력 시 이름/설명/태그에 "auth"를 포함하는 캡슐만 남는다 (대소문자 무시).
- **AC-028**: 정렬을 "이름"으로 변경 시 한글 자모 순(locale-aware) + 영문 알파벳 순으로 정렬.

### F. 데이터 일관성

- **AC-029**: 북마크 `bm-1`을 삭제하면 `bm-1`을 참조하던 모든 캡슐의 `bookmarkIds`에서 해당 id가 제거된다.
- **AC-030**: Todo `td-1` 삭제 동일하게 동작 (캡슐 `todoIds` 정리).
- **AC-031**: 캡슐 삭제 시 해당 캡슐에 참조된 북마크/Todo/메모는 bookmarkStore/todoStore에 그대로 남아 있다.
- **AC-032**: 활성 캡슐을 삭제하면 `activeCapsuleId`가 null로 바뀌고 UI는 "캡슐 없음" 상태로 전환된다.

### G. 메트릭

- **AC-033**: 활성 캡슐 상태에서 포모도로 focus 세션을 25분 완료하면 `metrics.focusMinutes`가 25 증가한다.
- **AC-034**: 활성 캡슐 상태에서 Todo를 완료 체크하면 `metrics.completedTodos`가 1 증가한다.
- **AC-035**: 캡슐이 비활성(None) 상태일 때 포모도로/Todo 완료는 어떤 캡슐 메트릭에도 영향 없다.

### H. 성능 & 비기능

- **AC-036**: 캡슐 100개 보유 시 CapsuleSwitcher 오픈 ~ 첫 페인트가 50ms 이하 (React Profiler 측정).
- **AC-037**: 캡슐 활성화 버튼 클릭 ~ 화면 필터 반영이 200ms 이하.
- **AC-038**: 기존 SPEC 테스트 전체 통과 (npm test 100% pass).
- **AC-039**: TypeScript strict 모드 0 오류, ESLint 0 오류 유지.
- **AC-040**: 신규 추가 코드 커버리지 85% 이상.

## 테스트 시나리오

### T-001: 캡슐 생성 → 활성화 → 자동 추가 → 해제 (E2E)

1. 앱 시작, 로그인 상태
2. `Ctrl+Shift+N` → 이름 "auth-refactor", 이모지 🔐, 태그 ["react","firebase"] 입력 → 저장
3. CapsuleSwitcher에 "🔐 auth-refactor" 표시 확인
4. 활성화 버튼 클릭 → 활성 상태 전환
5. 새 북마크 추가 "https://react.dev"
6. 캡슐 편집 모달 열어 `bookmarkIds`에 방금 북마크 포함 확인
7. Command Palette에서 "캡슐: 해제" 실행 → 활성 상태 해제
8. 새 북마크 추가 "https://firebase.google.com" → 어떤 캡슐에도 자동 추가되지 않음

### T-002: 북마크 삭제 시 고아 참조 정리

1. 캡슐 2개 생성 (`cap-A`, `cap-B`), 동일 북마크 `bm-1`을 양쪽에 추가
2. 북마크 `bm-1` 삭제
3. `cap-A.bookmarkIds`, `cap-B.bookmarkIds`에서 `bm-1` 제거 확인
4. 캡슐 자체는 유지, 다른 북마크 참조는 영향 없음

### T-003: 복원 체인 통합 테스트

1. 캡슐 생성: `pivotContext = { kind: 'tag', tag: 'rust' }`, `viewMode = 'pivot'`, `pomodoroPreset = { focusMinutes: 50, breakMinutes: 10 }`
2. 캡슐 활성화
3. `viewModeStore.mode === 'pivot'` 검증
4. `viewStore.context === { kind: 'tag', tag: 'rust' }` 검증
5. `pomodoroStore.focusMinutes === 50` 검증
6. `metrics.activationCount === 1`, `lastActivatedAt` 갱신 검증

### T-004: 로그인 전환 마이그레이션

1. 미로그인 상태에서 캡슐 3개 생성
2. 로그인 수행
3. Firestore `/users/{uid}/capsules/` 컬렉션에 3개 문서 존재 확인
4. 재로그인(세션 재시작) 후에도 동일하게 로드됨 확인

### T-005: 동시 편집 충돌 방지

1. 캡슐 1개 열어 CapsuleEditModal 수정 중
2. 다른 탭에서 동일 캡슐 삭제
3. 저장 시도 시 "존재하지 않는 캡슐" 에러 표시 + 모달 안전하게 닫힘

### T-006: 성능 테스트

1. 테스트 데이터로 캡슐 100개 생성 (각 북마크 50개 참조)
2. React Profiler로 CapsuleSwitcher 첫 렌더 < 50ms 확인
3. 활성화 버튼 클릭 후 BookmarkList 재렌더 완료까지 < 200ms 확인

## 엣지 케이스

- **EC-001**: 캡슐의 `pivotContext`가 존재하지 않는 categoryId를 참조 → 조용히 무시하고 `{ kind: 'all' }`로 fallback (로그만 남김)
- **EC-002**: 캡슐 이름 중복 허용 (id가 다르면 OK), UI에서만 "중복 이름 주의" 경고 표시
- **EC-003**: Firestore 오프라인 상태에서 캡슐 생성 → electron-store에 먼저 저장 후 온라인 복귀 시 동기화
- **EC-004**: 매우 큰 캡슐(bookmarkIds.length > 1000) → 경고 토스트: "캡슐이 너무 큽니다. 분할을 권장합니다"
- **EC-005**: 이모지 입력 빈 문자열 → 기본값 📦 자동 적용
- **EC-006**: 테마 전환(다크↔라이트) 시 캡슐 색상이 가독성을 유지하는지 OKLCH lightness 자동 보정

## 완료 정의 (Definition of Done)

- [ ] 모든 AC-001 ~ AC-040 통과
- [ ] 테스트 시나리오 T-001 ~ T-006 자동화 (Vitest + React Testing Library)
- [ ] TypeScript strict 0 오류 / ESLint 0 오류
- [ ] 신규 코드 커버리지 85% 이상
- [ ] 기존 테스트 회귀 없음 (npm test 100%)
- [ ] SPEC-CAPSULE-001 문서 모든 REQ가 구현 코드에 `@MX:SPEC: SPEC-CAPSULE-001` 태그로 추적 가능
- [ ] README.md 개발 현황 섹션에 v0.7.0 마일스톤 추가
