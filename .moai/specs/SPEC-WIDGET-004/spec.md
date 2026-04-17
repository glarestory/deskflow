# SPEC-WIDGET-004: 포모도로 타이머

---
id: SPEC-WIDGET-004
version: 1.0.0
status: Planned
created: 2026-04-12
updated: 2026-04-12
author: ZeroJuneK
priority: Medium
depends_on: SPEC-LAYOUT-001
---

## HISTORY

| 버전 | 날짜 | 변경 내용 |
|------|------|-----------|
| 1.0.0 | 2026-04-12 | 초기 SPEC 작성 |

## 개요

25분 집중 + 5분 휴식 사이클의 포모도로 타이머 위젯을 추가한다.
TodoWidget의 할 일 항목과 연동하여 "어떤 할 일에 집중 중인지" 트래킹할 수 있으며,
세션 완료 시 데스크톱 알림을 발송한다.

## 요구사항

### REQ-001 [Event-Driven]
**When** 사용자가 시작 버튼을 클릭하면, **the** 시스템은 25분 카운트다운을 **shall** 시작해야 한다.

### REQ-002 [Event-Driven]
**When** 사용자가 일시정지 버튼을 클릭하면, **the** 시스템은 타이머를 **shall** 일시정지해야 한다.

### REQ-003 [Event-Driven]
**When** 사용자가 초기화 버튼을 클릭하면, **the** 시스템은 타이머를 **shall** 초기 상태로 되돌려야 한다.

### REQ-004 [Event-Driven]
**When** 25분 집중 세션이 완료되면, **the** 시스템은 데스크톱 알림을 발송하고 5분 휴식 타이머를 **shall** 시작해야 한다.

### REQ-005 [Event-Driven]
**When** 5분 휴식 세션이 완료되면, **the** 시스템은 데스크톱 알림을 발송하고 다음 집중 세션 준비 상태로 **shall** 전환해야 한다.

### REQ-006 [Ubiquitous]
**The** 위젯은 현재 남은 시간(MM:SS), 세션 유형(집중/휴식), 완료된 포모도로 수를 **shall** 표시해야 한다.

### REQ-007 [Event-Driven]
**When** 사용자가 TodoWidget의 할 일 항목을 선택하면, **the** 시스템은 해당 할 일과 타이머를 **shall** 연결해야 한다.

### REQ-008 [Ubiquitous]
**The** 시스템은 집중 시간(기본 25분)과 휴식 시간(기본 5분)을 설정에서 **shall** 변경할 수 있어야 한다.

### REQ-009 [Unwanted]
**If** 4번의 포모도로가 완료되면, **then** **the** 시스템은 15분 긴 휴식을 **shall** 제안해야 한다.

## 비기능 요구사항

### NFR-001: 정확성
1초 단위 카운트다운. `setInterval` 드리프트 보정 적용.

### NFR-002: 알림
Electron: `new Notification()` (Node.js Notification API)
웹: `Notification` Web API (권한 요청 필요)

### NFR-003: 배경 실행
앱이 포커스를 잃어도 타이머는 계속 동작.

## 아키텍처 결정

### 상태 관리
- `pomodoroStore.ts` (Zustand) 신규 생성
- 상태: `{ mode: 'focus'|'break'|'longBreak'|'idle', remaining, completed, linkedTodoId, settings }`

### 컴포넌트
- `src/renderer/components/PomodoroWidget/PomodoroWidget.tsx`
- `src/renderer/components/PomodoroWidget/PomodoroWidget.test.tsx`

### TodoWidget 연동
- todoStore의 할 일 목록을 드롭다운으로 노출
- 집중 세션 완료 시 연결된 할 일의 완료 여부는 사용자가 직접 토글 (자동 완료 없음)

### 설정 저장
- pomodoroStore의 settings를 storage 어댑터로 영속화

## Exclusions

- 통계/히스토리 뷰
- 소리 알림 (데스크톱 알림만)
- 서버 동기화
