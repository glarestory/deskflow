# SPEC-UX-006 구현 진행 상황

## 기준선

- 시작 시 테스트: 미측정 (Plan 단계 — Run 시 측정 예정)
- 시작 일자: 2026-05-12
- 개발 모드: TDD (per `.moai/config/sections/quality.yaml` `development_mode: tdd`)
- 진행률: 0%
- 상태: draft

## 반복 이력

### Iteration 0 (2026-05-12) — Plan 단계
- 상태: SPEC 작성 완료
- AC 정의: 20개 (AC-001 ~ AC-020)
- EDGE 정의: 5개 (EDGE-001 ~ EDGE-005)
- REQ 정의: 21개 (REQ-UX-006-001 ~ REQ-UX-006-021)

## 작업 체크리스트

### M1: 마이그레이션 어댑터 + 레이아웃 스토어
- [ ] T-001: `layoutMigration.ts` 헬퍼 작성 + 테스트
- [ ] T-002: `layoutStore.ts` Responsive union 확장

### M2: 반응형 그리드 본체
- [ ] T-003: `WidgetLayout.tsx` Responsive 그리드 교체
- [ ] T-004: WidgetLayout 회귀 테스트 확장

### M3: 드래그 핸들 + 스크롤 격리
- [ ] T-005: `.widget-drag-handle` CSS 강화
- [ ] T-006: body 클래스 토글 (`is-dragging-widget`)

### M4: 리사이즈 핸들
- [ ] T-007: 14px / 24px 미디어 쿼리 분기

### M5: 모바일 헤더 collapse
- [ ] T-008: `HeaderMoreMenu.tsx` 분리 (신규)
- [ ] T-009: WidgetLayout 헤더 분기 적용
- [ ] T-010: Clock `clamp()` 폰트

### M6: 북마크 정렬 (신규 기능)
- [ ] T-011: `@dnd-kit` 3개 패키지 추가
- [ ] T-012: BookmarkCard 편집 모드 상태
- [ ] T-013: SortableContext 적용 + `SortableLink.tsx`
- [ ] T-014: 순서 영속화 (`bookmarkStore` 재사용)
- [ ] T-015: BookmarkCard 단위 테스트 확장

### M7: Viewport / PWA
- [ ] T-016: `index.html` PWA meta 추가
- [ ] T-017: Safe-area inset 헤더 적용

### M8: 검증
- [ ] T-018: 회귀 테스트 (기존 561개 100%)
- [ ] T-019: 신규 AC + EDGE + 품질 게이트 통과

## 최종 결과

(Run 단계 완료 후 기록)
