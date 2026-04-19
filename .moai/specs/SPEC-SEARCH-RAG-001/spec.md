---
id: SPEC-SEARCH-RAG-001
version: 0.1.0
status: draft
created: 2026-04-19
updated: 2026-04-19
author: ZeroJuneK
priority: high
issue_number: 0
---

# SPEC-SEARCH-RAG-001: Local RAG 검색 엔진 — Ollama 기반 북마크 시맨틱 검색

## HISTORY

| 버전 | 날짜 | 작성자 | 변경 내용 |
|------|------|--------|-----------|
| 0.1.0 | 2026-04-19 | ZeroJuneK | 최초 작성 (Deskflow "가장 똑똑한 허브" 기술적 해자 기능) |

## 개요

사용자가 저장한 **북마크를 자연어로 시맨틱 검색**할 수 있게 하는 로컬 우선 RAG(Retrieval-Augmented Generation) 검색 엔진.

"지난주 저장한 React 관련 자료 보여줘" → Ollama 임베딩으로 쿼리를 벡터화 → 미리 인덱싱된 북마크 임베딩과 코사인 유사도 비교 → Top K 결과를 Command Palette에 표시.

**Context Capsule(SPEC-CAPSULE-001)이 "맥락을 묶는다"면, SPEC-SEARCH-RAG-001은 "맥락을 찾는다"**. 이후 캡슐·Todo·메모·피드까지 확장되면 Deskflow가 개발자의 "Context Brain"으로 완성된다.

**분류**: SPEC (신규 기능)
**성격**: Greenfield — 신규 lib · 스토어 · UI 확장
**선행 SPEC**: SPEC-AUTH-001 (Firestore 저장), SPEC-UX-002 (Command Palette), SPEC-CAPSULE-001 (데이터 레이어 패턴)
**후속 SPEC 예정**: SPEC-SEARCH-RAG-002 (Todo/Notes/Capsule/Feed 확장), SPEC-SEARCH-RAG-003 (generator LLM 답변 합성)

## 사용자 스토리

**주 페르소나**: "수백 개 북마크가 쌓여 이름이나 URL로 찾기 어려워진 개발자"

1. `Cmd+K`로 Command Palette 열기
2. "지난주 저장한 인증 관련" 자연어 입력
3. RAG가 쿼리를 임베딩 → 북마크 임베딩과 코사인 유사도 비교
4. 상단에 `RAG` 그룹으로 Top 5 결과 표시 (유사도 점수 함께)
5. 엔터로 즉시 이동 또는 Alt+엔터로 편집

## 설계 결정 사항 (확정됨 2026-04-19)

### DEC-001: Ollama 필수 + 미설치 시 안내

**결정**: RAG 기능은 로컬 Ollama 서버에 의존. 감지되지 않으면 기능 비활성 + 설치 가이드.

**근거**: 오픈소스 · 프라이버시 우선 철학 유지. 클라우드 API 키 관리 복잡도 회피. 개발자 타겟은 Ollama 설치 허용 가능.

**동작**:
- 앱 시작 시 `fetch('http://localhost:11434/api/tags')` health check (REQ-001)
- 미탐지 시 Command Palette 내 RAG 그룹에 "Ollama 미설치 — 가이드 보기" 항목 표시
- 설정 화면에 Ollama 상태 배지 + 설치 가이드 링크 + 수동 재시도 버튼

### DEC-002: 플랫폼 — Electron + Web 모두 지원

**결정**: Ollama HTTP API(`localhost:11434`) 호출만으로 통신하므로 두 플랫폼 모두 동일 코드로 동작.

**근거**: 사용자가 어떤 빌드든 동일 UX 기대. 벡터 저장은 기존 storage abstraction 재사용.

**제약**:
- Ollama가 **사용자 로컬 머신**에 있어야 하므로 Web 빌드도 `localhost:11434`에 접근 (CORS 필요)
- 설치 가이드에 `OLLAMA_ORIGINS=*` (또는 구체적 origin) 환경변수 설정 포함
- 원격 머신의 Ollama 지원은 범위 외

### DEC-003: 초기 인덱싱 범위 — 북마크만 (MVP)

**결정**: `Link`(북마크 개별 항목) 단위로 `name + url + tags + description`을 조합해 임베딩.

**근거**: 가장 많은 데이터 + 가장 높은 ROI. 첫 릴리즈에서 복잡도 관리. Todo/메모/캡슐/피드는 SPEC-SEARCH-RAG-002로 분리.

**임베딩 source 포맷**:
```
{name}
URL: {url}
태그: {tags.join(', ')}
설명: {description ?? ''}
```

### DEC-004: UI — Command Palette 확장

**결정**: 기존 Cmd+K Palette에 `RAG` 결과 그룹을 신설. 접두사 없이 입력 시 fuzzy + RAG 하이브리드 결과 표시.

**근거**: 학습 비용 0. 기존 Palette UX에 자연스럽게 통합. 전용 위젯이나 별도 단축키 불필요.

**그룹 우선순위**:
- 쿼리 길이 ≥ 4자일 때 RAG 활성화 (단어 한 두 개로는 시맨틱 검색 무의미)
- RAG 결과가 있으면 **액션/카테고리/태그/RAG/북마크** 순서로 표시
- RAG 점수 ≥ 0.70 인 결과만 표시 (그 미만은 숨김)

## 요구사항

### 인프라 & Health Check

#### REQ-001: Ollama 연결 감지

**[Event-Driven]** **When** 앱이 시작되거나 사용자가 "RAG 재시도"를 실행하면, 시스템은 `http://localhost:11434/api/tags`에 GET 요청을 보내고 2초 타임아웃 이내 200 응답을 받으면 `ollamaAvailable = true`를 설정**해야 한다**.

#### REQ-002: 모델 존재 확인

**[State-Driven]** **While** `ollamaAvailable === true`인 동안, 시스템은 `/api/tags` 응답에서 `nomic-embed-text` 모델의 존재를 확인하고, 없으면 `modelMissing = true` 상태를 표시**해야 한다**.

#### REQ-003: 설정 UI 배지

**[Ubiquitous]** 시스템은 **항상** Command Palette에 RAG 상태 배지를 노출해야 한다:
- 녹색 "RAG 준비됨" (ollamaAvailable && !modelMissing)
- 노랑 "모델 누락 — `ollama pull nomic-embed-text`" (ollamaAvailable && modelMissing)
- 빨강 "Ollama 미탐지 — 설치 가이드" (!ollamaAvailable)

### 임베딩 파이프라인

#### REQ-004: 북마크 임베딩 생성

**[Event-Driven]** **When** 북마크 Link가 생성/수정되면, 시스템은 배경 큐에 임베딩 작업을 예약**해야 한다**. 임베딩 API는 `POST /api/embeddings` with `{ model: 'nomic-embed-text', prompt: <source text> }`.

#### REQ-005: 컨텐츠 해시 기반 중복 방지

**[State-Driven]** **While** 임베딩 생성 큐가 실행되는 동안, 시스템은 source text의 SHA-256 해시를 계산하여 기존 `BookmarkEmbedding.contentHash`와 동일하면 **재임베딩을 스킵해야 한다**.

#### REQ-006: 배치 인덱싱 (초기 로드)

**[Event-Driven]** **When** 사용자가 로그인 직후 북마크가 로드되면, 시스템은 누락된 임베딩(아직 없거나 contentHash 변경)을 10개씩 배치로 큐에 넣고 비동기로 처리**해야 한다**. UI는 진행률 Toast 표시.

#### REQ-007: 삭제 동기화

**[Event-Driven]** **When** 북마크 Link가 삭제되면, 시스템은 해당 `BookmarkEmbedding`을 저장소에서 제거**해야 한다**.

### 벡터 저장

#### REQ-008: 저장 경로

**[Ubiquitous]** 시스템은 **항상** 임베딩을 다음과 같이 저장해야 한다:
- 미인증: `electron-store` / `localStorage` 키 `rag-embeddings` (배열)
- 인증: Firestore `/users/{uid}/embeddings/{linkId}` (문서당 1 벡터)

#### REQ-009: 저장 스키마

**[Ubiquitous]** 각 임베딩 문서는 **항상** 다음 필드를 보유해야 한다:
- `linkId`, `categoryId`, `contentHash`, `embedding: number[]`, `dimension`, `model`, `embeddedAt`

### 검색 파이프라인

#### REQ-010: 쿼리 임베딩

**[Event-Driven]** **When** 사용자가 Command Palette에 4자 이상 쿼리를 입력하면, 시스템은 디바운스 300ms 후 Ollama에 쿼리 임베딩을 요청**해야 한다**.

#### REQ-011: 코사인 유사도 검색

**[Event-Driven]** **When** 쿼리 임베딩이 준비되면, 시스템은 저장된 모든 북마크 임베딩과 코사인 유사도를 계산하고, 유사도 ≥ 0.70 인 항목을 내림차순 정렬해 Top 10 반환**해야 한다**.

#### REQ-012: 결과 통합 표시

**[Event-Driven]** **When** RAG 결과가 준비되면, Command Palette는 기존 fuzzy 결과 위에 "RAG" 섹션을 삽입하고, 각 결과에 유사도 점수(0.00-1.00)를 표시**해야 한다**.

#### REQ-013: 폴백 동작

**[State-Driven]** **While** `ollamaAvailable === false` 또는 쿼리 길이 < 4자인 동안, Command Palette는 RAG 섹션을 숨기고 기존 fuzzy 검색만 동작**해야 한다**.

### 에러 & 복구

#### REQ-014: Ollama 통신 실패 처리

**[Event-Driven]** **When** Ollama API 호출이 5초 내에 응답하지 않거나 에러를 반환하면, 시스템은 해당 작업을 취소하고 에러 Toast를 표시**해야 한다** ("Ollama 응답 없음. 잠시 후 재시도하세요").

#### REQ-015: 부분 인덱싱 허용

**[State-Driven]** **While** 배치 인덱싱이 진행되는 동안, 일부 항목이 실패해도 나머지는 계속 진행**되어야 한다**. 실패 항목은 다음 앱 실행 시 재시도한다.

### 설정

#### REQ-016: RAG 활성화 토글

**[Ubiquitous]** 시스템은 **항상** 사용자가 RAG 기능을 수동으로 off 할 수 있는 설정(`rag.enabled`)을 제공해야 한다. 기본값 `true`.

#### REQ-017: 유사도 임계값 조정

**[Ubiquitous]** 사용자는 설정에서 **항상** 유사도 임계값(`rag.similarityThreshold`, 기본 0.70, 범위 [0.50, 0.90])을 조정할 수 있어야 한다.

### 프라이버시

#### REQ-018: 로컬 우선 보장

**[Ubiquitous]** 시스템은 **항상** 북마크 원본 텍스트를 외부 네트워크에 전송하지 않아야 한다 (Ollama는 localhost 한정). 미인증 상태에서는 임베딩 벡터도 로컬에만 저장된다.

## 비기능 요구사항

### NFR-001: 회귀 방지

기존 SPEC-UX-002 (Command Palette), SPEC-CAPSULE-001, SPEC-AUTH-001 테스트 100% 통과. RAG가 비활성(미설치)이어도 기존 Palette 동작 완전 보존.

### NFR-002: 성능

- 북마크 1개 임베딩 요청 응답: < 500ms (nomic-embed-text 기준)
- 배치 인덱싱 100개: < 60초 (10개/배치 × 최대 10초)
- 쿼리 → 결과 표시: < 800ms (쿼리 임베딩 + 500개 벡터 비교)
- 저장소 풋프린트: 384-dim float32 ≈ 1.5KB / 북마크 → 500개 ≈ 750KB

### NFR-003: 저장소 확장 안전성

기존 storage abstraction 재사용. 인증 사용자의 Firestore 문서는 서브컬렉션으로 분리해 상위 문서 1MB 제한 우회.

### NFR-004: 테스트 커버리지

- ollama 클라이언트 unit: mock `fetch` 기반 health/embed/에러 분기 (16개)
- embeddingStore unit: CRUD + contentHash 중복 방지 (12개)
- ragSearch unit: 코사인 유사도 · Top K · threshold (8개)
- Command Palette 통합: RAG 섹션 렌더 · 빈 결과 · 폴백 (6개)
- 전체 커버리지 85% 유지

## 제약사항

- React 19, TypeScript strict, Zustand 5
- Electron + Web 빌드 동일 코드 경로
- Ollama API: `nomic-embed-text` (384 dim) 고정 (MVP)
- 벡터 연산은 순수 JS (WASM SIMD 최적화는 후속)
- CORS: 사용자가 Ollama 측에 origin 허용 필요 (설치 가이드에 명시)

## 데이터 스키마

```typescript
// src/renderer/types/embedding.ts (신규)
export interface BookmarkEmbedding {
  linkId: string               // Link.id
  categoryId: string           // 소속 Category.id
  contentHash: string          // SHA-256 of source text (hex)
  embedding: number[]          // float[384]
  dimension: number            // 384 (고정, 버전 업그레이드 대비)
  model: string                // "nomic-embed-text"
  embeddedAt: string           // ISO-8601
}

// src/renderer/stores/embeddingStore.ts (신규)
export interface EmbeddingState {
  embeddings: Map<string, BookmarkEmbedding>  // linkId → embedding
  indexingQueue: string[]                     // 대기 중 linkIds
  indexingInProgress: boolean
  lastBatchProgress: { done: number; total: number } | null
  loaded: boolean

  loadEmbeddings: () => Promise<void>
  upsertEmbedding: (e: BookmarkEmbedding) => Promise<void>
  removeEmbedding: (linkId: string) => Promise<void>
  enqueueIndex: (linkIds: string[]) => void
  runIndexBatch: () => Promise<void>
  clearAll: () => Promise<void>
}

// src/renderer/stores/ragStore.ts (신규)
export interface RagState {
  ollamaAvailable: boolean
  modelMissing: boolean
  lastHealthCheck: string | null
  enabled: boolean                 // 설정: RAG 기능 on/off
  similarityThreshold: number      // 설정: 기본 0.70

  checkHealth: () => Promise<void>
  setEnabled: (v: boolean) => void
  setThreshold: (v: number) => void
  search: (query: string) => Promise<RagResult[]>
}

export interface RagResult {
  linkId: string
  categoryId: string
  score: number                    // 0.0 ~ 1.0
}
```

## 아키텍처 다이어그램

```
┌─────────────────┐     ┌──────────────────────┐
│ CommandPalette  │────▶│ ragStore.search(q)   │
└─────────────────┘     └──────────┬───────────┘
                                   │ 1. embed query
                                   ▼
                         ┌──────────────────────┐
                         │ ollamaClient.embed   │──▶ http://localhost:11434
                         └──────────┬───────────┘
                                    │ 2. cosine vs all
                                    ▼
                         ┌──────────────────────┐
                         │ embeddingStore.all   │
                         └──────────┬───────────┘
                                    │ 3. top K
                                    ▼
                            RagResult[] (sorted)

App start:
  bookmarkStore.load → embeddingStore.load → indexingQueue.enqueue(missing)
  → background runIndexBatch → 10/10/10... until done
```

## UI 구조

```
CommandPalette
 ├── RAG 상태 배지 (상단 고정)
 │    ├── 녹색 "RAG 준비됨"
 │    ├── 노랑 "모델 누락"
 │    └── 빨강 "Ollama 미탐지" + 설치 가이드 링크
 ├── 검색 입력
 └── 결과 그룹
      ├── 액션
      ├── 카테고리
      ├── 태그
      ├── RAG (유사도 ≥ 0.70, Top 10)  ← 신규
      └── 북마크 (fuzzy)
```

### 신규 파일
- `src/renderer/types/embedding.ts`
- `src/renderer/lib/ollamaClient.ts` + `.test.ts` (health/embed/에러)
- `src/renderer/lib/cosineSimilarity.ts` + `.test.ts`
- `src/renderer/lib/contentHash.ts` + `.test.ts` (Web Crypto SHA-256)
- `src/renderer/stores/embeddingStore.ts` + `.test.ts` + `.integration.test.ts`
- `src/renderer/stores/ragStore.ts` + `.test.ts`
- `src/renderer/components/CommandPalette/RagResults.tsx` (신규 서브컴포넌트)

### 수정 파일
- `src/renderer/components/CommandPalette/CommandPalette.tsx` (RAG 그룹 + 상태 배지)
- `src/renderer/stores/bookmarkStore.ts` (create/update/delete 시 embeddingStore 훅)
- `src/renderer/App.tsx` (ragStore health check + embeddingStore 로드)
- `src/renderer/lib/searchAll.ts` (RAG 결과를 SearchResult에 통합)
- `src/renderer/lib/migration.ts` (임베딩 마이그레이션)

## Exclusions (What NOT to Build)

- **Todo/Notes/Capsule/Feed 임베딩**: SPEC-SEARCH-RAG-002로 분리
- **Generator LLM 답변 합성** ("요약해줘" 류): SPEC-SEARCH-RAG-003
- **원격 Ollama (다른 머신)**: 범위 외. URL 설정은 후속
- **다른 임베딩 모델 선택**: nomic-embed-text 고정, 다중 모델은 후속
- **벡터 DB (sqlite-vss, LanceDB, Pinecone)**: MVP는 JS Map + JSON
- **WASM SIMD 가속**: 순수 JS 연산. 성능 NFR 미달 시 후속 SPEC
- **하이브리드 재정렬 (BM25 + 벡터)**: 순수 벡터만. BM25는 후속
- **검색 히스토리/즐겨찾기 쿼리**: 범위 외
- **인덱싱 Web Worker 분리**: 메인 스레드 디바운스로 처리. 성능 문제 시 후속
