---
id: SPEC-UX-013
version: 1.0.0
status: planned
created: 2026-06-02
updated: 2026-06-02
author: ZeroJuneK
priority: high
issue_number: 0
---

# SPEC-UX-013: 뉴스 피드 위젯 탭 + 지연 로딩 재설계 (Merged Article List → Per-Feed Tabs + Lazy Load)

## HISTORY

| 버전 | 날짜 | 작성자 | 변경 내용 |
|------|------|--------|-----------|
| 1.0.0 | 2026-06-02 | ZeroJuneK | 최초 작성 (병합 기사 목록 → 피드별 탭 UI + 지연 로딩(최초/새로고침 시 첫 탭만) + 피드별 로딩/오류/캐시 상태 + 탭 ARIA tablist 접근성 + 5개 피드 cap UX) |

## 개요

뉴스 피드 위젯은 현재 등록된 **모든 피드의 기사를 한 번에 가져와(merged)** 하나의 목록으로 합쳐 날짜 내림차순으로 표시한다. grep 검증:

- 병합 로딩: `feedStore.ts:171-174` `refreshAll` 이 `Promise.all(feeds.map(fetchFeedArticles))` 로 **모든 피드를 동시에 fetch**
- 병합 표시: `FeedWidget.tsx:224-286` 의 `articles` 단일 배열을 `source`/`pubDate` 구분 없이 하나의 목록으로 sort 후 렌더
- 단일 로딩 상태: `feedStore.ts:31` `loading: boolean` 1개만 존재 — 피드별 로딩/오류 구분 없음(오류는 `feed.error` 로 개별 존재하나 배지로만 표시)
- 피드 cap: `feedStore.ts:50-51` `MAX_FEEDS = 5`, `addFeed` `:100-103` 에서 5개 초과 시 조용히 `return`(사용자 피드백 없음)

### 본 SPEC 의 동기 (UX 핵심 문제)

#### 1. 출처 구분 불가 (가시성 결함)

모든 피드 기사가 하나의 목록에 섞여 날짜순으로 정렬되므로, 사용자는 **어느 기사가 어느 피드(출처)에서 왔는지** 목록 단위로 인지하기 어렵다(각 행의 `source` 텍스트로만 구분). 특정 피드의 최신 기사만 보고 싶을 때 스크롤로 찾아야 한다.

#### 2. 불필요한 네트워크 비용 (성능 결함)

위젯 초기 진입과 "새로고침" 시 **등록된 모든 피드를 동시에 fetch** 한다(`refreshAll`). 사용자가 실제로는 1개 피드만 보는 경우에도 5개 피드 전체 네트워크 요청이 발생한다. rss2json 프록시(`feedStore.ts:57-58`)는 외부 무료 API 로 rate-limit 위험이 있어 불필요한 호출은 비용/안정성 모두 악화시킨다.

#### 3. cap 도달 시 무피드백 (UX 결함)

`addFeed` 가 5개 초과 시 조용히 `return`(`feedStore.ts:101-103`) 하여, 사용자는 6번째 피드가 왜 추가되지 않는지 알 수 없다.

사용자 보고: "피드를 여러 개 넣었는데 어느 게 어느 출처인지 섞여서 안 보이고, 새로고침 누르면 다 같이 느리게 로딩됨. 피드를 탭으로 나눠서 보고 싶고, 안 보는 탭은 굳이 안 불러왔으면 좋겠다."

### 본 SPEC 의 해결 방향

병합 기사 목록을 **피드별 탭 UI + 지연 로딩(lazy load)** 으로 재설계한다.

- 각 피드는 자신의 **탭(tab)** 으로 표시된다(탭 바 = `role="tablist"`, 각 탭 = `role="tab"`, 본문 = `role="tabpanel"`). 활성 탭의 기사만 위젯 본문에 채워진다.
- **지연 로딩**: 최초 로드 및 새로고침 시 **첫 번째 탭의 피드만** fetch 한다. 나머지 탭은 **최초 클릭 시점에 1회 fetch(lazy)** 하고 캐시한다. 이후 재클릭은 캐시를 사용한다(새로고침 전까지 재요청 없음).
- 피드별 로딩/오류/캐시 상태를 store 에 보유한다(`idle`/`loading`/`loaded`/`error`/`stale`).
- 5개 피드 cap 에 명확한 UX(추가 버튼 비활성 + 안내 메시지)를 부여한다.

### 새로고침(refresh) 시맨틱 — 본 SPEC 의 채택 결정 (FIXED)

새로고침 동작은 두 후보가 있다: (A) 활성 탭만 재요청 vs (B) 모든 캐시 초기화 + 첫 탭 재로드. 본 SPEC 은 다음을 **채택한다**.

> **채택: "새로고침은 현재 활성 탭(active tab)을 재요청(re-fetch)하고, 나머지 모든 탭을 `stale` 로 표시한다. `stale` 탭은 다음 방문(클릭) 시 다시 지연 로딩된다."**

근거(rationale):
1. **사용자 의도 일치**: 사용자가 보고 있는(활성) 탭의 최신 기사를 즉시 갱신하는 것이 새로고침 버튼의 직관적 기대. 안 보는 탭까지 즉시 재요청하면 지연 로딩의 네트워크 절감 목적이 무너진다.
2. **지연 로딩 일관성**: 비활성 탭을 즉시 재요청하지 않고 `stale` 표시 → 다음 방문 시 lazy 재로드로 위임하여, "안 보는 탭은 네트워크 안 씀" 원칙을 새로고침 후에도 유지한다.
3. **rate-limit 안전**: 새로고침 1회당 외부 fetch 1회(활성 탭)로 제한되어 rss2json 프록시 부담 최소.

대안 (B)("전체 캐시 초기화 + 첫 탭 재로드") 는 **비목표(Exclusions)** 로 분류한다. 사용자가 모든 탭을 강제 갱신하려면 각 탭을 방문하면 `stale` → 재로드된다.

**분류**: SPEC (구현 대상 기능)
**성격**: Brownfield — `feedStore.ts` (병합 로딩 → 피드별 article map + per-feed status + `loadFeed`/`refreshActiveFeed` 액션 + cap 강제) + `FeedWidget.tsx` (병합 목록 → 탭 바 + tabpanel + per-feed 로딩/오류 + cap UX) + `feedStore.test.ts` 갱신
**선행 SPEC**: SPEC-WIDGET-003 (뉴스 피드 위젯 최초 구현), SPEC-UX-009 (위젯 핸들 시각 — `DragHandleSlot level="widget"`)
**범위**: `viewMode === 'widgets'` 의 뉴스 피드 위젯(`isWidgetVisible('feed')`) 한정. 위젯은 그리드 셀 내부에서 `height: 100%` 로 동작한다(`WidgetLayout.tsx:1095`). PivotLayout 적용 제외(Exclusions 참고).

## 요구사항

### 영역 1: 5개 피드 cap + cap UX

#### REQ-UX-013-001: 최대 5개 피드 제한 유지

**[Ubiquitous]** 시스템은 **항상** 등록 가능한 RSS 피드를 최대 5개로 제한해야 한다(기존 `feedStore.ts:51` `MAX_FEEDS = 5` 보존).

판별 기준: `feeds.length >= 5` 인 상태에서 `addFeed` 호출은 새 피드를 추가하지 않는다.

#### REQ-UX-013-002: cap 도달 시 추가 버튼 비활성 + 안내

**[State-Driven]** **While** 등록된 피드가 5개인 상태(`feeds.length === 5`)인 동안, 피드 추가 UI 는 **항상** 추가가 불가함을 명확히 표시해야 한다.

판별 기준:
- "+ 추가" 버튼(`data-testid="add-feed-btn"`)이 `disabled` 되거나, 클릭 시 추가 폼 대신 cap 안내가 노출된다.
- 안내 메시지: `"피드는 최대 5개까지 추가할 수 있습니다"` (한국어). `--text-muted` 색.
- 등록 피드 수 표시(`FeedWidget.tsx:292` `등록된 피드 (N/5)`)는 유지.

#### REQ-UX-013-003: cap 초과 추가 시도 graceful no-op

**[Unwanted]** 피드가 5개인 상태에서 6번째 추가 시도(URL 직접 입력 후 제출 등)가 발생하더라도, 시스템은 **에러를 발생시켜서는 안 되며** 새 피드를 추가해서도 안 된다.

판별 기준: `addFeed` 가 5개 초과 시 조용히 no-op(기존 `:101-103` 보존). 입력 폼이 열려 있었다면 cap 안내(REQ-UX-013-002)로 전환하거나 폼을 닫는다.

### 영역 2: 탭 UI

#### REQ-UX-013-004: 피드별 탭 바 렌더

**[Ubiquitous]** 등록된 피드가 1개 이상일 때, 위젯은 **항상** 각 피드를 하나의 탭으로 표시하는 탭 바를 렌더해야 한다.

판별 기준:
- 탭 바 컨테이너: `role="tablist"`
- 각 탭: `role="tab"`, 라벨은 `feed.title`(없으면 `feed.url`)
- 탭 바는 위젯의 고정 그리드 셀 내부에서 동작하며, 탭이 많아 한 줄을 초과하면 가로 스크롤(`overflowX: auto`) 또는 wrap 으로 처리하여 위젯 셀 밖으로 넘치지 않는다.

#### REQ-UX-013-005: 활성 탭 본문 = tabpanel

**[State-Driven]** **While** 특정 탭이 활성(active)인 동안, 위젯 본문은 **항상** 해당 피드의 기사 목록만 `role="tabpanel"` 영역에 표시해야 한다(병합 목록 아님).

판별 기준:
- tabpanel 컨테이너: `role="tabpanel"`, `aria-labelledby` 가 활성 탭의 id 와 연결.
- 활성 탭 기사: 해당 `feedId` 의 기사만(`pubDate` 내림차순). 기존 병합 sort(`FeedWidget.tsx:226-228`)는 피드 단위로 한정.
- 비활성 탭의 기사 목록은 렌더되지 않는다(조건부 렌더 또는 hidden).

#### REQ-UX-013-006: 활성 탭 시각/aria 표시

**[Ubiquitous]** 활성 탭은 **항상** `aria-selected="true"` 와 시각적 강조(teal/navy 테마 토큰 기반)를 가져야 하며, 비활성 탭은 `aria-selected="false"` 이어야 한다.

판별 기준:
- 활성 탭: `aria-selected="true"`, 강조 배경/하단 보더 등에 `var(--accent)` 또는 기존 teal/navy 토큰 사용.
- 비활성 탭: `aria-selected="false"`, `--text-muted` 등 저강조.
- 탭 색은 기존 `globals.css` 토큰(`--accent`/`--text-primary`/`--text-muted`/`--border`/`--link-bg`) 재사용. 신규 색 도입 금지(REQ-UX-013-017).

### 영역 3: 지연 로딩 / 피드별 상태

#### REQ-UX-013-007: 피드별 상태 모델

**[Ubiquitous]** 시스템은 **항상** 피드별로 로딩/캐시 상태를 구분해 보유해야 하며, 다음 상태 집합을 만족해야 한다.

- `idle`: 아직 fetch 시도하지 않음(지연 로딩 대기)
- `loading`: fetch 진행 중
- `loaded`: fetch 성공, 기사 캐시 보유
- `error`: fetch 실패(오류 메시지 보유)
- `stale`: 이전에 loaded 였으나 새로고침으로 무효화됨 — 다음 방문 시 재로드 대상

판별 기준: 피드별 상태는 `Record<feedId, FeedStatus>` 형태로 store 에 존재하며, 기존 단일 `loading: boolean`(`feedStore.ts:31`)은 피드별 상태로 대체되거나 파생값으로 유지된다.

#### REQ-UX-013-008: 최초 로드 = 첫 탭만 fetch

**[Event-Driven]** **When** 위젯이 최초로 마운트되어 피드 목록을 불러온 직후, 시스템은 **첫 번째 피드(탭)만** fetch 해야 하며, 나머지 피드는 fetch 해서는 안 된다(상태 `idle` 유지).

판별 기준:
- 앱 시작 시 `loadFeeds`(`feedStore.ts:85-95`) 로 피드 목록 복원 후, 첫 번째 피드에 대해서만 `loadFeed(firstFeedId)` 호출.
- 2번째 이후 피드는 `status === 'idle'`, 기사 fetch 미발생(네트워크 요청 0회).

#### REQ-UX-013-009: 비활성 탭 최초 클릭 시 지연 로딩

**[Event-Driven]** **When** 사용자가 아직 로드되지 않은(`status === 'idle'` 또는 `'stale'`) 탭을 클릭하면, 시스템은 해당 피드를 **1회 fetch** 하고 결과를 캐시해야 한다.

판별 기준:
- 클릭 → 활성 탭 전환 → 해당 피드 `status` 가 `idle`/`stale` 이면 `loadFeed(feedId)` 호출.
- `status === 'loaded'` 이면 재요청하지 않고 캐시(`articlesByFeed[feedId]`)를 사용(REQ-UX-013-010).

#### REQ-UX-013-010: 캐시 재사용 (재클릭 시 무재요청)

**[Unwanted]** 이미 로드된(`status === 'loaded'`) 탭을 사용자가 다시 클릭하더라도, 시스템은 **새로 fetch 해서는 안 된다**(캐시 사용).

판별 기준: 같은 탭을 두 번째 클릭할 때 `loadFeed` 가 외부 fetch 를 트리거하지 않는다(네트워크 요청 추가 0회). 캐시된 기사 목록이 즉시 표시된다.

#### REQ-UX-013-011: 피드별 로딩 스피너 / 오류 표시

**[State-Driven]** **While** 활성 탭의 피드가 `loading` 상태인 동안, tabpanel 본문은 **항상** 해당 피드 단위의 로딩 표시(스피너/`"불러오는 중..."`)를 보여야 하며, `error` 상태인 동안에는 해당 피드의 오류 메시지를 보여야 한다.

판별 기준:
- `status === 'loading'`: tabpanel 에 `"불러오는 중..."`(또는 스피너). 탭 라벨에 로딩 인디케이터를 함께 둘 수 있음.
- `status === 'error'`: tabpanel 에 오류 안내 + 재시도 가능(해당 탭 다시 클릭 또는 새로고침). 기존 피드 오류 배지(`FeedWidget.tsx:176-198`) 패턴 재사용 가능.
- 로딩/오류는 활성 탭(피드) 단위로 격리되어, 다른 탭 표시에 영향을 주지 않는다.

#### REQ-UX-013-012: 새로고침 = 활성 탭 재요청 + 나머지 stale

**[Event-Driven]** **When** 사용자가 "새로고침"(`data-testid="refresh-feeds-btn"`)을 누르면, 시스템은 **현재 활성 탭의 피드만 재요청(re-fetch)** 하고, 나머지 모든 피드의 상태를 `stale` 로 표시해야 한다.

판별 기준:
- 활성 피드: `refreshActiveFeed()` → 해당 피드 강제 re-fetch(캐시 무시), `loading` → `loaded`/`error`.
- 비활성 피드: `status` 가 `loaded` 였다면 `stale` 로 전환(기사 캐시는 유지하되 무효 표시). `idle` 이면 그대로.
- `stale` 탭을 다음에 방문하면 REQ-UX-013-009 에 따라 재로드된다.
- 기존 `refreshAll`(모든 피드 동시 fetch)은 본 SPEC 에서 제거 또는 internal API 로만 보존(Exclusions 참고).

### 영역 4: 피드 추가/삭제 + 빈 상태

#### REQ-UX-013-013: 탭 컨텍스트에서 피드 추가

**[Event-Driven]** **When** 사용자가 피드를 추가하면(`addFeed`), 시스템은 새 피드의 탭을 탭 바에 추가해야 한다.

판별 기준:
- 추가 직후 새 탭이 탭 바에 노출.
- 새 피드의 fetch 정책: 새 피드를 **즉시 fetch 하여 `loaded`**(추가는 명시적 사용자 의도이므로 즉시 로드가 직관적) 하거나, 추가 후 해당 탭을 활성화하여 지연 로딩 경로로 fetch 한다(결정은 plan.md D3 참고 — 추가 즉시 fetch + 새 탭 활성 권장).
- 기존 `addFeed` 의 cap 체크(REQ-UX-013-001) 와 영속화(`storage.set('rss-feeds', ...)`, `feedStore.ts:113`) 보존.

#### REQ-UX-013-014: 피드 삭제 시 탭 + 캐시 정리 + 활성 탭 재선택

**[Event-Driven]** **When** 사용자가 피드를 삭제하면(`removeFeed`), 시스템은 해당 피드의 탭, 기사 캐시, 피드별 상태를 제거하고, 삭제된 탭이 활성 탭이었다면 다른 탭(예: 첫 번째)을 활성화해야 한다.

판별 기준:
- `removeFeed(id)` 가 `feeds`, `articlesByFeed[id]`, `statusByFeed[id]` 를 제거(기존 `feedStore.ts:116-123` 의 articles 정리 확장).
- 삭제된 탭이 활성이었으면 남은 첫 번째 탭을 활성화. 남은 탭이 없으면 빈 상태(REQ-UX-013-015).
- 새 활성 탭이 `idle`/`stale` 이면 지연 로딩 경로(REQ-UX-013-009) 적용.

#### REQ-UX-013-015: 빈 상태 (피드 0개)

**[State-Driven]** **While** 등록된 피드가 0개인 동안, 위젯은 **항상** 탭 바를 렌더하지 않고 `"피드를 추가해주세요"`(기존 `FeedWidget.tsx:201-214`) 안내를 표시해야 한다.

판별 기준: `feeds.length === 0` → tablist/tabpanel 미렌더, 빈 상태 안내 표시.

### 영역 5: 탭 키보드 접근성

#### REQ-UX-013-016: 탭 ARIA tablist 패턴 + 화살표 키 내비게이션

**[Ubiquitous]** 탭 UI 는 **항상** WAI-ARIA Tabs 패턴(WCAG 2.1 AA)을 만족해야 한다.

판별 기준:
- 컨테이너 `role="tablist"`, 각 탭 `role="tab"`, 본문 `role="tabpanel"`.
- 활성 탭 `aria-selected="true"`, 비활성 `aria-selected="false"`.
- 각 탭은 `aria-controls` 로 tabpanel id 와 연결, tabpanel 은 `aria-labelledby` 로 활성 탭 id 와 연결.
- 키보드: 탭 바 포커스 시 `ArrowLeft`/`ArrowRight`(또는 `ArrowUp`/`ArrowDown`)로 탭 간 포커스 이동, `Enter`/`Space`(또는 포커스 이동 즉시 선택 — automatic activation)로 탭 선택.
- 탭 stop: roving tabindex(활성 탭만 `tabIndex={0}`, 나머지 `tabIndex={-1}`) 또는 동등한 포커스 관리.
- 탭 선택 시 지연 로딩(REQ-UX-013-009)이 키보드 경로에서도 동일하게 트리거되어야 한다.

### 영역 6: 보존 / 회귀 / 공통

#### REQ-UX-013-017: 외부 의존성 무증가

**[Ubiquitous]** 본 SPEC 구현 과정에서 **항상** 신규 npm 패키지를 추가해서는 안 된다.

검증:
- `zustand` 이미 설치 — store 확장 즉시 가능.
- 탭 UI 는 native 마크업 + ARIA 속성으로 구현(라이브러리 불필요).
- 기존 `globals.css` teal/navy 토큰 재사용.

#### REQ-UX-013-018: 위젯 드래그 핸들 + 편집 모드 보존

**[Ubiquitous]** 본 SPEC 구현 후에도 위젯 드래그 핸들(`FeedWidget.tsx:69-94` 의 `widget-drag-handle` + `DragHandleSlot level="widget"`, SPEC-UX-009)과 react-grid-layout(RGL) 위젯 이동이 **항상** 동작해야 한다.

판별 기준:
- `className="widget-drag-handle"` 헤더 영역 보존 — RGL `draggableHandle` 셀렉터.
- `DragHandleSlot level="widget"` + `useEditMode` 의 `isEditing` 보존.
- 탭 바 클릭(탭 선택)이 위젯 드래그를 트리거해서는 안 되며, 위젯 드래그 핸들 영역과 탭 바 영역이 분리되어야 한다.

#### REQ-UX-013-019: 지연 로딩으로 idle 탭 네트워크 0회

**[Unwanted]** 비활성 + 미방문 탭(`status === 'idle'`)에 대해 시스템은 **네트워크 요청을 발생시켜서는 안 된다**.

판별 기준: 최초 로드 후(첫 탭만 fetch), 다른 탭을 클릭하기 전까지 해당 피드의 외부 fetch 호출 0회(테스트에서 mock fetch 호출 수로 검증).

#### REQ-UX-013-020: 빌드/린트/타입 통과

**[Ubiquitous]** 본 SPEC 구현 후 다음 명령이 **항상** 성공해야 한다.

- `npm run build`
- `npm run lint` (ESLint 오류 0)
- `npm run typecheck` (TypeScript 오류 0)

#### REQ-UX-013-021: 데이터 모델 호환 + 영속화 보존

**[Unwanted]** 본 SPEC 은 피드 영속화 스키마(`rss-feeds` 키, `Feed[]` 직렬화)를 변경해서는 안 된다.

판별 기준:
- `Feed` 형상(`id`/`url`/`title`/`error?`)과 `storage` 영속화 키(`rss-feeds`)는 그대로 유지.
- 기사 캐시(`articlesByFeed`)와 피드별 상태(`statusByFeed`)는 **에페메럴**(영속화하지 않음) — 기존 articles 가 영속화되지 않던 정책(`feedStore.ts:47` 주석) 일관.
- 선택적으로 마지막 활성 탭 id 를 영속화할 수 있다(REQ-UX-013-022, Optional).

#### REQ-UX-013-022: 활성 탭 영속화 (Optional)

**[Optional]** **Where** 마지막으로 본 탭을 다음 진입 시 복원하길 원하는 환경에서는, 시스템은 활성 탭의 `feedId` 를 `localStorage`/`storage` 에 영속화할 수 있다(key: `feed-active-tab`).

판별 기준:
- 영속화된 활성 탭 id 가 현재 `feeds` 에 존재하면 그 탭을 활성화하고 지연 로딩(REQ-UX-013-008 의 "첫 탭"은 "마지막 활성 탭"으로 대체될 수 있음).
- 영속화된 id 가 존재하지 않거나 키가 없으면 첫 번째 탭을 활성화(기본 동작).
- 본 옵션 미구현 시 기본 동작은 항상 첫 번째 탭 활성(REQ-UX-013-008).

## 비기능 요구사항

### NFR-001: 네트워크 효율 (지연 로딩 검증)

- 최초 로드 시 외부 fetch 는 1회(첫 탭만, REQ-UX-013-008).
- idle 탭은 네트워크 0회(REQ-UX-013-019).
- 새로고침 1회당 외부 fetch 1회(활성 탭만, REQ-UX-013-012).
- 캐시된 탭 재클릭 시 fetch 0회(REQ-UX-013-010).

### NFR-002: 접근성 (WCAG 2.1 AA + WAI-ARIA Tabs)

- tablist/tab/tabpanel role, `aria-selected`, `aria-controls`/`aria-labelledby`(REQ-UX-013-016).
- 화살표 키 내비게이션 + roving tabindex.
- 탭 hit-area 모바일 터치 보장(최소 44px — WCAG 2.5.5 권고).
- 로딩/오류 상태가 보조기술에 전달(예: `aria-busy` 또는 상태 텍스트).

### NFR-003: 성능 (5개 피드)

- 5개 피드 + 피드당 최대 10개 기사(`feedStore.ts:54` `MAX_ARTICLES_PER_FEED`) 환경에서 탭 전환이 즉각 반응.
- 비활성 탭 기사 목록은 렌더하지 않아 렌더 비용 절감(조건부 렌더).
- 탭 전환은 캐시 hit 시 네트워크 없이 즉시 표시.

### NFR-004: DnD / 편집 모드 무회귀

- 위젯 드래그 핸들 + RGL 위젯 이동 + 편집 모드 시각(SPEC-UX-009) 회귀 0(REQ-UX-013-018).

### NFR-005: 테스트 전략 (lazy-load 검증)

- vitest 컴포넌트/스토어 테스트에서 mock fetch 호출 수로 지연 로딩을 검증(최초 1회, idle 탭 0회, 재클릭 0회, 새로고침 1회).
- 기존 `feedStore.test.ts` 는 병합 로딩(`refreshAll` 전체 fetch) 전제를 가지므로 본 SPEC 에서 갱신 필요(아래 데이터 스키마 + plan 마이그레이션 노트 참고).

### NFR-006: e2e 검증

- Playwright e2e 로 탭 전환, 지연 로딩(네트워크 인터셉트로 요청 수 검증), 캐시 재사용, 새로고침 시맨틱, cap 차단, 키보드 탭 내비게이션을 검증. 기존 `e2e/spec-ux-011-favorites-dnd.spec.ts` 의 헬퍼(`waitForUI`, `enterWidgetMode`) 패턴을 참고한다.

## 제약사항

- React 19 / TypeScript strict / Zustand 5 유지
- 한국어 코드 주석 (per `.moai/config/sections/language.yaml` `code_comments: ko`)
- 신규 파일 첫 줄은 한국어 한 줄 헤더 주석
- 신규 외부 의존성 추가 금지 (REQ-UX-013-017)
- TDD 모드 준수 (NFR-005)
- "Surgical Changes" 원칙 — SPEC 외 리팩토링 금지
- 백엔드/Firestore/영속화 스키마 변경 금지 — `Feed` 형상과 `rss-feeds` 키 유지 (REQ-UX-013-021)
- 위젯 드래그 핸들 + RGL 보존 (REQ-UX-013-018)
- rss2json 프록시(`feedStore.ts:57-58`) 그대로 사용 — 외부 API 교체 금지(비목표)

## 데이터 스키마

### feedStore 형상 (병합 articles → 피드별 article map + per-feed status)

```typescript
// src/renderer/stores/feedStore.ts (수정)

/** 피드별 로딩/캐시 상태 (REQ-UX-013-007) */
type FeedStatus = 'idle' | 'loading' | 'loaded' | 'error' | 'stale'

interface FeedState {
  feeds: Feed[]
  /** 피드별 기사 캐시 (병합 articles 대체) — feedId 키 */
  articlesByFeed: Record<string, Article[]>
  /** 피드별 상태 — feedId 키 */
  statusByFeed: Record<string, FeedStatus>
  /** 현재 활성 탭의 feedId (없으면 첫 피드) */
  activeFeedId: string | null

  /** URL로 피드 추가 (최대 5개, 추가 즉시 fetch + 새 탭 활성 — D3) */
  addFeed: (url: string) => Promise<void>
  /** 피드 + 캐시 + 상태 제거 + 활성 탭 재선택 (REQ-UX-013-014) */
  removeFeed: (id: string) => void
  /** 활성 탭 설정 — idle/stale 이면 지연 로딩 트리거 (REQ-UX-013-009) */
  setActiveFeed: (id: string) => void
  /** 단일 피드 지연 로딩 — loaded 면 no-op(캐시), 강제 옵션 가능 (REQ-UX-013-009/010) */
  loadFeed: (id: string, opts?: { force?: boolean }) => Promise<void>
  /** 활성 탭 강제 재요청 + 나머지 stale (REQ-UX-013-012) */
  refreshActiveFeed: () => Promise<void>
  /** 앱 시작 시 피드 복원 + 첫(또는 마지막 활성) 탭만 로드 (REQ-UX-013-008) */
  loadFeeds: () => Promise<void>
}
```

설계 노트:
- 기존 단일 `articles: Article[]` + `loading: boolean`(`feedStore.ts:29-31`)은 `articlesByFeed` + `statusByFeed` 로 대체된다. 활성 탭 기사 = `articlesByFeed[activeFeedId]`.
- `fetchFeedArticles`(`feedStore.ts:125-169`)는 `loadFeed` 내부 구현으로 흡수하되, 성공 시 `articlesByFeed[id]` 채움 + `statusByFeed[id] = 'loaded'`, 실패 시 `feed.error` + `statusByFeed[id] = 'error'`.
- `refreshAll`(`:171-174`)은 제거하거나 internal-only(테스트 마이그레이션 시 참고).

### 새로고침 시맨틱 (채택 — REQ-UX-013-012)

```typescript
refreshActiveFeed: async () => {
  const { activeFeedId, feeds } = get()
  if (activeFeedId === null) return
  // 활성 탭 강제 재요청
  await get().loadFeed(activeFeedId, { force: true })
  // 나머지 loaded 탭을 stale 로 표시 (다음 방문 시 재로드)
  set((state) => {
    const next = { ...state.statusByFeed }
    for (const f of feeds) {
      if (f.id !== activeFeedId && next[f.id] === 'loaded') next[f.id] = 'stale'
    }
    return { statusByFeed: next }
  })
},
```

### 지연 로딩 가드 (REQ-UX-013-009/010)

```typescript
loadFeed: async (id, opts) => {
  const status = get().statusByFeed[id]
  // 캐시 재사용: loaded 면 강제 옵션 없이는 재요청 안 함 (REQ-UX-013-010)
  if (status === 'loaded' && opts?.force !== true) return
  set((s) => ({ statusByFeed: { ...s.statusByFeed, [id]: 'loading' } }))
  // ... fetch (기존 fetchFeedArticles 로직) ...
  // 성공: articlesByFeed[id] 채움 + statusByFeed[id] = 'loaded'
  // 실패: feed.error + statusByFeed[id] = 'error'
},
```

### 탭 UI DOM 구조 (예시 — WAI-ARIA Tabs)

```jsx
{/* FeedWidget — 탭 바 (REQ-UX-013-004/006/016) */}
<div role="tablist" aria-label="뉴스 피드 탭" style={{ display: 'flex', overflowX: 'auto', gap: 4 }}>
  {feeds.map((feed) => {
    const selected = feed.id === activeFeedId
    return (
      <button
        key={feed.id}
        role="tab"
        id={`feed-tab-${feed.id}`}
        aria-selected={selected}
        aria-controls={`feed-panel-${feed.id}`}
        tabIndex={selected ? 0 : -1}
        onClick={() => setActiveFeed(feed.id)}
        onKeyDown={handleTabKeyDown /* ArrowLeft/Right + roving tabindex */}
        style={{
          color: selected ? 'var(--text-primary)' : 'var(--text-muted)',
          borderBottom: selected ? '2px solid var(--accent)' : '2px solid transparent',
        }}
      >
        {feed.title !== '' ? feed.title : feed.url}
      </button>
    )
  })}
</div>

{/* tabpanel (REQ-UX-013-005/011) */}
{activeFeedId !== null && (
  <div role="tabpanel" id={`feed-panel-${activeFeedId}`} aria-labelledby={`feed-tab-${activeFeedId}`}>
    {statusByFeed[activeFeedId] === 'loading' && <div>불러오는 중...</div>}
    {statusByFeed[activeFeedId] === 'error' && <div>오류: ...</div>}
    {(statusByFeed[activeFeedId] === 'loaded' || statusByFeed[activeFeedId] === 'stale') &&
      (articlesByFeed[activeFeedId] ?? [])
        .slice()
        .sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime())
        .map(/* 기사 행 — 기존 FeedWidget.tsx:230-284 재사용 */)}
  </div>
)}
```

## @MX 태깅 가이드

본 SPEC 으로 수정되는 anchor 의 `@MX:SPEC` sub-line 에 `SPEC-UX-013` 을 추가한다(per `.claude/rules/moai/workflow/mx-tag-protocol.md`, `code_comments: ko`).

- `feedStore.ts:1-3` 의 `@MX:ANCHOR` + `@MX:SPEC: SPEC-WIDGET-003` → `SPEC-UX-013` 추가(store 가 FeedWidget 단일 의존, fan_in 확장 시 `@MX:REASON` 갱신).
- `FeedWidget.tsx:1-2` 의 `@MX:NOTE` + `@MX:SPEC: SPEC-WIDGET-003, SPEC-UX-009` → `SPEC-UX-013` 추가.
- 신규 `loadFeed`/`refreshActiveFeed`/`setActiveFeed` 가 FeedWidget 에서 다수 호출(fan_in >= 3)되면 store anchor 의 `@MX:REASON` 에 지연 로딩 진입점 명시.

## Exclusions (What NOT to Build)

- **새로고침 = 전체 캐시 초기화 + 첫 탭 재로드(대안 B)**: 본 SPEC 은 "활성 탭만 재요청 + 나머지 stale"(REQ-UX-013-012) 채택. 전체 강제 갱신은 미지원 — 사용자는 각 탭 방문으로 stale 재로드
- **모든 탭 동시 fetch(기존 `refreshAll` 동작)**: 병합 로딩은 본 SPEC 의 제거 대상. internal API 로만 보존할 수 있으나 UI 경로에서 호출하지 않음
- **자동 새로고침 인터벌(polling)**: 주기적 자동 갱신은 비목표 — 별도 SPEC
- **피드 탭 재정렬(드래그로 탭 순서 변경)**: 탭 순서는 `feeds` 배열 순서 고정. 탭 재정렬은 별도 SPEC
- **OPML import / export**: 피드 일괄 가져오기/내보내기는 비목표 — 별도 SPEC
- **무한 스크롤 / 페이지네이션**: 피드당 최대 10개 기사(`MAX_ARTICLES_PER_FEED`) 고정. 추가 로딩은 별도 SPEC
- **기사 읽음/안읽음 표시, 즐겨찾기, 검색**: 본 SPEC 은 탭 + 지연 로딩 + cap UX 한정. 기사 단위 기능은 별도 SPEC
- **rss2json 외 대체 프록시 / 직접 RSS 파싱**: 기존 rss2json 프록시 유지(REQ-UX-013 제약사항). 프록시 교체는 별도 SPEC
- **기사 캐시 영속화(세션 간 복원)**: `articlesByFeed`/`statusByFeed` 는 에페메럴(REQ-UX-013-021). 캐시 영속화는 별도 SPEC
- **피드 영속화 스키마 변경**: `rss-feeds` 키 + `Feed[]` 직렬화 유지 — 변경 금지
- **PivotLayout 영향**: 본 SPEC 은 `viewMode === 'widgets'` 뉴스 피드 위젯 한정

## 추적성 (Traceability)

| REQ | 관련 파일 (현재 grep 검증) | 변경 영역 |
|-----|---------------------------|----------|
| REQ-UX-013-001 | `feedStore.ts:51, 100-103` (`MAX_FEEDS`, cap 체크) | 5개 제한 유지 |
| REQ-UX-013-002 | `FeedWidget.tsx:116-131` (추가 버튼), `:292` (N/5 표시) | cap UX(버튼 비활성 + 안내) |
| REQ-UX-013-003 | `feedStore.ts:100-103` (cap no-op) | graceful no-op |
| REQ-UX-013-004 | `FeedWidget.tsx` (신규 탭 바) | tablist 렌더 |
| REQ-UX-013-005 | `FeedWidget.tsx:224-286` (병합 목록) | tabpanel 활성 탭 기사 |
| REQ-UX-013-006 | `FeedWidget.tsx` 탭 요소, `globals.css` 토큰 | aria-selected + teal/navy 강조 |
| REQ-UX-013-007 | `feedStore.ts:27-31` (`loading: boolean`) | `statusByFeed` per-feed 상태 |
| REQ-UX-013-008 | `feedStore.ts:85-95` (`loadFeeds`) | 최초 첫 탭만 fetch |
| REQ-UX-013-009 | `feedStore.ts` 신규 `loadFeed`/`setActiveFeed` | 탭 클릭 지연 로딩 |
| REQ-UX-013-010 | `feedStore.ts` `loadFeed` 가드 | 캐시 재사용(loaded no-op) |
| REQ-UX-013-011 | `FeedWidget.tsx:216-221` (로딩), `:176-198` (오류 배지) | 피드별 로딩/오류 |
| REQ-UX-013-012 | `feedStore.ts:171-174` (`refreshAll`), `FeedWidget.tsx:46-48, 97-114` (새로고침) | 활성 탭 재요청 + stale |
| REQ-UX-013-013 | `feedStore.ts:97-114` (`addFeed`), `FeedWidget.tsx:35-44` | 탭 추가 |
| REQ-UX-013-014 | `feedStore.ts:116-123` (`removeFeed`), `FeedWidget.tsx:316-330` | 탭 + 캐시 정리 + 활성 재선택 |
| REQ-UX-013-015 | `FeedWidget.tsx:201-214` (빈 상태) | 피드 0개 안내 |
| REQ-UX-013-016 | `FeedWidget.tsx` 탭 바 (신규) | tablist/tab/tabpanel + 화살표 키 |
| REQ-UX-013-017 | `package.json` (변경 없음) | 의존성 무증가 |
| REQ-UX-013-018 | `FeedWidget.tsx:69-94` (`widget-drag-handle`, `DragHandleSlot`) | RGL 핸들 보존 |
| REQ-UX-013-019 | `feedStore.ts` `loadFeed`/지연 경로 | idle 탭 네트워크 0회 |
| REQ-UX-013-021 | `feedStore.ts:47-48, 113` (`rss-feeds` 영속화) | 스키마 보존 |
| REQ-UX-013-022 | `feedStore.ts` `activeFeedId` 영속화(선택) | 활성 탭 복원 |
</content>
</invoke>
