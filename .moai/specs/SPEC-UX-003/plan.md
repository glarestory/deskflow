# SPEC-UX-003: 구현 계획

## 기술 접근 방식

신규 `PivotLayout` 컴포넌트 작성 + `viewStore` 상태 관리 + react-window 통합.
기존 `App.tsx`는 viewMode에 따라 PivotLayout 또는 WidgetLayout(기존 그리드)을 렌더.
favicon은 별도 헬퍼 (`<Favicon domain={url} fallback="C" />`).

## 마일스톤

### M1: 기반 작업 (Priority High)

- **T-001**: react-window 의존성 추가
  - `package.json`: react-window ^1.8.x, @types/react-window
  - `npm install` 후 lockfile 갱신
  - 번들 크기 측정 (+~25KB 예상)

- **T-002**: viewStore 작성
  - `src/renderer/stores/viewStore.ts`: Zustand
  - 컨텍스트, 검색, 뷰모드, 밀도, 사이드바 토글
  - persist 미적용 (세션 단위)

- **T-003**: Link 타입 확장
  - favorite, createdAt 필드 추가 (옵셔널)
  - bookmarkStore에 toggleFavorite 액션 추가
  - 마이그레이션: 기존 데이터에 createdAt = Date.now() 일괄 부여 (한 번만)

### M2: Favicon (Priority High)

- **T-004**: Favicon 컴포넌트
  - `src/renderer/components/Favicon/Favicon.tsx`
  - props: url, size (16/24/32), fallback char
  - Google s2 API + onError 시 fallback 원형 (도메인 첫 글자)
  - 로딩 중 placeholder

### M3: Sidebar (Priority High)

- **T-005**: Sidebar 컨테이너
  - `src/renderer/components/PivotLayout/Sidebar.tsx`
  - 5개 섹션 렌더, viewStore.context 바인딩
  - collapse/expand 상태 처리

- **T-006**: SidebarCategoryList
  - 카테고리 리스트, 개수 chip, 활성 상태 강조
  - 키보드 1-9 단축키 핸들러

- **T-007**: SidebarTagList
  - tagStore.allTags 상위 N개 (기본 15)
  - "더 보기" 토글
  - 다중 선택 토글 UI (이미 선택된 태그는 강조)

- **T-008**: SidebarSettings
  - 위젯 모드 전환 (UX-005 완료 후 동작), 테마, 로그아웃
  - 사용자 아바타 + 이름

### M4: MainView (Priority High)

- **T-009**: PivotLayout 컨테이너
  - `src/renderer/components/PivotLayout/PivotLayout.tsx`
  - Sidebar + MainView 합성

- **T-010**: ContextHeader + Breadcrumb
  - 현재 컨텍스트 시각화 ("📂 AI 도구 > 🏷 #ai")
  - 각 segment 클릭으로 해제

- **T-011**: SearchInput
  - debounce 100ms, viewStore.searchQuery 바인딩
  - `/` 단축키로 포커스

- **T-012**: ToolbarRight
  - 뷰 토글 (list/grid), 밀도 dropdown, 정렬 (이름/시간/빈도) dropdown

- **T-013**: TopSection (자주 쓰는 것)
  - 컨텍스트 = 'all'일 때만
  - usageStore 상위 8개 격자 카드

### M5: BookmarkList (Priority High)

- **T-014**: 가상화 리스트 통합
  - react-window FixedSizeList
  - 행 높이 = density 매핑
  - 1000개+ 데이터 60fps 검증

- **T-015**: BookmarkRow (list mode)
  - favicon + name + url + meta + tag chips + ⭐
  - hover 액션 버튼 (편집/삭제)
  - 클릭 → 새 창 열기 + usageStore.recordUsage

- **T-016**: BookmarkCard (grid mode)
  - 기존 BookmarkCard 재사용 검토 또는 신규
  - 격자에서는 favicon 큰 사이즈 + 이름 중심

- **T-017**: ContextMenu (우클릭)
  - 신규 컴포넌트 또는 라이브러리 검토 (없이 직접 구현)
  - 편집 / 삭제 / 태그 추가 / 카테고리 이동

### M6: 키보드 (Priority High)

- **T-018**: 단축키 통합
  - useHotkeys 훅 또는 직접 keydown 리스너
  - j/k/Enter/e/f/1-9// 모두 처리
  - Command Palette 열려 있을 때 비활성화

### M7: 통합 (Priority High)

- **T-019**: App.tsx 분기
  - viewMode === 'pivot' → PivotLayout
  - viewMode === 'widgets' → 기존 ReactGridLayout (그대로 유지)
  - viewMode 기본값은 'pivot' (UX-005에서 viewModeStore 도입)

- **T-020**: usageStore 통합
  - 북마크 클릭 시 recordUsage 호출
  - "자주 쓰는 것" 섹션 데이터 소스

### M8: 품질 (Priority High)

- **T-021**: 성능 측정
  - 1000개 북마크 시드 데이터로 스크롤 fps 측정
  - React DevTools profiler

- **T-022**: 접근성 검증
  - axe-core 자동 + 수동 키보드 검증
  - ARIA tree, listbox 패턴

- **T-023**: 테스트
  - viewStore.test, Sidebar.test, BookmarkRow.test, PivotLayout.test
  - 통합 시나리오: 카테고리 선택 → 태그 추가 → 검색 → 클릭

## 리스크

| 리스크 | 영향 | 완화 전략 |
|--------|------|-----------|
| react-window React 19 호환 이슈 | 빌드 실패 | 사전 PoC, 문제 시 @tanstack/react-virtual fallback |
| 1000개+ 데이터 시드 어려움 | 성능 측정 어려움 | 테스트용 generate script 작성 |
| favicon API rate limit | 일부 누락 | onError fallback + 캐싱 (sessionStorage) |
| 기존 위젯 사용자 혼란 | 마이그레이션 마찰 | 첫 진입 시 모드 안내 토스트 (UX-005에서) |
| ContextMenu 자체 구현 복잡 | 시간 ↑ | 1차는 dropdown만, 우클릭은 후속 |

## 의존성

- 선행: SPEC-BOOKMARK-003 (태그), SPEC-UX-002 (Command Palette + usageStore)
- 후행: SPEC-UX-005 (위젯 모드 전환 토글)
