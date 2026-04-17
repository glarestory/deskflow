# SPEC-UX-005: 구현 계획

## 기술 접근 방식

신규 `viewModeStore` (themeStore 패턴 복제) + `App.tsx` 최상위 분기 추가.
기존 위젯 그리드 코드는 `WidgetLayout` 컴포넌트로 추출 (App.tsx에서 분리).
PivotLayout은 SPEC-UX-003에서 작성. 두 컴포넌트 모두 themeStore/authStore 등 공통 스토어 사용.

## 마일스톤

### M1: viewModeStore (Priority High)

- **T-001**: viewModeStore 생성
  - `src/renderer/stores/viewModeStore.ts`: Zustand
  - 패턴: themeStore 복제 (loaded, loadMode, setMode, toggleMode)
  - storage 키: `view-mode`
  - 테스트: `viewModeStore.test.ts`

- **T-002**: 마이그레이션 안내 헬퍼
  - `src/renderer/lib/firstPivotIntroSeen.ts`: localStorage flag
  - 첫 1회만 토스트 표시 후 flag 저장

### M2: App.tsx 리팩터링 (Priority High)

- **T-003**: WidgetLayout 컴포넌트 추출
  - `src/renderer/components/WidgetLayout/WidgetLayout.tsx`
  - 기존 App.tsx의 ResponsiveGridLayout + 위젯 슬롯 코드 그대로 이동
  - props: 필요한 핸들러 (handleAddCategory, exportBookmarks 등)

- **T-004**: App.tsx 분기 적용
  - viewMode 로드 → 'pivot' or 'widgets' 분기
  - PivotLayout / WidgetLayout 둘 다 import
  - 모달, Command Palette 등 공통 UI는 분기 외부에서 렌더

### M3: 토글 UI (Priority Medium)

- **T-005**: WidgetLayout TopBar에 모드 토글 추가
  - 기존 TopBar 버튼 그룹에 "Pivot 모드" 버튼 1개 추가
  - 클릭 → toggleMode

- **T-006**: PivotLayout Sidebar에 모드 토글
  - SidebarSettings 섹션에 "위젯 모드로 전환" 버튼

### M4: Command Palette 통합 (Priority Medium)

- **T-007**: Action 추가
  - SPEC-UX-002 actions 목록에 "Pivot/Widget 모드 전환" 추가
  - 현재 모드에 따라 텍스트 동적

### M5: 첫 진입 안내 (Priority Low)

- **T-008**: 안내 토스트
  - PivotLayout mount 시 firstPivotIntroSeen 체크
  - 미본 사용자에게 5초 토스트 표시
  - 기존 사용자 (layoutStore에 데이터 있음)에게만 표시

### M6: 검증 (Priority High)

- **T-009**: 회귀 테스트
  - 기존 App.test.tsx, layoutStore.test.ts 100% 통과 보장
  - WidgetLayout이 기존 동작 그대로인지 검증

- **T-010**: 통합 시나리오
  - viewModeStore.test.ts (load/save/toggle)
  - App.test에 viewMode 분기 케이스 추가

## 리스크

| 리스크 | 영향 | 완화 전략 |
|--------|------|-----------|
| App.tsx 추출 중 기존 동작 회귀 | 위젯 모드 깨짐 | 추출 전 App.test.tsx 모든 테스트 통과 확인, 이후 동일 통과 검증 |
| viewModeStore 로드 전 분기 실행 | 깜빡임 | loaded 플래그 + 로딩 인디케이터 |
| 사용자가 토글 못 찾음 | 발견성 ↓ | 양쪽 모드에 명시적 토글 배치 + Command Palette 액션 |
| 모드 전환 시 메모리 leak | 성능 ↓ | unmount cleanup 검증, 스토어 구독 해제 |

## 의존성

- 선행: SPEC-UX-003 (PivotLayout 컴포넌트 존재 전제)
- 선행: SPEC-UX-002 (Command Palette action 통합)
- 후행: 없음 (Pivot UX 전환 마지막 단계)
