# 모바일 반응형 그리드 및 북마크 정렬 (SPEC-UX-006)

## 개요

Deskflow의 위젯 모드는 iPhone 16 Plus(430×932) 환경에서 중대한 UX 문제를 겪고 있었습니다.

**주요 문제점**:
- 위젯이 41~62px로 붕괴되어 콘텐츠가 읽을 수 없는 상태
- 9개의 헤더 버튼이 화면을 넘어 가로 오버플로우 발생
- Clock과 Search가 겹쳐서 표시됨
- 모바일에서 드래그와 스크롤이 충돌해 상호작용 불가능
- 북마크는 고정된 링크일 뿐 순서 변경 불가능

본 SPEC-UX-006은 이 모든 문제를 해결하기 위해 6개 영역을 개선합니다.

---

## 변경 전/후 비교

### 문제 상황 (변경 전)

```
iPhone 16 Plus 430×932px

┌──────────────────────────────────────────┐
│ 🕐 Clock | 🔍 Search | [More buttons ...]  │
│ [Button overflow! →→→→→→→→→→→→→→→→→→→] │
├──────────────────────────────────────────┤
│  [Widget 41px] [Widget 62px]  [Wid...]   │
│  [Widget ...]  [Widget ...]   [Wid...]   │
│                                          │
│  드래그 중 페이지 스크롤도 발생           │
└──────────────────────────────────────────┘
```

**스크린샷**: <!-- TODO: screenshot before -->

### 개선된 상황 (변경 후)

```
iPhone 16 Plus 430×932px

┌──────────────────────────────────────────┐
│ clamp(2rem~8vw) Clock | [⋯ More] [+] [☀️]│
├──────────────────────────────────────────┤
│ [             Search (100%)             ] │
├──────────────────────────────────────────┤
│  [  Widget (단일 컬럼)  ]                │
│  [  재정렬 가능 북마크   ]                │
│  [  Widget             ]                │
│  [  안전 영역 고려      ]                │
│                                          │
│  드래그 중 body 스크롤 격리              │
└──────────────────────────────────────────┘
```

**스크린샷**: <!-- TODO: screenshot after -->

### 데스크탑 회귀 없음 (≥1200px)

```
Desktop 1920×1080px

┌────────────────────────────────────────────────────────┐
│ 🕐 Clock | [Button1] [Button2] ... [Button9] [+] [☀️]  │
├────────────────────────────────────────────────────────┤
│  [Widget 12c] [Widget 12c] [Widget 12c]                │
│  [Widget 12c] [Widget 12c] [Widget 12c]                │
│                                                        │
│  드래그/리사이즈 모두 활성화, 기존 동작 유지           │
└────────────────────────────────────────────────────────┘
```

---

## 주요 변경 사항

### 1. 반응형 그리드 (Responsive Grid)

**변경 대상**: `WidgetLayout.tsx`, `layoutStore.ts`

```typescript
// 기존
<GridLayout ... />  // 단일 레이아웃

// 신규
<WidthProvider>
  <Responsive breakpoints={{lg:1200, md:996, sm:768, xs:480, xxs:0}}
               cols={{lg:12, md:10, sm:6, xs:4, xxs:2}} />
</WidthProvider>
```

**브레이크포인트 정의**:
| 이름 | 너비(px) | 컬럼 수 | 용도 |
|-----|--------|--------|------|
| `lg` | 1200+ | 12 | 데스크탑 |
| `md` | 996-1199 | 10 | 태블릿 가로 |
| `sm` | 768-995 | 6 | 태블릿 세로 |
| `xs` | 480-767 | 4 | 폰(표준) |
| `xxs` | 0-479 | 2 | 폰(소형) |

**핵심**: xs/xxs 브레이크포인트에서 `isDraggable=false`, `isResizable=false` 적용으로 모바일 뷰는 정보 보기 전용 모드.

### 2. 위젯 드래그 UX (Widget Drag)

**변경 대상**: `globals.css`, `WidgetLayout.tsx`

```css
/* CSS 강화 */
.widget-drag-handle {
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
  cursor: grab;
  min-height: 44px;
}

.widget-drag-handle:active {
  cursor: grabbing;
}

body.is-dragging-widget {
  overflow: hidden;
  overscroll-behavior: contain;
}
```

**동작**:
- 드래그 중 `<body>` 요소에 `is-dragging-widget` 클래스 추가
- 이 상태에서 페이지 스크롤 완전 격리
- 드래그 종료 시 즉시 제거

**모바일 제약**: react-grid-layout 2.2.3은 native long-press 지원 없음. 모바일 뷰 모드(xs/xxs)에서는 위젯 드래그 자체가 비활성화 상태가 기본 동작.

### 3. 북마크 정렬 (Bookmark Sorting)

**변경 대상**: `BookmarkCard.tsx`, `SortableLink.tsx` (신규), `package.json`

**신규 의존성**:
```json
{
  "@dnd-kit/core": "^latest",
  "@dnd-kit/sortable": "^latest",
  "@dnd-kit/utilities": "^latest"
}
```

**동작**:
```typescript
// BookmarkCard.tsx 내부 구조
<DndContext sensors={[PointerSensor]} onDragEnd={handleSort}>
  <SortableContext items={linkIds}>
    {links.map(link => (
      <SortableLink key={link.id} id={link.id} {...link} />
    ))}
  </SortableContext>
</DndContext>
```

**편집 모드**: 
- 사용자가 "편집" 버튼 클릭 → `isEditing=true`
- 편집 모드에서만 드래그로 순서 변경 가능
- 순서 변경 시 `bookmarkStore` 업데이트 → localStorage 자동 동기화

**모바일 센서 설정**:
```typescript
PointerSensor({
  activationConstraint: {
    delay: 250,      // 250ms 길게 누르기
    tolerance: 5     // 5px 이동 허용
  }
})
```

### 4. 모바일 헤더 Collapse

**변경 대상**: `WidgetLayout.tsx`, `HeaderMoreMenu.tsx` (신규)

**sm 이하(768px) 동작**:

| 요소 | 변경 |
|-----|------|
| 9개 버튼 | "⋯ More" 메뉴로 축소 |
| 빠른 추가(+) | 헤더에 직접 노출 |
| 테마 토글(☀️) | 헤더에 직접 노출 |
| Search | 헤더에서 분리, 자체 row(`width: 100%`) |

```
모바일 헤더 (sm이하)
┌─────────────────────┐
│ Clock | More | + | ☀️│
├─────────────────────┤
│ [Search 100%]       │
```

### 5. 리사이즈 핸들 터치 사이징

**변경 대상**: `globals.css`

```css
/* 기본: 데스크탑 */
.react-grid-item > .react-resizable-handle {
  width: 14px;
  height: 14px;
}

/* 터치 기기 */
@media (hover: none) and (pointer: coarse) {
  .react-grid-item > .react-resizable-handle {
    width: 24px;
    height: 24px;
  }
}
```

**모바일 뷰 모드**: 모바일 뷰 모드(xs/xxs) 활성화 시 리사이즈 핸들 완전 숨김 + 비활성화.

### 6. PWA & Safe-Area Meta

**변경 대상**: `index.html`, `WidgetLayout.tsx`

```html
<!-- index.html -->
<meta name="viewport" 
      content="width=device-width, initial-scale=1.0, viewport-fit=cover">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="theme-color" content="#0f0f12">
```

**Safe-area inset** (노치/Dynamic Island 대응):

```typescript
// WidgetLayout.tsx 헤더
const topBarStyle = {
  paddingTop: 'env(safe-area-inset-top)',
  paddingLeft: 'env(safe-area-inset-left)',
  paddingRight: 'env(safe-area-inset-right)',
}
```

미지원 환경에서는 자동으로 0 적용.

---

## localStorage 마이그레이션

### 문제

기존 `widget-layout` 키는 평면 `WidgetLayout[]` 형태로 저장되어 있습니다:

```typescript
// 기존 (Flat)
const layout = [
  { i: 'clock', x: 0, y: 0, w: 12, h: 2 },
  { i: 'search', x: 0, y: 2, w: 12, h: 1 },
  ...
]
localStorage.setItem('widget-layout', JSON.stringify(layout))
```

### 해결책

`loadLayout()` 호출 시 자동으로 Responsive 형태로 변환:

```typescript
// 신규 (Responsive)
const layout = {
  lg: [
    { i: 'clock', x: 0, y: 0, w: 12, h: 2 },
    { i: 'search', x: 0, y: 2, w: 12, h: 1 },
    ...
  ]
  // md, sm, xs, xxs는 선택사항 (lg 복사로 fallback)
}
```

### 마이그레이션 로직

**파일**: `src/renderer/lib/layoutMigration.ts`

```typescript
export function migrateLayoutToResponsive(
  layout: WidgetLayout[] | ResponsiveLayout
): ResponsiveLayout {
  // 이미 Responsive 형태인 경우: 그대로 반환 (idempotent)
  if ('lg' in layout && typeof layout === 'object') {
    return layout as ResponsiveLayout
  }

  // Flat → Responsive 변환
  return {
    lg: layout as WidgetLayout[]
  }
}
```

### 호환성

- **기존 사용자**: 앱 시작 시 자동 변환 (무손실)
- **신규 사용자**: 처음부터 Responsive 형태로 저장
- **변환 실패**: `DEFAULT_LAYOUT` fallback (복구 가능)
- **버전 추적**: `hub-migrated` flag 갱신

---

## 테스트 시나리오

### 환경별 검증

**iPhone 16 Plus (430×932px, Safari)**:
1. 앱 시작 → 위젯이 단일 컬럼으로 렌더링 확인
2. 스크롤 → 모든 위젯이 보임 (가로 오버플로우 없음)
3. 헤더 → "⋯ More" 메뉴 표시, Search가 별도 row
4. 북마크 카드 편집 모드 진입 → 링크 드래그로 순서 변경 가능
5. 드래그 중 → 페이지 스크롤 불가능 (body 격리)

**Desktop (1920×1080px, Chrome/Firefox)**:
1. 기존 12열 그리드 동작 유지
2. 9개 헤더 버튼 모두 노출 (More 메뉴 숨김)
3. Search가 헤더 오른쪽에 인라인 배치
4. 위젯 드래그/리사이즈 모두 정상 작동
5. 회귀 테스트: SPEC-LAYOUT-001, SPEC-UI-001 100% 통과

**iPad (768px, Safari)**:
1. sm 브레이크포인트: 6열 그리드, 헤더 collapse 시작
2. Search 분리됨
3. 터치 기기이므로 리사이즈 핸들 24px로 확대

---

## 알려진 한계

### RGL Long-Press 미지원

`react-grid-layout` 2.2.3은 모바일 native long-press 드래그를 지원하지 않습니다.

**현재 구현**:
- 모바일 뷰 모드(xs/xxs) 활성화 → 위젯 드래그 비활성화 (정보 보기 전용)
- 사용자가 수동으로 모바일 뷰 모드 OFF → 데스크톱처럼 mouse 이벤트 기반 드래그 가능
- 북마크는 `@dnd-kit`으로 long-press 지원 (PointerSensor 활성)

**향후 개선**: 위젯 자체 드래그를 `@dnd-kit`으로 전환하는 별도 SPEC 예정.

### 북마크 카테고리 간 이동 불가

본 SPEC-UX-006은 같은 카테고리(위젯) 내부의 링크 순서 변경만 지원합니다.

- ✅ 카테고리 내부 순서 변경
- ❌ 카테고리 간 링크 이동 (후속 SPEC 대상)

### Safe-area 미지원 환경

`env(safe-area-inset-*)` CSS 미지원 환경(레거시 Android)에서는 0으로 처리됨 (안전).

---

## 관련 문서

- **SPEC 문서**: `.moai/specs/SPEC-UX-006/spec.md` (21개 요구사항)
- **구현 계획**: `.moai/specs/SPEC-UX-006/plan.md` (8개 마일스톤, 19개 태스크)
- **진행 상황**: `.moai/specs/SPEC-UX-006/progress.md` (체크리스트)

---

## 피드백 및 문제 보고

이 문서가 오래되었거나 부정확한 부분이 있으면, 다음 경로에서 확인하세요:

- 구현 상태: `.moai/specs/SPEC-UX-006/progress.md`
- 기술 설계: `.moai/specs/SPEC-UX-006/plan.md`
- 요구사항: `.moai/specs/SPEC-UX-006/spec.md`

이 문서는 SPEC-UX-006 구현 완료 시점에 자동 생성되었습니다.
