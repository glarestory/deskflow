# SPEC-TODO-002: 할 일 반복 설정

---
id: SPEC-TODO-002
version: 1.0.0
status: Planned
created: 2026-04-12
updated: 2026-04-12
author: ZeroJuneK
priority: Medium
---

## HISTORY

| 버전 | 날짜 | 변경 내용 |
|------|------|-----------|
| 1.0.0 | 2026-04-12 | 초기 SPEC 작성 |

## 개요

TodoWidget의 할 일 항목에 반복 일정(매일, 매주 특정 요일, 매월)을 설정할 수 있도록 확장한다.
반복 할 일은 설정된 일정에 따라 자동으로 재생성되며, 완료 후 다음 회차가 준비된다.

## 요구사항

### REQ-001 [Event-Driven]
**When** 사용자가 할 일을 추가하거나 편집할 때, **the** 시스템은 반복 설정 옵션을 **shall** 제공해야 한다.

### REQ-002 [Ubiquitous]
**The** 시스템은 다음 반복 패턴을 **shall** 지원해야 한다: 없음, 매일, 매주(요일 선택), 매월(일 선택).

### REQ-003 [Event-Driven]
**When** 반복 할 일이 완료 처리되면, **the** 시스템은 다음 예정일에 해당 할 일을 자동으로 **shall** 재생성해야 한다.

### REQ-004 [Ubiquitous]
**The** 반복 할 일은 완료 여부와 무관하게 목록에서 구분 표시(반복 아이콘)되어야 **shall** 한다.

### REQ-005 [Event-Driven]
**When** 앱이 시작되면, **the** 시스템은 오늘 예정된 반복 할 일이 목록에 있는지 **shall** 확인해야 한다.

### REQ-006 [Unwanted]
**If** 앱이 여러 날 동안 실행되지 않았다면, **then** **the** 시스템은 놓친 날짜의 할 일을 일괄 생성하지 않고 당일 것만 **shall** 생성해야 한다.

### REQ-007 [Event-Driven]
**When** 사용자가 반복 할 일을 삭제하면, **the** 시스템은 "이 항목만 삭제" 또는 "반복 전체 삭제" 옵션을 **shall** 제공해야 한다.

### REQ-008 [Ubiquitous]
**The** 시스템은 반복 할 일에 다음 예정일을 **shall** 표시해야 한다.

## 비기능 요구사항

### NFR-001: 날짜 계산
외부 date 라이브러리 없이 Date 표준 API만 사용.

### NFR-002: 타입 안전성
TypeScript strict 모드 준수.

## 아키텍처 결정

### 타입 확장
```ts
interface Todo {
  id: string
  text: string
  completed: boolean
  // 신규 필드
  recurrence?: {
    type: 'daily' | 'weekly' | 'monthly'
    daysOfWeek?: number[]  // weekly: 0=일, 6=토
    dayOfMonth?: number    // monthly
    nextDue: string        // ISO date string
    parentId?: string      // 원본 반복 할 일 ID
  }
}
```

### todoStore 확장
- `addRecurringTodo(todo, recurrence)`: 반복 할 일 추가
- `checkAndRegenerateRecurring()`: 앱 시작 시 호출, 오늘 예정 항목 생성
- `deleteTodoSeries(id)`: 반복 전체 삭제

### 컴포넌트 확장
- `TodoWidget.tsx`: 반복 아이콘 표시, 삭제 확인 모달
- `RecurrenceModal.tsx` 신규: 반복 설정 UI

## Exclusions

- 커스텀 반복 패턴 (격주, N일마다 등)
- 반복 할 일 캘린더 뷰
- Firestore 반복 할 일 동기화 (SPEC-SYNC-002에서 처리)
