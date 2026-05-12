---
id: SPEC-UX-006
version: 1.0.0
status: completed
created: 2026-05-12
updated: 2026-05-12
author: ZeroJuneK
priority: high
issue_number: 0
---

# SPEC-UX-006: Mobile Responsive Grid & Sortable Bookmarks

## HISTORY

| 버전 | 날짜 | 작성자 | 변경 내용 |
|------|------|--------|-----------|
| 1.0.0 | 2026-05-12 | ZeroJuneK | 최초 작성 (모바일 반응형 그리드 + 북마크 드래그 정렬) |

## 개요

Deskflow는 개인 생산성 대시보드로, 위젯 모드(SPEC-LAYOUT-001 + SPEC-UI-001)에서 `react-grid-layout`의 단일 `GridLayout`을 사용한다. 현재 iPhone 16 Plus(430×932) 환경에서 위젯 너비가 41~62px로 붕괴되고, 9개의 헤더 버튼이 가로 오버플로우를 발생시키며, Clock과 Search가 겹친다. 또한 드래그 핸들 CSS의 `touch-action: auto`로 인해 모바일에서 스크롤과 드래그가 충돌한다. 위젯 내부 북마크는 정적 `<a>` 태그로만 표시되어 재정렬이 불가능하다.

본 SPEC은 다음 6개 영역을 개선한다.

1. **반응형 그리드**: `GridLayout` → `WidthProvider(Responsive)`. xs/xxs 브레이크포인트에서 단일 컬럼 강제 + "모바일 뷰 모드" 토글.
2. **드래그 UX**: `.widget-drag-handle` 모바일 터치 호환(touch-action, long-press 500ms).
3. **북마크 정렬(신규)**: `@dnd-kit/core` + `@dnd-kit/sortable` 도입, 위젯 편집 모드에서 활성화.
4. **모바일 헤더**: ≤sm에서 9개 버튼을 햄버거/More 메뉴로 collapse, Clock `clamp()`, Search 자체 row.
5. **리사이즈 핸들**: 데스크탑 14px, 터치 24px, 모바일 뷰 모드에서 완전 비활성.
6. **Viewport/PWA**: `viewport-fit=cover`, `apple-mobile-web-app-capable`, `theme-color`, `env(safe-area-inset-*)`.

**분류**: SPEC (구현 대상 기능)
**성격**: Brownfield -- WidgetLayout.tsx / BookmarkCard.tsx / globals.css / index.html / layoutStore.ts 수정
**선행 SPEC**: SPEC-LAYOUT-001 (위젯 그리드), SPEC-UI-001 (시각 토큰), SPEC-UX-005 (viewMode 분기)

## 요구사항

### REQ-UX-006-001: Responsive 그리드 전환

**[Ubiquitous]** 시스템은 위젯 모드에서 **항상** `react-grid-layout`의 `WidthProvider(Responsive)` 컴포넌트를 사용해야 한다.

브레이크포인트:
- `lg: 1200`, `md: 996`, `sm: 768`, `xs: 480`, `xxs: 0`

컬럼 수:
- `lg: 12`, `md: 10`, `sm: 6`, `xs: 4`, `xxs: 2`

### REQ-UX-006-002: 모바일 단일 컬럼 강제

**[State-Driven]** **While** 화면 너비가 xs 또는 xxs 브레이크포인트에 해당하는 동안, 위젯 레이아웃은 단일 컬럼 세로 스택으로 렌더링되어야 하며 `isDraggable=false`, `isResizable=false` 가 적용되어야 한다.

### REQ-UX-006-003: 모바일 뷰 모드 토글

**[Ubiquitous]** 시스템은 **항상** 현재 뷰포트가 모바일(xs/xxs) 인지 여부를 판정하는 "모바일 뷰 모드" 상태를 가져야 한다. 이 상태는 브레이크포인트에서 자동 결정되며, 사용자는 수동으로도 토글할 수 있다.

### REQ-UX-006-004: 레이아웃 마이그레이션

**[Event-Driven]** **When** 앱이 시작되어 기존 `localStorage`(`widget-layout`, `deskflow-usage-store`)에서 평면 `WidgetLayout[]` 형태의 레이아웃을 발견하면, 시스템은 `{lg: WidgetLayout[]}` 형태의 Responsive 레이아웃으로 즉시 변환하고 `hub-migrated` 버전을 갱신해야 한다.

마이그레이션은 idempotent해야 하며 이미 `{lg: [...]}` 형태인 경우 변경하지 않는다.

### REQ-UX-006-005: 드래그 핸들 touch-action

**[Ubiquitous]** `.widget-drag-handle` 셀렉터는 **항상** 다음 CSS 속성을 가져야 한다.

```
touch-action: none;
user-select: none;
-webkit-user-select: none;
cursor: grab;
min-height: 44px;
```

활성 상태에서는 `cursor: grabbing;` 이어야 한다.

### REQ-UX-006-006: 모바일 long-press 드래그 진입

**[Event-Driven]** **When** 모바일에서 사용자가 `.widget-drag-handle`을 500ms 이상 누르면, 시스템은 드래그 모드를 활성화해야 한다.

### REQ-UX-006-007: 드래그 중 스크롤 격리

**[State-Driven]** **While** 사용자가 위젯을 드래그하는 동안, `body` 요소는 `overflow: hidden; overscroll-behavior: contain;` 이 적용되어 페이지 스크롤이 잠겨야 한다. 드래그 종료 시 즉시 원상 복구되어야 한다.

### REQ-UX-006-008: 북마크 정렬 컨텍스트

**[Ubiquitous]** 위젯의 북마크 리스트는 **항상** `@dnd-kit/core`의 `DndContext` 및 `@dnd-kit/sortable`의 `SortableContext`로 래핑되어야 한다.

### REQ-UX-006-009: 편집 모드에서만 정렬 활성

**[State-Driven]** **While** 위젯의 "편집 모드"가 활성화된 동안에만, 북마크 항목이 드래그로 재정렬 가능해야 한다.

### REQ-UX-006-010: 모바일 PointerSensor

**[Event-Driven]** **When** 사용자가 모바일에서 북마크를 long-press하면(250ms delay, 5px tolerance), 시스템은 드래그를 시작해야 한다.

`@dnd-kit`의 `PointerSensor` `activationConstraint: { delay: 250, tolerance: 5 }` 를 사용한다.

### REQ-UX-006-011: 북마크 순서 영속화

**[Event-Driven]** **When** 사용자가 위젯 내부 북마크의 순서를 변경하면, 시스템은 즉시 변경된 순서를 저장소에 영속화해야 한다.

영속화 키는 기존 북마크 스토어를 재사용하며, 페이지 리로드 후 동일 순서가 복원되어야 한다.

### REQ-UX-006-012: 모바일 헤더 collapse

**[State-Driven]** **While** 화면 너비가 sm 브레이크포인트(768px) 이하인 동안, 9개의 헤더 버튼은 햄버거/More(⋯) 메뉴로 축소되어야 하며, "빠른 추가" 버튼과 테마 토글 버튼만 헤더에 직접 노출되어야 한다.

### REQ-UX-006-013: Clock 반응형 폰트

**[Ubiquitous]** Clock 컴포넌트의 표시 폰트 크기는 **항상** `clamp(2rem, 8vw, 5rem)` 으로 정의되어야 한다.

### REQ-UX-006-014: SearchBar 모바일 row 분리

**[State-Driven]** **While** 화면 너비가 sm 이하인 동안, SearchBar는 헤더와 분리된 자체 row에 배치되어야 하며 `width: 100%` 를 가져야 한다.

### REQ-UX-006-015: 리사이즈 핸들 크기

**[Ubiquitous]** 위젯 리사이즈 핸들은 **항상** 기본 14px 크기를 가져야 한다.

**[State-Driven]** **While** 환경이 `@media (hover: none) and (pointer: coarse)` 조건을 만족하는 동안, 리사이즈 핸들 크기는 24px로 확대되어야 한다.

### REQ-UX-006-016: 모바일 뷰 모드 리사이즈 비활성

**[State-Driven]** **While** 모바일 뷰 모드가 활성화된 동안, 리사이즈 핸들은 화면에 표시되지 않아야 하며 동작도 비활성화되어야 한다.

### REQ-UX-006-017: Viewport meta

**[Ubiquitous]** `index.html`의 viewport meta 태그는 **항상** `width=device-width, initial-scale=1.0, viewport-fit=cover` 를 포함해야 한다.

### REQ-UX-006-018: PWA meta 태그

**[Ubiquitous]** `index.html`은 **항상** 다음 meta 태그를 포함해야 한다.

- `apple-mobile-web-app-capable=yes`
- `theme-color=#0f0f12`

### REQ-UX-006-019: Safe-area inset

**[Ubiquitous]** 헤더 영역은 **항상** `env(safe-area-inset-top)`, `env(safe-area-inset-left)`, `env(safe-area-inset-right)` 를 padding에 반영해야 한다.

### REQ-UX-006-020: 데스크탑 회귀 0

**[Unwanted]** 시스템은 화면 너비가 1200px 이상인 데스크탑 환경에서 SPEC-LAYOUT-001 및 SPEC-UI-001 동작 대비 회귀를 발생시키지 **않아야 한다**.

### REQ-UX-006-021: 가로 스크롤 금지

**[Unwanted]** iPhone 16 Plus(430×932) Safari 환경에서 페이지 전체에 가로 스크롤이 발생해서는 안 된다.

## 비기능 요구사항

### NFR-001: 회귀 방지

기존 SPEC-LAYOUT-001 / SPEC-UI-001 / SPEC-UX-005 / SPEC-MOBILE-RESPONSIVE-001 테스트 100% 통과.

### NFR-002: 빌드/린트/타입

- `npm run build` 통과
- `npm run lint` ESLint 오류 0
- `npm run typecheck` TypeScript 오류 0

### NFR-003: 모바일 뷰포트 성능

- 모바일 뷰포트에서 드래그 시작 후 첫 프레임까지 < 100ms
- long-press 인식 정확도(오발화 < 5%)

### NFR-004: 마이그레이션 안전성

- 기존 `widget-layout` 키 데이터 무손실 변환
- 변환 실패 시 `DEFAULT_LAYOUT` 으로 fallback

## 제약사항

- React 19 / TypeScript strict / Zustand 5 / `react-grid-layout` 2.2.3 유지
- 한국어 코드 주석 (per `.moai/config/sections/language.yaml` `code_comments: ko`)
- 신규 파일 첫 줄은 한국어 한 줄 헤더 주석 (per 글로벌 CLAUDE.md Rule 6)
- 새로 도입 가능한 외부 의존성은 `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` 만 허용
- TDD 모드(quality.yaml `development_mode: tdd`) 준수 — RED 단계에서 acceptance 시나리오 기반 테스트 선작성

## 데이터 스키마

### Responsive 레이아웃 형태

```typescript
// 기존 (Flat)
type FlatLayout = WidgetLayout[]

// 신규 (Responsive)
type ResponsiveLayout = {
  lg: WidgetLayout[]
  md?: WidgetLayout[]
  sm?: WidgetLayout[]
  xs?: WidgetLayout[]
  xxs?: WidgetLayout[]
}
```

### 마이그레이션 변환 규칙

```
FlatLayout (예: [{i:'clock',...}, ...])
  ↓ migrateLayoutToResponsive
ResponsiveLayout (예: {lg: [{i:'clock',...}, ...]})
```

### 북마크 항목 순서

기존 `Category.links: Link[]` 의 배열 순서를 그대로 정렬 상태로 사용. 별도 `order` 필드 추가 없음.

## Exclusions (What NOT to Build)

- **위젯 콘텐츠/기능 변경**: TodoWidget, NotesWidget, FeedWidget 등 내부 동작 수정 없음
- **백엔드/Firebase 스키마 변경**: Firestore 컬렉션 구조 유지
- **새로운 위젯 유형 추가**: 카테고리, Clock, Search, Bookmarks, Todo, Notes, Feed 그대로 유지
- **6개 목표 영역을 벗어난 리팩터링**: CLAUDE.md "Surgical Changes" 원칙 준수
- **`@dnd-kit` 이외의 신규 라이브러리 도입**: react-beautiful-dnd 등 대체 라이브러리 검토 안 함
- **PivotLayout(SPEC-UX-003) 영향 범위**: 위젯 모드 한정, Pivot 모드는 본 SPEC 범위 밖
- **북마크 카테고리 간 이동**: 같은 카테고리(위젯) 내부 정렬만 지원, 카테고리 간 드래그 이동은 범위 밖
- **북마크 순서 Firestore 동기화**: 1차에서는 기존 북마크 스토어가 사용하는 동기화 메커니즘만 사용 (별도 후속 SPEC에서 필요 시 다룸)
- **viewMode(`pivot`/`widgets`) 전환 UX 변경**: SPEC-UX-005 범위
