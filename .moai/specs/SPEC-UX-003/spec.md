---
id: SPEC-UX-003
version: 1.0.0
status: draft
created: 2026-04-13
updated: 2026-04-13
author: ZeroJuneK
priority: high
issue_number: 0
---

# SPEC-UX-003: Pivot 레이아웃 (Sidebar + Virtualized List)

## HISTORY

| 버전 | 날짜 | 작성자 | 변경 내용 |
|------|------|--------|-----------|
| 1.0.0 | 2026-04-13 | ZeroJuneK | 최초 작성 (Pivot UX 전환 핵심) |

## 개요

기존 드래그 그리드(SPEC-LAYOUT-001) 대신 **Sidebar + 가상화 리스트** 구조의 새 레이아웃 "Pivot"을 도입한다.
북마크가 1차 시민이며, 카테고리/태그/즐겨찾기/액션이 사이드바에 통합되고, 메인 영역은 선택된 컨텍스트의 북마크를 가상화 리스트로 빠르게 표시한다.
Raindrop.io / Linear / Arc 스타일의 정보 밀도 + 키보드 친화 UX.

**분류**: SPEC (구현 대상 기능)
**성격**: Brownfield + Greenfield -- 신규 컴포넌트 다수, 기존 App.tsx 분기 추가
**선행 SPEC**: SPEC-BOOKMARK-003 (태그), SPEC-UX-002 (Command Palette)

## 요구사항

### REQ-001: 2-column 레이아웃

**[Ubiquitous]** Pivot 모드는 **항상** 좌측 Sidebar(고정 250px) + 우측 Main(가변)으로 구성되어야 한다.

### REQ-002: Sidebar 구성

**[Ubiquitous]** Sidebar는 **항상** 다음 섹션을 위에서 아래로 표시해야 한다:
1. 전체 (모든 북마크)
2. ⭐ 즐겨찾기
3. 📂 카테고리 목록 (개수 표시)
4. 🏷 태그 목록 (사용 빈도 상위 N개)
5. ⚙ 설정 (위젯 모드 전환, 테마, 로그아웃)

### REQ-003: 메인 뷰 -- 선택 컨텍스트 표시

**[State-Driven]** **While** Sidebar에서 항목이 선택된 동안, 메인 영역은 해당 컨텍스트의 북마크 목록을 표시**해야 한다**.

### REQ-004: 검색바 (메인 상단)

**[Ubiquitous]** 메인 영역 상단에 **항상** 현재 컨텍스트 내 검색 입력창을 표시해야 한다.

### REQ-005: 가상화 리스트

**[Ubiquitous]** 메인 영역의 북마크 목록은 **항상** react-window로 가상화되어야 한다 (1000개+ 부드럽게).

### REQ-006: 격자/리스트 뷰 토글

**[Event-Driven]** **When** 사용자가 뷰 토글 버튼을 클릭하면, 메인 영역은 격자(Card Grid) 또는 리스트(Row List) 형태로 전환**되어야 한다**.

### REQ-007: 밀도 토글

**[Event-Driven]** **When** 사용자가 밀도 설정을 변경하면, 행 높이가 Compact(40px) / Comfortable(56px) / Spacious(72px)로 즉시 적용**되어야 한다**.

### REQ-008: 북마크 표시 정보

**[Ubiquitous]** 각 북마크 항목은 **항상** 다음을 표시해야 한다:
- Favicon (Google s2 favicon API)
- 이름 (link.name)
- URL (link.url, 짧게 표시)
- 추가 시각 또는 마지막 사용 시각
- 태그 chip (최대 3개 표시, 나머지는 +N)

### REQ-009: 항목 클릭 동작

**[Event-Driven]** **When** 사용자가 북마크 행을 클릭하면, 시스템은 해당 URL을 새 탭에서 열**어야 한다**.
**When** 사용자가 우클릭하면, 컨텍스트 메뉴(편집/삭제/태그 추가/카테고리 이동)가 표시**되어야 한다**.

### REQ-010: 즐겨찾기 토글

**[Event-Driven]** **When** 사용자가 북마크 행의 ⭐ 아이콘을 클릭하면, 시스템은 해당 북마크의 favorite 플래그를 토글**해야 한다**.

### REQ-011: 빈 상태 표시

**[State-Driven]** **While** 현재 컨텍스트에 매칭 북마크가 0건인 동안, 시스템은 안내 메시지와 "북마크 추가" 버튼을 표시**해야 한다**.

### REQ-012: 자주 쓰는 것 (Top section)

**[Ubiquitous]** "전체" 컨텍스트 선택 시 메인 상단에 **항상** "자주 쓰는 것" 8개를 격자로 표시해야 한다 (usageStore 기반).

### REQ-013: 카테고리 / 태그 다중 필터

**[Event-Driven]** **When** 사용자가 사이드바에서 카테고리와 태그를 동시에 선택하면, 두 조건을 AND로 결합한 결과를 표시**해야 한다**.

### REQ-014: 사이드바 접기/펼치기

**[Event-Driven]** **When** 사용자가 사이드바 토글 버튼을 클릭하면, 사이드바가 접혀 아이콘만 남거나 펼쳐**져야 한다**.

### REQ-015: 키보드 단축키

**[Ubiquitous]** Pivot 모드에서 **항상** 다음 단축키가 동작해야 한다:
- `j` / `k`: 리스트 항목 위/아래
- `Enter`: 선택 항목 열기
- `e`: 편집
- `f`: 즐겨찾기 토글
- `1`~`9`: 사이드바 N번째 카테고리 빠른 이동
- `/`: 검색바 포커스

## 비기능 요구사항

### NFR-001: 성능

1000개 북마크 기준 사이드바 렌더링 < 16ms, 메인 리스트 스크롤 60fps 유지.

### NFR-002: 반응형

최소 너비 768px 지원. 그 이하는 사이드바 자동 접힘.

### NFR-003: 접근성

- ARIA tree 패턴 (사이드바)
- ARIA listbox 패턴 (메인 리스트)
- Tab 순서: 사이드바 → 검색 → 메인 리스트

### NFR-004: TypeScript strict + 테스트 85%

신규 모듈 커버리지 85% 이상, any 사용 금지.

## 제약사항

- React 19, TypeScript strict, Zustand 5
- 가상화: `react-window` (확정)
- favicon: `https://www.google.com/s2/favicons?domain={domain}&sz=32`, fallback은 도메인 첫 글자 원형
- 최소 row 높이: 40px, 최대 80px
- 사이드바 collapse 시 너비: 60px

## 데이터 스키마

```typescript
// 신규: viewStore (Pivot 컨텍스트 상태)
type SidebarContext =
  | { kind: 'all' }
  | { kind: 'favorites' }
  | { kind: 'category'; categoryId: string }
  | { kind: 'tag'; tag: string }

interface ViewState {
  context: SidebarContext
  searchQuery: string
  viewMode: 'list' | 'grid'
  density: 'compact' | 'comfortable' | 'spacious'
  sidebarCollapsed: boolean
  setContext: (ctx: SidebarContext) => void
  setSearchQuery: (q: string) => void
  setViewMode: (m: 'list' | 'grid') => void
  setDensity: (d: 'compact' | 'comfortable' | 'spacious') => void
  toggleSidebar: () => void
}

// Link 타입 확장 (favorite 플래그)
interface Link {
  id: string
  name: string
  url: string
  tags: string[]    // SPEC-BOOKMARK-003
  favorite?: boolean    // 신규
  createdAt?: number    // 신규 (옵셔널, 마이그레이션 대응)
}
```

## 컴포넌트 구조

```
PivotLayout
├── Sidebar
│   ├── SidebarSection (전체, 즐겨찾기)
│   ├── SidebarCategoryList
│   ├── SidebarTagList
│   └── SidebarSettings
├── MainView
│   ├── ContextHeader (현재 컨텍스트 + breadcrumb)
│   ├── SearchInput (REQ-004)
│   ├── ToolbarRight (뷰 토글, 밀도, 정렬)
│   ├── TopSection (자주 쓰는 것, 컨텍스트=all일 때만)
│   └── BookmarkList
│       ├── BookmarkRow (list mode)
│       └── BookmarkCard (grid mode -- 기존 컴포넌트 재활용 가능)
└── ContextMenu (우클릭)
```

## Exclusions (What NOT to Build)

- **드래그 앤 드롭 카테고리/태그 재정렬**: 별도 SPEC
- **다중 선택 + 일괄 편집**: 별도 SPEC
- **Saved Searches / Smart Folders**: 별도 SPEC
- **Custom Sidebar Order**: 고정 순서만 지원
- **모바일 최적화**: 데스크톱/태블릿 우선
- **Dark/Light 외 테마**: 기존 themeStore만 사용
