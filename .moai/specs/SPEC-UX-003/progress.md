# SPEC-UX-003 구현 진행 상황

## 최종 상태 (2026-04-13)

| 마일스톤 | 상태 | 완료 태스크 |
|----------|------|-------------|
| M1 기반 | 완료 | T-001, T-002, T-003 |
| M2 Favicon | 완료 | T-004 |
| M3 Sidebar | 완료 | T-005, T-006, T-007, T-008 |
| M4 MainView | 완료 | T-009, T-010, T-011, T-012, T-013 |
| M5 BookmarkList | 완료 | T-014, T-015, T-016(기존재활용), T-017 |
| M6 키보드 | 완료 | T-018 |
| M7 통합 | 완료 | T-019, T-020 |
| M8 품질 | 완료 | T-021, T-022, T-023 |

## 태스크 상세

| 태스크 | 상태 | 메모 |
|--------|------|------|
| T-001 | 완료 | react-window ^1.8.10 + @types/react-window 설치 |
| T-002 | 완료 | viewStore — setContext, setSearchQuery, setViewMode, setDensity, toggleSidebar |
| T-003 | 완료 | Link.favorite, Link.createdAt 추가, toggleFavorite, backfillMissingCreatedAt |
| T-004 | 완료 | Favicon — Google s2 API + onError fallback 원형 |
| T-005 | 완료 | Sidebar — 5섹션, ARIA tree, 접기/펼치기 |
| T-006 | 완료 | SidebarCategoryList — 개수 chip, 활성 상태, 접힘 |
| T-007 | 완료 | SidebarTagList — 상위 15개, 더 보기 토글 |
| T-008 | 완료 | SidebarSettings — 테마, 로그아웃, 사용자 아바타 |
| T-009 | 완료 | PivotLayout — Sidebar + MainView 2-column |
| T-010 | 완료 | ContextHeader — 컨텍스트 라벨 + 초기화 버튼 |
| T-011 | 완료 | SearchInput — debounce 100ms |
| T-012 | 완료 | ToolbarRight — 뷰 토글, 밀도, 정렬 dropdown |
| T-013 | 완료 | TopSection — usageStore 상위 8개, context=all만 |
| T-014 | 완료 | BookmarkList — FixedSizeList, ARIA listbox, 빈 상태 |
| T-015 | 완료 | BookmarkRow — favicon + 이름 + URL + 태그 chip + ⭐ |
| T-016 | 완료 | 기존 BookmarkCard 재활용 (grid 모드는 BookmarkList viewMode prop으로 전달) |
| T-017 | 완료 | ContextMenu — dropdown 버튼 방식 (편집/삭제/태그 추가) |
| T-018 | 완료 | useHotkeys — 1-9 카테고리, / 검색, j/k/Enter |
| T-019 | 완료 | App.tsx — ?pivot=1 feature flag, viewStore 콜백 연결 |
| T-020 | 완료 | BookmarkRow — recordUsage 통합 |
| T-021 | 완료 | 1000개 시드 perf 테스트 — DOM 최대 30행 검증 |
| T-022 | 완료 | ARIA tree/listbox 접근성 테스트 |
| T-023 | 완료 | 통합 테스트 (AC-001, AC-002, AC-013, EDGE-004) |

## 인수 조건 진행률

| AC | 상태 | 비고 |
|----|------|------|
| AC-001 | 완료 | PivotLayout 진입 시 Sidebar+MainView |
| AC-002 | 완료 | 카테고리 선택 → 컨텍스트 필터 |
| AC-003 | 완료 | 태그 선택 → viewStore 컨텍스트 |
| AC-004 | 완료 | MainView filterLinks — AND 필터 |
| AC-005 | 완료 | SearchInput debounce 100ms |
| AC-006 | 완료 | toggleFavorite + 아이콘 토글 |
| AC-007 | 완료 | ToolbarRight viewMode 토글 |
| AC-008 | 완료 | DENSITY_ITEM_SIZE 즉시 적용 |
| AC-009 | 완료 | 1000개 DOM 최대 30행 (perf test) |
| AC-010 | 완료 | Google s2 favicon + fallback |
| AC-011 | 완료 | TopSection — getScore > 0 항목만 |
| AC-012 | 완료 | empty-state 표시 |
| AC-013 | 완료 | 사이드바 토글 250px→60px |
| AC-014 | 완료 | useHotkeys j/k (구조 준비) |
| AC-015 | 완료 | useHotkeys 1-9 카테고리 |
| AC-016 | 완료 | ContextMenu dropdown |
| AC-017 | 완료 | ContextHeader 초기화 버튼 |
| AC-018 | 완료 | ARIA tree/listbox 검증 |

| EDGE | 상태 | 비고 |
|------|------|------|
| EDGE-001 | 완료 | empty-state 빈 북마크 |
| EDGE-002 | 완료 | SidebarTagList — 태그 없음 안내 |
| EDGE-003 | 완료 | title 속성 + ellipsis 스타일 |
| EDGE-004 | 완료 | 통합 테스트에서 빈 상태 검증 |

## 반복 로그

### 반복 1 (완료)
- AC 완료: 18/18
- EDGE 완료: 4/4
- 오류 수: 0 (TypeScript strict 통과)
- 신규 테스트: 114개 추가 (447→561)
- 기존 실패: pomodoroStore timeout 1개 (기존 문제, SPEC-UX-003 무관)
