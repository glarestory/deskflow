# SPEC-UX-013: 인수 조건

## 시나리오

### 영역 1: 5개 피드 cap + cap UX

#### AC-001: 최대 5개 피드 제한

**Given** 등록된 피드가 4개인 상태에서
**When** 사용자가 유효한 RSS URL 로 피드를 추가하면
**Then** 피드가 5개가 되어야 한다
**And** 6번째 추가 시도 시 `feeds.length === 5` 가 유지되어야 한다 (추가 거부)

→ REQ-UX-013-001

#### AC-002: cap 도달 시 추가 버튼 비활성 + 안내

**Given** 등록된 피드가 5개인 상태에서
**When** FeedWidget 헤더의 "+ 추가" 버튼(`data-testid="add-feed-btn"`)을 검사하면
**Then** 버튼이 `disabled` 이거나 클릭 시 cap 안내가 표시되어야 한다
**And** `"피드는 최대 5개까지 추가할 수 있습니다"` 안내가 노출되어야 한다
**And** 등록 피드 수 표시가 "(5/5)" 로 표시되어야 한다

→ REQ-UX-013-002

#### AC-003: cap 초과 추가 graceful no-op

**Given** 등록된 피드가 5개인 상태에서
**When** `addFeed('https://sixth.com/rss')` 가 호출되면
**Then** 에러가 발생해서는 안 된다
**And** `feeds.length === 5` 가 유지되어야 한다 (새 피드 미추가)

→ REQ-UX-013-001, REQ-UX-013-003

### 영역 2: 탭 UI

#### AC-004: 피드별 탭 바 렌더

**Given** 등록된 피드가 3개(A, B, C)인 상태에서
**When** FeedWidget 이 렌더되면
**Then** `role="tablist"` 컨테이너가 존재해야 한다
**And** 각 피드마다 `role="tab"` 요소가 존재해야 한다 (총 3개)
**And** 각 탭의 라벨은 `feed.title`(없으면 `feed.url`)이어야 한다

→ REQ-UX-013-004

#### AC-005: 활성 탭 본문 = tabpanel (해당 피드 기사만)

**Given** 피드 A(활성), B, C 가 있고 A 가 로드된 상태에서
**When** tabpanel 영역을 검사하면
**Then** `role="tabpanel"` 영역에 A 의 기사만 표시되어야 한다 (B/C 기사 미표시)
**And** tabpanel 의 `aria-labelledby` 가 활성 탭(A)의 id 와 연결되어야 한다
**And** A 의 기사는 `pubDate` 내림차순으로 정렬되어야 한다

→ REQ-UX-013-005

#### AC-006: 활성 탭 시각/aria 표시

**Given** 탭 A 가 활성, B/C 가 비활성인 상태에서
**When** 각 탭 요소를 검사하면
**Then** A 는 `aria-selected="true"`, B/C 는 `aria-selected="false"` 이어야 한다
**And** A 는 teal/navy 강조(예: `var(--accent)` 하단 보더), B/C 는 `--text-muted` 저강조이어야 한다

→ REQ-UX-013-006

### 영역 3: 지연 로딩 / 피드별 상태

#### AC-007: 최초 로드 = 첫 탭만 fetch

**Given** 저장된 피드 3개(A, B, C)가 있는 환경에서 (mock fetch 호출 수 추적)
**When** 앱이 시작되어 `loadFeeds` 가 실행되면
**Then** 외부 fetch 는 첫 번째 피드(A)에 대해서만 1회 발생해야 한다
**And** B, C 의 `statusByFeed` 는 `idle` 이어야 한다 (fetch 0회)
**And** `activeFeedId === A.id` 이어야 한다

→ REQ-UX-013-008, REQ-UX-013-019

#### AC-008: 비활성 탭 최초 클릭 시 지연 로딩

**Given** A 가 로드(`loaded`)되고 B 가 `idle` 인 상태에서 (mock fetch 호출 수 추적)
**When** 사용자가 탭 B 를 클릭하면 (`setActiveFeed(B.id)`)
**Then** B 에 대해 외부 fetch 가 정확히 1회 발생해야 한다
**And** B 의 `statusByFeed` 가 `loading` → `loaded` 로 전환되어야 한다
**And** `articlesByFeed[B.id]` 에 B 의 기사가 캐시되어야 한다

→ REQ-UX-013-009

#### AC-009: 캐시 재사용 (재클릭 시 무재요청)

**Given** B 가 이미 로드(`loaded`)된 상태에서 (mock fetch 호출 수 추적)
**When** 사용자가 다른 탭으로 갔다가 B 를 다시 클릭하면
**Then** B 에 대한 추가 외부 fetch 가 발생해서는 안 된다 (0회)
**And** 캐시된 `articlesByFeed[B.id]` 가 즉시 표시되어야 한다

→ REQ-UX-013-010

#### AC-010: 피드별 로딩 표시

**Given** 탭 B 가 `loading` 상태인 동안
**When** tabpanel 을 검사하면
**Then** `"불러오는 중..."`(또는 스피너)이 표시되어야 한다
**And** 다른 탭(A)의 표시에는 영향을 주지 않아야 한다 (격리)

→ REQ-UX-013-011

#### AC-011: 피드별 오류 표시

**Given** 탭 C 의 fetch 가 실패(`error`)한 상태에서
**When** 사용자가 탭 C 를 활성화하면
**Then** tabpanel 에 C 의 오류 안내가 표시되어야 한다
**And** C 의 `statusByFeed === 'error'`, `feed.error` 가 설정되어야 한다
**And** 탭 C 를 다시 클릭(또는 새로고침)하여 재시도할 수 있어야 한다

→ REQ-UX-013-011

#### AC-012: 새로고침 = 활성 탭 재요청 + 나머지 stale

**Given** A(활성, `loaded`), B(`loaded`), C(`loaded`) 상태에서 (mock fetch 호출 수 추적)
**When** 사용자가 "새로고침"(`data-testid="refresh-feeds-btn"`)을 누르면
**Then** A 에 대해서만 외부 fetch 가 1회 발생해야 한다 (force re-fetch)
**And** B 와 C 의 `statusByFeed` 가 `stale` 로 전환되어야 한다
**And** B, C 에 대한 추가 fetch 는 발생해서는 안 된다 (0회)

→ REQ-UX-013-012

#### AC-013: stale 탭 다음 방문 시 재로드

**Given** 새로고침 후 B 가 `stale` 상태인 환경에서 (mock fetch 호출 수 추적)
**When** 사용자가 탭 B 를 클릭하면
**Then** B 에 대해 외부 fetch 가 1회 발생해야 한다 (stale → 재로드)
**And** B 의 상태가 `loaded` 로 전환되어야 한다

→ REQ-UX-013-009, REQ-UX-013-012

### 영역 4: 피드 추가/삭제 + 빈 상태

#### AC-014: 피드 추가 시 탭 + 즉시 로드 + 새 탭 활성

**Given** 피드 2개(A, B)가 있고 A 가 활성인 상태에서
**When** 사용자가 새 피드 C 를 추가하면 (`addFeed`)
**Then** 탭 바에 C 탭이 추가되어야 한다
**And** C 가 즉시 fetch 되어 `loaded` + 활성 탭이 되어야 한다 (D3)
**And** `feeds` 영속화(`storage.set('rss-feeds', ...)`)가 1회 호출되어야 한다

→ REQ-UX-013-013

#### AC-015: 피드 삭제 시 탭/캐시/상태 정리 + 활성 재선택

**Given** 피드 A(활성), B, C 가 있는 상태에서
**When** 사용자가 활성 피드 A 를 삭제하면 (`removeFeed(A.id)`)
**Then** A 의 탭, `articlesByFeed[A.id]`, `statusByFeed[A.id]` 가 제거되어야 한다
**And** 남은 첫 번째 탭(B)이 활성화되어야 한다
**And** B 가 `idle`/`stale` 이면 지연 로딩이 트리거되어야 한다

→ REQ-UX-013-014

#### AC-016: 빈 상태 (피드 0개)

**Given** 등록된 피드가 0개인 상태에서
**When** FeedWidget 이 렌더되면
**Then** tablist/tabpanel 이 렌더되어서는 안 된다
**And** `"피드를 추가해주세요"` 안내가 표시되어야 한다

→ REQ-UX-013-015

#### AC-017: 마지막 피드 삭제 시 빈 상태 전환

**Given** 피드가 1개(A)만 남은 상태에서
**When** 사용자가 A 를 삭제하면
**Then** 탭 바가 사라지고 빈 상태 안내가 표시되어야 한다
**And** `activeFeedId === null` 이어야 한다
**And** 에러가 발생해서는 안 된다

→ REQ-UX-013-014, REQ-UX-013-015

### 영역 5: 탭 키보드 접근성

#### AC-018: ARIA tablist 패턴 속성

**Given** 피드 3개의 탭 바가 렌더된 상태에서
**When** 탭 요소들을 검사하면
**Then** 컨테이너는 `role="tablist"`, 각 탭은 `role="tab"`, 본문은 `role="tabpanel"` 이어야 한다
**And** 각 탭은 `aria-controls` 로 tabpanel id 와 연결되어야 한다
**And** tabpanel 은 `aria-labelledby` 로 활성 탭 id 와 연결되어야 한다

→ REQ-UX-013-016

#### AC-019: 화살표 키 탭 내비게이션 + roving tabindex

**Given** 탭 A 가 활성이고 탭 바에 포커스가 있는 상태에서
**When** 사용자가 `ArrowRight`(또는 `ArrowDown`)를 누르면
**Then** 포커스/선택이 다음 탭(B)으로 이동해야 한다
**And** B 가 활성(`aria-selected="true"`)이 되어야 한다
**And** 활성 탭만 `tabIndex={0}`, 나머지는 `tabIndex={-1}` 이어야 한다 (roving)

→ REQ-UX-013-016

#### AC-020: 키보드 탭 전환 시 지연 로딩 트리거

**Given** 탭 A(활성, loaded), B(`idle`)이고 탭 바에 포커스가 있는 상태에서 (mock fetch 추적)
**When** 사용자가 화살표 키로 B 를 활성화하면
**Then** B 에 대해 외부 fetch 가 1회 발생해야 한다 (지연 로딩이 키보드 경로에서도 동작)

→ REQ-UX-013-009, REQ-UX-013-016

### 영역 6: 보존 / 회귀

#### AC-021: 위젯 드래그 핸들 보존

**Given** 편집 모드 ON 상태에서
**When** FeedWidget 헤더를 검사하면
**Then** `className="widget-drag-handle"` 영역이 존재해야 한다 (RGL draggableHandle)
**And** `DragHandleSlot level="widget"`(SPEC-UX-009)이 노출되어야 한다
**And** 탭 바 클릭이 위젯 드래그를 트리거해서는 안 된다 (영역 분리)

→ REQ-UX-013-018

#### AC-022: 외부 의존성 무증가

**Given** 본 SPEC 구현 완료 후
**When** `package.json` 의 dependencies 를 검사하면
**Then** 신규 npm 패키지가 추가되어서는 안 된다 (`zustand` 만 기존 활용, 탭은 native + ARIA)

→ REQ-UX-013-017

#### AC-023: 영속화 스키마 보존

**Given** 본 SPEC 구현 완료 후
**When** 피드 영속화를 검사하면
**Then** 영속화 키는 `rss-feeds`, 값은 `Feed[]`(`id`/`url`/`title`/`error?`) 직렬화이어야 한다
**And** `articlesByFeed`/`statusByFeed` 는 영속화되어서는 안 된다 (에페메럴)

→ REQ-UX-013-021

#### AC-024: 활성 탭 영속화 (Optional)

**Given** 활성 탭 영속화(REQ-UX-013-022)가 구현된 환경에서, 마지막 활성 탭이 B 였던 경우
**When** 앱을 재시작하고 B 가 여전히 `feeds` 에 존재하면
**Then** B 가 활성 탭으로 복원되고 지연 로딩되어야 한다
**And** 영속 id 가 더 이상 존재하지 않으면 첫 번째 탭으로 fallback 해야 한다

→ REQ-UX-013-022

## 엣지 케이스

### EDGE-001: 단일 피드 (탭 1개)

**Given** 등록된 피드가 1개(A)만 있는 상태에서
**When** FeedWidget 이 렌더되면
**Then** 탭 바에 A 탭 1개가 표시되어야 한다 (A 가 자동 활성 + 로드)
**And** A 의 기사가 tabpanel 에 표시되어야 한다

→ REQ-UX-013-004, REQ-UX-013-008

### EDGE-002: 첫 탭 fetch 실패 시 최초 진입

**Given** 첫 번째 피드(A)의 최초 fetch 가 실패하는 환경에서
**When** `loadFeeds` 가 첫 탭을 로드하면
**Then** A 의 `statusByFeed === 'error'` 가 되어야 한다
**And** A 의 tabpanel 에 오류 안내가 표시되어야 한다
**And** B, C 는 여전히 `idle` (fetch 0회)이어야 한다

→ REQ-UX-013-008, REQ-UX-013-011, REQ-UX-013-019

### EDGE-003: lazy-load 중 빠른 탭 전환 (race)

**Given** 탭 B 가 `loading` 중인 상태에서 (B fetch 미완료)
**When** 사용자가 즉시 탭 C 로 전환하고 다시 B 로 돌아오면
**Then** B 의 fetch 가 중복 트리거되어서는 안 된다 (`loading` 가드)
**And** B 완료 후 `articlesByFeed[B.id]` 가 일관되게 채워져야 한다
**And** 에러나 상태 꼬임이 없어야 한다

→ REQ-UX-013-009, REQ-UX-013-010

### EDGE-004: 새로고침 시 활성 탭이 idle 인 경우

**Given** 활성 탭 A 가 `idle` 인 상태(최초 로드 실패 또는 미로드)에서
**When** 사용자가 새로고침을 누르면
**Then** A 에 대해 fetch 가 1회 발생해야 한다 (force)
**And** 나머지 탭 중 `loaded` 인 것만 `stale` 로 전환, `idle`/`error` 는 그대로여야 한다

→ REQ-UX-013-012

### EDGE-005: 활성 탭 삭제 후 남은 탭 0개

**Given** 활성 탭 A 가 유일한 피드인 상태에서
**When** A 를 삭제하면
**Then** `activeFeedId === null`, 탭 바 미렌더, 빈 상태 안내 표시
**And** 후속 `setActiveFeed`/`refreshActiveFeed` 호출이 graceful no-op 이어야 한다

→ REQ-UX-013-014, REQ-UX-013-015

### EDGE-006: rss2json status !== 'ok' 응답

**Given** 활성 탭 fetch 가 HTTP 200 이나 `data.status !== 'ok'` 를 반환하는 환경에서
**When** `loadFeed` 가 실행되면
**Then** 기존 오류 처리(`feedStore.ts:132-133`)에 따라 `statusByFeed === 'error'`, `feed.error` 설정되어야 한다
**And** 다른 탭 상태에 영향이 없어야 한다

→ REQ-UX-013-011

### EDGE-007: 탭 라벨 truncation (긴 피드 제목)

**Given** 매우 긴 `feed.title` 을 가진 피드가 있는 상태에서
**When** 탭 바가 렌더되면
**Then** 탭 라벨은 ellipsis 로 truncation 되거나 탭 바 가로 스크롤로 처리되어 위젯 셀 밖으로 넘치지 않아야 한다

→ REQ-UX-013-004

## 컴포넌트 테스트 기대치 (vitest)

### feedStore.test.ts (마이그레이션 + 신규)

- `loadFeeds` 가 첫 번째 피드만 fetch (mock fetch 1회), 나머지 `statusByFeed === 'idle'` (AC-007)
- `setActiveFeed(idleId)` → 해당 피드 fetch 1회, `loaded` 전환 (AC-008)
- `setActiveFeed(loadedId)` → fetch 0회 (캐시, AC-009)
- `loadFeed(id, { force: true })` → `loaded` 여도 재요청 1회
- `refreshActiveFeed` → 활성 1회 fetch + 나머지 `loaded → stale` (AC-012), stale 탭 재방문 시 재로드 (AC-013)
- `addFeed` 5개 초과 시 no-op (`feeds.length === 5` 유지, 기존 `:104-121` 보존, AC-001/003)
- `addFeed` 성공 시 새 피드 즉시 `loaded` + `activeFeedId` 갱신 (AC-014)
- `removeFeed` → `feeds`/`articlesByFeed`/`statusByFeed` 정리 + 활성 재선택 (AC-015/017)
- `loadFeed` 실패 시 `error` + `feed.error` (AC-011, EDGE-006)
- 영속화: `addFeed`/`removeFeed` 후 `storage.set('rss-feeds', ...)` 호출, `articlesByFeed` 미영속 (AC-023)
- 손상 응답/네트워크 오류 graceful (기존 `:93-102` 보존)

### FeedWidget (컴포넌트 테스트, 신규/갱신)

- 피드 N개 → `role="tab"` N개, `role="tablist"` 1개 (AC-004)
- 활성 탭 `aria-selected="true"`, 비활성 `false` (AC-006)
- 탭 클릭 → `setActiveFeed` 호출, tabpanel 기사 전환 (AC-005/008)
- `feeds.length === 5` → 추가 버튼 disabled + 안내 (AC-002)
- `feeds.length === 0` → 빈 상태 안내, 탭 미렌더 (AC-016)
- `loading`/`error` 상태별 tabpanel 표시 (AC-010/011)
- `widget-drag-handle` + `DragHandleSlot` 존재 (AC-021)
- 화살표 키 → 탭 전환 + roving tabindex (AC-019)

## Playwright 시나리오 목록 (e2e/spec-ux-013-feed-tabs.spec.ts)

`page.route` 로 rss2json 요청을 인터셉트하여 피드별 요청 수를 결정적으로 검증한다. 기존 `spec-ux-011-favorites-dnd.spec.ts` 헬퍼(`waitForUI`, `enterWidgetMode`) 재사용.

1. 최초 진입 → 첫 탭만 네트워크 요청(다른 피드 요청 0회) (AC-007)
2. 2번째 탭 클릭 → 해당 피드 요청 1회 (AC-008)
3. 2번째 탭 재클릭 → 요청 0회 (캐시) (AC-009)
4. 새로고침 → 활성 탭만 요청 1회, 다른 탭 요청 0회 + stale (AC-012)
5. stale 탭 클릭 → 재요청 1회 (AC-013)
6. 6번째 피드 추가 차단 + cap 안내 (AC-002)
7. 탭 키보드 내비게이션(ArrowRight) → 다음 탭 활성 + 지연 로딩 (AC-019/020)
8. 피드 삭제 → 탭 제거 + 활성 재선택 (AC-015), 마지막 삭제 → 빈 상태 (AC-017)
9. desktop(1280×720) 탭 바 + mobile(375×667) 탭 가로 스크롤 + hit-area 44px (NFR-002)

## 품질 게이트

- [ ] `npm run typecheck` TypeScript 오류 0 (strict)
- [ ] `npm run lint` ESLint 경고/오류 0
- [ ] `npm run build` 정상 종료
- [ ] `npm run test:run` 기존 단위 테스트 100% 통과 (`feedStore.test.ts` 마이그레이션 반영)
- [ ] `feedStore` 커버리지 95% 이상 (loadFeed 캐시 가드, loadFeeds 첫 탭, setActiveFeed, refreshActiveFeed stale, addFeed cap, removeFeed 정리, error 경로 모두 커버)
- [ ] e2e Playwright `spec-ux-013-feed-tabs.spec.ts` 통과 (탭 + 지연 로딩 요청 수 + 캐시 + 새로고침 + cap + 키보드)
- [ ] mobile viewport(375×667) + desktop viewport(1280×720) 양쪽 e2e 모두 통과

## Definition of Done

- [ ] REQ-UX-013-001 ~ REQ-UX-013-022 모두 구현 (REQ-UX-013-022 는 Optional)
- [ ] AC-001 ~ AC-024 통과 (AC-024 는 Optional 구현 시)
- [ ] EDGE-001 ~ EDGE-007 처리
- [ ] 파일 변경 맵의 파일만 수정/생성 (그 외 파일 touch 금지 — Surgical Changes)
- [ ] 신규 외부 의존성 추가 없음 (`zustand` + native ARIA 탭)
- [ ] 신규 파일(e2e)은 첫 줄에 한국어 한 줄 헤더 주석 포함
- [ ] 수정 anchor(`feedStore.ts`, `FeedWidget.tsx`)의 `@MX:SPEC` 에 `SPEC-UX-013` 추가
- [ ] SPEC-WIDGET-003 / SPEC-UX-009 회귀 0 (위젯 드래그 핸들 + RGL 보존)
- [ ] 새로고침 시맨틱은 "활성 탭 재요청 + 나머지 stale"(REQ-UX-013-012) — 전체 강제 갱신은 비목표로 명시
- [ ] 영속화 스키마(`rss-feeds`, `Feed[]`) 변경 없음 (REQ-UX-013-021)
- [ ] PR 본문에 본 SPEC ID(`SPEC-UX-013`)와 핵심 변경(병합 목록 → 피드별 탭 + 지연 로딩) + 새로고침 시맨틱(활성 탭만) + cap UX 명시
- [ ] PR 본문에 사용자 핵심 문제(출처 구분 불가, 불필요한 전체 fetch, cap 무피드백) 해소 여부 명시
</content>
