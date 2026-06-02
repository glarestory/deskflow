# SPEC-UX-013: 구현 계획

## 기술 접근 방식

본 SPEC 은 SPEC-WIDGET-003 의 뉴스 피드 위젯 + SPEC-UX-009 의 위젯 드래그 핸들 구조를 **그대로 유지**하면서, 기사 표시를 **병합 단일 목록 → 피드별 탭 UI + 지연 로딩** 으로 재설계한다. 핵심 변화 4개 영역:

1. **feedStore 상태 재설계**: 병합 `articles: Article[]` + 단일 `loading: boolean` → 피드별 `articlesByFeed: Record<feedId, Article[]>` + `statusByFeed: Record<feedId, FeedStatus>` + `activeFeedId`. 병합 `refreshAll` 제거, `loadFeed`(지연)/`refreshActiveFeed`(활성 탭만)/`setActiveFeed`(탭 전환 시 지연 트리거) 신규
2. **FeedWidget 탭 UI**: 병합 목록(`FeedWidget.tsx:224-286`) → WAI-ARIA tablist/tab/tabpanel. 활성 탭의 기사만 표시. 화살표 키 내비게이션 + roving tabindex
3. **지연 로딩 정책**: 최초/새로고침 시 첫(또는 마지막 활성) 탭만 fetch, 나머지 idle. 비활성 탭 첫 클릭 시 1회 fetch + 캐시. 재클릭은 캐시. 새로고침은 활성 탭 재요청 + 나머지 stale
4. **cap UX + 피드별 상태 표시**: 5개 도달 시 추가 버튼 비활성 + 안내. 피드별 로딩 스피너 / 오류 표시(활성 탭 단위 격리)

### 핵심 결정 사항

**결정 D1 — 병합 articles → 피드별 map (REQ-UX-013-007)**

선택지:
- (a) `articlesByFeed: Record<feedId, Article[]>` + `statusByFeed: Record<feedId, FeedStatus>` (피드별 분리)
- (b) 기존 단일 `articles: Article[]` 유지 + 표시 시 `activeFeedId` 로 filter

**결정: (a) 피드별 map**

**이유**:
1. **지연 로딩 자연 표현**: 피드별 `status`(idle/loading/loaded/error/stale)를 map 으로 가지면 "이 피드는 아직 안 불러옴" 을 1급 상태로 표현. (b) 는 단일 배열에 어느 피드가 로드됐는지 별도 추적 필요 — 응집도 낮음
2. **캐시 재사용 명확**: `articlesByFeed[id]` 존재 + `status === 'loaded'` 가 캐시 hit 판별의 단일 출처. REQ-UX-013-010 의 "재클릭 시 무재요청" 가드가 깔끔
3. **stale 격리**: 새로고침 시 활성 탭 외 `loaded → stale` 전환이 map 키 단위로 자연스러움
4. **렌더 비용 절감**: 활성 탭 기사만 sort/render(NFR-003). 단일 배열이면 전체 정렬 후 filter

**결정 D2 — 새로고침 시맨틱: 활성 탭만 vs 전체 (REQ-UX-013-012)**

선택지:
- (a) 활성 탭만 재요청 + 나머지 `stale` (채택)
- (b) 전체 캐시 초기화 + 첫 탭 재로드 + 나머지 idle

**결정: (a) 활성 탭 재요청 + 나머지 stale** (spec.md 의 FIXED 결정)

**이유**:
1. **사용자 의도**: 새로고침 = "지금 보는 탭 최신화". 안 보는 탭까지 즉시 요청하면 지연 로딩 절감 무의미
2. **rate-limit 안전**: 새로고침 1회 = 외부 fetch 1회. rss2json 무료 프록시 부담 최소
3. **지연 로딩 일관**: stale 탭은 다음 방문 시 재로드 → "안 보는 탭 네트워크 안 씀" 원칙 유지

(b) 는 비목표(Exclusions). 사용자가 전체 갱신을 원하면 각 탭 방문으로 stale 재로드.

**판별 기준**: `refreshActiveFeed()` 가 활성 피드 `loadFeed(id, { force: true })` + 나머지 `loaded → stale`. `refreshAll` 제거(또는 internal-only).

**결정 D3 — 피드 추가 시 fetch 정책 (REQ-UX-013-013)**

선택지:
- (a) 추가 즉시 fetch + 새 탭 활성(`loaded`)
- (b) 추가 후 새 탭 idle, 사용자 클릭 시 지연 로딩

**결정: (a) 추가 즉시 fetch + 새 탭 활성**

**이유**:
1. **명시적 의도**: 피드 추가는 사용자가 "이걸 보겠다" 는 명시적 행위 → 즉시 보여주는 것이 직관적. 추가했는데 빈 탭이면 혼란
2. **피드 제목 즉시 확보**: rss2json 응답에서 `feed.title` 을 받아 탭 라벨을 채움(`feedStore.ts:137-141` 패턴). 즉시 fetch 안 하면 탭 라벨이 URL 로만 표시
3. **지연 로딩 원칙과 모순 없음**: 지연 로딩의 목적은 "안 보는 탭 절감". 방금 추가해 활성화한 탭은 보는 탭이므로 즉시 로드가 정합

**결정 D4 — `fetchFeedArticles` 보존 vs 흡수 (REQ-UX-013-009)**

선택지:
- (a) `fetchFeedArticles`(`feedStore.ts:125-169`)를 `loadFeed` 내부 헬퍼로 흡수(시그니처 변경)
- (b) `fetchFeedArticles` 유지 + `loadFeed` 가 가드 후 호출

**결정: (b) `fetchFeedArticles` 유지 + `loadFeed` 래핑**

**이유**:
1. **변경 최소화**: 기존 fetch/파싱/오류 처리 로직(`:128-168`)은 검증됨 — 재작성 위험 회피. `loadFeed` 는 캐시 가드 + status 전환만 추가
2. **테스트 마이그레이션 용이**: 기존 `feedStore.test.ts:72-90` 의 `fetchFeedArticles` 직접 호출 테스트를 `articlesByFeed` 기준으로 갱신하되 호출 시그니처 유지
3. **단일 책임**: `fetchFeedArticles` = 순수 네트워크+파싱, `loadFeed` = 지연/캐시/status 정책. 관심사 분리

**판별 기준**: `loadFeed(id, opts)` → status 가 `loaded` && `!opts.force` 면 return(캐시). 아니면 `loading` set → `fetchFeedArticles(feed)` → 성공 시 `articlesByFeed[id]` + `loaded`, 실패 시 `error`. `fetchFeedArticles` 내부의 `set({ loading: true/false })`(`:126, 167`)는 `statusByFeed[id]` 갱신으로 치환.

**결정 D5 — 탭 활성화 방식: automatic vs manual activation (REQ-UX-013-016)**

선택지:
- (a) automatic activation — 화살표 키로 포커스 이동 즉시 탭 선택 + 지연 로딩
- (b) manual activation — 화살표로 포커스만 이동, `Enter`/`Space` 로 선택

**결정: (a) automatic activation**

**이유**:
1. **WAI-ARIA 권장**: 탭 패널 콘텐츠가 무겁지 않고 즉시 표시 가능한 경우 automatic activation 권장(WAI-ARIA APG). 단, 지연 로딩이 있으므로 포커스 이동 시 fetch 가 트리거됨 — 화살표 연타 시 다수 fetch 위험
2. **지연 로딩과의 절충**: automatic activation 채택하되, `loadFeed` 의 캐시 가드(loaded no-op)로 중복 fetch 방지. idle/stale 탭으로 빠르게 지나가면 fetch 가 시작되나, 동일 탭 재방문은 캐시 — 실사용에서 문제 적음
3. **단순성**: manual activation 은 포커스 상태와 선택 상태를 분리 관리해야 하므로 복잡. automatic 이 코드 단순

검토 사항: 화살표 연타로 idle 탭을 빠르게 지나갈 때 다수 fetch 가 시작될 수 있음 — plan 검토 사항에 디바운스/포커스-vs-선택 분리 옵션 명시(아래 권장 사항 참고).

## 마일스톤

### M1: feedStore 상태 재설계 (Priority High)

- **T-001**: `feedStore.ts` 상태 형상 변경
  - 파일: `src/renderer/stores/feedStore.ts` (수정)
  - 추가: `FeedStatus` 타입, `articlesByFeed`, `statusByFeed`, `activeFeedId`
  - 제거/대체: `articles: Article[]`(병합), `loading: boolean`(단일) → 활성 탭 status 파생
  - `@MX:SPEC: SPEC-UX-013` 추가(`:3`)
- **T-002**: `loadFeed` 지연 로딩 + 캐시 가드 (REQ-UX-013-009/010)
  - `loadFeed(id, opts?)`: `loaded` && `!force` → return(캐시). 아니면 `loading` set → `fetchFeedArticles` → `loaded`/`error`
  - `fetchFeedArticles` 유지(D4) — 내부 `loading` set 을 `statusByFeed[id]` 로 치환, 성공 시 `articlesByFeed[id]` 채움
- **T-003**: `setActiveFeed` + `refreshActiveFeed` (REQ-UX-013-009/012)
  - `setActiveFeed(id)`: `activeFeedId` 설정 + status `idle`/`stale` 이면 `loadFeed(id)` 트리거
  - `refreshActiveFeed()`: 활성 피드 `loadFeed(id, { force: true })` + 나머지 `loaded → stale` (D2)
  - 선택적 `activeFeedId` 영속화(REQ-UX-013-022, key `feed-active-tab`)
- **T-004**: `loadFeeds` 최초 첫 탭만 로드 (REQ-UX-013-008)
  - `loadFeeds`(`:85-95`) 확장: 피드 복원 후 첫 번째(또는 영속화된 활성) 피드만 `loadFeed` 호출. 나머지 `idle`
  - `activeFeedId` 초기 설정
- **T-005**: `addFeed` 즉시 fetch + 새 탭 활성 (REQ-UX-013-013, D3) + cap 보존 (REQ-UX-013-001/003)
  - cap 체크(`:101-103`) 보존. 추가 후 `loadFeed(newId, { force: true })` + `setActiveFeed(newId)`
- **T-006**: `removeFeed` 탭/캐시/상태 정리 + 활성 재선택 (REQ-UX-013-014)
  - `feeds`, `articlesByFeed[id]`, `statusByFeed[id]` 제거(`:116-123` 확장). 활성 탭이었으면 남은 첫 탭 활성(없으면 null)
- **T-007**: `feedStore.test.ts` 마이그레이션 + 신규 (NFR-005)
  - 파일: `src/renderer/stores/feedStore.test.ts` (수정)
  - 마이그레이션: 기존 `articles` 단일 배열 단언 → `articlesByFeed[feedId]` 기준. `refreshAll` 전체 fetch 테스트(`:124-142`) → `refreshActiveFeed` 활성 탭만 + 나머지 stale 로 재작성
  - 신규: `loadFeed` 캐시 가드(loaded no-op), `loadFeeds` 최초 1회 fetch(첫 탭만, 나머지 idle), `setActiveFeed` idle 탭 클릭 시 fetch / loaded 탭 클릭 시 no-op, `refreshActiveFeed` 활성 1회 + 나머지 stale, cap 5개 초과 no-op(`:104-121` 보존)

### M2: FeedWidget 탭 UI (Priority High)

- **T-008**: `FeedWidget.tsx` 탭 바 렌더 (REQ-UX-013-004/006)
  - 파일: `src/renderer/components/FeedWidget/FeedWidget.tsx` (수정)
  - `role="tablist"` + 각 탭 `role="tab"`, `aria-selected`, `aria-controls`. 활성 탭 teal/navy 강조(`--accent` 하단 보더)
  - 탭 바 `overflowX: auto`(또는 wrap) — 위젯 셀 밖 넘침 방지
  - `widget-drag-handle` 헤더와 탭 바 영역 분리(REQ-UX-013-018)
- **T-009**: `FeedWidget.tsx` tabpanel 활성 탭 기사 (REQ-UX-013-005/011)
  - 병합 목록(`:224-286`) → `role="tabpanel"` 활성 탭 기사만(`articlesByFeed[activeFeedId]` sort)
  - 기사 행 마크업(`:230-284`)은 재사용. `aria-labelledby` 활성 탭 연결
  - `statusByFeed[activeFeedId]` 분기: `loading` → "불러오는 중...", `error` → 오류 안내(기존 `:176-198` 배지 패턴 재사용), `loaded`/`stale` → 기사 표시
- **T-010**: `FeedWidget.tsx` 탭 클릭/키보드 → `setActiveFeed` (REQ-UX-013-009/016)
  - 탭 `onClick={() => setActiveFeed(feed.id)}`
  - `onKeyDown`: ArrowLeft/Right(또는 Up/Down) 포커스 이동 + automatic activation(D5) + roving tabindex(활성 `tabIndex=0`, 나머지 `-1`)
- **T-011**: `FeedWidget.tsx` cap UX (REQ-UX-013-002/003)
  - `feeds.length === 5` → "+ 추가" 버튼(`:116-131`) `disabled` + 안내 `"피드는 최대 5개까지 추가할 수 있습니다"`
  - 등록 피드 수 표시(`:292` N/5) 유지
- **T-012**: `FeedWidget.tsx` 빈 상태 + 피드 삭제 (REQ-UX-013-014/015)
  - 빈 상태(`:201-214`) 보존 — `feeds.length === 0` 시 탭/패널 미렌더
  - 삭제 버튼(`:316-330`) → `removeFeed` 후 활성 탭 재선택은 store 가 처리

### M3: 보존 / 회귀 / 반응형 검증 (Priority High)

- **T-013**: 위젯 드래그 핸들 + RGL 보존 검증 (REQ-UX-013-018)
  - `widget-drag-handle` + `DragHandleSlot level="widget"`(`:69-94`) 보존, 편집 모드 `isEditing` 보존
  - 탭 클릭이 위젯 드래그를 트리거하지 않음(영역 분리)
- **T-014**: 모바일 반응형 + 탭 hit-area (NFR-002)
  - 탭 hit-area 최소 44px. 탭 바 가로 스크롤이 모바일 셀(`MOBILE_LAYOUT` feed `h:4`)에서 동작
- **T-015**: 빌드/린트/타입 + 회귀 0 (REQ-UX-013-020)
  - `npm run build` / `npm run lint` / `npm run typecheck` 0 error
  - `npm run test:run` 기존 테스트(갱신분 포함) 100% 통과

### M4: e2e Playwright 시나리오 (Priority Medium)

- **T-016**: 탭 + 지연 로딩 e2e
  - 파일: `e2e/spec-ux-013-feed-tabs.spec.ts` (신규, `spec-ux-011-favorites-dnd.spec.ts` 헬퍼 패턴 재사용)
  - 시나리오(네트워크 인터셉트로 요청 수 검증):
    1. 최초 진입 → 첫 탭만 fetch(다른 피드 요청 0회, REQ-UX-013-008/019)
    2. 2번째 탭 클릭 → 해당 피드 1회 fetch(REQ-UX-013-009)
    3. 2번째 탭 재클릭 → fetch 0회(캐시, REQ-UX-013-010)
    4. 새로고침 → 활성 탭만 1회 fetch, 다른 탭 stale(REQ-UX-013-012)
    5. 6번째 피드 추가 차단 + 안내(REQ-UX-013-002)
- **T-017**: 키보드 탭 내비게이션 e2e (REQ-UX-013-016)
  - 탭 포커스 → ArrowRight → 다음 탭 활성 + 지연 로딩
  - `aria-selected`/`role` 검증
- **T-018**: 데스크탑/모바일 반응형 e2e
  - desktop(1280×720) 탭 바, mobile(375×667) 탭 가로 스크롤 + hit-area

## 파일 변경 맵 (실제 grep 결과 기반)

| 파일 경로 | 변경 유형 | 사유 / 관련 REQ |
|----------|----------|----------------|
| `src/renderer/stores/feedStore.ts` | 수정 | 병합 articles/loading → 피드별 map + status + activeFeedId + `loadFeed`/`refreshActiveFeed`/`setActiveFeed` + cap 보존 / REQ-001, 003, 007~014, 019, 021, 022 |
| `src/renderer/stores/feedStore.test.ts` | 수정 | 병합 전제 마이그레이션 + 지연 로딩/캐시/새로고침/cap 신규 테스트 / NFR-005 |
| `src/renderer/components/FeedWidget/FeedWidget.tsx` | 수정 | 병합 목록 → 탭 바 + tabpanel + 피드별 로딩/오류 + cap UX + 키보드 / REQ-002, 004, 005, 006, 011, 013, 015, 016, 018 |
| `e2e/spec-ux-013-feed-tabs.spec.ts` | 신규 | 탭 + 지연 로딩(요청 수 인터셉트) + 캐시 + 새로고침 + cap + 키보드 + 반응형 e2e / NFR-006 |

**조사 결과 발견된 기존 자산** (중복 작업 회피):

- `feedStore.ts:125-169` `fetchFeedArticles` — 네트워크+파싱+오류 처리 검증됨. `loadFeed` 가 래핑(D4), 재작성 안 함
- `feedStore.ts:57-58` `buildProxyUrl`(rss2json) — 그대로 사용(외부 API 교체 비목표)
- `feedStore.ts:51` `MAX_FEEDS = 5`, `:54` `MAX_ARTICLES_PER_FEED = 10` — 보존
- `feedStore.ts:47-48, 113` `rss-feeds` 영속화 + `Feed[]` 직렬화 — 스키마 보존(REQ-UX-013-021)
- `FeedWidget.tsx:230-284` 기사 행 마크업(제목 ellipsis + source/date) — tabpanel 내부 재사용
- `FeedWidget.tsx:176-198` 피드 오류 배지 패턴 — 탭별 오류 표시에 재사용
- `FeedWidget.tsx:69-94` `widget-drag-handle` + `DragHandleSlot level="widget"`(SPEC-UX-009) — 보존
- `FeedWidget.tsx:9-23` `formatRelativeDate` 헬퍼 — 그대로 사용
- `globals.css` teal/navy 토큰(`--accent`/`--text-primary`/`--text-muted`/`--border`/`--link-bg`/`--link-hover`) — 탭/패널 시각 재사용(신규 색 없음)
- `e2e/spec-ux-011-favorites-dnd.spec.ts` 헬퍼(`waitForUI`, `enterWidgetMode`) — e2e 재사용
- `feedStore.test.ts:4-18` window.storage/fetch 모킹 + `makeRss2JsonResponse` 픽스처 — 신규 테스트에 재사용

## 리스크

| 리스크 | 영향 | 완화 전략 |
|--------|------|-----------|
| `feedStore.test.ts` 의 병합 전제(`articles` 단일 배열, `refreshAll` 전체 fetch) 마이그레이션 누락 | 기존 테스트 실패/거짓 통과 | T-007 — `articles` → `articlesByFeed[id]` 전면 치환, `refreshAll` 테스트 → `refreshActiveFeed`(활성 1회 + 나머지 stale) 재작성. 모킹/픽스처 재사용 |
| 네트워크 모킹의 lazy-load race condition | 테스트 flakiness | mock fetch 호출 수로 검증(NFR-005). `loadFeed` 의 `loading` 가드로 동일 피드 중복 fetch 방지. await 순서 명확화 |
| automatic activation + 화살표 연타 시 다수 idle 탭 fetch (D5) | 불필요한 네트워크 | `loadFeed` 캐시 가드로 동일 탭 중복 방지. 검토 사항: 포커스-vs-선택 분리 또는 디바운스(아래 권장). 실사용에서 5개 피드 한도라 영향 제한적 |
| cache staleness — stale 탭이 오래된 기사 표시 | 사용자가 옛 기사 봄 | REQ-UX-013-012 — stale 탭은 다음 방문 시 재로드. stale 시각 단서(예: 탭에 "갱신 필요" 인디케이터) 추가 검토 |
| 탭 바가 위젯 그리드 셀 밖으로 넘침(피드 많을 때) | 레이아웃 깨짐 | REQ-UX-013-004 — 탭 바 `overflowX: auto`(또는 wrap). 위젯 컨테이너 `overflow: hidden`(`FeedWidget.tsx:63`) 유지 |
| 탭 클릭과 위젯 드래그 핸들 충돌 | 탭 선택이 드래그로 인식 | REQ-UX-013-018 — `widget-drag-handle` 헤더와 탭 바를 별도 영역으로 분리. RGL `draggableHandle` 셀렉터는 헤더에만 |
| 활성 탭 영속화(선택) id 가 삭제된 피드 가리킴 | 빈 활성 탭 | REQ-UX-013-022 — 영속 id 가 현재 `feeds` 에 없으면 첫 탭 fallback |
| 단일 `loading: boolean` 제거로 기존 FeedWidget 로딩 표시 의존 깨짐 | 로딩 UI 회귀 | T-009 — 활성 탭 `statusByFeed[activeFeedId] === 'loading'` 파생으로 치환. 전역 로딩 표시 제거 |

## 의존성

- **선행**: SPEC-WIDGET-003 (뉴스 피드 위젯 최초 구현 — `feedStore`/`FeedWidget`), SPEC-UX-009 (위젯 드래그 핸들 `DragHandleSlot level="widget"`)
- **후행** (후속 SPEC 후보):
  - 자동 새로고침 인터벌(polling)
  - 피드 탭 재정렬(드래그)
  - OPML import/export
  - 기사 무한 스크롤 / 페이지네이션
  - 기사 읽음/안읽음 + 검색
  - 기사 캐시 세션 간 영속화
  - stale 탭 시각 인디케이터 정교화

## 권장 / 검토 사항

**새로고침 시맨틱 — 활성 탭 재요청 + 나머지 stale 권장 (D2, REQ-UX-013-012)**

권장: 활성 탭만 즉시 재요청하고 나머지는 stale 로 표시(다음 방문 재로드). 지연 로딩의 네트워크 절감 목적과 사용자의 "보는 탭 최신화" 의도에 모두 부합. 전체 강제 갱신은 비목표.

**최초 활성 탭 — 첫 번째 탭 권장, 마지막 활성 탭 영속화는 Optional (REQ-UX-013-008/022)**

권장: 기본은 첫 번째 탭 활성 + 지연 로딩. 마지막 활성 탭 복원은 Optional(REQ-UX-013-022) — 사용자 경험 향상이나 핵심 아님. 영속 id 가 유효하지 않으면 첫 탭 fallback.

**상태 모델 — 피드별 map 권장 (D1)**

권장: `articlesByFeed` + `statusByFeed` + `activeFeedId`. 지연 로딩/캐시/stale 을 1급 상태로 표현. 단일 배열 + filter 는 상태 추적이 흩어져 비권장.

**automatic activation 검토 (D5)**

automatic activation 채택하되, 화살표 연타로 idle 탭 다수 fetch 가 우려되면 후속 조정:
- 옵션 A: 포커스 이동은 자유, 선택(활성)은 짧은 디바운스(예: 150ms) 후 확정 → 빠르게 지나간 탭은 fetch 안 함
- 옵션 B: manual activation 으로 전환(포커스만 화살표, Enter/Space 로 선택)
1차 구현은 automatic + `loadFeed` 캐시 가드로 충분. 5개 피드 한도라 실사용 영향 제한적.

**기타 권장 사항**:
- `fetchFeedArticles` 는 흡수하지 말고 `loadFeed` 가 래핑(D4) — 검증된 네트워크 로직 보존, 테스트 마이그레이션 용이
- 피드별 오류는 활성 탭 단위로 tabpanel 에 표시 + 기존 오류 배지 패턴 재사용
- e2e 는 네트워크 인터셉트(`page.route`)로 피드별 요청 수를 검증해 지연 로딩을 결정적으로 확인
- stale 탭에 "새로고침으로 갱신됨" 시각 단서를 둘지는 후속 검토(1차는 다음 방문 시 자동 재로드로 충분)
</content>
