---
id: SPEC-UX-002
version: 1.0.0
status: draft
created: 2026-04-13
updated: 2026-04-13
author: ZeroJuneK
priority: high
issue_number: 0
---

# SPEC-UX-002: Command Palette 전역 검색 (Raycast/Linear 스타일)

## HISTORY

| 버전 | 날짜 | 작성자 | 변경 내용 |
|------|------|--------|-----------|
| 1.0.0 | 2026-04-13 | ZeroJuneK | 최초 작성 (Pivot UX 전환 2단계) |

## 개요

기존 `CommandPalette.tsx` (정적 명령 메뉴)를 **fuzzy search 기반 전역 검색기**로 확장한다.
북마크, 카테고리, 태그, 시스템 액션을 단일 검색창에서 키보드만으로 액세스할 수 있게 한다.
Raycast/Linear/Arc Cmd-K UX에서 영감.

**분류**: SPEC (구현 대상 기능)
**성격**: Brownfield -- 기존 CommandPalette 대폭 확장
**선행 SPEC**: SPEC-UX-001 (CommandPalette 초안), SPEC-BOOKMARK-003 (태그 시스템)

## 요구사항

### REQ-001: Cmd+K / Ctrl+K 토글

**[Event-Driven]** **When** 사용자가 Cmd+K(Mac) 또는 Ctrl+K(Win/Linux)를 누르면, 시스템은 Command Palette를 열거나 닫**아야 한다**.

### REQ-002: 통합 fuzzy 검색

**[Ubiquitous]** Command Palette는 단일 입력창에서 다음 항목을 **항상** 동시 검색할 수 있어야 한다:
- 모든 북마크 (link.name + link.url)
- 모든 카테고리 (category.name)
- 모든 태그 (tag string)
- 시스템 액션 (테마 전환, 레이아웃 초기화, 로그아웃, 모드 전환 등)

### REQ-003: 결과 그룹화

**[Ubiquitous]** 검색 결과는 **항상** 다음 4개 그룹으로 분리 표시해야 한다:
1. Bookmarks
2. Categories
3. Tags
4. Actions

### REQ-004: 빈도/최근 가중치

**[Ubiquitous]** 빈 검색어 상태에서, 시스템은 **항상** 사용자의 최근 사용 + 사용 빈도 기반으로 상위 8개 항목을 제안해야 한다.

### REQ-005: 키보드 네비게이션

**[Ubiquitous]** 시스템은 **항상** ↑/↓로 결과 이동, Enter로 실행, Esc로 닫기를 지원해야 한다.

### REQ-006: 수정자 키 의미 분리

**[Event-Driven]** **When** 북마크 결과가 선택된 상태에서:
- Enter: 같은 창에서 열기
- Cmd/Ctrl+Enter: 새 창에서 열기
- Alt/Option+Enter: EditModal로 편집
- Cmd/Ctrl+Backspace: 삭제 확인 다이얼로그

### REQ-007: 접두사 필터

**[Event-Driven]** **When** 입력의 첫 문자가 특수 접두사면, 시스템은 해당 그룹만 검색**해야 한다**:
- `>` 또는 `:` → Actions만
- `#` → Tags만
- `@` → Categories만
- `/` → Bookmarks만 (URL 포함)

### REQ-008: 사용 기록 저장

**[Event-Driven]** **When** 사용자가 Command Palette에서 항목을 실행하면, 시스템은 해당 항목 ID와 timestamp를 usage history에 기록**해야 한다**.

### REQ-009: Highlight 매칭 글자

**[Ubiquitous]** 시스템은 검색 결과의 매칭된 글자를 **항상** 굵게/색상 강조해야 한다.

### REQ-010: 응답성

**[Ubiquitous]** 검색 결과는 키 입력 후 100ms 이내에 표시되어야 한다 (북마크 1000개 기준).

### REQ-011: Empty State

**[State-Driven]** **While** 검색어가 있고 매칭 결과가 0건인 동안, 시스템은 "결과 없음" 메시지와 가능한 액션(예: "이 텍스트로 새 북마크 추가") 제안을 표시**해야 한다**.

### REQ-012: Footer 키 가이드

**[Ubiquitous]** Command Palette 하단에 **항상** 사용 가능한 키 단축키 가이드를 표시해야 한다.

## 비기능 요구사항

### NFR-001: 의존성 최소화

fuzzy search는 외부 라이브러리(`fuse.js` 등) 또는 자체 구현 모두 가능. 번들 크기 +20KB 이내.

### NFR-002: 접근성 (a11y)

- ARIA combobox 패턴 준수
- Focus trap (palette 내부에서만 포커스 순환)
- Esc로 닫고 이전 포커스 복원

### NFR-003: 키보드 우선

마우스 사용 없이 모든 기능 접근 가능해야 한다.

### NFR-004: 테스트 커버리지 85% 이상

신규 모듈(`commandStore`, `usageStore`, `fuzzyMatch`)은 85% 이상 커버.

## 제약사항

- React 19, TypeScript strict, Zustand 5
- 검색 알고리즘: subsequence + 가중치 매칭 (full Levenshtein 불필요)
- 최대 결과 수: 그룹당 5개 (총 20개)
- usage history 최대 200개 (오래된 것부터 삭제)

## 데이터 스키마

```typescript
// 신규: commandStore
interface CommandPaletteState {
  isOpen: boolean
  query: string
  selectedIndex: number
  open: () => void
  close: () => void
  setQuery: (q: string) => void
}

// 신규: usageStore
interface UsageEntry {
  type: 'bookmark' | 'category' | 'tag' | 'action'
  id: string
  timestamps: number[]   // 최근 N개 사용 시각
}

interface UsageState {
  entries: Map<string, UsageEntry>
  recordUsage: (type: UsageEntry['type'], id: string) => void
  getScore: (type: UsageEntry['type'], id: string) => number  // 빈도 * recency
}

// 통합 검색 결과
type SearchResult =
  | { kind: 'bookmark'; link: Link; categoryId: string; matchedRanges: [number, number][] }
  | { kind: 'category'; category: Category; matchedRanges: [number, number][] }
  | { kind: 'tag'; tag: string; count: number; matchedRanges: [number, number][] }
  | { kind: 'action'; action: PaletteAction; matchedRanges: [number, number][] }
```

## Action 목록 (내장)

- 테마 전환
- 위젯/Pivot 모드 전환
- 레이아웃 초기화
- 로그아웃
- 북마크 가져오기 (Import)
- 빠른 추가
- 중복 탐지
- 새로고침 피드
- 모든 태그 보기
- 최근 추가된 북마크 보기

## Exclusions (What NOT to Build)

- **풀텍스트 페이지 콘텐츠 검색**: 메타데이터(이름, URL)만
- **검색 히스토리 UI**: usageStore는 내부 ranking 용도만
- **음성 입력**: 키보드만
- **AI 자연어 검색**: regex/fuzzy만
- **다중 선택 (체크박스)**: 단일 선택만 (Bulk edit은 별도 SPEC)
