# SPEC-UX-005: 인수 조건

## 시나리오

### AC-001: 신규 사용자 기본값

**Given** viewMode 데이터가 없는 신규 사용자
**When** 앱이 시작되면
**Then** Pivot 모드로 진입해야 한다 (PivotLayout 렌더)

### AC-002: 토글로 위젯 모드 전환

**Given** Pivot 모드 진입 상태에서
**When** 사용자가 사이드바 "위젯 모드" 버튼 클릭
**Then** 화면이 즉시 WidgetLayout(드래그 그리드)으로 전환되어야 한다
**And** viewMode 값이 storage에 'widgets'로 저장되어야 한다

### AC-003: 위젯 → Pivot 전환

**Given** 위젯 모드 진입 상태에서
**When** TopBar의 "Pivot 모드" 버튼 클릭
**Then** 화면이 PivotLayout으로 전환되어야 한다
**And** storage에 'pivot' 저장

### AC-004: 새로고침 후 viewMode 복원

**Given** 사용자가 위젯 모드로 전환 후 페이지 새로고침
**When** 앱이 다시 로드되면
**Then** 위젯 모드가 복원되어야 한다 (Pivot으로 깜빡임 없음)

### AC-005: 컨텍스트 보존

**Given** Pivot 모드에서 "AI 도구" 카테고리 선택 후 위젯 모드 전환
**When** 사용자가 다시 Pivot 모드로 돌아옴
**Then** 사이드바에 "AI 도구"가 다시 활성 상태이어야 한다 (viewStore 상태 유지)

### AC-006: Command Palette에서 모드 전환

**Given** Pivot 모드에서 Cmd+K
**When** ">위젯" 입력 후 Enter
**Then** 위젯 모드로 전환되어야 한다
**And** Action 텍스트가 Pivot 모드에서는 "위젯 모드로 전환", 위젯 모드에서는 "Pivot 모드로 전환"으로 동적이어야 한다

### AC-007: 첫 진입 안내 토스트

**Given** 기존 위젯 모드 사용자(layoutStore에 데이터 있음)가 업데이트 후 첫 진입
**When** 자동으로 Pivot 모드 진입
**Then** "새로운 Pivot 레이아웃입니다..." 토스트 5초 표시
**And** 같은 사용자가 다시 진입 시 토스트 표시 안 함 (firstPivotIntroSeen flag)

### AC-008: 신규 사용자는 안내 미표시

**Given** layoutStore에 저장 데이터 없는 신규 사용자
**When** Pivot 모드 진입
**Then** 안내 토스트가 표시되지 않아야 한다 (필요 없음)

### AC-009: 위젯 모드 회귀 0

**Given** 위젯 모드로 전환한 사용자
**When** 기존 SPEC-LAYOUT-001/SPEC-UI-001 시나리오 (드래그, 리사이즈, 레이아웃 초기화 등)를 수행
**Then** 기존과 100% 동일하게 동작해야 한다

### AC-010: PivotLayout unmount 시 정리

**Given** Pivot 모드에서 위젯 모드로 전환
**When** PivotLayout unmount
**Then** viewStore subscribe 해제, 키보드 이벤트 리스너 해제 (메모리 leak 0)

### AC-011: 로딩 중 깜빡임 방지

**Given** 앱이 시작되어 viewMode 로드 중
**When** 로드 완료 전
**Then** 로딩 인디케이터 표시 (Pivot/Widget 어느 것도 깜빡 표시 안 됨)

## 엣지 케이스

### EDGE-001: storage에 잘못된 값

**Given** view-mode 키에 "invalid_string" 저장됨
**When** loadMode 실행
**Then** 기본값 'pivot'으로 복구

### EDGE-002: 모드 전환 중 다른 액션

**Given** 위젯 → Pivot 전환 중 사용자가 빠르게 다시 클릭
**When** 연속 토글
**Then** 마지막 클릭 결과가 정상 적용 (race condition 없음)

### EDGE-003: Firestore 동기화 실패

**Given** 인증 사용자가 모드 변경 시 Firestore 쓰기 실패
**When** 변경 시도
**Then** 로컬 상태는 변경되고, 다음 성공 시 동기화 (네트워크 회복 시)

## 품질 게이트

- [ ] TypeScript strict 통과
- [ ] ESLint 0
- [ ] viewModeStore 커버리지 85% 이상
- [ ] 기존 App.test, layoutStore.test 100% 통과
- [ ] WidgetLayout 추출 후 위젯 모드 시각/동작 회귀 0
- [ ] 모드 전환 < 50ms (체감 즉시)

## Definition of Done

- [ ] REQ-001 ~ REQ-011 구현
- [ ] AC-001 ~ AC-011 통과
- [ ] EDGE-001 ~ EDGE-003 처리
- [ ] App.tsx 분기 단순/명료
- [ ] WidgetLayout 컴포넌트 분리 완료
- [ ] Pivot UX 전환 4-SPEC 시리즈 통합 동작 검증
