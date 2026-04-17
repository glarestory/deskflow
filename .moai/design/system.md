# Design System

This file is the persistent design memory for this project. It is maintained by MoAI agents
and accumulates design intent, domain vocabulary, and craft decisions across sessions.

See `.claude/skills/moai-design-craft/` for the protocol that governs this file.

---

## Design Intent

Deskflow는 하루를 시작하는 사람이 맨 처음 여는 화면이다. 산만함을 제거하고, 지금 해야 할 것에 즉시 집중할 수 있는 조용한 대시보드. 정보는 항상 거기 있고, 조작하기 전까지 시선을 빼앗지 않는다.

## Domain Vocabulary

| Term | Definition |
|------|-----------|
| 위젯 (Widget) | 독립적으로 동작하는 기능 단위. 외부 상태에 의존하되 스스로 렌더링 책임을 진다 |
| 허브 (Hub) | 위젯들의 배치 컨테이너. 레이아웃만 담당하며 위젯 로직에 개입하지 않는다 |
| 북마크 (Bookmark) | 카테고리 + 링크 묶음. 사용자가 자주 방문하는 URL의 조직화된 컬렉션 |
| 카테고리 (Category) | 북마크의 그룹. 이모지 아이콘 + 이름 + 링크 배열로 구성 |
| 테마 토큰 | CSS 변수로 정의된 색상 값. dark/light 두 세트가 존재 |

## Craft Principles

- **침묵이 기본**: 정보는 보여지지만 울리지 않는다. 알림, 뱃지, 플래시는 없다
- **즉각 반응**: 모든 인터랙션은 150ms 이내 피드백. hover → transform translateY(-2px)
- **색상 절제**: 강조색(#6366f1 인디고)은 하나만. 나머지는 회색 계열
- **타이포 계층**: 숫자/코드는 JetBrains Mono, 한국어 텍스트는 Noto Sans KR
- **파괴적 행동 확인**: 카테고리 삭제 등 복구 불가 동작은 모달에서 명시적 버튼

## Per-Feature Direction

### SPEC-UI-001: 위젯 시스템

**Who**: 하루 시작 루틴이 있는 개인 사용자. 앱을 켜면 시계-검색-북마크를 순서대로 훑는다.  
**What**: 로딩 없이 즉시 시각 정보를 얻고, 검색 한 번으로 웹으로 나가고, 클릭 한 번으로 자주 쓰는 사이트로 이동한다.  
**Feel**: 군더더기 없는 미니멀. 어두운 방에서 켜도 눈이 피로하지 않은 dark-first.

**색상 세계 (Color World)**:
- 배경: 깊은 네이비 #0f1117 — 새벽 하늘, 집중 공간
- 카드: #1a1d2b — 배경보다 살짝 밝은 층위
- 강조: #6366f1 인디고 — 유일한 생동감
- 텍스트: #e4e6f0 — 순백보다 부드러운 오프화이트
- 무음: #6b7094 — 보조 정보, 시선을 빼앗지 않음

**시그니처 요소**: 시계 영역. JetBrains Mono 56px, letterSpacing -2px, 초(seconds)는 24px opacity 0.4 — 시간이 흐르는 질감

**피할 것 (Defaults to Avoid)**:
- 그라데이션 배경, 그림자 과잉 — 단색 평면이 더 집중적
- 색상 코딩 남발 (빨강=위험, 파랑=정보 등) — 인디고 하나로 통일
- 스크롤 강제 — 모든 위젯이 초기 뷰포트 안에 수용

## Anti-Patterns

[Patterns that were tried and failed — added during /moai review --critique.]
