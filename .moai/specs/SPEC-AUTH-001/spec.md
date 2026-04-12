---
id: SPEC-AUTH-001
version: 1.0.0
status: draft
created: 2026-04-11
updated: 2026-04-11
author: ZeroJuneK
priority: high
issue_number: 0
---

# SPEC-AUTH-001: Firebase OAuth + Firestore 데이터 동기화

## HISTORY

| 버전 | 날짜 | 작성자 | 변경 내용 |
|------|------|--------|-----------|
| 1.0.0 | 2026-04-11 | ZeroJuneK | 최초 작성 |

## 개요

Deskflow에 Firebase Authentication 기반 Google/GitHub OAuth 로그인을 추가하고,
인증된 사용자의 데이터(bookmarks, todos, notes, theme)를 Firestore에 동기화한다.
기존 localStorage/Electron IPC 기반 스토리지 추상화 레이어(SPEC-WEB-001)를 확장하여
인증 상태에 따라 Firestore 어댑터와 로컬 어댑터를 자동 전환한다.

**분류**: SPEC (구현 대상 기능)
**성격**: Brownfield -- 기존 Storage Abstraction Layer 위에 인증 + 클라우드 동기화 레이어 추가
**선행 SPEC**: SPEC-WEB-001 (Storage Abstraction Layer)

## 요구사항

### REQ-001: 미인증 사용자 로그인 화면 표시

**[Ubiquitous]** 시스템은 인증된 사용자가 없을 때 LoginScreen을 **항상** 표시해야 한다.

### REQ-002: OAuth 로그인 플로우 시작

**[Event-Driven]** **When** 사용자가 "Sign in with Google" 또는 "Sign in with GitHub" 버튼을 클릭하면, 시스템은 Firebase Auth의 `signInWithPopup`을 통해 해당 프로바이더의 OAuth 플로우를 시작**해야 한다**.

### REQ-003: 로그인 성공 후 메인 허브 전환

**[Event-Driven]** **When** OAuth 인증이 성공하면, 시스템은 Firebase User 객체를 authStore에 저장하고 메인 Hub 화면을 표시**해야 한다**.

### REQ-004: 최초 로그인 시 로컬 데이터 마이그레이션

**[Event-Driven]** **When** 사용자가 최초 로그인하면, 시스템은 로컬 스토리지에 저장된 데이터(bookmarks, todos, notes, theme)를 Firestore의 해당 사용자 문서로 업로드**해야 한다**.

### REQ-005: 인증 상태에서 Firestore 데이터 경로

**[State-Driven]** **While** 사용자가 인증된 상태인 동안, 모든 데이터 읽기/쓰기는 Firestore를 통해 수행**되어야 한다**.

### REQ-006: 로그아웃 처리

**[Event-Driven]** **When** 사용자가 로그아웃하면, 시스템은 Firebase 인증 세션을 해제하고 LoginScreen을 다시 표시**해야 한다**.

### REQ-007: Firebase 설정 오류 처리

**[State-Driven]** **While** Firebase 설정이 누락되거나 유효하지 않은 동안, 시스템은 설정 오류 메시지를 표시**해야 한다**.

### REQ-008: Firebase 환경 변수 로딩

**[Ubiquitous]** 시스템은 Firebase 설정을 `VITE_FIREBASE_*` 환경 변수에서 **항상** 로드해야 한다.

### REQ-009: 앱 시작 시 인증 상태 로딩 표시

**[Event-Driven]** **When** 앱이 시작되어 인증 상태를 확인하는 동안, 시스템은 로딩 인디케이터를 표시**해야 한다**.

### REQ-010: 복수 OAuth 프로바이더 지원

**[Ubiquitous]** 시스템은 Google OAuth와 GitHub OAuth 두 가지 프로바이더를 **항상** 지원해야 한다.

## 비기능 요구사항

### NFR-001: 인증 상태 지속성

Firebase Auth의 기본 세션 관리를 통해 인증 상태가 페이지 새로고침 후에도 유지되어야 한다.

### NFR-002: TypeScript 타입 안전성

TypeScript strict mode를 준수하고, `any` 타입을 사용하지 않아야 한다.

### NFR-003: Firestore 오프라인 지속성

Firestore의 오프라인 캐시(`enablePersistence` 또는 `enableIndexedDbPersistence`)를 활성화하여
네트워크 끊김 시에도 데이터 접근이 가능해야 한다.

### NFR-004: 테스트 Firebase SDK 모킹

테스트에서 Firebase SDK를 `vi.mock`으로 모킹하여 실제 Firebase 서비스에 의존하지 않아야 한다.

### NFR-005: 하위 호환성

기존 Electron 빌드 및 웹 빌드 기능(SPEC-WEB-001)이 영향을 받지 않아야 한다.
미인증 상태에서 로컬 스토리지 기반 동작은 기존과 동일해야 한다.

## 제약사항

- Firebase SDK v10 (modular API) 사용
- React 19 + TypeScript 5.7 strict mode 유지
- Zustand 5 기반 상태 관리
- Electron 환경에서는 `signInWithPopup` (web popup) 방식 사용
- 기존 인라인 스타일 + CSS 변수 패턴 유지

## Firestore 데이터 스키마

```
users/{uid}/
  profile     -> { displayName, email, photoURL }
  data/
    bookmarks -> [{ id, name, icon, links[] }]
    todos     -> [{ id, text, done }]
    theme     -> { mode: "dark" | "light" }
    notes     -> { content: string }
```

## Exclusions (What NOT to Build)

- **Email/Password 인증**: OAuth만 지원, email/password 로그인은 범위 밖
- **멀티 프로필 / 팀 기능**: 향후 SPEC에서 다룸
- **충돌 해결 (다중 디바이스 동시 편집)**: 향후 SPEC에서 다룸
- **Electron 네이티브 OAuth**: 웹 팝업 방식으로 통일 (Electron에서도 동작)
- **푸시 알림**: 범위 밖
- **결제/구독**: 범위 밖
- **Firebase Admin SDK / Cloud Functions**: 클라이언트 SDK만 사용
- **소셜 프로필 연동 (Twitter, Facebook 등)**: Google/GitHub만 지원
