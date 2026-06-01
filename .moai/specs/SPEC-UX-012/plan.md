# SPEC-UX-012: 구현 계획

## 기술 접근 방식

본 SPEC 은 SPEC-UX-007/008/009/010/011 의 단일 편집 토글 + 단일 DndContext + 레벨별 핸들 구조를 **그대로 유지**하면서, 즐겨찾기 위젯의 카테고리 표시를 **고정 높이(220px) 카드 그리드 → 멀티 확장 아코디언 + 칩 인라인 wrap 링크** 로 재설계한다. 핵심 변화 5개 영역:

1. **확장 상태 store**: 카테고리별 펼침/접힘 상태(`Record<categoryId, boolean>`)를 관리하고 localStorage 에 영속화. 기존 `editModeStore.ts:32-45` 의 `readBool`/키 상수 패턴 재사용. 기본값은 "키 없으면 펼침"(all expanded)
2. **BookmarkCard 아코디언화**: 고정 높이(`height: 220`) + 내부 스크롤 래퍼 제거. 헤더에 링크 수 배지 + 셰브론 추가, `aria-expanded`/`aria-controls` disclosure 패턴. 펼침 상태에 따라 링크 칩 영역 조건부 렌더
3. **링크 칩 레이아웃**: 2열 그리드(`gridTemplateColumns: '1fr 1fr'`) → `flex-wrap` 칩. `SortableLink` 의 칩 시각(`--link-bg` 등) + truncation 완화(maxWidth)
4. **WidgetLayout 즐겨찾기 섹션**: 고정 행 높이 그리드(`gridAutoRows: '220px'`) → 카테고리 세로 스택. 위젯 컨테이너 스크롤 유지. 단일 DndContext + 카테고리 SortableContext 보존
5. **헤더 토글 vs 드래그/편집 충돌 분리**: 헤더 클릭 = 펼침 토글, 그룹 핸들/⚙️ 버튼 = stopPropagation. SPEC-UX-011 의 헤더 행 전체 listeners spread(`BookmarkCard.tsx:116`) 와 토글 클릭의 공존 설계

### 핵심 결정 사항

**결정 D1 — 확장 상태 store: 신규 store vs editModeStore 확장 (REQ-UX-012-002/003)**

선택지:
- (a) 신규 `favoritesExpandStore.ts` — 즐겨찾기 확장 전용 store
- (b) `editModeStore` 에 `expanded` map + `toggleExpand` 추가

**결정: (a) 신규 `favoritesExpandStore.ts`**

**이유**:
1. **관심사 분리**: `editModeStore` 는 "편집 모드 활성/자동종료/드래그" 상태에 집중. 확장 상태는 편집 모드와 무관한 표시(view) 상태 — 별도 store 가 응집도 높음
2. **fan_in 명확**: 확장 store 는 BookmarkCard(읽기/토글), WidgetLayout(초기 로드), 헤더 토글(토글) 이 의존 → 단일 책임 store 로 `@MX:ANCHOR` 부여 적합
3. **영속화 독립**: `editModeStore.isEditing` 은 세션 휘발이지만 확장 상태는 영속 — 영속화 정책이 달라 분리가 자연스러움
4. **기존 패턴 일관**: `editModeStore.ts:32-45` 의 `readBool`/키 상수 패턴을 신규 store 가 그대로 차용 (단, map 직렬화는 `JSON.parse`/`stringify` 사용)

**구현 패턴**:
```typescript
// favoritesExpandStore.ts (신규, 한국어 헤더 주석)
const FAVORITES_EXPANDED_KEY = 'favorites-expanded'

// 영속화된 펼침 카테고리 id 배열 로드 — 없으면 빈 객체(=모두 펼침으로 해석)
function readExpanded(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(FAVORITES_EXPANDED_KEY)
    if (raw === null) return {}
    return JSON.parse(raw) as Record<string, boolean>
  } catch {
    return {}
  }
}

export const useFavoritesExpandStore = create<FavoritesExpandState>((set, get) => ({
  expanded: readExpanded(),
  isExpanded: (id) => {
    const v = get().expanded[id]
    return v === undefined ? true : v   // REQ-UX-012-004: 키 없으면 펼침
  },
  toggleExpand: (id) => {
    const next = { ...get().expanded, [id]: !(get().expanded[id] ?? true) }
    try { localStorage.setItem(FAVORITES_EXPANDED_KEY, JSON.stringify(next)) } catch { /* 무시 */ }
    set({ expanded: next })
  },
}))
```

**결정 D2 — 헤더 클릭 토글 vs 그룹 핸들 드래그 공존 (REQ-UX-012-006/012)**

현재 SPEC-UX-011 은 헤더 행 전체에 dnd-kit listeners 를 spread 한다(`BookmarkCard.tsx:116` `{...(isEditing ? listeners : {})}`). 본 SPEC 은 헤더 클릭에 **펼침 토글**도 부여해야 하므로 충돌 가능성이 있다.

선택지:
- (a) 헤더 클릭(토글)은 항상 활성, 편집 모드 ON 시 드래그는 **그룹 핸들(`data-group-handle`)에만** listeners 제한 (SPEC-UX-009 원래 설계로 회귀)
- (b) 헤더 행 전체 listeners 유지(SPEC-UX-011) + 토글은 `onClick` 으로 처리, 드래그는 pointer move 임계값으로 구분(dnd-kit PointerSensor distance)

**결정: (a) 그룹 핸들에만 listeners 제한 + 헤더 클릭 = 토글**

**이유**:
1. **명확한 의도 분리**: 헤더 본문 클릭 = "펼침/접힘"(가장 빈번한 동작), 그룹 핸들 잡기 = "카테고리 이동"(편집 모드 전용). 동작 모호성 제거
2. **SPEC-UX-009 의 원래 설계 의도와 일치**: REQ-UX-009-004 는 listeners 를 핸들 슬롯에만 제한하는 것이 원칙. SPEC-UX-011 이 헤더 전체로 확장한 것은 드래그 편의를 위한 것이었으나, 본 SPEC 에서 헤더 클릭이 토글을 담당하면서 핸들 제한이 다시 타당
3. **dnd-kit distance 임계값 의존 회피**: (b) 는 클릭과 드래그를 이동 거리로 구분하는데, 작은 의도치 않은 이동에도 드래그가 시작되어 토글이 누락될 수 있음 — 사용자 혼란

**판별 기준**:
- `BookmarkCard.tsx:116` 의 헤더 행 listeners spread 제거 → `DragHandleSlot level="group"` 에만 listeners(SPEC-UX-009 원형)
- 헤더 행에 `onClick={() => toggleExpand(category.id)}` 부여
- ⚙️ 버튼(`:144-152`) + 그룹 핸들 pointerdown 은 `stopPropagation()` 로 토글 버블링 차단

**결정 D3 — 칩 링크 sorting strategy (REQ-UX-012-013)**

선택지:
- (a) `rectSortingStrategy` — 2D wrap 레이아웃에 적합(dnd-kit 권장)
- (b) `horizontalListSortingStrategy` — 단일 행 가정
- (c) `verticalListSortingStrategy` — 세로 리스트 가정

**결정: (a) `rectSortingStrategy`**

**이유**:
1. 칩 flex-wrap 은 2D 그리드와 유사한 레이아웃 — `rectSortingStrategy` 가 wrap 된 칩의 위치 계산에 가장 적합
2. 기존 `BookmarkCard.tsx:179` 가 이미 `rectSortingStrategy` 사용 중 — 변경 최소화
3. dnd-kit 공식 문서상 wrap 레이아웃에 `rectSortingStrategy` 권장

**결정 D4 — cross-group 드롭 경로 비활성 방식 (REQ-UX-012-014)**

선택지:
- (a) `useDroppable`(`BookmarkCard.tsx:58`)을 펼친 카테고리에만 등록, 접힌 카테고리는 미등록
- (b) droppable 은 그대로 등록하되 `handleDragOver`/`handleDragEnd`(`WidgetLayout.tsx:235-303`)의 cross-group 분기를 no-op 처리
- (c) droppable + cross-group 핸들러 코드 자체를 제거(SPEC-UX-008 롤백)

**결정: (b) droppable 등록 유지 + cross-group 핸들러 분기 no-op**

**이유**:
1. **store 액션 보존(Exclusions)**: SPEC-UX-008 `moveLinkBetweenGroups` store 액션을 삭제하지 않음 — 후속 SPEC 재도입 용이. (c) 는 코드 손실 위험
2. **회귀 표면 최소화**: droppable 등록 자체는 무해(같은 카테고리 내 정렬에도 droppable 필요). cross-group **이동 호출만** 차단하면 됨
3. **명시적 비목표 표현**: `handleDragEnd` 의 cross-group 분기에 "SPEC-UX-012: cross-group 비목표 — no-op" 주석으로 의도 명문화. 후속 SPEC 에서 분기 복원만 하면 됨

**판별 기준**:
- `WidgetLayout.tsx:237-303` `handleDragEnd` 의 `active.data.type === 'link'` && `activeCategoryId !== overCategoryId` 분기에서 `moveLinkBetweenGroups` 호출을 조건부 비활성(no-op) + 주석
- 같은 카테고리 내 링크 정렬(`updateBookmark`) 경로는 유지

**결정 D5 — 셰브론 아이콘 (REQ-UX-012-005)**

`lucide-react` 의 `ChevronDown` 사용(이미 설치, `DragHandleSlot.tsx:3` 에서 `GripVertical`/`Grip` import 중). 펼침 시 `rotate(180deg)` transition, `aria-hidden="true"`. 신규 의존성 없음(REQ-UX-012-016).

**결정 D6 — 빈 카테고리 placeholder 의 아코디언 적응 (SPEC-UX-010 보존)**

SPEC-UX-010 의 빈 카테고리 placeholder(`BookmarkCard.tsx:219-239` "여기로 드래그하여 추가" / "북마크가 없습니다")는 본 SPEC 아코디언에서 **펼친 상태에서만** 칩 컨테이너 내부에 표시한다. 접힌 카테고리는 헤더의 링크 수 배지 "(0)" 로 빈 상태를 표현. cross-group 비목표(REQ-UX-012-014)이므로 placeholder 의 "여기로 드래그하여 추가" 문구는 "북마크가 없습니다" 로 단순화 검토(편집 모드여도 cross-group drop 비활성이므로 — plan 검토 사항 참고).

## 마일스톤

### M1: 확장 상태 store 신규 (Priority High)

- **T-001**: `favoritesExpandStore.ts` 신규
  - 파일: `src/renderer/stores/favoritesExpandStore.ts` (신규, 한국어 헤더 주석)
  - 인터페이스: `FavoritesExpandState { expanded, isExpanded, toggleExpand }`
  - 기본값: 키 없으면 펼침(REQ-UX-012-004) — `isExpanded` 가 undefined → true 반환
  - 영속화: `favorites-expanded` 키, JSON map 직렬화 (REQ-UX-012-003)
  - `@MX:ANCHOR` + `@MX:REASON` + `@MX:SPEC: SPEC-UX-012` (fan_in >= 3)
- **T-002**: `favoritesExpandStore.test.ts` 단위 테스트
  - 파일: `src/renderer/stores/favoritesExpandStore.test.ts` (신규)
  - 케이스: 초기 빈 map → 모든 id `isExpanded === true`, `toggleExpand` 1회 → false + localStorage set, 재토글 → true, localStorage 복원, JSON 파싱 실패 시 graceful fallback

### M2: BookmarkCard 아코디언화 (Priority High)

- **T-003**: `BookmarkCard.tsx` 고정 높이 + 내부 스크롤 래퍼 제거
  - 파일: `src/renderer/components/BookmarkCard/BookmarkCard.tsx` (수정)
  - 제거: `:80` `height: 220`, `:81` `overflow: 'hidden'` (또는 펼침에 맞게 조정), `:182-198` 스크롤 래퍼 div
  - 카드 컨테이너는 콘텐츠 높이에 맞춰 자연 확장 (`height: 'auto'`)
- **T-004**: `BookmarkCard.tsx` 헤더 — 링크 수 배지 + 셰브론 + disclosure 패턴
  - 파일: `BookmarkCard.tsx:99-171` (수정)
  - 추가: 링크 수 배지 `<span>({category.links.length})</span>` (이름 우측, `--text-muted`)
  - 추가: `ChevronDown` 셰브론 (펼침 시 rotate 180, `aria-hidden`)
  - 헤더 토글 요소에 `role`/`aria-expanded`/`aria-controls` (REQ-UX-012-007)
  - import: `import { ChevronDown } from 'lucide-react'`
- **T-005**: `BookmarkCard.tsx` 헤더 클릭 토글 + 인터랙티브 예외 (D2)
  - 파일: `BookmarkCard.tsx:99-171` (수정)
  - 헤더 행 listeners spread 제거(`:116`) → `DragHandleSlot level="group"` 에만 listeners(SPEC-UX-009 원형 회귀)
  - 헤더 행에 `onClick={() => toggleExpand(category.id)}` + `onKeyDown` (Enter/Space)
  - ⚙️ 버튼 + 그룹 핸들 pointerdown `stopPropagation` (REQ-UX-012-006)
  - `useFavoritesExpandStore` 구독: `const isExpanded = useFavoritesExpandStore(s => s.isExpanded(category.id))`
- **T-006**: `BookmarkCard.tsx` 칩 링크 레이아웃 + 조건부 렌더
  - 파일: `BookmarkCard.tsx:201-242` (수정)
  - 변경: 2열 그리드 → `display: 'flex', flexWrap: 'wrap', gap: 8`
  - 칩 컨테이너는 `isExpanded` 일 때만 렌더(또는 `display: none`) — REQ-UX-012-008
  - 칩 컨테이너에 `id={panelId}` (헤더 `aria-controls` 연결)
  - SPEC-UX-010 placeholder 는 펼침 + `links.length === 0` 시 칩 컨테이너 내부 표시(D6)
- **T-007**: `BookmarkCard.test.tsx` 갱신
  - 파일: `BookmarkCard.test.tsx` (수정)
  - 신규: 헤더에 링크 수 배지 "(N)" 표시, `aria-expanded` 속성, 헤더 클릭 → `toggleExpand` 호출, ⚙️ 클릭 → 토글 미발생(stopPropagation), 펼침 시 칩 렌더 / 접힘 시 칩 미렌더
  - 회귀: 편집 모드 ON 시 accent border(`:71`) 보존, 그룹 핸들 존재

### M3: SortableLink 칩 시각 + truncation 완화 (Priority High)

- **T-008**: `SortableLink.tsx` 칩 스타일 적응
  - 파일: `src/renderer/components/BookmarkCard/SortableLink.tsx` (수정)
  - 변경: 칩 컨테이너 `flex: '0 0 auto'`, `maxWidth: 200` (REQ-UX-012-010), 패딩 컴팩트(`4px 10px`)
  - 보존: `--link-bg`/`--link-hover` hover, 드래그 중 `--accent-soft` 시각(SPEC-UX-011), 링크 핸들 슬롯(SPEC-UX-009)
  - 이름 span: `maxWidth` 내 표시, 초과 시 ellipsis (truncation 완화)
- **T-009**: `globals.css` 칩/아코디언 시각 토큰 (선택적)
  - 파일: `src/renderer/styles/globals.css` (수정)
  - 칩 hover/active 토큰, 셰브론 회전 transition, `@media (prefers-reduced-motion: reduce)` 블록에 transition 무효 규칙 추가(기존 블록 확장)
- **T-010**: `SortableLink.test.tsx` (있으면) 또는 BookmarkCard 통합 테스트 갱신
  - 칩 폭 정책, hover 배경, 드래그 중 시각 보존 검증

### M4: WidgetLayout 즐겨찾기 섹션 아코디언 스택 (Priority High)

- **T-011**: `WidgetLayout.tsx` 고정 행 높이 그리드 → 세로 스택
  - 파일: `src/renderer/components/WidgetLayout/WidgetLayout.tsx:971-995` (수정)
  - 제거: `:979` `gridAutoRows: '220px'`
  - 변경: 카테고리 컨테이너를 `display: 'flex', flexDirection: 'column', gap` 세로 스택(또는 1열 grid). 위젯 컨테이너 스크롤(`:908` `overflowY: 'auto'`) 유지
  - 카테고리 SortableContext(`:971`) 보존 — `rectSortingStrategy` 또는 `verticalListSortingStrategy` (세로 스택에 적합한 전략 검토)
- **T-012**: `WidgetLayout.tsx` cross-group 드롭 경로 no-op (D4)
  - 파일: `WidgetLayout.tsx:235-303` `handleDragEnd` (수정)
  - cross-group 분기(`active.type === 'link'` && `activeCategoryId !== overCategoryId`)에서 `moveLinkBetweenGroups` 호출 비활성 + "SPEC-UX-012: cross-group 비목표 no-op" 주석
  - 같은 카테고리 내 정렬(`updateBookmark`) 경로 유지
- **T-013**: `WidgetLayout.tsx` autoScroll 임계값 / DragOverlay 적응
  - 파일: `WidgetLayout.tsx:967` autoScroll, `:1001-1040` DragOverlay (검토/조정)
  - 고정 행 높이 제거로 autoScroll 동작이 달라질 수 있음 — 위젯 컨테이너 스크롤에 맞게 임계값 검토
  - 그룹 DragOverlay 미러는 보존(헤더 + 링크 수)
- **T-014**: `WidgetLayout.test.tsx` 회귀 + 신규
  - 파일: `WidgetLayout.test.tsx` (수정)
  - 신규: `gridAutoRows: '220px'` 부재 검증, 카테고리 세로 스택
  - 회귀: 단일 DndContext, 카테고리 정렬, Esc 종료, 타이머 카운트다운(SPEC-UX-011)

### M5: 타이머 / 반응형 / 회귀 검증 (Priority High)

- **T-015**: 타이머 일시 중지 보존 검증 (REQ-UX-012-015)
  - `editModeStore.isDragging`/`setDragging` + `WidgetLayout.tsx:463-499` `isDragInProgress` 가드 회귀 0
  - 아코디언 헤더 토글이 `pointerdown` 활동 리스너(`:491`)로 타이머 리셋되는지 확인
- **T-016**: 모바일 반응형 검증 (REQ-UX-012-017)
  - 모바일 breakpoint 에서 카테고리 1열 스택 + 칩 wrap
  - 헤더 토글 hit-area 44px
- **T-017**: SPEC-UX-006~011 회귀 0 (REQ-UX-012-020)
  - 기존 단위/통합 테스트 100% 통과 (cross-group 비목표 항목 제외)
  - `npm run build` / `npm run lint` / `npm run typecheck` 0 error

### M6: e2e Playwright 시나리오 (Priority Medium)

- **T-018**: 아코디언 e2e 시나리오
  - 파일: `e2e/spec-ux-012-favorites-accordion.spec.ts` (신규, `spec-ux-011-favorites-dnd.spec.ts` 헬퍼 패턴 재사용)
  - 시나리오:
    1. 최초 진입 → 모든 카테고리 펼침(REQ-UX-012-004)
    2. 카테고리 헤더 클릭 → 접힘(`aria-expanded === false`, 칩 미표시)
    3. 다른 카테고리도 펼친 채 유지(멀티 확장, REQ-UX-012-002)
    4. 새로고침 → 마지막 펼침/접힘 상태 복원(localStorage, REQ-UX-012-003)
    5. 헤더에 링크 수 배지 "(N)" 표시
    6. `Enter`/`Space` 키로 헤더 토글(REQ-UX-012-007)
    7. ⚙️ 버튼 클릭 → 토글 미발생 + EditModal 열림
- **T-019**: DnD 보존 e2e 시나리오
  - 파일: `e2e/spec-ux-012-favorites-accordion.spec.ts` 내 또는 별도
  - 시나리오:
    1. 편집 모드 ON → 그룹 핸들 드래그 → 카테고리 재정렬(REQ-UX-012-012)
    2. 펼친 카테고리 내 링크 핸들 드래그 → 같은 카테고리 정렬(REQ-UX-012-013)
    3. (비목표 검증) 다른 카테고리로 링크 드래그 → 이동 미발생(REQ-UX-012-014)
    4. 드래그 중 카운트다운 정지(SPEC-UX-011 회귀, REQ-UX-012-015)
- **T-020**: 칩 wrap + 반응형 e2e
  - 시나리오: desktop(1280×720) 칩 wrap, mobile(375×667) 1열 스택 + 칩 wrap

## 파일 변경 맵 (실제 grep 결과 기반)

| 파일 경로 | 변경 유형 | 사유 / 관련 REQ |
|----------|----------|----------------|
| `src/renderer/stores/favoritesExpandStore.ts` | 신규 | 확장 상태 store / REQ-002, 003, 004 |
| `src/renderer/stores/favoritesExpandStore.test.ts` | 신규 | store 단위 테스트 |
| `src/renderer/components/BookmarkCard/BookmarkCard.tsx` | 수정 | 고정 높이 제거 + 아코디언 헤더(배지/셰브론/disclosure) + 칩 레이아웃 / REQ-001, 005, 006, 007, 008, 014, 018 |
| `src/renderer/components/BookmarkCard/BookmarkCard.test.tsx` | 수정 | 아코디언 + 배지 + 토글 케이스 |
| `src/renderer/components/BookmarkCard/SortableLink.tsx` | 수정 | 칩 시각 + truncation 완화 / REQ-009, 010, 013 |
| `src/renderer/components/WidgetLayout/WidgetLayout.tsx` | 수정 | 고정 행 높이 그리드 → 세로 스택 + cross-group no-op + autoScroll/DragOverlay 적응 / REQ-001, 011, 012, 014, 015, 017 |
| `src/renderer/components/WidgetLayout/WidgetLayout.test.tsx` | 수정 | 세로 스택 + 회귀 검증 |
| `src/renderer/styles/globals.css` | 수정 | 칩/셰브론 시각 토큰 + reduced-motion / REQ-009 |
| `e2e/spec-ux-012-favorites-accordion.spec.ts` | 신규 | 아코디언 + DnD 보존 + 반응형 e2e |

**조사 결과 발견된 기존 자산** (중복 작업 회피):

- `lucide-react` 이미 설치 — `ChevronDown` 즉시 import (`DragHandleSlot.tsx:3` 에서 `GripVertical`/`Grip` 사용 중)
- `editModeStore.ts:32-45` 의 `readBool`/키 상수 패턴 — `favoritesExpandStore` 가 JSON map 버전으로 차용
- `globals.css:240-262` 의 토큰(`--link-bg`/`--link-hover`/`--surface-2`/`--accent-soft`/`--text-muted`/`--text-faint`/`--border`) 그대로 재사용
- `BookmarkCard.tsx:61` `linkIds` useMemo, `WidgetLayout.tsx:320` `displayBookmarkIds` useMemo — 드래그 중 배열 안정성 패턴 보존
- `DragHandleSlot` 컴포넌트(SPEC-UX-009) — 그룹/링크 핸들 그대로 사용
- `SortableLink.tsx:49-70` 드래그 중 시각(`--accent-soft` + dashed outline) — SPEC-UX-011 보존
- `WidgetLayout.tsx:951-968` 단일 DndContext + accessibility announcements + `closestCorners` 보존
- `editModeStore.isDragging`/`setDragging` + `WidgetLayout.tsx:463-499` 타이머 일시 중지 (SPEC-UX-011) 보존
- SPEC-UX-008 `moveLinkBetweenGroups` store 액션 — 삭제하지 않고 드롭 경로만 no-op (D4)
- `e2e/spec-ux-011-favorites-dnd.spec.ts` 의 헬퍼(`waitForUI`, `enterWidgetMode`, `enableEditMode`, `dragTo`) — e2e 재사용

## 리스크

| 리스크 | 영향 | 완화 전략 |
|--------|------|-----------|
| 고정 높이 제거로 카테고리 재정렬 시 세로 jitter 재발 | 드래그 UX 회귀 | NFR-002 — 드래그 대상은 그룹 핸들이고 DragOverlay 미러로 처리. 접힌 카테고리는 헤더 높이로 일정. 펼친 카테고리 높이 가변은 `rectSortingStrategy`/`verticalListSortingStrategy` 의 transform 정렬로 흡수. T-019 e2e 로 검증 |
| 헤더 클릭 토글 vs 그룹 핸들 드래그 충돌 | 토글 누락 또는 드래그 미시작 | D2 — listeners 를 그룹 핸들에만 제한 + 헤더 onClick=토글 + 핸들/⚙️ stopPropagation. SPEC-UX-009 원형 회귀로 의도 분리 명확 |
| cross-group 비활성으로 SPEC-UX-008 회귀 인식 | "이동 안 됨" 사용자 보고 | REQ-UX-012-014 의 명시적 비목표 문서화 + PR 본문 명시. store 액션 보존으로 후속 SPEC 재도입 용이 |
| localStorage `favorites-expanded` JSON 파싱 실패 | store 초기화 실패 | T-001 의 try/catch graceful fallback(`{}` 반환 → 모두 펼침). T-002 단위 테스트로 검증 |
| 다수 카테고리/링크 시 모두 펼침으로 초기 렌더 비용 증가 | 성능 저하 | NFR-003 — 접힌 카테고리는 칩 미렌더(조건부). 사용자가 정리 후 상태 영속. `useMemo` 배열 안정성 보존 |
| SPEC-UX-010 빈 카테고리 placeholder 의 cross-group 문구 부정합 | "여기로 드래그하여 추가" 인데 drop 불가 | D6 — cross-group 비목표이므로 placeholder 문구를 "북마크가 없습니다" 로 단순화 검토. 펼침 시에만 표시 |
| 모바일에서 칩 wrap + 헤더 토글 hit-area 부족 | 터치 정확도 저하 | REQ-UX-012-017 — 헤더 토글 최소 44px, 칩 좁은 폭 wrap. T-016/T-020 반응형 검증 |
| 셰브론 회전 transition 이 prefers-reduced-motion 무시 | 접근성 위반 | T-009 — globals.css `@media (prefers-reduced-motion: reduce)` 블록에 셰브론 transition 무효 규칙 추가(기존 블록 확장) |

## 의존성

- **선행**: SPEC-UX-006 (반응형 + 링크 정렬), SPEC-UX-007 (편집 모드 + 카테고리 정렬), SPEC-UX-008 (cross-group 이동 + 단일 DndContext), SPEC-UX-009 (레벨별 핸들), SPEC-UX-010 (자동 종료 + 빈 그룹 placeholder), SPEC-UX-011 (DnD UX + 타이머 일시 중지)
- **후행** (후속 SPEC 후보):
  - 아코디언 친화적 cross-group 링크 이동 재도입 (접힌 헤더 hover 자동 펼침 + drag-to-expand)
  - 단일 open 아코디언 모드 옵션
  - 확장 상태 디바이스 간 동기화(Firestore)
  - 접힌 카테고리 미니 미리보기
  - 칩 색상/태그 커스터마이징
  - 아코디언 height transition 정교화

## 권장 / 검토 사항

**최초 기본 확장 — all expanded 권장 사유 (REQ-UX-012-004)**

선택지: all collapsed / all expanded / first-only expanded

**권장: all expanded**

이유:
1. **SPEC 핵심 동기 부합**: "북마크가 안 보임" 해결이 목표 → 최초 모두 보이는 것이 의도와 일치
2. **신규 카테고리 노출**: 영속화 키에 없는 신규 카테고리가 기본 펼침 → 새 카테고리가 숨지 않음
3. **사용자 정리 가능**: 필요 시 개별 접기 → 다음 진입 시 상태 복원

**확장 store 분리 vs editModeStore 확장 — 분리 권장 (D1)**

권장: 신규 `favoritesExpandStore`. 관심사 분리(편집 상태 vs 표시 상태), 영속화 정책 차이(세션 휘발 vs 영속), fan_in 명확성.

**cross-group 비목표 — store 액션 보존 권장 (D4)**

권장: `moveLinkBetweenGroups` 삭제 금지, 드롭 경로만 no-op. 후속 SPEC 에서 분기 복원만으로 재도입 가능하도록 코드 손실 방지.

**기타 권장 사항**:
- 칩 maxWidth 는 200px 로 시작 — 사용자 테스트 후 조정 가능
- 셰브론은 `ChevronDown` + rotate 180(펼침) — 추가 아이콘 import 없이 단일 아이콘 회전
- e2e 는 `spec-ux-011-favorites-dnd.spec.ts` 의 헬퍼(`enableEditMode`, `dragTo`, `enterWidgetMode`)를 그대로 재사용해 일관성 유지
- 빈 카테고리 placeholder 문구는 cross-group 비목표를 반영해 "북마크가 없습니다" 로 단순화(편집 모드여도 drop 불가이므로 "여기로 드래그하여 추가" 는 오해 소지)
</content>
