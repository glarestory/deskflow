# SPEC-UX-007 구현 진행 상황

## 기준선

- 시작 일자: 2026-05-12
- 완료 일자: 2026-05-12
- 개발 모드: TDD (per `.moai/config/sections/quality.yaml` `development_mode: tdd`)
- 브랜치: `feat/global-edit-mode`
- 진행률: 100%
- 상태: completed

## 반복 이력

### Iteration 0 (2026-05-12) — Plan 단계
- 상태: SPEC 작성 완료 (draft)
- REQ 정의: 20개 (REQ-UX-007-001 ~ REQ-UX-007-020)
- AC 정의: 15개 (AC-001 ~ AC-015)
- EDGE 정의: 5개 (EDGE-001 ~ EDGE-005)
- 파일 변경 맵: 14개 (신규 2 + 수정 12)
- 핵심 결정 사항: D1(드래그 핸들 위치), D2(nested DndContext 격리), D3(Esc 리스너 위치), D4(body 클래스 토글), D5(⚙️ 버튼 의미 변경)

### Iteration 1 (2026-05-12) — M1 RED-GREEN-REFACTOR
- 신규: `editModeStore.ts` + `editModeStore.test.ts`
- AC-001 (초기값 false), AC-002 (toggle/set 동작) 통과
- 6개 테스트 GREEN

### Iteration 2 (2026-05-12) — M2/M3 RED-GREEN-REFACTOR
- 수정: `WidgetLayout.tsx`, `WidgetLayout.test.tsx`
- 수정: `HeaderMoreMenu.tsx`, `HeaderMoreMenu.test.tsx`
- AC-003 (토글 버튼 렌더링), AC-004 (Pencil/Check 아이콘), AC-005 (body 클래스)
- AC-006 (Esc 키), AC-007 (More 메뉴 항목), AC-008 (isDraggable 조건) 통과

### Iteration 3 (2026-05-12) — M4 RED-GREEN-REFACTOR
- 수정: `TodoWidget.tsx`, `NotesWidget.tsx`, `WeatherWidget.tsx`
- REQ-UX-007-010: widget-drag-handle 통일 (6개 위젯)
- Clock/SearchBar: WidgetLayout 셀 래퍼에 추가 (D1 결정)

### Iteration 4 (2026-05-12) — M5 RED-GREEN-REFACTOR
- 수정: `bookmarkStore.ts`, `bookmarkStore.test.ts`
- 완전 재작성: `BookmarkCard.tsx`, `BookmarkCard.test.tsx`
- AC-009 (reorderCategories), AC-010~AC-013 (useSortable), AC-014 (순서 영속화)
- AC-015 (⚙️ 버튼 opacity, 로컬 isEditing 제거, 외부 클릭 useEffect 삭제) 통과

### Iteration 5 (2026-05-12) — M6 CSS
- 수정: `globals.css` — body.is-edit-mode .react-grid-item outline
- 수정: `WidgetLayout.mobile.test.tsx` — SPEC-UX-007 반영 (편집 모드 OFF/ON 분리)
- REQ-UX-007-020 (시각 신호), prefers-reduced-motion 처리 완료

## 작업 체크리스트

### M1: 전역 편집 모드 store (Priority High)
- [x] T-001: `editModeStore.ts` 신규 작성 (한국어 헤더 주석)
- [x] T-002: `editModeStore.test.ts` 단위 테스트

### M2: WidgetLayout 헤더 토글 + 그리드 조건식 (Priority High)
- [x] T-003: 데스크탑 헤더 토글 버튼 추가 (`Pencil`/`Check` 아이콘)
- [x] T-004: `isDraggable`/`isResizable` 조건식 변경 (`isEditing && !isMobile && !isMobileBreakpoint`)
- [x] T-005: `body.is-edit-mode` 클래스 토글 useEffect
- [x] T-006: Esc 키 리스너 등록 + cleanup
- [x] T-007: WidgetLayout 회귀/신규 테스트

### M3: 모바일 More 메뉴 편집 토글 (Priority High)
- [x] T-008: HeaderMoreMenu 에 "편집"/"완료" 항목 추가
- [x] T-009: HeaderMoreMenu 테스트 갱신

### M4: 위젯 드래그 핸들 통일 (Priority High)
- [x] T-010: TodoWidget 헤더에 `widget-drag-handle` 추가
- [x] T-011: NotesWidget 헤더에 `widget-drag-handle` 추가
- [x] T-012: WeatherWidget 헤더에 `widget-drag-handle` 추가
- [x] T-013: Clock / SearchBar 위젯 셀 래퍼에 `widget-drag-handle` 추가
- [x] T-014: `.widget-drag-handle` 매칭 위젯 수 회귀 테스트

### M5: BookmarkCard 카테고리 정렬 (Priority High)
- [x] T-015: `bookmarkStore.reorderCategories` API 추가
- [x] T-016: `bookmarkStore.reorderCategories` 단위 테스트
- [x] T-017: BookmarkCard grid 를 카테고리용 SortableContext 로 래핑
- [x] T-018: BookmarkCard 를 useSortable item 으로 변환 (헤더 영역만 listeners)
- [x] T-019: BookmarkCard 로컬 `isEditing` 제거 + `useEditMode` 통합 + 외부 클릭 useEffect 삭제
- [x] T-020: BookmarkCard 단위 테스트 갱신

### M6: 시각 신호 CSS (Priority Medium)
- [x] T-021: `body.is-edit-mode .react-grid-item` outline + `prefers-reduced-motion` 처리

### M7: 검증 (Priority High)
- [x] T-022: SPEC-UX-006 회귀 0 검증 (layoutMigration, mobile responsive, BookmarkCard 링크 정렬)
- [x] T-023: AC-001 ~ AC-015 + 품질 게이트 통과 (typecheck, lint, build)

## 최종 결과

- 변경 파일: 12개 수정 + 2개 신규
  - 신규: `editModeStore.ts`, `editModeStore.test.ts`
  - 수정: `WidgetLayout.tsx`, `WidgetLayout.test.tsx`, `WidgetLayout.mobile.test.tsx`
  - 수정: `HeaderMoreMenu.tsx`, `HeaderMoreMenu.test.tsx`
  - 수정: `TodoWidget.tsx`, `NotesWidget.tsx`, `WeatherWidget.tsx`
  - 수정: `bookmarkStore.ts`, `bookmarkStore.test.ts`
  - 수정: `BookmarkCard.tsx`, `BookmarkCard.test.tsx`
  - 수정: `globals.css`
- 신규 의존성: 없음 (NFR-003)
- 커밋: M1(c3e7553), M2/M3(9ac93c3), M4(d7c6d79), M5(1204af0), M6(0f616cb)
- 최종 검증:
  - typecheck: PASS
  - lint: PASS
  - test:run: 1023/1037 통과 (14개 실패는 localStorage.clear 관련 사전 존재 실패)
  - build: PASS
  - SPEC-UX-006 회귀: 0
- 알려진 한계:
  - WeatherWidget 로딩/에러 상태에서 widget-drag-handle 없음 (데이터 표시 상태만 핸들 있음)
  - EDGE-005: Esc 키 + EditModal 열린 상태 충돌은 미구현 (후속 작업 후보)
- 후속 작업 후보:
  - 위젯 자체 wiggle keyframe 애니메이션 (iOS 스타일)
  - 항목 카테고리 간 이동
  - 편집 모드 Firebase 동기화
  - 편집 모드 진입 단축키 확장 (Cmd+E 등)
  - Esc + EditModal 충돌 처리 (EDGE-005)
