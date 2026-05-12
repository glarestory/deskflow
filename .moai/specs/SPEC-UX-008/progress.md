# SPEC-UX-008 구현 진행 상황

## 기준선

- 시작 일자: 2026-05-12
- 완료 일자: 2026-05-12
- 개발 모드: TDD (per `.moai/config/sections/quality.yaml` `development_mode: tdd`)
- 브랜치: `feat/cross-category-dnd`
- 진행률: 100%
- 상태: completed

## 반복 이력

### Iteration 0 (2026-05-12) — Plan 단계

- 상태: SPEC 작성 완료 (draft)
- REQ 정의: 18개 (REQ-UX-008-001 ~ REQ-UX-008-018)
- NFR 정의: 4개 (NFR-001 ~ NFR-004)
- AC 정의: 16개 + EDGE 4개 = 총 20개 시나리오
- 파일 변경 맵: 신규 0 + 수정 5 (`bookmarkStore.ts`, `bookmarkStore.test.ts`, `BookmarkCard.tsx`, `BookmarkCard.test.tsx`, `SortableLink.tsx`, `WidgetLayout.tsx`, `WidgetLayout.test.tsx`)
- 핵심 결정 사항:
  - **D1**: DndContext 위치 — WidgetLayout 의 BookmarkCard grid 직속 부모로 단일 통합. BookmarkCard 내부 DndContext 제거.
  - **D2**: collisionDetection — `closestCorners` (dnd-kit 공식 multi-container 권장).
  - **D3**: useDroppable id — `category.id` 직접 사용 (링크 id 와 충돌 없음, grep 검증).
  - **D4**: 빈 카테고리 droppable — `min-height: 48px` 로 hit-area 확보.
  - **D5**: onDragOver/onDragEnd 분리 — dragOver 는 in-memory, dragEnd 만 영속화 (REQ-UX-008-013 단일 트랜잭션).
  - **D6**: 영속화 호출 — moveLinkBetweenGroups 1회 호출(onDragEnd) 또는 updateBookmark 1회 호출(onDragEnd 의 단일 그룹 분기).
  - **D7**: dragging 임시 상태 모델 — WidgetLayout 의 로컬 `useState<Bookmark[] | null>` 사용 (옵션 B).

## 후속 후보 (Out of Scope, 별도 SPEC 추천)

본 SPEC 작업 중 식별되었으나 명시적으로 범위 외로 둔 항목들.

- **PivotLayout 의 cross-category DnD**: BookmarkList(가상화 행 기반) 컴포넌트는 본 SPEC 의 dnd-kit multi-container 패턴과 통합 패턴이 다름 — 별도 SPEC.
- **PivotLayout 정렬 옵션(이름순/추가순/빈도순) 과 사용자 정의 순서의 충돌 해소**: 정렬 옵션 활성 상태에서 drag 정렬이 어떻게 상호작용해야 하는지 별도 의사결정 필요.
- **Cmd+Z (Undo) 지원**: 이동 히스토리 스택 도입 — 별도 SPEC.
- **다중 선택(multi-select) 후 일괄 이동**: 단일 항목 이동 우선. 다중 선택 UX 별도 SPEC.
- **DragOverlay 정교한 애니메이션**: 스프링 / 그림자 / 회전 모션 등 — 별도 디자인 SPEC.
- **카테고리 자체의 nesting (1-depth → multi-depth)**: Deskflow 데이터 모델 자체의 변경이 필요 — 별도 데이터 SPEC.
- **즐겨찾기 뷰 내부의 정렬 UX**: 본 SPEC 은 invariant 유지만 책임. 즐겨찾기 뷰 자체 정렬 UX 는 PivotLayout 측 별도 SPEC.

## 위험 모니터링

- onDragOver 의 잦은 setState → 성능 모니터링 필요 (M5 통합 테스트에서 React Profiler 부담 측정 권장)
- DragOverlay 미러 렌더 비용 — overlay 는 1개 항목만이라 무시 가능 (예상)
- BookmarkCard.test.tsx 의 단독 렌더 wrapper 변경 — 기존 SPEC-UX-006/007 케이스 회귀 0 검증 필요

## 검증 체크리스트 (Plan 단계 완료 시점)

- [x] EARS REQ 18개 작성, 5형식(Ubiquitous/Event-Driven/State-Driven/Unwanted/Optional) 모두 사용
- [x] Exclusions 섹션에 최소 5개 항목 명시 (사용자 명시 9개 + 합리적 경계 추가)
- [x] HISTORY 섹션 작성
- [x] grep 으로 실제 파일 라인 번호 검증 (`BookmarkCard.tsx:160`, `WidgetLayout.tsx:553`, `bookmarkStore.ts` 시그니처)
- [x] 핵심 결정 D1-D7 plan.md 에 명시 및 대안 비교
- [x] AC 5개 이상 (구체적 시나리오 16개 + 엣지 4개)
- [x] invariant 테스트 1개 (AC-015 즐겨찾기 뷰)
- [x] 회귀 검증 체크리스트 plan.md 에 포함
- [ ] manager-tdd 로 Run 단계 진행 (다음 단계)
