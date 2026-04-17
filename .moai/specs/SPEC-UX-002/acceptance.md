# SPEC-UX-002: 인수 조건

## 시나리오

### AC-001: Cmd+K로 팔레트 열기/닫기

**Given** 앱이 인증된 상태에서
**When** 사용자가 Cmd+K (또는 Ctrl+K) 누르면
**Then** Command Palette가 화면 중앙에 표시되어야 한다
**And** 한 번 더 누르거나 Esc 누르면 닫혀야 한다

### AC-002: 빈 검색어 -- 추천 항목 표시

**Given** 팔레트가 처음 열렸을 때
**When** 검색어가 비어 있으면
**Then** usageStore 기반 상위 8개 항목이 그룹별로 표시되어야 한다
**And** 처음 사용 시(usage 데이터 없음) 카테고리 + 액션 default가 표시되어야 한다

### AC-003: 통합 fuzzy 검색

**Given** 북마크 "ChatGPT", 카테고리 "AI 도구", 태그 "ai"가 있을 때
**When** 사용자가 "ai" 입력
**Then** Bookmarks 그룹에 ChatGPT, Categories 그룹에 "AI 도구", Tags 그룹에 "ai"가 모두 표시되어야 한다

### AC-004: 매칭 글자 highlight

**Given** 검색어 "cha"
**When** 결과에 "ChatGPT"가 표시될 때
**Then** "Cha" 부분이 강조 스타일(굵게/색상)로 렌더링되어야 한다

### AC-005: 키보드 네비게이션

**Given** 검색 결과가 5개 표시된 상태에서
**When** ↓ 키를 3번 누르면
**Then** 4번째 항목이 선택되어야 한다 (시각적 강조)
**And** Enter 누르면 해당 항목 액션이 실행되어야 한다

### AC-006: Cmd+Enter 새 창 열기 (북마크)

**Given** 검색 결과 첫 번째가 북마크일 때
**When** 사용자가 Cmd+Enter
**Then** window.open(url, '_blank') 호출되어야 한다
**And** Enter만 누른 경우와 별도로 처리되어야 한다

### AC-007: Alt+Enter 편집

**Given** 북마크 결과가 선택된 상태
**When** Alt+Enter
**Then** EditModal이 열리고 해당 link가 편집 가능해야 한다
**And** Palette는 닫혀야 한다

### AC-008: 접두사 `>` -- 액션만 검색

**Given** 검색어 ">테마"
**When** 결과가 표시될 때
**Then** Actions 그룹의 "테마 전환"만 표시되어야 한다 (다른 그룹 표시 X)

### AC-009: 접두사 `#` -- 태그만 검색

**Given** 검색어 "#dev"
**When** 결과가 표시될 때
**Then** Tags 그룹의 "dev" 태그만 표시되어야 한다

### AC-010: Empty state

**Given** 매칭 결과 0건
**When** 사용자가 "xxxxxxxx" 입력
**Then** "결과 없음" 메시지 표시
**And** "이 텍스트로 새 북마크 추가" 등 액션 제안이 노출되어야 한다

### AC-011: 사용 기록 저장 및 ranking 반영

**Given** 사용자가 "ChatGPT" 북마크를 5회 실행
**When** 다음 번 팔레트 빈 상태로 열기
**Then** 추천 8개 중 ChatGPT가 상위에 표시되어야 한다

### AC-012: 응답성

**Given** 1000개 북마크 데이터셋
**When** 사용자가 빠르게 타이핑
**Then** 키 입력 후 100ms 이내에 결과가 갱신되어야 한다

### AC-013: 액션 실행

**Given** 검색어 ">로그아웃"
**When** Enter
**Then** authStore.signOut 호출되어야 한다
**And** Palette 닫히고 LoginScreen 표시되어야 한다

### AC-014: 카테고리 선택 시 동작

**Given** Categories 그룹에서 "AI 도구" 선택
**When** Enter
**Then** Pivot 레이아웃이 활성 상태면 사이드바에서 해당 카테고리 선택 + 메인 뷰 필터 적용
**And** Palette 닫혀야 한다

### AC-015: 태그 선택 시 동작

**Given** Tags 그룹에서 "ai" 선택
**When** Enter
**Then** tagStore.selectTag('ai') 호출
**And** Pivot 사이드바 태그 필터 적용

## 엣지 케이스

### EDGE-001: 한글 자모 분리 입력

**Given** 검색어 "ㅈ" (한글 자모만)
**When** 결과 검색
**Then** "잠금" 같은 한글 시작 매칭 또는 그냥 매칭 없음으로 처리 (오류 X)

### EDGE-002: usage 데이터 손상

**Given** localStorage의 usage 데이터가 JSON 파싱 실패
**When** 앱 시작
**Then** 빈 상태로 초기화 + 오류 로그 (앱 동작 정상)

### EDGE-003: 매우 긴 검색어

**Given** 사용자가 200자 입력
**When** 검색 실행
**Then** 잘라서 처리 또는 결과 없음 (메모리 폭발 X)

### EDGE-004: 팔레트 열린 상태에서 모달 등장

**Given** EditModal이 떠 있는 상태에서
**When** 사용자가 Cmd+K
**Then** Palette가 EditModal 위에 표시되거나, 또는 무시 (충돌 없음)

## 품질 게이트

- [ ] TypeScript strict 통과
- [ ] ESLint 0건
- [ ] 신규 모듈 커버리지 85% 이상
- [ ] 1000개 북마크 검색 100ms 이내 (Lighthouse 또는 수동 측정)
- [ ] ARIA combobox 패턴 axe-core 검증 통과
- [ ] 키보드만으로 모든 시나리오 수행 가능

## Definition of Done

- [ ] REQ-001 ~ REQ-012 구현 완료
- [ ] AC-001 ~ AC-015 통과
- [ ] EDGE-001 ~ EDGE-004 처리
- [ ] 기존 CommandPalette 사용처 회귀 0
- [ ] 후행 SPEC-UX-003 통합 가능 형태로 액션 핸들러 분리
