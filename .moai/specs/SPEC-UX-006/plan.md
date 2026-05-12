# SPEC-UX-006: 구현 계획

## 기술 접근 방식

본 SPEC은 **WidgetLayout.tsx 한 곳에 집중된 그리드 책임을 유지**하면서, 다음 4개의 외과적 변경(Surgical Change)을 진행한다.

1. **그리드 엔진 교체**: `WidgetLayout.tsx` 내부의 `ReactGridLayout` 단일 그리드를 `WidthProvider(Responsive)` 로 교체한다. 기존 데스크탑 동작은 `lg` 브레이크포인트 컬럼/레이아웃을 그대로 사용하여 회귀를 막는다.
2. **드래그 핸들 모바일 호환**: `src/renderer/styles/globals.css` 의 `.widget-drag-handle` 규칙을 강화하고, 드래그 중 body 스크롤 격리를 위해 `dragging` 토글 클래스를 도입한다.
3. **북마크 정렬**: `BookmarkCard.tsx` 내부 링크 리스트를 `@dnd-kit/sortable`로 래핑하여 카테고리 내부 순서 변경을 지원한다. 편집 모드 토글은 기존 `onEdit` 진입점을 활용해 인라인 편집 상태를 추가한다.
4. **Viewport / PWA / 헤더 collapse**: `src/renderer/index.html` 메타 태그 보강 + `WidgetLayout.tsx` 헤더 부분(9개 버튼)을 모바일 More 메뉴로 분리.

기존 `layoutStore.ts` 의 `WidgetLayout[]` 평면 스키마는 깨지 않고, `loadLayout()` 에서 마이그레이션 어댑터를 통해 Responsive 형태로 변환한다. 외부에 노출되는 API는 그대로 유지(상위 호환).

## 마일스톤

### M1: 마이그레이션 어댑터 + 레이아웃 스토어 (Priority High)

- **T-001**: `migrateLayoutToResponsive` 헬퍼 작성
  - 파일: `src/renderer/lib/layoutMigration.ts` (신규)
  - 입력: `WidgetLayout[]` 또는 `ResponsiveLayout`
  - 출력: `ResponsiveLayout` (idempotent)
  - 테스트: `src/renderer/lib/layoutMigration.test.ts` (신규)

- **T-002**: `layoutStore.ts` 확장
  - 파일: `src/renderer/stores/layoutStore.ts` (수정)
  - `ResponsiveLayout` 타입 추가, 기존 `WidgetLayout[]` 와 union 처리
  - `loadLayout()` 내부에서 `migrateLayoutToResponsive` 호출
  - `updateLayout`, `resetLayout` 시그니처에 Responsive 형태 지원
  - 회귀 테스트: 기존 `layoutStore.test.ts` 100% 통과

### M2: 반응형 그리드 본체 (Priority High)

- **T-003**: `WidgetLayout.tsx` Responsive 그리드 교체
  - 파일: `src/renderer/components/WidgetLayout/WidgetLayout.tsx` (수정)
  - import: `import { Responsive, WidthProvider } from 'react-grid-layout'`
  - 브레이크포인트/컬럼 상수 추가:
    ```
    BREAKPOINTS = {lg:1200, md:996, sm:768, xs:480, xxs:0}
    COLS = {lg:12, md:10, sm:6, xs:4, xxs:2}
    ```
  - 기존 `MOBILE_LAYOUT` 상수는 xs/xxs 단일 컬럼 강제 로직과 통합
  - `isDraggable`/`isResizable`은 `currentBreakpoint` 가 xs/xxs일 때 false
  - 기존 `useIsMobile` 훅 호출은 유지 (헤더 / SearchBar 위치 결정 책임)

- **T-004**: WidgetLayout 회귀 테스트 확장
  - 파일: `src/renderer/components/WidgetLayout/WidgetLayout.test.tsx` (수정)
  - 파일: `src/renderer/components/WidgetLayout/WidgetLayout.mobile.test.tsx` (수정)
  - 브레이크포인트별 컬럼 수 검증 케이스 추가

### M3: 드래그 핸들 + 스크롤 격리 (Priority High)

- **T-005**: `.widget-drag-handle` CSS 강화
  - 파일: `src/renderer/styles/globals.css` (수정)
  - `touch-action: none; user-select: none; -webkit-user-select: none; min-height: 44px;`
  - `:active { cursor: grabbing; }`
  - `body.is-dragging-widget { overflow: hidden; overscroll-behavior: contain; }`

- **T-006**: 드래그 중 body 클래스 토글
  - 파일: `src/renderer/components/WidgetLayout/WidgetLayout.tsx` (수정)
  - Responsive의 `onDragStart`/`onDragStop` 핸들러에서 `document.body.classList.toggle('is-dragging-widget', ...)`
  - 모바일 long-press 500ms는 RGL 기본 동작에 의존 (커스텀 sensor 없음 — 라이브러리 정책상 RGL은 long-press 통합 미지원이므로 모바일에서는 드래그 자체가 비활성화 상태가 기본이며, 사용자 토글로 모바일 뷰 모드 해제 시 long-press 동작 검증)
  - **결정 사항**: REQ-UX-006-006 의 "long-press 500ms" 는 모바일 뷰 모드 OFF 상태에서 적용되며, react-grid-layout 기본 mouse 이벤트만으로는 long-press 구현이 불가능하므로 **`@dnd-kit` 도입 시 위젯 자체 드래그도 함께 dnd-kit 기반으로 전환할지 여부**는 Risk 항목에서 다룸. 1차 구현은 RGL 기본 동작 유지 + 모바일 뷰 모드에서는 드래그 OFF로 결정.

### M4: 리사이즈 핸들 (Priority Medium)

- **T-007**: 리사이즈 핸들 크기 분기
  - 파일: `src/renderer/styles/globals.css` (수정)
  - `.react-grid-item > .react-resizable-handle` 기본 14px
  - `@media (hover: none) and (pointer: coarse)` 안에서 24px
  - 모바일 뷰 모드(컴포넌트 측 `isResizable=false`)에서 자동 비활성

### M5: 모바일 헤더 collapse (Priority Medium)

- **T-008**: 헤더 More 메뉴 컴포넌트 분리
  - 파일: `src/renderer/components/WidgetLayout/HeaderMoreMenu.tsx` (신규, 한국어 헤더 주석)
  - sm 이하에서만 렌더
  - 포함 액션(축소 대상 7개): 카테고리 추가, 가져오기, 내보내기, 중복 탐지, 레이아웃 초기화, Pivot 모드, 로그아웃
  - 직접 노출 유지(2개): 빠른 추가, 테마 토글

- **T-009**: `WidgetLayout.tsx` 헤더 분기 적용
  - 파일: `src/renderer/components/WidgetLayout/WidgetLayout.tsx` (수정)
  - `isMobile === true` 시 `HeaderMoreMenu` 렌더, 그 외에는 기존 버튼 그룹
  - SearchBar는 sm 이하에서 헤더 외부 자체 row로 배치 + `width: 100%`

- **T-010**: Clock 반응형 폰트
  - 파일: `src/renderer/components/Clock/Clock.tsx` (수정 — 폰트 사이즈만)
  - 시간 표시 inline style 의 `fontSize` 를 `clamp(2rem, 8vw, 5rem)` 으로 변경
  - 기타 시각 토큰은 수정 금지 (Surgical)

### M6: 북마크 정렬 (Priority High — Goal #3 신규 기능)

- **T-011**: `@dnd-kit` 의존성 추가
  - `package.json` 에 `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` 3개 추가
  - 다른 라이브러리 추가는 금지 (제약사항)

- **T-012**: `BookmarkCard.tsx` 편집 모드 상태
  - 파일: `src/renderer/components/BookmarkCard/BookmarkCard.tsx` (수정)
  - 내부 상태 `isEditing: boolean` 추가 (기존 `onEdit` 클릭으로 토글)
  - 편집 모드 진입 시에만 dnd 활성화

- **T-013**: SortableContext 적용
  - 파일: `src/renderer/components/BookmarkCard/BookmarkCard.tsx` (수정)
  - `DndContext` + `SortableContext` 래핑
  - 각 `<a>` 항목을 `SortableLink` 서브 컴포넌트로 추출 (신규 파일: `src/renderer/components/BookmarkCard/SortableLink.tsx`, 한국어 헤더 주석)
  - 모바일: `PointerSensor` `activationConstraint: { delay: 250, tolerance: 5 }`
  - 데스크탑: 기본 `PointerSensor` (즉시 활성)

- **T-014**: 순서 영속화
  - `onDragEnd` 시 `bookmarkStore` 의 카테고리 내부 `links` 배열 순서 변경 액션 호출
  - 기존 `useBookmarkStore` 의 update 메커니즘 재사용 (신규 API 추가 금지, 기존 update 시그니처에 정렬된 links 배열을 그대로 넘김)
  - 테스트: 정렬 → 리로드 → 동일 순서 유지

- **T-015**: BookmarkCard 단위 테스트
  - 파일: `src/renderer/components/BookmarkCard/BookmarkCard.test.tsx` (수정)
  - dnd 모킹 (dnd-kit 표준 패턴)
  - 편집 모드 ON/OFF 분기 + 순서 변경 → store 호출 검증

### M7: Viewport / PWA (Priority Medium)

- **T-016**: `index.html` meta 강화
  - 파일: `src/renderer/index.html` (수정)
  - 기존 viewport meta 는 `viewport-fit=cover` 이미 포함되어 있음 (검증 후 보강)
  - 추가: `<meta name="apple-mobile-web-app-capable" content="yes">`
  - 추가: `<meta name="theme-color" content="#0f0f12">`

- **T-017**: Safe-area inset 헤더 적용
  - 파일: `src/renderer/components/WidgetLayout/WidgetLayout.tsx` (수정)
  - TopBar `padding` 에 `env(safe-area-inset-*)` 조건부 추가
  - 모바일에서만 적용 (PC 환경 영향 없음)

### M8: 검증 (Priority High)

- **T-018**: 회귀 테스트 통과 검증
  - 기존 561개 테스트 100% 통과 (pomodoro timeout 등 기지 이슈 제외)
  - SPEC-UX-005 / SPEC-LAYOUT-001 / SPEC-MOBILE-RESPONSIVE-001 회귀 0

- **T-019**: 신규 acceptance 시나리오 통과
  - acceptance.md AC-001 ~ AC-014 + EDGE-001 ~ EDGE-005 통과
  - `npm run build`, `npm run lint`, `npm run typecheck` 모두 ✅

## 파일 변경 맵 (실제 grep 결과 기반)

| 파일 경로 | 변경 유형 | 사유 / 관련 REQ |
|----------|----------|----------------|
| `src/renderer/components/WidgetLayout/WidgetLayout.tsx` | 수정 | 그리드 엔진 교체, 모바일 헤더 분기, drag start/stop body 토글, safe-area / REQ-001, 002, 003, 007, 012, 014, 016, 019 |
| `src/renderer/components/WidgetLayout/WidgetLayout.test.tsx` | 수정 | Responsive 회귀 테스트 추가 |
| `src/renderer/components/WidgetLayout/WidgetLayout.mobile.test.tsx` | 수정 | 브레이크포인트 별 검증 추가 |
| `src/renderer/components/WidgetLayout/HeaderMoreMenu.tsx` | 신규 | sm 이하 헤더 More 메뉴 / REQ-012 |
| `src/renderer/components/WidgetLayout/HeaderMoreMenu.test.tsx` | 신규 | More 메뉴 단위 테스트 |
| `src/renderer/components/BookmarkCard/BookmarkCard.tsx` | 수정 | dnd-kit Sortable, 편집 모드 / REQ-008, 009, 010, 011 |
| `src/renderer/components/BookmarkCard/SortableLink.tsx` | 신규 | useSortable 적용 링크 항목 |
| `src/renderer/components/BookmarkCard/BookmarkCard.test.tsx` | 수정 | 정렬 시나리오 + 편집 모드 |
| `src/renderer/components/Clock/Clock.tsx` | 수정 | `clamp()` 폰트 / REQ-013 |
| `src/renderer/stores/layoutStore.ts` | 수정 | ResponsiveLayout union, loadLayout 마이그레이션 호출 / REQ-001, 004 |
| `src/renderer/lib/layoutMigration.ts` | 신규 | Flat→Responsive 변환 / REQ-004 |
| `src/renderer/lib/layoutMigration.test.ts` | 신규 | 마이그레이션 idempotent 검증 |
| `src/renderer/styles/globals.css` | 수정 | `.widget-drag-handle` 강화, resize 핸들 미디어 쿼리, `body.is-dragging-widget` / REQ-005, 007, 015 |
| `src/renderer/index.html` | 수정 | PWA meta 추가 / REQ-017, 018 |
| `package.json` | 수정 | `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` 추가 |

**조사 결과 발견된 기존 자산**(중복 작업 회피):
- `src/renderer/hooks/useIsMobile.ts` 이미 존재 → 그대로 재사용
- `src/renderer/lib/migration.ts` 의 `MIGRATION_FLAG='hub-migrated'` 는 Firestore용이며 `widget-layout` 과 별개 → 본 SPEC 마이그레이션은 `layoutMigration.ts` 에서 별도 처리
- `src/renderer/stores/usageStore.ts` 의 `'deskflow-usage-store'` 키는 본 SPEC 범위에 무관 (위젯 레이아웃 키는 `'widget-layout'`)
- `.widget-drag-handle` 사용처: `PomodoroWidget.tsx`, `FeedWidget.tsx`, `WidgetLayout.tsx` 의 `draggableHandle=".widget-drag-handle"` 세 곳 — CSS 변경만으로 모든 위젯에 적용됨
- `WidgetLayout.tsx` 헤더에 `import 'react-grid-layout/css/styles.css'`, `import 'react-resizable/css/styles.css'` 가 이미 있음 → 추가 import 불필요

## 리스크

| 리스크 | 영향 | 완화 전략 |
|--------|------|-----------|
| `react-grid-layout` 2.2.3의 `Responsive` API 가 기존 평면 layout 과 시그니처 차이 | 데스크탑 회귀 | T-001 마이그레이션을 idempotent 하게 작성, `lg` 키 단일 사용 시 기존 동작 유지 검증. 데스크탑 회귀 테스트(`App.test.tsx`, `WidgetLayout.test.tsx`) 100% 통과 후에만 다음 단계 진입 |
| RGL이 long-press 모바일 드래그를 native 지원하지 않음 | REQ-UX-006-006 미달 | 1차: 모바일 뷰 모드 OFF 상태에서만 드래그 가능, ON 상태에서는 드래그 비활성. long-press 500ms는 사용자가 수동으로 모바일 뷰 모드 OFF 한 후의 일반 mouse 이벤트로 동작. 향후 위젯 자체 드래그를 dnd-kit으로 전환하는 별도 SPEC을 고려 |
| `@dnd-kit` 도입으로 번들 크기 증가 | 페이지 로드 시간 ↑ | 3개 패키지 합산 약 30KB gzipped (확인 완료). Vite tree-shaking 으로 사용 부분만 포함되도록 named import 만 사용 |
| 북마크 순서 변경이 Firestore 동기화와 race condition | 데이터 손실 | `bookmarkStore` 의 기존 update 흐름을 그대로 사용 (별도 동기화 메커니즘 추가 금지). drag end 시 1회만 update 호출 |
| 모바일에서 More 메뉴 외부 클릭으로 닫힘 처리 누락 | UX 불편 | T-008에서 `useEffect` + `mousedown` 외부 클릭 리스너 등록 + cleanup |
| Safe-area inset가 데스크탑에서 잘못된 공간 추가 | 헤더 시각 변경 | `env(safe-area-inset-*)` 는 미지원 환경에서 0이므로 안전. `WidgetLayout.tsx` 의 `isMobile === true` 조건과 결합해 추가 안전망 |
| `WidgetLayout.test.tsx` 가 `react-grid-layout` 을 모킹 중이라 Responsive 검증이 모킹 영향 받음 | 테스트 신뢰성 ↓ | 모킹 코드를 Responsive 컴포넌트 노출 형태로 업데이트 + props 검증 형식 유지 |

## 의존성

- 선행: SPEC-LAYOUT-001 (위젯 그리드), SPEC-UI-001 (시각 토큰), SPEC-MOBILE-RESPONSIVE-001 (모바일 미디어 쿼리)
- 병행: SPEC-UX-005 (viewMode 분기) — 본 SPEC 변경은 viewMode='widgets' 인 경로에만 영향
- 후행: 없음 (Pivot 모드 / 백엔드는 영향 없음)
