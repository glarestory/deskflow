# SPEC-WIDGET-003: RSS/뉴스 피드 위젯

---
id: SPEC-WIDGET-003
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

사용자가 등록한 RSS 피드 URL로부터 최신 기사를 가져와 홈 화면에 표시하는 위젯을 추가한다.
여러 피드를 관리할 수 있으며 클릭 시 브라우저/외부 링크로 열린다.

## 요구사항

### REQ-001 [Event-Driven]
**When** 사용자가 RSS URL을 추가하면, **the** 시스템은 해당 피드의 최신 기사를 **shall** 가져와야 한다.

### REQ-002 [Ubiquitous]
**The** 위젯은 각 피드의 최신 기사를 제목, 출처, 발행일 순으로 **shall** 표시해야 한다.

### REQ-003 [Event-Driven]
**When** 사용자가 기사를 클릭하면, **the** 시스템은 해당 기사 URL을 기본 브라우저에서 **shall** 열어야 한다.

### REQ-004 [Event-Driven]
**When** 앱이 시작되거나 새로고침 버튼을 클릭하면, **the** 시스템은 등록된 모든 피드를 **shall** 갱신해야 한다.

### REQ-005 [State-Driven]
**While** 피드를 불러오는 동안, **the** 시스템은 로딩 상태를 **shall** 표시해야 한다.

### REQ-006 [Event-Driven]
**When** 사용자가 피드 URL을 삭제하면, **the** 시스템은 해당 피드와 기사 목록을 **shall** 제거해야 한다.

### REQ-007 [Unwanted]
**If** RSS 피드 파싱에 실패하면, **then** **the** 시스템은 해당 피드에 오류 상태를 **shall** 표시해야 한다.

### REQ-008 [Ubiquitous]
**The** 시스템은 최대 5개 피드를 **shall** 지원해야 한다.

### REQ-009 [Ubiquitous]
**The** 시스템은 피드당 최신 10개 기사를 **shall** 표시해야 한다.

## 비기능 요구사항

### NFR-001: CORS 처리
브라우저 환경에서 CORS 이슈 해결을 위해 RSS-to-JSON 프록시 서비스 또는 Electron의 net 모듈 활용.

### NFR-002: 캐싱
마지막 성공 피드 결과를 localStorage에 캐싱.

### NFR-003: 타입 안전성
RSS 아이템 타입 정의 필수.

## 아키텍처 결정

### RSS 파싱 전략
- Electron 환경: `node-fetch` + xml 파싱 (IPC를 통해 메인 프로세스 활용)
- 웹 환경: `https://api.rss2json.com/v1/api.json?rss_url=` 프록시 사용 (무료 티어)
- 파서: `fast-xml-parser` 또는 DOMParser

### 상태 관리
- `feedStore.ts` (Zustand) 신규 생성
- 상태: `{ feeds: Feed[], articles: Article[], loading, error }`

### 컴포넌트
- `src/renderer/components/FeedWidget/FeedWidget.tsx`
- `src/renderer/components/FeedWidget/FeedWidget.test.tsx`

### 타입
```ts
interface Feed { id: string; url: string; title: string }
interface Article { feedId: string; title: string; link: string; pubDate: string; source: string }
```

## Exclusions

- 기사 전문 내장 뷰어
- 읽음/안읽음 상태 관리
- 푸시 알림
