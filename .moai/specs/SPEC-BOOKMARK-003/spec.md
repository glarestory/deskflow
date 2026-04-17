---
id: SPEC-BOOKMARK-003
version: 1.0.0
status: draft
created: 2026-04-13
updated: 2026-04-13
author: ZeroJuneK
priority: high
issue_number: 0
---

# SPEC-BOOKMARK-003: 북마크 태그 시스템

## HISTORY

| 버전 | 날짜 | 작성자 | 변경 내용 |
|------|------|--------|-----------|
| 1.0.0 | 2026-04-13 | ZeroJuneK | 최초 작성 (Pivot UX 전환 1단계) |

## 개요

기존 카테고리 기반 분류에 더해 **다중 태그 시스템**을 도입한다. URL 도메인을 분석하여 자동 태그를 추출하고, 사용자 수동 태그를 추가할 수 있게 한다.
태그는 카테고리와 병행 운영되며, Pivot 레이아웃(SPEC-UX-003)의 사이드바와 Command Palette(SPEC-UX-002) 검색에 활용된다.

**분류**: SPEC (구현 대상 기능)
**성격**: Brownfield -- 기존 Bookmark 데이터 모델 확장
**선행 SPEC**: SPEC-AUTH-001 (Firestore 동기화), SPEC-IMPORT-001 (북마크 import)

## 요구사항

### REQ-001: Link 데이터에 tags 필드 추가

**[Ubiquitous]** 시스템은 각 Link 객체에 `tags: string[]` 필드를 **항상** 보유해야 한다.

### REQ-002: URL 도메인 기반 자동 태그 추출

**[Event-Driven]** **When** 새 북마크가 추가되거나 기존 북마크가 업데이트되면, 시스템은 URL 도메인을 분석하여 매칭되는 자동 태그를 부여**해야 한다**.

### REQ-003: 사용자 수동 태그 추가/제거

**[Event-Driven]** **When** 사용자가 북마크 편집 화면에서 태그를 입력하면, 시스템은 해당 태그를 Link.tags 배열에 추가**해야 한다**.

### REQ-004: 태그 자동완성

**[Event-Driven]** **When** 사용자가 태그 입력창에 텍스트를 입력하면, 시스템은 기존에 사용된 태그 중 매칭되는 항목을 자동완성 제안**해야 한다**.

### REQ-005: 전체 태그 집계

**[Ubiquitous]** 시스템은 모든 북마크에서 사용된 태그를 집계하여 **항상** 사용 빈도순으로 제공해야 한다.

### REQ-006: 태그 별 북마크 필터링

**[State-Driven]** **While** 태그가 선택된 동안, 시스템은 해당 태그를 가진 북마크만 필터링하여 표시**해야 한다**.

### REQ-007: 다중 태그 AND 필터

**[Event-Driven]** **When** 여러 태그가 동시에 선택되면, 시스템은 모든 선택된 태그를 가진 북마크만 표시**해야 한다**.

### REQ-008: 자동 태그 사전 (Domain Tag Map) 내장

**[Ubiquitous]** 시스템은 주요 도메인-태그 매핑 사전을 **항상** 내장해야 한다 (예: github.com → dev, youtube.com → video, openai.com/anthropic.com → ai).

### REQ-009: Firestore 동기화 호환

**[Ubiquitous]** 시스템은 tags 필드를 Firestore에 **항상** 직렬화/역직렬화 가능한 형태로 저장해야 한다.

### REQ-010: 기존 데이터 마이그레이션

**[Event-Driven]** **When** 앱이 처음 시작되어 tags 필드가 없는 기존 북마크를 발견하면, 시스템은 자동 태그를 추출하여 빈 배열 대신 채워**야 한다**.

## 비기능 요구사항

### NFR-001: TypeScript 타입 안전성

`Link` 인터페이스에 `tags: string[]` 추가, strict mode 유지, any 타입 금지.

### NFR-002: 태그 정규화

태그는 소문자, 공백 제거, 한글/영문/숫자/하이픈만 허용.

### NFR-003: 성능 -- 태그 집계

북마크 1000개 기준 태그 집계가 100ms 이내에 완료되어야 한다 (Map 기반 O(n)).

### NFR-004: 하위 호환성

tags 필드가 없는 기존 데이터를 읽어도 오류 없이 빈 배열로 처리되어야 한다.

### NFR-005: 테스트 커버리지 85% 이상

신규 모듈(`tagStore`, `domainTagMap`, `extractTags`)은 85% 이상 커버.

## 제약사항

- 태그 최대 길이: 20자
- 북마크당 태그 최대 개수: 10개
- 자동 태그 사전은 코드에 내장 (외부 API 호출 금지)
- TypeScript 5.7 strict, React 19, Zustand 5

## 데이터 스키마

```typescript
// 기존
interface Link {
  id: string
  name: string
  url: string
}

// 신규
interface Link {
  id: string
  name: string
  url: string
  tags: string[]      // 신규 -- 자동 + 수동
}

// Firestore: users/{uid}/data/bookmarks 내부의 각 link 객체에 tags 포함
```

## Domain Tag Map (내장 사전 예시)

```
github.com, gitlab.com, bitbucket.org      → dev, code
youtube.com, vimeo.com                      → video
openai.com, anthropic.com, claude.ai        → ai
gmail.com, mail.google.com                  → email
notion.so, obsidian.md                      → notes
figma.com, dribbble.com                     → design
docs.google.com, drive.google.com           → docs
stackoverflow.com, dev.to                   → dev, learn
medium.com, substack.com                    → blog, read
```

## Exclusions (What NOT to Build)

- **계층형 태그**: 평면 구조만 지원
- **태그 색상 커스터마이징**: 자동 색상 (해시 기반)만
- **태그 별칭/시노님**: 별도 SPEC
- **AI 자동 태깅**: OpenAI/LLM 호출 없음, 도메인 사전만
- **태그 OR 필터**: AND 필터만 (단순화)
- **카테고리 제거**: 카테고리는 그대로 유지, 태그는 추가 레이어
