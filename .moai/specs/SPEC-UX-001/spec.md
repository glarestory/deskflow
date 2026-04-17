# SPEC-UX-001: 키보드 단축키 팔레트 (Command Palette)

---
id: SPEC-UX-001
version: 1.0.0
status: Implemented
created: 2026-04-12
updated: 2026-04-12
author: ZeroJuneK
priority: High
---

## HISTORY

| 버전 | 날짜 | 변경 내용 |
|------|------|-----------|
| 1.0.0 | 2026-04-12 | 초기 SPEC 작성 |

## 개요

`Cmd+K` (macOS) / `Ctrl+K` (Windows/Linux) 단축키로 호출되는 Command Palette를 구현한다.
북마크 검색, 할 일 추가, Google 검색, 앱 내 액션(테마 전환 등)을 하나의 입력창에서 처리한다.

## 요구사항

### REQ-001 [Event-Driven]
**When** 사용자가 `Cmd+K` / `Ctrl+K`를 누르면, **the** 시스템은 Command Palette 오버레이를 **shall** 표시해야 한다.

### REQ-002 [Event-Driven]
**When** 팔레트가 열리면, **the** 시스템은 입력 필드에 자동 포커스를 **shall** 부여해야 한다.

### REQ-003 [Event-Driven]
**When** `Escape`를 누르거나 오버레이 외부를 클릭하면, **the** 시스템은 팔레트를 **shall** 닫아야 한다.

### REQ-004 [State-Driven]
**While** 사용자가 텍스트를 입력하면, **the** 시스템은 아래 카테고리에서 실시간으로 결과를 **shall** 필터링해야 한다:
  - 북마크 (제목/URL 매칭)
  - 할 일 (텍스트 매칭)
  - 앱 액션 (테마 전환, 가져오기, 내보내기 등)
  - Google 검색 (폴백)

### REQ-005 [Event-Driven]
**When** 사용자가 결과 항목을 클릭하거나 `Enter`를 누르면, **the** 시스템은 해당 액션을 **shall** 실행해야 한다.

### REQ-006 [Ubiquitous]
**The** 시스템은 `↑` / `↓` 화살표 키로 결과 항목 간 이동을 **shall** 지원해야 한다.

### REQ-007 [Ubiquitous]
**The** 팔레트는 최대 10개 결과를 **shall** 표시해야 한다.

### REQ-008 [Ubiquitous]
**The** 북마크 결과 클릭 시 기본 브라우저로 URL이 **shall** 열려야 한다.

### REQ-009 [Ubiquitous]
**The** 할 일 결과 클릭 시 해당 할 일을 완료 토글하거나 TodoWidget으로 포커스를 **shall** 이동해야 한다.

### REQ-010 [Ubiquitous]
**The** 팔레트는 마지막 5개 검색어를 최근 검색으로 **shall** 저장해야 한다.

## 비기능 요구사항

### NFR-001: 성능
키 입력 후 100ms 이내 결과 렌더링 (디바운스 불필요, 로컬 데이터만 검색).

### NFR-002: 접근성
`role="combobox"`, `aria-expanded`, `aria-activedescendant` 속성 적용.

### NFR-003: 애니메이션
팔레트 오픈/클로즈 시 fade + scale 트랜지션 (200ms).

## 아키텍처 결정

### 단축키 등록
- `useEffect`에서 `document.addEventListener('keydown', handler)` 사용
- Electron과 웹 모두 동일 방식

### 컴포넌트
- `src/renderer/components/CommandPalette/CommandPalette.tsx`
- `src/renderer/components/CommandPalette/CommandPalette.test.tsx`
- `src/renderer/hooks/useCommandPalette.ts` (단축키 + 상태 관리)

### 앱 액션 레지스트리
```ts
interface PaletteAction {
  id: string
  label: string
  category: 'bookmark' | 'todo' | 'action' | 'search'
  icon?: string
  execute: () => void
}
```

### 전역 상태
- App.tsx에서 팔레트 열림/닫힘 상태 관리
- bookmarkStore, todoStore에서 데이터 직접 참조 (별도 store 불필요)

## Exclusions

- 플러그인 시스템
- 커스텀 단축키 설정
- 음성 입력
