# SPEC-LAYOUT-001: 드래그 앤 드롭 위젯 레이아웃

---
id: SPEC-LAYOUT-001
version: 1.0.0
status: Planned
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

사용자가 위젯의 위치와 크기를 자유롭게 조정할 수 있는 드래그 앤 드롭 그리드 레이아웃 시스템을 도입한다.
현재의 고정 CSS 그리드를 react-grid-layout 기반의 동적 레이아웃으로 교체하여,
각 위젯의 배치를 localStorage/Firestore에 저장하고 세션 간 유지한다.

## 요구사항

### REQ-001 [Event-Driven]
**When** 사용자가 위젯의 헤더를 드래그하면, **the** 시스템은 위젯을 그리드 내에서 이동할 수 **shall** 있어야 한다.

### REQ-002 [Event-Driven]
**When** 사용자가 위젯의 모서리/테두리를 드래그하면, **the** 시스템은 위젯의 크기를 조정할 수 **shall** 있어야 한다.

### REQ-003 [State-Driven]
**While** 레이아웃 변경이 발생하면, **the** 시스템은 변경된 레이아웃을 자동으로 **shall** 저장해야 한다.

### REQ-004 [Event-Driven]
**When** 앱이 시작되면, **the** 시스템은 저장된 레이아웃을 **shall** 복원해야 한다.

### REQ-005 [Event-Driven]
**When** 사용자가 "레이아웃 초기화" 버튼을 클릭하면, **the** 시스템은 기본 레이아웃으로 **shall** 되돌려야 한다.

### REQ-006 [Ubiquitous]
**The** 시스템은 각 위젯의 최소 크기 제약(minW, minH)을 **shall** 적용해야 한다.

### REQ-007 [Ubiquitous]
**The** 레이아웃은 12열 그리드 기반으로 **shall** 동작해야 한다.

## 비기능 요구사항

### NFR-001: 반응성
드래그/리사이즈 중 60fps 이상 유지.

### NFR-002: 호환성
Electron 앱과 웹 브라우저 모두에서 동작.

### NFR-003: 타입 안전성
TypeScript strict 모드 준수.

## 아키텍처 결정

### 라이브러리
- `react-grid-layout` 사용 (1.x)
- CSS: `react-grid-layout/css/styles.css` + `react-resizable/css/styles.css`

### 레이아웃 스키마
```ts
interface WidgetLayout {
  i: string   // 위젯 ID
  x: number   // 열 위치
  y: number   // 행 위치
  w: number   // 열 너비
  h: number   // 행 높이
  minW?: number
  minH?: number
}
```

### 기본 레이아웃
| 위젯 | x | y | w | h | minW | minH |
|------|---|---|---|---|------|------|
| clock | 0 | 0 | 4 | 2 | 3 | 2 |
| search | 4 | 0 | 8 | 2 | 4 | 2 |
| bookmarks | 0 | 2 | 8 | 6 | 4 | 4 |
| todo | 8 | 2 | 4 | 4 | 3 | 3 |
| notes | 8 | 6 | 4 | 4 | 3 | 3 |

### 저장 전략
- `layoutStore.ts` (Zustand): 레이아웃 상태 관리
- 스토리지 어댑터(storage.ts) 활용 → Electron/웹 공통

## Exclusions

- 위젯 추가/제거 UI (위젯 토글은 별도 SPEC)
- 모바일 터치 최적화
