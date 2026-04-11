---
id: SPEC-UI-001
type: acceptance
---

# SPEC-UI-001: 인수 기준

## 시나리오

### S1: Clock 렌더링

- **Given** 앱이 로드되고 Clock 컴포넌트가 마운트된 상태
- **When** 1초가 경과하면
- **Then** 현재 시간이 HH:MM 형식(24시간)으로 표시되고, 초가 별도 크기로 표시되며, 한국어 날짜(YYYY년 M월 D일 X요일)가 표시된다
- **검증**: `vi.useFakeTimers` + `vi.advanceTimersByTime(1000)` 후 시간 갱신 확인

### S2: 검색 실행

- **Given** SearchBar가 렌더링된 상태
- **When** 사용자가 "electron"을 입력하고 Enter 키를 누르면
- **Then** `window.open("https://www.google.com/search?q=electron", "_blank")`이 호출된다
- **검증**: `vi.spyOn(window, 'open')` 후 호출 인자 검증

### S3: 빈 검색어 무시

- **Given** SearchBar가 렌더링된 상태
- **When** 검색어 없이(또는 공백만 입력하고) Enter 키를 누르면
- **Then** `window.open`이 호출되지 않는다
- **검증**: `window.open` spy의 호출 횟수가 0인지 확인

### S4: 할 일 추가 및 토글

- **Given** TodoWidget이 렌더링된 상태
- **When** 사용자가 "새 할 일"을 입력하고 Enter 키를 누르면
- **Then** "새 할 일" 항목이 목록에 추가되고, 미완료 수가 1 증가한다
- **When** 해당 항목의 체크박스를 클릭하면
- **Then** 항목이 완료 상태로 전환되고, 미완료 수가 1 감소한다
- **검증**: `@testing-library/react`의 `fireEvent.change` + `fireEvent.submit`, 텍스트/체크박스 상태 확인

### S5: 메모 자동 저장

- **Given** NotesWidget이 마운트되고 `window.storage` 모킹이 설정된 상태
- **When** 텍스트 영역에 "테스트 메모"를 입력하고 600ms가 경과하면
- **Then** `window.storage.set("hub-notes", "테스트 메모")`가 호출된다
- **When** 500ms만 경과하면 (600ms 미만)
- **Then** `window.storage.set`이 아직 호출되지 않는다
- **검증**: `vi.useFakeTimers` + `vi.advanceTimersByTime(600)` 후 mock 호출 확인

### S6: 테마 전환

- **Given** 다크 모드가 활성화된 상태
- **When** 테마 토글 버튼을 클릭하면
- **Then** CSS 변수 `--bg`가 라이트 테마 값(`#f0f1f5`)으로 변경된다
- **Then** themeStore의 mode가 `"light"`로 변경된다
- **검증**: 루트 요소의 style 속성에서 `--bg` 값 확인

### S7: Storage IPC 동작

- **Given** 앱이 초기화되는 상태
- **When** `window.storage.get("hub-bookmarks")`가 호출되면
- **Then** 저장된 북마크 JSON 데이터가 `{ value: string }` 형태로 반환된다
- **When** 스토리지에 데이터가 없으면
- **Then** `{ value: undefined }` 또는 null이 반환되고, 기본값(DEFAULT_BOOKMARKS)이 사용된다
- **검증**: `vi.stubGlobal('storage', { get: vi.fn(), set: vi.fn() })` 패턴

### S8: 프로덕션 빌드

- **Given** 모든 위젯 구현이 완료된 상태
- **When** `npm run build`를 실행하면
- **Then** `out/` 디렉터리가 생성되고, TypeScript 컴파일 오류가 0건이다
- **검증**: CI 환경에서 빌드 커맨드 실행

### S9: BookmarkCard 편집 플로우

- **Given** 기본 북마크가 로드되고 BookmarkCard가 렌더링된 상태
- **When** 설정(편집) 버튼을 클릭하면
- **Then** EditModal이 열리고 해당 카테고리의 아이콘, 이름, 링크 목록이 표시된다
- **When** 링크 이름을 수정하고 저장 버튼을 누르면
- **Then** bookmarkStore가 업데이트되고 BookmarkCard에 변경된 이름이 반영된다
- **검증**: `screen.getByRole('dialog')` 존재 확인, 저장 후 텍스트 변경 확인

### S10: 할 일 삭제

- **Given** TodoWidget에 3개의 기본 할 일이 로드된 상태
- **When** 첫 번째 항목의 삭제 버튼을 클릭하면
- **Then** 해당 항목이 목록에서 제거되고, 총 항목 수가 2개로 줄어든다
- **검증**: `screen.queryByText` 삭제된 항목이 null 반환

## Edge Cases

### EC-001: 테스트 환경 window.storage 부재

- **상황**: Vitest(jsdom) 환경에서 `window.storage`가 정의되지 않음
- **기대 동작**: `vi.stubGlobal('storage', { get: vi.fn(...), set: vi.fn() })`으로 모킹하여 테스트 실행 가능
- **검증**: 모든 테스트 파일의 `beforeEach`에서 모킹 설정 확인

### EC-002: 스토리지 데이터 없는 초기 실행

- **상황**: electron-store에 저장된 데이터가 없는 첫 실행
- **기대 동작**: DEFAULT_BOOKMARKS(4개 카테고리), DEFAULT_TODOS(3개 항목), DEFAULT_NOTES("여기에 메모를 작성하세요...")가 사용됨
- **검증**: `window.storage.get`이 `{ value: undefined }`를 반환할 때 기본값 로드 확인

### EC-003: NotesWidget 언마운트 시 pending timeout

- **상황**: 사용자가 메모를 입력한 직후(600ms 미만) 컴포넌트가 언마운트됨
- **기대 동작**: `clearTimeout`으로 pending 디바운스 타이머가 정리되어 메모리 누수 없음
- **검증**: `vi.useFakeTimers` 환경에서 언마운트 후 타이머 실행 시 에러 없음

### EC-004: Clock 언마운트 시 인터벌 정리

- **상황**: Clock 컴포넌트가 조건부 렌더링으로 언마운트됨
- **기대 동작**: `clearInterval`로 1초 인터벌이 정리됨
- **검증**: 언마운트 후 `vi.advanceTimersByTime(2000)` 실행 시 추가 렌더링 없음

### EC-005: 빈 텍스트 할 일 추가 방지

- **상황**: 사용자가 공백만 입력하고 Enter를 누름
- **기대 동작**: 새 항목이 추가되지 않고, 입력 필드가 비워지지 않음(또는 비워짐)
- **검증**: todoStore의 items 배열 길이가 변하지 않음

### EC-006: 카테고리 삭제 후 UI 반영

- **상황**: 마지막 남은 카테고리를 삭제
- **기대 동작**: BookmarkCard 영역이 비어 있는 상태로 렌더링 (크래시 없음)
- **검증**: bookmarkStore.categories가 빈 배열일 때 App.tsx 정상 렌더링

## Quality Gate 기준

### Definition of Done

- [ ] 모든 컴포넌트에 대한 테스트 파일 존재 (6개 컴포넌트 x 1 테스트 파일)
- [ ] `npm run test` 전체 통과
- [ ] 테스트 커버리지 85% 이상
- [ ] `npm run typecheck` (tsc --noEmit) 오류 0건
- [ ] `npm run lint` 경고/오류 0건
- [ ] `npm run build` 성공, `out/` 디렉터리 생성
- [ ] 모든 EARS 요구사항(REQ-001 ~ REQ-009)에 대한 테스트 매핑 존재
- [ ] 프로토타입(productivity-hub.jsx)의 모든 기능이 TypeScript 버전에서 동작 확인
- [ ] `@MX:ANCHOR` 태그가 bookmarkStore에 부착됨
