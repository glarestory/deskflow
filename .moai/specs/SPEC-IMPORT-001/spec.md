# SPEC-IMPORT-001: Chrome 북마크 가져오기

---
id: SPEC-IMPORT-001
version: 1.0.0
status: Completed
created: 2026-04-11
updated: 2026-04-11
author: ZeroJuneK
priority: High
issue_number: null
---

## HISTORY

| 버전 | 날짜 | 변경 내용 |
|------|------|-----------|
| 1.0.0 | 2026-04-11 | 초기 SPEC 작성 |

## 개요

Chrome에서 내보낸 북마크 HTML 파일(Netscape Bookmark Format)을 Deskflow의 북마크 시스템으로 가져오는 기능을 제공한다.

사용자는 TopBar의 "+ 가져오기" 버튼을 통해 HTML 파일을 선택하고, 미리보기를 확인한 뒤, 병합(merge) 또는 전체 교체(replace) 모드로 북마크를 가져올 수 있다.

## 요구사항

### REQ-001 [Event-Driven]

**When** 사용자가 TopBar의 "+ 가져오기" 버튼을 클릭하면, **the** 시스템은 `.html` 파일만 필터링된 파일 선택 대화상자를 **shall** 열어야 한다.

### REQ-002 [Event-Driven]

**When** 유효한 Chrome 북마크 HTML 파일이 선택되면, **the** 시스템은 파싱된 결과를 카테고리 N개, 링크 M개 형태로 미리보기를 **shall** 표시해야 한다.

### REQ-003 [Event-Driven]

**When** 사용자가 병합(merge) 모드로 가져오기를 확인하면, **the** 시스템은 파싱된 카테고리를 기존 북마크에 **shall** 추가해야 한다.

### REQ-004 [Event-Driven]

**When** 사용자가 전체 교체(replace) 모드로 가져오기를 확인하면, **the** 시스템은 기존 북마크를 모두 삭제하고 가져온 북마크로 **shall** 교체해야 한다.

### REQ-005 [Unwanted]

**If** 병합 모드에서 동일한 이름의 카테고리가 이미 존재하면, **then** **the** 시스템은 중복 카테고리를 생성하지 않고 기존 카테고리에 링크를 **shall** 추가해야 한다.

### REQ-006 [Ubiquitous]

**The** 시스템은 카테고리 이름의 키워드를 기반으로 이모지 아이콘을 자동으로 **shall** 할당해야 한다.

### REQ-007 [Event-Driven]

**When** 유효하지 않거나 북마크 형식이 아닌 HTML 파일이 선택되면, **the** 시스템은 오류 메시지를 **shall** 표시해야 한다.

### REQ-008 [Unwanted]

**If** 파싱된 폴더에 링크가 하나도 없으면, **then** **the** 시스템은 해당 빈 카테고리를 **shall** 가져오지 않아야 한다.

### REQ-009 [Event-Driven]

**When** 가져오기가 완료되면, **the** 시스템은 bookmarkStore를 통해 업데이트된 북마크를 **shall** 저장해야 한다.

### REQ-010 [State-Driven]

**While** HTML 파일을 파싱하는 동안, **the** 시스템은 로딩 인디케이터를 **shall** 표시해야 한다.

## 비기능 요구사항

### NFR-001: 내결함성

파서는 비정상적인 HTML을 정상적으로 처리해야 한다 (크래시 없이 가능한 만큼 파싱).

### NFR-002: 플랫폼 독립성

Electron과 웹 컨텍스트 모두에서 동작해야 한다 (네이티브 Electron API 미사용, `<input type="file">` + `DOMParser` 사용).

### NFR-003: 타입 안전성

TypeScript strict 모드 준수, `any` 타입 사용 금지.

### NFR-004: 테스트 커버리지

파서 및 컴포넌트 테스트 커버리지 85% 이상.

## 아키텍처 결정

### 파일 선택

- `<input type="file" accept=".html">` 사용 (웹/Electron 모두 호환)
- Electron IPC 불필요

### 파싱 전략

- `DOMParser`로 HTML 문자열 파싱 (브라우저 네이티브, 의존성 없음)
- `<DL>` 트리를 순회하여 폴더 구조 추출
- `<H3>` -> 카테고리 이름, `<A>` -> 링크 (href + 텍스트)

### 이모지 자동 할당

카테고리 이름 키워드 -> 이모지 매핑:

| 키워드 | 이모지 |
|--------|--------|
| news, 뉴스 | 📰 |
| dev, 개발, github | 💻 |
| work, 업무 | 💼 |
| social, 소셜 | 👥 |
| shopping, 쇼핑 | 🛍️ |
| video, 유튜브, youtube | 🎬 |
| music, 음악 | 🎵 |
| travel, 여행 | ✈️ |
| finance, 금융 | 💰 |
| (기본값) | 🔖 |

### Import Modal

- 3단계 플로우: 파일 선택 -> 미리보기 -> 확인/완료
- 병합(merge) / 전체 교체(replace) 모드 선택 옵션

## Exclusions (What NOT to Build)

- **Firefox/Safari 북마크 가져오기**: 향후 별도 SPEC으로 처리
- **내보내기 기능** (Deskflow -> HTML): 향후 별도 SPEC으로 처리
- **드래그 앤 드롭 파일 입력**: 향후 개선 사항
- **클라우드 북마크 동기화** (Chrome Sync API): 범위 외
- **URL 기반 북마크 중복 제거**: 범위 외

## 관련 SPEC

- SPEC-UI-001: 북마크/카테고리 UI 및 타입 정의
