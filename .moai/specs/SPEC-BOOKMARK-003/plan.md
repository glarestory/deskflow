# SPEC-BOOKMARK-003: 구현 계획

## 기술 접근 방식

기존 `Link` 타입 확장 + 신규 `tagStore`와 `domainTagMap` 헬퍼 추가.
저장 시 자동 태그 부여, 로드 시 마이그레이션 (tags 필드 없으면 자동 채움).
EditModal과 QuickCapture에 태그 입력 컴포넌트 추가.

## 마일스톤

### M1: 데이터 모델 확장 (Priority High)

- **T-001**: Link 타입에 tags 필드 추가
  - `src/renderer/types/index.ts` 수정
  - 기존 모든 사용처 컴파일 오류 검토 (옵셔널 X, 빈 배열 default)

- **T-002**: 자동 태그 추출 헬퍼
  - `src/renderer/lib/domainTagMap.ts` -- 도메인 → 태그 사전 (상수)
  - `src/renderer/lib/extractTags.ts` -- URL 입력받아 자동 태그 배열 반환
  - 단위 테스트 포함 (`extractTags.test.ts`)

### M2: 태그 스토어 (Priority High)

- **T-003**: tagStore 생성
  - `src/renderer/stores/tagStore.ts`: Zustand
  - state: `selectedTags: string[]`, `allTags: { tag: string; count: number }[]`
  - actions: `selectTag`, `deselectTag`, `clearTags`, `recomputeAllTags(bookmarks)`
  - 테스트: `tagStore.test.ts`

- **T-004**: bookmarkStore 통합
  - 북마크 추가/수정 시 자동 태그 자동 부여 로직
  - bookmarkStore 변경 시 tagStore.recomputeAllTags 호출 (subscribe 패턴)

### M3: 마이그레이션 (Priority High)

- **T-005**: 기존 데이터 자동 마이그레이션
  - `src/renderer/lib/migration.ts` 확장
  - bookmarkStore.loadBookmarks 완료 후 tags 필드 없는 link 검사
  - 자동 태그 채워서 storage.set으로 저장

### M4: UI 통합 (Priority Medium)

- **T-006**: EditModal에 태그 입력 추가
  - `src/renderer/components/EditModal/EditModal.tsx`
  - 각 link 행에 태그 chip 입력 (TagInput 컴포넌트 신규)
  - 자동완성: tagStore.allTags에서 매칭

- **T-007**: TagInput 컴포넌트
  - `src/renderer/components/TagInput/TagInput.tsx`
  - chip 표시, 삭제, 입력, 제안
  - 정규화 (소문자, trim) 자동 적용
  - 테스트: `TagInput.test.tsx`

- **T-008**: QuickCapture에 태그 입력 추가
  - `src/renderer/components/QuickCapture/QuickCapture.tsx`
  - 동일 TagInput 재사용

### M5: 검증 (Priority High)

- **T-009**: 통합 테스트
  - 새 북마크 추가 → 자동 태그 부여 검증
  - tagStore 집계 정확성
  - Firestore 직렬화 라운드트립

## 리스크

| 리스크 | 영향 | 완화 전략 |
|--------|------|-----------|
| 기존 Link 사용처 누락 | 컴파일 오류 | TypeScript strict로 모든 사용처 자동 검출 |
| 마이그레이션 실패 시 데이터 손실 | 사용자 북마크 손상 | 마이그레이션 전 백업, 실패 시 원본 유지 |
| 자동 태그 오부여 (도메인 매칭 오류) | UX 혼란 | 자동 태그는 prefix `auto:` 없이 부여하되, 사용자가 제거 가능 |
| Firestore 쿼리 비용 증가 | 비용 | 클라이언트 측 필터링만 사용 (서버 쿼리 X) |

## 의존성

- 선행: SPEC-AUTH-001 (Firestore), SPEC-IMPORT-001 (Bookmark import)
- 후행: SPEC-UX-002 (Command Palette가 태그 검색에 사용), SPEC-UX-003 (사이드바 태그 네비)
