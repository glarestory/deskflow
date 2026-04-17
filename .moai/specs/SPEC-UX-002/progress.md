# SPEC-UX-002 진행 상황

## 현황

| 항목 | 상태 |
|------|------|
| SPEC 버전 | 1.0.0 |
| 시작일 | 2026-04-13 |
| 완료일 | 2026-04-13 |
| 방법론 | TDD (RED-GREEN-REFACTOR) |
| 타겟 커버리지 | 85% |
| 신규 테스트 수 | 112 (fuzzyMatch:21, searchAll:23, usageStore:12, commandStore:9, ResultItem:14, CommandPalette:16, integration:14, perf:3) |
| 기존 테스트 유지 | 447 pass / 448 total (1 기존 실패 유지) |

## 태스크 진행

| 태스크 | 마일스톤 | 상태 | 테스트 수 |
|--------|---------|------|---------|
| T-001 fuzzyMatch | M1 | DONE | 21 |
| T-002 searchAll | M1 | DONE | 23 |
| T-003 usageStore | M2 | DONE | 12 |
| T-004 commandStore | M2 | DONE | 9 |
| T-005 CommandPalette UI | M3 | DONE | 16 |
| T-006 ResultItem | M3 | DONE | 14 |
| T-007 App 통합 | M4 | DONE | - |
| T-008 usage 추적 | M4 | DONE | - |
| T-009 성능 측정 | M5 | DONE | 3 |
| T-010 통합 테스트 | M5 | DONE | 14 |

## 인수 조건 달성

| AC | 설명 | 상태 |
|----|------|------|
| AC-001 | Cmd+K 열기/닫기 | DONE |
| AC-002 | 빈 검색어 추천 | PARTIAL (usage 데이터 없을 때 빈 상태) |
| AC-003 | 통합 fuzzy 검색 | DONE |
| AC-004 | 매칭 글자 highlight | DONE |
| AC-005 | 키보드 네비게이션 | DONE |
| AC-006 | Cmd+Enter 새 창 | DONE |
| AC-007 | Alt+Enter 편집 | DONE |
| AC-008 | > 접두사 액션 검색 | DONE |
| AC-009 | # 접두사 태그 검색 | DONE |
| AC-010 | Empty state | DONE |
| AC-011 | 사용 기록 ranking | DONE (getScore 구현) |
| AC-012 | 응답성 100ms | DONE (17ms 달성) |
| AC-013 | 액션 실행 | DONE |
| AC-014 | 카테고리 선택 | PARTIAL (SPEC-UX-003 대기) |
| AC-015 | 태그 선택 | PARTIAL (SPEC-UX-003 대기) |

## 반복 이력

| 반복 | 날짜 | AC 완료 수 | 에러 수 | 메모 |
|------|------|-----------|---------|------|
| 1 | 2026-04-13 | 0 | 0 | 초기 |
| 2 | 2026-04-13 | 13 | 0 | 완료 |

## TODO (후속 SPEC 대기)

- AC-002: 빈 검색어 상태 usage 기반 8개 추천 (usageStore는 준비됨, UI 통합 필요)
- AC-014: 카테고리 선택 → Pivot 레이아웃 필터 (SPEC-UX-003)
- AC-015: 태그 선택 → Pivot 사이드바 필터 (SPEC-UX-003)
- 피벗/위젯 모드 전환 액션 활성화 (SPEC-UX-005)
- 모든 태그 보기, 최근 추가 북마크 보기 (SPEC-UX-003)
