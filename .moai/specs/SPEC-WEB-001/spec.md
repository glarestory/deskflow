---
id: SPEC-WEB-001
version: 1.0.0
status: draft
created: 2026-04-11
updated: 2026-04-11
author: ZeroJuneK
priority: high
issue_number: 0
---

# SPEC-WEB-001: Deskflow 웹 배포 전환

## HISTORY

| 버전 | 날짜 | 작성자 | 변경 내용 |
|------|------|--------|-----------|
| 1.0.0 | 2026-04-11 | ZeroJuneK | 최초 작성 |

## 개요

Deskflow Electron 앱을 브라우저에서 실행 가능한 웹 애플리케이션으로 변환한다.
Electron IPC 기반 `window.storage` API를 추상화하여 웹 환경에서는 `localStorage`를,
Electron 환경에서는 기존 IPC 브릿지를 사용하는 Storage Abstraction Layer를 도입한다.
별도의 Vite 웹 빌드 설정을 추가하여 정적 파일로 배포 가능한 출력물을 생성한다.

**분류**: SPEC (구현 대상 기능)
**성격**: Brownfield -- 기존 Electron 앱에 웹 호환 레이어 추가

## 요구사항

### REQ-001: Storage Abstraction Layer

**[Ubiquitous]** 시스템은 `src/renderer/lib/storage.ts` 모듈을 통해 `get(key)` / `set(key, value)` 함수를 **항상** 제공해야 한다.

**[Event-Driven]** **When** 모듈이 로드되면, 시스템은 `typeof window.storage !== 'undefined'` 조건으로 Electron 환경 여부를 감지**해야 한다**.

**[State-Driven]** **While** Electron 환경(window.storage가 존재)인 동안, `get`/`set` 함수는 기존 `window.storage.get`/`window.storage.set` IPC 브릿지를 사용**해야 한다**.

**[State-Driven]** **While** 웹 브라우저 환경(window.storage가 미존재)인 동안, `get` 함수는 `localStorage.getItem(key)`를 `{ value: string | null }` 형태로 래핑하여 반환**해야 하며**, `set` 함수는 `localStorage.setItem(key, value)`를 호출**해야 한다**.

**[Ubiquitous]** `get` 함수의 반환 타입은 `Promise<{ value: string | null }>`로 기존 IPC API와 동일한 시그니처를 **항상** 유지해야 한다.

**[Ubiquitous]** `set` 함수의 반환 타입은 `Promise<void>`로 기존 IPC API와 동일한 시그니처를 **항상** 유지해야 한다.

### REQ-002: localStorage 어댑터 구현

**[Event-Driven]** **When** 웹 환경에서 `get(key)`를 호출하면, 시스템은 `localStorage.getItem(key)` 결과를 `Promise.resolve({ value })` 형태로 반환**해야 한다**.

**[Event-Driven]** **When** 웹 환경에서 `set(key, value)`를 호출하면, 시스템은 `localStorage.setItem(key, value)`를 실행하고 `Promise.resolve()` 를 반환**해야 한다**.

**[Unwanted]** localStorage 어댑터는 JSON 파싱이나 직렬화를 수행**해서는 안 된다** (호출자가 직접 처리).

### REQ-003: 스토어 Storage 추상화 적용

**[Ubiquitous]** `bookmarkStore.ts`는 `window.storage.get`/`set` 대신 `storage.ts`에서 import한 `get`/`set` 함수를 **항상** 사용해야 한다.

**[Ubiquitous]** `todoStore.ts`는 `window.storage.get`/`set` 대신 `storage.ts`에서 import한 `get`/`set` 함수를 **항상** 사용해야 한다.

**[Ubiquitous]** `themeStore.ts`는 `window.storage.get`/`set` 대신 `storage.ts`에서 import한 `get`/`set` 함수를 **항상** 사용해야 한다.

### REQ-004: NotesWidget Storage 추상화 적용

**[Ubiquitous]** `NotesWidget.tsx`는 `window.storage.get`/`set` 대신 `storage.ts`에서 import한 `get`/`set` 함수를 **항상** 사용해야 한다.

**[Ubiquitous]** NotesWidget의 600ms 디바운스 자동 저장 동작은 storage 추상화 적용 후에도 동일하게 동작**해야 한다**.

### REQ-005: 웹 빌드 스크립트

**[Event-Driven]** **When** `npm run build:web`을 실행하면, 시스템은 `vite.web.config.ts` 설정을 사용하여 웹 전용 빌드를 수행**해야 한다**.

**[Ubiquitous]** 웹 빌드 출력물은 `web-dist/` 디렉토리에 **항상** 생성되어야 한다.

**[Ubiquitous]** 웹 빌드는 Electron 의존성(`electron`, `electron-vite`, `electron-builder`, `electron-store`)을 번들에 포함**하지 않아야 한다**.

### REQ-006: 웹 개발 서버

**[Event-Driven]** **When** `npm run dev:web`을 실행하면, 시스템은 `vite.web.config.ts` 설정으로 Vite 개발 서버를 시작**해야 한다**.

**[Ubiquitous]** 웹 개발 서버는 HMR(Hot Module Replacement)을 **항상** 지원해야 한다.

### REQ-007: 정적 파일 배포 호환

**[Ubiquitous]** `web-dist/` 출력물은 `index.html` + JS/CSS 번들로 구성되어 정적 파일 서버(GitHub Pages, Netlify, Vercel)에서 **항상** 서빙 가능해야 한다.

**[Unwanted]** 웹 빌드 출력물은 서버 사이드 런타임(Node.js 등)에 의존**해서는 안 된다**.

### REQ-008: Electron 타입 선언 호환

**[State-Driven]** **While** 웹 빌드 모드인 동안, `electron.d.ts`의 `window.storage` 타입 선언이 없어도 TypeScript 컴파일 오류가 발생**하지 않아야 한다**.

**[Ubiquitous]** `storage.ts` 모듈은 자체적으로 내보내는 `get`/`set` 함수에 대한 완전한 타입 정의를 **항상** 포함해야 한다.

## 비기능 요구사항

### NFR-001: 하위 호환성

- 기존 Electron 빌드(`npm run dev`, `npm run build`)는 영향을 받지 않아야 한다
- 기존 테스트 스위트는 storage 추상화 적용 후에도 통과해야 한다

### NFR-002: 번들 크기

- 웹 빌드에 Electron 관련 코드가 포함되지 않아야 한다
- storage 추상화 레이어의 코드 크기는 1KB 미만이어야 한다

### NFR-003: 타입 안전성

- TypeScript strict mode 준수
- `any` 타입 사용 금지
- storage 추상화 API가 기존 `window.storage` 시그니처와 동일한 타입을 보장

## 제약사항

- React 19 + TypeScript 5.7 strict mode 유지
- Vite (standalone, electron-vite 아님) 사용하여 웹 빌드 구성
- 기존 인라인 스타일 + CSS 변수 패턴 유지
- `@vitejs/plugin-react` 플러그인 재사용

## Exclusions (What NOT to Build)

- **PWA (Service Worker, 오프라인 지원)**: 별도 SPEC에서 다룸
- **멀티 유저 / 백엔드 서버**: 범위 밖
- **인증 (Auth)**: 범위 밖
- **CI/CD 웹 배포 파이프라인**: 별도 SPEC에서 다룸
- **SSR (Server-Side Rendering)**: 순수 클라이언트 사이드 SPA로 유지
- **데이터 마이그레이션 (Electron -> Web)**: 별도 SPEC에서 다룸
- **IndexedDB 또는 다른 웹 스토리지 API**: localStorage만 사용
- **환경 변수 기반 빌드 분기**: 런타임 감지 방식 채택
