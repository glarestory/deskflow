---
id: SPEC-UX-005
version: 1.0.0
status: draft
created: 2026-04-13
updated: 2026-04-13
author: ZeroJuneK
priority: high
issue_number: 0
---

# SPEC-UX-005: View Mode Toggle (Pivot ↔ Widget)

## HISTORY

| 버전 | 날짜 | 작성자 | 변경 내용 |
|------|------|--------|-----------|
| 1.0.0 | 2026-04-13 | ZeroJuneK | 최초 작성 (Pivot UX 전환 마무리) |

## 개요

기존 드래그 그리드 대시보드(SPEC-LAYOUT-001 + SPEC-UI-001)는 신규 Pivot 레이아웃(SPEC-UX-003)과 함께 **2가지 view mode** 중 하나를 선택할 수 있도록 한다.
기본은 Pivot, 사용자가 토글로 전환 가능. 선택은 Firestore/localStorage에 영속화한다.

**분류**: SPEC (구현 대상 기능)
**성격**: Brownfield -- App.tsx 분기, 기존 그리드 코드는 유지
**선행 SPEC**: SPEC-UX-003 (Pivot), SPEC-LAYOUT-001 (기존 위젯 그리드)

## 요구사항

### REQ-001: viewMode 상태 정의

**[Ubiquitous]** 시스템은 **항상** `viewMode: 'pivot' | 'widgets'` 상태를 보유해야 한다.

### REQ-002: 기본값 = pivot

**[Ubiquitous]** viewMode 초기값은 **항상** `'pivot'` 이어야 한다.

### REQ-003: viewMode 영속화

**[Event-Driven]** **When** 사용자가 viewMode를 변경하면, 시스템은 즉시 storage에 저장**해야 한다** (Firestore 인증 사용자 / localStorage 미인증).

### REQ-004: 앱 시작 시 viewMode 복원

**[Event-Driven]** **When** 앱이 시작되어 사용자 데이터를 로드할 때, 저장된 viewMode를 복원**해야 한다**.

### REQ-005: 토글 UI 위치

**[Ubiquitous]** viewMode 전환 토글은 **항상** Pivot 사이드바 설정 섹션과 위젯 모드 TopBar 양쪽에 표시되어야 한다.

### REQ-006: 전환 즉시 반영

**[Event-Driven]** **When** 사용자가 토글하면, 화면이 즉시 해당 모드로 재렌더링**되어야 한다** (페이지 리로드 없이).

### REQ-007: 위젯 모드에서 사이드바/Pivot 컴포넌트 미사용

**[State-Driven]** **While** viewMode === 'widgets' 인 동안, PivotLayout 컴포넌트는 mount 되지 않아야 한다 (메모리 절약).

### REQ-008: 위젯 모드 표시 = 기존 ReactGridLayout

**[State-Driven]** **While** viewMode === 'widgets' 인 동안, 화면은 기존 SPEC-LAYOUT-001 그리드 형태로 동작**해야 한다** (회귀 0).

### REQ-009: Command Palette 액션 통합

**[Ubiquitous]** Command Palette(SPEC-UX-002)에 **항상** "위젯 모드 전환" 또는 "Pivot 모드 전환" 액션이 표시되어야 한다 (현재 모드와 반대).

### REQ-010: 모드 전환 시 컨텍스트 보존

**[Event-Driven]** **When** Pivot 모드에서 컨텍스트(카테고리/태그) 선택 후 위젯 모드로 전환했다가 다시 Pivot으로 돌아오면, 이전 컨텍스트가 복원**되어야 한다**.

### REQ-011: 첫 진입 안내 (선택)

**[Event-Driven]** **When** 기존 위젯 모드 사용자가 업데이트 후 처음 Pivot 모드에 진입하면, 시스템은 1회성 안내 토스트를 표시**해야 한다** ("새로운 Pivot 레이아웃입니다. 위젯 모드로 돌아가려면 ⚙ 설정 > 위젯 모드").

## 비기능 요구사항

### NFR-001: 회귀 방지

기존 SPEC-LAYOUT-001 / SPEC-UI-001 / SPEC-WIDGET-* 테스트 100% 통과.

### NFR-002: 마이그레이션 안전성

- 기존 사용자: layoutStore에 저장된 widget layout이 있어도 viewMode는 'pivot' 기본
- 첫 진입 안내로 위젯 모드로 돌아가는 경로 명확히 제공

### NFR-003: 번들 분리 (선택적)

추후 필요 시 위젯 모드 코드를 dynamic import로 분리 가능하도록 구조화 (1차에서는 정적 import 허용).

## 제약사항

- React 19, TypeScript strict, Zustand 5
- viewMode 저장은 themeStore와 동일한 스토리지 패턴 사용 (storage abstraction)

## 데이터 스키마

```typescript
// 신규: viewModeStore
type ViewMode = 'pivot' | 'widgets'

interface ViewModeState {
  mode: ViewMode
  loaded: boolean
  loadMode: () => Promise<void>
  setMode: (mode: ViewMode) => void
  toggleMode: () => void
}
```

스토리지 키: `view-mode` (string: "pivot" 또는 "widgets")

## App.tsx 분기 구조

```typescript
function App() {
  const { mode: viewMode } = useViewModeStore()
  // ... 인증/로딩 게이트 ...

  if (viewMode === 'pivot') {
    return <PivotLayout />
  }
  return <WidgetLayout />  // 기존 ReactGridLayout 코드
}
```

## Exclusions (What NOT to Build)

- **3번째 view mode**: pivot/widgets 2가지만
- **분할 화면 (Pivot + Widget 동시)**: 단일 모드만
- **Per-category view mode**: 전역만
- **Animated transition**: 즉시 전환만
- **Code splitting / lazy load**: 1차에서는 정적 (필요 시 후속)
