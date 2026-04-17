# SPEC-BOOKMARK-003: 인수 조건

## 시나리오

### AC-001: 새 북마크 추가 시 자동 태그 부여

**Given** 사용자가 인증된 상태에서
**When** URL `https://github.com/anthropics/claude` 인 북마크를 추가하면
**Then** 해당 link의 tags에 `["dev", "code"]`가 자동으로 포함되어야 한다

### AC-002: 도메인 매칭 안 되는 URL은 빈 자동 태그

**Given** 사용자가 임의의 사적 도메인 북마크를 추가하면
**When** 자동 태그 추출이 실행될 때
**Then** tags 배열은 빈 배열 또는 사용자 입력 태그만 포함되어야 한다

### AC-003: 사용자 수동 태그 추가

**Given** EditModal이 열린 상태에서
**When** 사용자가 TagInput에 "프로젝트A" 입력 후 Enter
**Then** 해당 link의 tags에 `"프로젝트a"` (소문자 정규화)가 추가되어야 한다

### AC-004: 태그 정규화 (공백/대문자)

**Given** 사용자가 "  Web Dev  " 입력
**When** TagInput이 정규화하면
**Then** 저장된 태그는 `"web-dev"` 또는 `"webdev"` (공백 제거 + 소문자)이어야 한다

### AC-005: 태그 자동완성

**Given** 시스템에 `dev`, `design`, `data` 태그가 이미 사용 중일 때
**When** 사용자가 TagInput에 "de" 입력
**Then** `dev`, `design` 두 개가 제안 목록에 표시되어야 한다

### AC-006: 태그 집계 정확성

**Given** 5개의 북마크가 다음 태그 분포를 가질 때:
- 북마크1: `[dev, ai]`, 북마크2: `[dev]`, 북마크3: `[ai, video]`, 북마크4: `[dev, design]`, 북마크5: `[ai]`
**When** tagStore.allTags가 집계되면
**Then** 결과는 `[{tag:"dev", count:3}, {tag:"ai", count:3}, {tag:"design", count:1}, {tag:"video", count:1}]` 형태여야 한다 (count 내림차순)

### AC-007: 단일 태그 필터

**Given** 다양한 태그를 가진 북마크가 있을 때
**When** 사용자가 사이드바에서 `#dev` 태그를 선택하면
**Then** `dev` 태그를 가진 북마크만 메인 뷰에 표시되어야 한다

### AC-008: 다중 태그 AND 필터

**Given** `dev` 태그 북마크 3개, 그 중 2개가 `ai` 태그도 가질 때
**When** 사용자가 `#dev`와 `#ai`를 동시 선택하면
**Then** 두 태그를 모두 가진 2개만 표시되어야 한다

### AC-009: 태그 제거

**Given** EditModal에서 link에 chip 표시된 태그가 있을 때
**When** 사용자가 chip의 X 버튼 클릭
**Then** 해당 태그가 link.tags에서 제거되어야 한다
**And** Firestore에 변경 내용이 영속화되어야 한다

### AC-010: 기존 데이터 마이그레이션

**Given** Firestore에 tags 필드가 없는 북마크가 있을 때
**When** 앱이 시작되어 bookmarkStore.loadBookmarks가 완료되면
**Then** 모든 link에 tags 배열이 존재해야 한다 (자동 태그 또는 빈 배열)
**And** 마이그레이션 결과가 Firestore에 저장되어야 한다

### AC-011: Firestore 직렬화 호환

**Given** tags 필드가 있는 북마크
**When** Firestore에 저장 후 다시 로드하면
**Then** tags 배열이 동일하게 복원되어야 한다

## 엣지 케이스

### EDGE-001: 잘못된 URL

**Given** URL이 `not-a-url` 같이 파싱 불가
**When** extractTags 호출
**Then** 오류 없이 빈 배열 반환

### EDGE-002: 태그 최대 개수 초과

**Given** 이미 10개 태그가 있는 link
**When** 사용자가 11번째 태그 입력 시도
**Then** "최대 10개까지" 안내 표시, 추가되지 않음

### EDGE-003: 중복 태그 추가 시도

**Given** 이미 `dev` 태그가 있는 link
**When** 사용자가 `dev` 다시 입력
**Then** 중복 추가되지 않음 (경고 또는 무시)

### EDGE-004: 자동 태그 + 수동 태그 충돌

**Given** 자동으로 `dev` 부여된 link에 사용자가 `dev` 수동 추가
**When** 저장
**Then** 중복 없이 단일 `dev`만 유지

## 품질 게이트

- [ ] TypeScript strict 통과 (`tsc --noEmit` 오류 0)
- [ ] ESLint 오류 0
- [ ] 신규 파일 테스트 커버리지 85% 이상
- [ ] 기존 테스트 회귀 0건
- [ ] `any` 타입 사용 없음
- [ ] 마이그레이션 로직 idempotent (반복 실행해도 안전)

## Definition of Done

- [ ] REQ-001 ~ REQ-010 구현 완료
- [ ] AC-001 ~ AC-011 통과
- [ ] EDGE-001 ~ EDGE-004 처리 확인
- [ ] domainTagMap 사전 최소 30개 도메인 포함
- [ ] 후행 SPEC(UX-002, UX-003)에서 사용 가능한 API 노출
