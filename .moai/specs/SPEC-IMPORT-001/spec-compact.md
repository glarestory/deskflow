# SPEC-IMPORT-001 Compact: Chrome 북마크 가져오기

## 핵심 요약

Chrome 내보내기 HTML(Netscape Bookmark Format) -> Deskflow 북마크 변환 및 가져오기.
TopBar "+ 가져오기" 버튼 -> ImportModal(파일 선택 -> 미리보기 -> 확인) -> bookmarkStore 저장.

## 요구사항 요약

| ID | 패턴 | 요약 |
|----|------|------|
| REQ-001 | Event | "+ 가져오기" 클릭 -> .html 파일 선택 대화상자 |
| REQ-002 | Event | 유효 파일 선택 -> 미리보기 (N카테고리, M링크) |
| REQ-003 | Event | 병합 확인 -> 기존에 추가 |
| REQ-004 | Event | 교체 확인 -> 전체 교체 |
| REQ-005 | Unwanted | 병합 시 동일 이름 카테고리 중복 금지 -> 링크 병합 |
| REQ-006 | Ubiquitous | 카테고리 이름 키워드 -> 이모지 자동 할당 |
| REQ-007 | Event | 비유효 파일 -> 오류 메시지 |
| REQ-008 | Unwanted | 빈 카테고리(링크 0) 가져오기 금지 |
| REQ-009 | Event | 가져오기 완료 -> bookmarkStore 저장 |
| REQ-010 | State | 파싱 중 -> 로딩 인디케이터 |

## 작업 목록

| ID | 파일 | 설명 |
|----|------|------|
| T-001 | `src/renderer/lib/bookmarkParser.ts` | DOMParser 기반 Chrome HTML 파서 |
| T-002 | `src/renderer/lib/bookmarkParser.test.ts` | 파서 단위 테스트 |
| T-003 | `src/renderer/components/ImportModal/ImportModal.tsx` | 가져오기 모달 UI |
| T-004 | `src/renderer/components/ImportModal/ImportModal.test.tsx` | 모달 컴포넌트 테스트 |
| T-005 | `src/renderer/App.tsx` 수정 | "+ 가져오기" 버튼 + ImportModal 연결 |
| T-006 | `src/renderer/stores/bookmarkStore.ts` 수정 | `importBookmarks(categories, mode)` 액션 |

## 타입 매핑

```
Chrome <H3> 폴더 -> Bookmark { id, name, icon(자동), links[] }
Chrome <A> 링크  -> Link { id, name, url }
```

## Exclusions

Firefox/Safari 가져오기, 내보내기, 드래그앤드롭, Chrome Sync API, URL 중복 제거
