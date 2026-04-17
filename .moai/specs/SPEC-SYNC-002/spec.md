# SPEC-SYNC-002: 오프라인 우선 + Firestore 충돌 해결

---
id: SPEC-SYNC-002
version: 1.0.0
status: Planned
created: 2026-04-12
updated: 2026-04-12
author: ZeroJuneK
priority: Low
depends_on: SPEC-AUTH-001
---

## HISTORY

| 버전 | 날짜 | 변경 내용 |
|------|------|-----------|
| 1.0.0 | 2026-04-12 | 초기 SPEC 작성 |

## 개요

SPEC-AUTH-001에서 구현된 Firestore 동기화를 오프라인 우선(Offline-First) 방식으로 개선하고,
여러 기기 간 데이터 충돌 발생 시 Last-Write-Wins 대신 사용자가 선택할 수 있는 충돌 해결 UI를 제공한다.

## 요구사항

### 오프라인 우선

#### REQ-001 [Ubiquitous]
**The** 시스템은 네트워크 연결 없이도 **shall** 정상 동작해야 한다.

#### REQ-002 [State-Driven]
**While** 오프라인 상태이면, **the** 시스템은 상태 표시줄에 "오프라인" 배지를 **shall** 표시해야 한다.

#### REQ-003 [Event-Driven]
**When** 오프라인에서 데이터를 변경하면, **the** 시스템은 변경 사항을 로컬 대기열(pending queue)에 **shall** 저장해야 한다.

#### REQ-004 [Event-Driven]
**When** 네트워크가 복구되면, **the** 시스템은 대기열의 변경 사항을 Firestore에 자동으로 **shall** 동기화해야 한다.

#### REQ-005 [Ubiquitous]
**The** 시스템은 Firestore SDK의 `enableIndexedDbPersistence` 또는 `initializeFirestore({ localCache })` 를 **shall** 활성화해야 한다.

### 충돌 해결

#### REQ-006 [Event-Driven]
**When** 동일 데이터가 두 기기에서 동시에 수정되어 충돌이 발생하면, **the** 시스템은 충돌 해결 모달을 **shall** 표시해야 한다.

#### REQ-007 [Ubiquitous]
**The** 충돌 모달은 "로컬 버전", "서버 버전", "병합" 옵션을 **shall** 제공해야 한다.

#### REQ-008 [Event-Driven]
**When** 사용자가 버전을 선택하면, **the** 시스템은 선택된 버전을 확정하고 Firestore를 **shall** 업데이트해야 한다.

#### REQ-009 [Ubiquitous]
**The** 시스템은 각 데이터 변경에 타임스탬프와 기기 ID를 **shall** 기록해야 한다.

#### REQ-010 [Ubiquitous]
**The** 시스템은 마지막 동기화 시각을 UI에 **shall** 표시해야 한다.

## 비기능 요구사항

### NFR-001: 데이터 무결성
충돌 해결 전까지 어떤 데이터도 손실되어서는 안 됨.

### NFR-002: 투명성
동기화 상태(동기화됨/동기화 중/오프라인/충돌)를 사용자가 항상 확인 가능.

### NFR-003: 성능
대기열 동기화는 백그라운드에서 실행되어 UI를 블로킹하지 않음.

## 아키텍처 결정

### Firebase SDK 설정
- `initializeFirestore` with `persistentLocalCache({ tabManager: persistentMultipleTabManager() })` 적용
- `firestoreStorage.ts` 수정

### 충돌 감지 전략
- Firestore 트랜잭션을 활용한 낙관적 잠금
- `updatedAt` 필드 비교로 충돌 감지
- 충돌 시 로컬 변경을 pending 상태로 보존

### 상태 확장
- `syncStore.ts` 신규 생성
- 상태: `{ status: 'synced'|'syncing'|'offline'|'conflict', pendingCount, lastSynced, conflicts }`

### 컴포넌트
- `src/renderer/components/SyncStatus/SyncStatus.tsx`: 상태 배지 (TopBar에 통합)
- `src/renderer/components/ConflictModal/ConflictModal.tsx`: 충돌 해결 UI

### 대기열 구조
```ts
interface PendingChange {
  id: string
  collection: string
  operation: 'set' | 'update' | 'delete'
  data: unknown
  timestamp: number
  deviceId: string
}
```

## Exclusions

- 실시간 협업 (다른 사용자와 동시 편집)
- 변경 이력 롤백
- 백엔드 충돌 해결 서버
