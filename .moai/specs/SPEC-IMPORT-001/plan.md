# SPEC-IMPORT-001: 구현 계획

## 구현 개요

Chrome 북마크 HTML 파서, Import Modal UI, bookmarkStore 확장의 3개 영역으로 구성된다.
모든 구현은 클라이언트 사이드에서 동작하며, 외부 의존성 추가 없이 브라우저 네이티브 API(`DOMParser`, `FileReader`)만 사용한다.

## 마일스톤

### M1: 파서 구현 (Priority High)

Chrome 북마크 HTML을 Deskflow Bookmark 타입으로 변환하는 순수 함수 구현.

**산출물:**
- `src/renderer/lib/bookmarkParser.ts`
- `src/renderer/lib/bookmarkParser.test.ts`

**기술 접근:**
- `DOMParser`로 HTML 문자열을 DOM 트리로 파싱
- 재귀적으로 `<DL>` 요소를 순회하여 폴더/링크 구조 추출
- `<H3>` 요소 -> 카테고리 이름, `<A>` 요소 -> Link 객체
- 빈 카테고리 필터링 (REQ-008)
- 카테고리 이름 기반 이모지 자동 할당 (REQ-006)
- 유효성 검사: Netscape Bookmark Format 헤더 확인 (REQ-007)

**주요 함수:**
- `parseBookmarkHtml(html: string): ParseResult` -- 메인 파서
- `assignCategoryIcon(name: string): string` -- 이모지 매핑
- `ParseResult` 타입: `{ categories: Bookmark[], errors: string[] }`

### M2: Import Modal UI (Priority High)

3단계 플로우(파일 선택 -> 미리보기 -> 확인)를 제공하는 모달 컴포넌트.

**산출물:**
- `src/renderer/components/ImportModal/ImportModal.tsx`
- `src/renderer/components/ImportModal/ImportModal.test.tsx`

**기술 접근:**
- 단계별 상태 관리: `'select' | 'preview' | 'done'`
- `<input type="file" accept=".html">` 로 파일 선택
- `FileReader.readAsText()`로 파일 내용 읽기
- 미리보기 화면에서 카테고리/링크 수 표시
- 병합(merge) / 전체 교체(replace) 라디오 버튼
- 로딩 인디케이터 (REQ-010)
- 오류 메시지 표시 (REQ-007)

### M3: Store 확장 및 통합 (Priority High)

bookmarkStore에 가져오기 액션을 추가하고 App.tsx에 진입점을 연결.

**산출물:**
- `src/renderer/stores/bookmarkStore.ts` 수정 -- `importBookmarks` 액션 추가
- `src/renderer/App.tsx` 수정 -- "+ 가져오기" 버튼 및 ImportModal 연결

**기술 접근:**
- `importBookmarks(categories: Bookmark[], mode: 'merge' | 'replace'): void`
- merge 모드: 동일 이름 카테고리가 있으면 링크만 추가, 없으면 새 카테고리 추가 (REQ-005)
- replace 모드: 기존 북마크 전체 교체 (REQ-004)
- 가져오기 완료 후 storage에 자동 저장 (REQ-009)

## 위험 요소

| 위험 | 영향 | 완화 전략 |
|------|------|-----------|
| 비표준 Chrome HTML 포맷 | 파싱 실패 | 방어적 파싱 + graceful fallback |
| 대용량 북마크 파일 (수천 개) | UI 멈춤 | 비동기 파싱, 로딩 인디케이터 |
| 특수문자/유니코드 카테고리 이름 | 이모지 매핑 실패 | 기본값 이모지(🔖) fallback |

## 의존성

- `src/renderer/types/index.ts` -- Bookmark, Link 타입 (기존)
- `src/renderer/stores/bookmarkStore.ts` -- 기존 CRUD 액션 (기존)
- `src/renderer/lib/storage.ts` -- storage 인터페이스 (기존)
