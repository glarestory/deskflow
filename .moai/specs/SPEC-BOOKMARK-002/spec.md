# SPEC-BOOKMARK-002: 북마크 향상 (빠른 추가 + 내보내기 + 중복 탐지)

---
id: SPEC-BOOKMARK-002
version: 1.0.0
status: Planned
created: 2026-04-12
updated: 2026-04-12
author: ZeroJuneK
priority: High
depends_on: SPEC-IMPORT-001
---

## HISTORY

| 버전 | 날짜 | 변경 내용 |
|------|------|-----------|
| 1.0.0 | 2026-04-12 | 초기 SPEC 작성 |

## 개요

북마크 관련 세 가지 기능을 하나의 SPEC으로 구현한다:
1. **빠른 북마크 추가 (Quick Capture)**: URL 직접 입력 또는 클립보드 붙여넣기로 즉시 북마크 추가
2. **내보내기 (Export)**: Deskflow 북마크를 Netscape HTML 형식(.html)으로 내보내기
3. **중복 탐지**: 동일 URL이 여러 카테고리에 존재할 때 경고 및 정리 옵션 제공

## 요구사항

### Quick Capture

#### REQ-001 [Event-Driven]
**When** 사용자가 TopBar의 "+ 빠른 추가" 버튼을 클릭하면, **the** 시스템은 URL 입력 팝오버를 **shall** 표시해야 한다.

#### REQ-002 [Event-Driven]
**When** 팝오버가 열리면, **the** 시스템은 클립보드에 유효한 URL이 있으면 자동으로 **shall** 붙여넣어야 한다.

#### REQ-003 [Event-Driven]
**When** 사용자가 URL을 입력하고 카테고리를 선택한 뒤 확인하면, **the** 시스템은 해당 카테고리에 북마크를 **shall** 추가해야 한다.

#### REQ-004 [Unwanted]
**If** 입력된 URL이 유효하지 않은 형식이면, **then** **the** 시스템은 오류 메시지를 **shall** 표시해야 한다.

#### REQ-005 [Event-Driven]
**When** URL 제목을 입력하지 않으면, **the** 시스템은 URL의 hostname을 기본 제목으로 **shall** 사용해야 한다.

### Export

#### REQ-006 [Event-Driven]
**When** 사용자가 "내보내기" 버튼을 클릭하면, **the** 시스템은 모든 북마크를 Netscape HTML 형식으로 **shall** 내보내야 한다.

#### REQ-007 [Ubiquitous]
**The** 내보내기 파일명은 `deskflow-bookmarks-YYYY-MM-DD.html` 형식이어야 **shall** 한다.

#### REQ-008 [Ubiquitous]
**The** 내보내기 HTML은 Chrome/Firefox에서 재가져오기 가능한 표준 Netscape Bookmark Format을 **shall** 따라야 한다.

### 중복 탐지

#### REQ-009 [Event-Driven]
**When** 새 북마크를 추가하거나 가져오기 후, **the** 시스템은 동일 URL 중복 여부를 **shall** 확인해야 한다.

#### REQ-010 [Event-Driven]
**When** 중복 URL이 발견되면, **the** 시스템은 중복 목록을 표시하고 "유지" 또는 "제거" 옵션을 **shall** 제공해야 한다.

#### REQ-011 [Event-Driven]
**When** 사용자가 "중복 스캔" 버튼을 클릭하면, **the** 시스템은 전체 북마크를 스캔하여 중복 보고서를 **shall** 표시해야 한다.

## 비기능 요구사항

### NFR-001: 플랫폼 독립성
Electron과 웹 모두에서 동작. 파일 다운로드는 `<a download>` 활용.

### NFR-002: 타입 안전성
TypeScript strict 모드 준수.

## 아키텍처 결정

### Quick Capture 컴포넌트
- `src/renderer/components/QuickCapture/QuickCapture.tsx`
- Popover 형태 (TopBar에 통합)

### Export 로직
- `src/renderer/lib/bookmarkExporter.ts` 신규 생성
- `generateNetscapeHTML(categories: Category[]): string`

### 중복 탐지 로직
- `src/renderer/lib/bookmarkDedup.ts` 신규 생성
- `findDuplicates(categories: Category[]): DuplicateGroup[]`
- `src/renderer/components/DedupModal/DedupModal.tsx`

### bookmarkStore 확장
- `exportBookmarks()`: 내보내기 트리거
- `removeDuplicates(keepIds: string[])`: 선택적 중복 제거

## Exclusions

- Firefox/Safari 가져오기 (SPEC-IMPORT-001 범위)
- 북마크 폴더 계층 구조 추가
- 태그 시스템
