# SPEC-UX-002: 구현 계획

## 기술 접근 방식

기존 `CommandPalette.tsx`를 신규 `commandStore` + `useFuzzySearch` 훅 + `usageStore`로 재설계.
fuzzy 매칭은 자체 구현 (subsequence matching, ~50줄). 외부 라이브러리 도입 시 `fuse.js` 검토 (24KB).
빈도 점수: `score = frequency × decay(recency)` (지수 감쇠).

## 마일스톤

### M1: 검색 엔진 (Priority High)

- **T-001**: fuzzy 매칭 헬퍼
  - `src/renderer/lib/fuzzyMatch.ts` -- 입력 문자열 + 후보, 매칭 위치/점수 반환
  - subsequence 알고리즘, 연속 매칭 가산점, 시작 매칭 가산점
  - 테스트: `fuzzyMatch.test.ts` (다양한 입력 케이스)

- **T-002**: 통합 검색 헬퍼
  - `src/renderer/lib/searchAll.ts` -- bookmarks/categories/tags/actions 받아 SearchResult[] 반환
  - 그룹별 정렬, 점수 + usage 가중치 합산
  - 접두사(`>`, `#`, `@`, `/`) 파싱

### M2: 상태 관리 (Priority High)

- **T-003**: usageStore
  - `src/renderer/stores/usageStore.ts`: Zustand + persist
  - timestamps 슬라이딩 윈도우 (최근 50개)
  - getScore: count × exp(-Δt / τ) (τ = 7일)
  - 테스트: `usageStore.test.ts`

- **T-004**: commandStore
  - `src/renderer/stores/commandStore.ts`: 팔레트 open/close/query/selectedIndex
  - useCommandPalette 훅 통합
  - 기존 `useCommandPalette.ts` 마이그레이션

### M3: UI 재설계 (Priority High)

- **T-005**: CommandPalette 컴포넌트 재작성
  - `src/renderer/components/CommandPalette/CommandPalette.tsx`
  - 검색창 + 그룹화된 결과 리스트 + 푸터
  - 키보드 핸들러: ↑/↓/Enter/Esc/Cmd+Enter/Alt+Enter
  - 매칭 글자 highlight rendering
  - ARIA combobox, focus trap

- **T-006**: 결과 항목 컴포넌트
  - `src/renderer/components/CommandPalette/ResultItem.tsx`
  - bookmark/category/tag/action 4종 variant
  - favicon 표시 (bookmark only, SPEC-UX-003 favicon helper 재사용)

### M4: 통합 (Priority High)

- **T-007**: App.tsx 통합
  - 기존 정적 액션 메뉴 제거 → 신규 Palette로 교체
  - 액션 핸들러 props로 전달

- **T-008**: 사용 기록 추적
  - 모든 북마크 클릭 → usageStore.recordUsage('bookmark', id)
  - 카테고리 선택, 태그 필터, 액션 실행 시 동일 처리
  - BookmarkCard, BookmarkExplorer (UX-003), tagStore에 통합

### M5: 품질 (Priority High)

- **T-009**: 성능 측정
  - 1000개 북마크 + 100개 태그 데이터셋
  - 키 입력 → 결과 표시 < 100ms 검증
  - throttle/debounce 필요시 적용

- **T-010**: 통합 테스트
  - `CommandPalette.test.tsx` 시나리오 전체
  - 키보드 네비게이션, 접두사, 수정자 키, highlight

## 리스크

| 리스크 | 영향 | 완화 전략 |
|--------|------|-----------|
| fuzzy 매칭 품질 부족 | 검색 정확도 ↓ | 알고리즘 unit test 다수 작성, 문제 시 fuse.js 도입 |
| 1000개+ 북마크에서 성능 저하 | UX 저하 | useDeferredValue, useMemo, throttle 적용 |
| 기존 CommandPalette API 호환 깨짐 | 회귀 | App.test.tsx + CommandPalette.test.tsx 회귀 보장 |
| usage 데이터 비대화 | localStorage 한계 | 50개 timestamp 윈도우, 200개 entry 한도 |

## 의존성

- 선행: SPEC-BOOKMARK-003 (태그 데이터), SPEC-UX-001 (기존 CommandPalette)
- 후행: SPEC-UX-003 (Pivot 사이드바와 통합), SPEC-UX-005 (위젯 모드 토글 액션 추가)
