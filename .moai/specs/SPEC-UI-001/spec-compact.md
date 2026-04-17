---
id: SPEC-UI-001
type: compact
---

# SPEC-UI-001: Deskflow 위젯 시스템 (Compact)

## 요약

productivity-hub.jsx 프로토타입을 TypeScript + Electron IPC로 마이그레이션.
5개 위젯 + EditModal + Zustand 스토어 + electron-store IPC 통합.

## 요구사항 요약

| ID | 위젯/모듈 | EARS 패턴 | 핵심 동작 |
|----|----------|-----------|-----------|
| REQ-001 | App Layout | Ubiquitous + Event | TopBar + Hero + Main grid (1fr 360px) |
| REQ-002 | Clock | Ubiquitous + Event | 1초 갱신, HH:MM:SS, 한국어 날짜, clearInterval |
| REQ-003 | SearchBar | Event + Unwanted | Google 검색 (window.open), 빈 검색어 무시 |
| REQ-004 | BookmarkCard | Ubiquitous + Event + State | 2열 그리드, hover 효과, EditModal 연동 |
| REQ-005 | TodoWidget | Event + Ubiquitous + Unwanted | 추가/토글/삭제, 미완료 수, 빈 텍스트 방지 |
| REQ-006 | NotesWidget | Event | 600ms 디바운스 자동 저장, 언마운트 시 cleanup |
| REQ-007 | Storage IPC | Event + Ubiquitous | storage:get/set 채널, contextBridge |
| REQ-008 | Zustand | Ubiquitous + Event + Complex | 3개 스토어, loaded flag, 자동 저장 |
| REQ-009 | Theme | Event + Ubiquitous | 다크/라이트 전환, CSS 변수, 스토리지 영속 |

## 인수 기준 요약

| ID | 시나리오 | 검증 방법 |
|----|----------|-----------|
| S1 | Clock HH:MM + 한국어 날짜 | vi.useFakeTimers |
| S2 | "electron" 검색 실행 | window.open spy |
| S3 | 빈 검색어 무시 | window.open 미호출 확인 |
| S4 | 할 일 추가 + 토글 | fireEvent + 텍스트 확인 |
| S5 | 메모 600ms 디바운스 저장 | vi.advanceTimersByTime |
| S6 | 다크 → 라이트 전환 | --bg CSS 변수 값 확인 |
| S7 | Storage IPC get/set | stubGlobal mock |
| S8 | 프로덕션 빌드 | npm run build + out/ 확인 |
| S9 | BookmarkCard 편집 플로우 | EditModal 열기/저장/반영 |
| S10 | 할 일 삭제 | 항목 제거 + 수 감소 |

## 파일 목록

### 신규 생성

| 파일 | 설명 |
|------|------|
| `src/renderer/types/index.ts` | Bookmark, Todo, Category, ThemeTokens 타입 |
| `src/renderer/styles/themes.ts` | dark/light 테마 토큰 객체 |
| `src/renderer/styles/globals.css` | CSS 리셋, CSS 변수 기본값 |
| `src/main/ipc/storage.ts` | electron-store IPC 핸들러 |
| `src/renderer/stores/bookmarkStore.ts` | 북마크 CRUD Zustand 스토어 |
| `src/renderer/stores/todoStore.ts` | 할 일 CRUD Zustand 스토어 |
| `src/renderer/stores/themeStore.ts` | 테마 상태 Zustand 스토어 |
| `src/renderer/components/Clock/Clock.tsx` | 실시간 시계 컴포넌트 |
| `src/renderer/components/Clock/Clock.test.tsx` | Clock 테스트 |
| `src/renderer/components/SearchBar/SearchBar.tsx` | 검색바 컴포넌트 |
| `src/renderer/components/SearchBar/SearchBar.test.tsx` | SearchBar 테스트 |
| `src/renderer/components/BookmarkCard/BookmarkCard.tsx` | 북마크 카드 컴포넌트 |
| `src/renderer/components/BookmarkCard/BookmarkCard.test.tsx` | BookmarkCard 테스트 |
| `src/renderer/components/EditModal/EditModal.tsx` | 편집 모달 컴포넌트 |
| `src/renderer/components/EditModal/EditModal.test.tsx` | EditModal 테스트 |
| `src/renderer/components/TodoWidget/TodoWidget.tsx` | 할 일 컴포넌트 |
| `src/renderer/components/TodoWidget/TodoWidget.test.tsx` | TodoWidget 테스트 |
| `src/renderer/components/NotesWidget/NotesWidget.tsx` | 메모 컴포넌트 |
| `src/renderer/components/NotesWidget/NotesWidget.test.tsx` | NotesWidget 테스트 |

### 수정

| 파일 | 변경 내용 |
|------|-----------|
| `src/main/index.ts` | IPC 핸들러 등록 추가 |
| `src/preload/index.ts` | window.storage 브릿지 추가 |
| `src/renderer/App.tsx` | 전체 레이아웃 구성 (TopBar + Hero + Grid) |

## Exclusions (What NOT to Build)

- CSS Modules 도입 (인라인 스타일 유지)
- Playwright E2E 테스트 (별도 SPEC)
- electron-builder 패키징 (별도 SPEC)
- 위젯 드래그 앤 드롭 (v1.0 계획)
- 글로벌 단축키 / 트레이 아이콘 (v1.0 계획)
- 다국어(i18n) 지원
- 북마크 import/export 기능
- 반응형 레이아웃
- 애니메이션 라이브러리
