---
id: SPEC-SEARCH-RAG-004
version: 0.1.0
status: draft
created: 2026-04-20
updated: 2026-04-20
author: ZeroJuneK
priority: high
issue_number: 0
---

# SPEC-SEARCH-RAG-004: RAG 백엔드 어댑터 — Transformers.js 브라우저 임베딩 지원

## HISTORY

| 버전 | 날짜 | 작성자 | 변경 내용 |
|------|------|--------|-----------|
| 0.1.0 | 2026-04-20 | ZeroJuneK | 최초 작성 (설치 장벽 제거 + WebGPU/WASM 지원 + Adapter pattern) |

## 개요

SPEC-SEARCH-RAG-001에서 Ollama(`localhost:11434`)에 직접 의존하던 임베딩 레이어를
**`EmbeddingProvider` 어댑터 패턴**으로 추상화하고, `@huggingface/transformers` 기반
**브라우저 내부 임베딩** 백엔드(Transformers.js)를 병렬 제공한다.

신규 사용자는 아무것도 설치하지 않고 첫 실행 후 수십 초 내에 RAG를 사용할 수 있어야 하며,
기존 Ollama 사용자는 아무것도 변경하지 않아도 기존 경로가 그대로 동작해야 한다.

**Context Capsule(SPEC-CAPSULE-001)이 "맥락을 묶고", SPEC-SEARCH-RAG-001이 "맥락을 찾는다"면,
SPEC-SEARCH-RAG-004는 "맥락을 찾는 두뇌를 골라서 쓸 수 있게" 하여 Deskflow의 진입 장벽을 제거한다.**

**분류**: SPEC (기능 확장 + 아키텍처 리팩터)
**성격**: Brownfield — 기존 ragStore/embeddingStore 의존 지점을 인터페이스로 추상화 + 신규 Provider 구현
**선행 SPEC**: SPEC-SEARCH-RAG-001 (완료 — 인프라 기반)
**병렬/orthogonal SPEC**: SPEC-SEARCH-RAG-002 (Todo/Notes 확장). `GenericEmbedding.kind` 는 provider와 독립적이므로 병렬 개발 가능.
**후속 SPEC 예정**: 모델 선택 UI (nomic 외 다수), ONNX 번들링(오프라인 첫 사용), 서버 사이드 embedding(외부 API key)

## 사용자 스토리

**신규 사용자 페르소나**: "앱을 처음 설치한 사람. Ollama가 뭔지 모르고, 설치 가이드 읽기 싫다."

1. 앱 첫 실행 → Command Palette 배지에 파랑 "RAG 모델 다운로드 중 (42%)" 표시
2. 네트워크 상황에 따라 수십 초 ~ 1분 이내 다운로드 완료 → 녹색 "RAG 준비됨" 배지
3. `Cmd+K` → "지난주 저장한 디자인 도구" 입력 → RAG 결과 Top 5 즉시 표시
4. Ollama 설치 여부와 무관하게 동작

**기존 Ollama 사용자 페르소나**: "SPEC-001 시절부터 Ollama 사용 중. 성능과 프라이버시 만족."

1. 앱 업데이트 → 아무런 UI 변화 없음
2. 기존 Ollama 경로 동작 유지 (배지/검색/인덱싱 전부 동일)
3. 설정에서 backend 가 `ollama` 로 유지되고 있음을 확인 가능
4. 마이그레이션 프롬프트 없음

**파워 유저 페르소나**: "GPU 좋은 데스크톱. 속도 극대화 원함. 혹은 반대로 로컬망 Ollama 서버 활용하고 싶음."

1. 설정 → RAG 섹션 → backend 드롭다운에서 `Ollama`/`Browser` 선택
2. 전환 시 "전체 재인덱싱이 시작됩니다" 경고 → 확인
3. ProgressToast 가 재인덱싱 진행률 표시
4. 완료 후 새 backend 로 검색 동작

## 설계 결정 사항 (확정됨 2026-04-20)

### DEC-001: Adapter Pattern — `EmbeddingProvider` 인터페이스

**결정**: `ragStore` 및 `embeddingStore` 가 `ollamaClient` 를 직접 import 하는 대신,
`EmbeddingProvider` 인터페이스만 의존한다. 현재 `ollamaClient.embed` 는 `OllamaEmbeddingProvider`
클래스로 래핑되어 인터페이스에 맞춰진다.

**인터페이스**:
```typescript
export interface EmbeddingProvider {
  readonly name: 'ollama' | 'transformers'
  readonly dimension: number           // 384 | 768
  readonly model: string               // 고유 식별자 (재인덱싱 트리거)

  checkHealth(): Promise<HealthStatus>
  embed(text: string): Promise<number[]>
  preload?(progressCb?: (pct: number) => void): Promise<void>
  dispose?(): void
}
```

**근거**:
- 두 backend 가 완전히 다른 런타임 (로컬 HTTP vs 브라우저 WASM/WebGPU) 이므로 단일 통합 함수는 부적절.
- 인터페이스 추상화로 향후 Provider 추가 (서버 사이드 API, ONNX 로컬 번들 등) 가 선형 확장.
- 기존 `ollamaClient.ts` 파일은 **수정하지 않고** 새 provider 클래스에서 함수 호출만 감싼다 → SPEC-001 회귀 위험 최소화.

**대안 (기각)**:
- **완전 교체**: Transformers.js만 남기고 Ollama 제거. 기존 사용자 프라이버시·성능 요구 충족 불가. 기각.
- **런타임 감지 자동 선택**: "Ollama 있으면 Ollama, 없으면 Transformers" — 사용자 의도 무시. 전환 시점 모호. 기각.

### DEC-002: Transformers.js 모델 = `Xenova/nomic-embed-text-v1.5`

**결정**: Browser backend 의 초기 유일 지원 모델은 `Xenova/nomic-embed-text-v1.5` 로 고정.

- 차원: **768** (Ollama `nomic-embed-text` 의 384와 다름 — 핵심 제약)
- 크기: 약 **137MB** (IndexedDB 캐시, 최초 1회 다운로드)
- 다국어: 한국어 포함 100+ 언어 (평가 상 한국어 recall 우수)
- 라이선스: Apache 2.0
- Ollama nomic-embed-text 와 **동일 계열 이름** 이므로 사용자 인지 부담 낮음

**근거**:
- v1.5 는 Matryoshka 학습으로 품질/크기 비율이 우수.
- 다국어가 필수 (사용자 주 입력 언어 ko).
- `Xenova/*` prefix 는 Transformers.js 공식 변환 모델 계열로 안정성 검증됨.

**대안 (기각)**:
- `Xenova/all-MiniLM-L6-v2` (22MB, 384차원): 크기는 매력적이나 영어 중심. 한국어 품질 낮음. 기각.
- `Xenova/bge-m3` (500MB+): 품질 최고지만 첫 다운로드 시간 + 저장 공간 과도. 기각.
- `Xenova/mxbai-embed-large-v1` (670MB): 동일 이유. 기각.

모델 선택 UI는 **범위 외**. 사용자 요청이 누적되면 후속 SPEC.

### DEC-003: 신규 사용자 기본 = Browser, 기존 사용자 = Ollama 유지

**결정**: `rag.backend` 설정 키의 **기본값 결정 로직**:

- `rag-backend` 키가 storage 에 없고, `rag-embeddings` 키에도 데이터가 없으면 (완전 신규) → `'transformers'`
- `rag-backend` 키가 storage 에 없고, `rag-embeddings` 키에 데이터가 있으면 (SPEC-001 사용자) → `'ollama'`
- `rag-backend` 키가 있으면 해당 값 사용

**근거**:
- 신규 사용자에게 설치 장벽을 느끼게 하지 않는 것이 본 SPEC의 핵심 목표.
- 기존 사용자가 자동으로 Browser 로 전환되면 전체 재인덱싱이 강제 발생 → 파괴적 업그레이드. 기각.
- Ollama 사용자는 명시적 전환을 선택할 때만 Browser 로 이동.

**마이그레이션 없음**: 기존 임베딩은 그대로 유지. backend 전환 시에만 재인덱싱 트리거 (DEC-004).

### DEC-004: 차원 불일치 시 자동 재인덱싱

**결정**: `provider.dimension` 이 기존 embeddings 의 대표 dimension 과 다르면
`embeddingStore.clearAll()` + 모든 source 엔티티(북마크)를 `enqueueIndex`로 재예약 + `ProgressToast` 표시.

**트리거 시점**:
- 앱 초기화 시: `ragStore.setBackend` 완료 후 provider.dimension vs embeddings.first().dimension 비교.
- 사용자가 설정에서 backend 전환 시: 확인 다이얼로그 후 동일 절차.
- 모델이 바뀌었지만 차원이 같은 경우: 안전을 위해 provider.model 문자열이 기존 embeddings.first().model 과 다르면 역시 재인덱싱.

**근거**:
- 차원이 다른 벡터 간 cosine similarity 계산은 `cosineSimilarity.ts` 가 throw 하며 무의미.
- 부분 재인덱싱은 불가 (모든 기존 벡터가 새 차원과 호환 불가).
- 사용자에게 상태를 숨기지 않고 명시적 Toast 로 알림 → 인지 가능한 시스템.

**대안 (기각)**:
- **수동 "재인덱싱" 버튼**: 사용자가 잊으면 검색 결과 0개로 보이는 silent failure. 기각.
- **차원 혼재 허용**: cosine 구현 복잡도 급증. 기각.

### DEC-005: 최초 모델 다운로드 UX

**결정**: Browser backend 활성 상태에서 첫 embed 호출 전,
`RagStatusBadge` 가 파랑 `downloading` 상태(+진행률 %)를 표시하며 앱은 다른 기능은 정상 사용 가능하다.

**동작**:
- `ragStore` 에 `downloadProgress: number | null` 상태 추가.
- Transformers.js `pipeline({ progress_callback })` 훅으로 파일별 진행률 수신 → `ragStore.setDownloadProgress`.
- 진행률은 파일별이 아닌 **전체 가중 평균**으로 표시 (여러 샤드 파일의 바이트 총합 기반).
- 다운로드 실패 시 빨강 배지 + "다시 시도" 버튼 + "Ollama 로 전환" 대안 안내.

**근거**:
- 137MB 는 네트워크 속도에 따라 수십 초 걸릴 수 있음 → 진행률이 없으면 "멈춘 것" 으로 오인.
- 설정 다이얼로그가 아닌 배지에 진행률 표시 → 다른 작업 중에도 인지 가능.

### DEC-006: WebGPU/WASM 자동 감지 + 사용자 선택 불필요

**결정**:
- 앱 초기화 시 `navigator.gpu?.requestAdapter()` 호출로 WebGPU 가용성 판정.
- 성공 시 `device: 'webgpu'` + `dtype: 'fp32'`.
- 실패 또는 `navigator.gpu` 미존재 시 `device: 'wasm'` 자동 폴백 (Transformers.js 내장).
- 사용자는 device 를 **직접 선택하지 않음**. 설정 UI 에서는 현재 활성 device 를 informational 으로만 표시.

**근거**:
- WebGPU 감지 실패 경우의 수가 많음 (OS, 브라우저, 하드웨어, 플래그 등) → 사용자 판단 불가.
- 사용자가 잘못 선택 시 전혀 동작하지 않거나 극단적으로 느려질 수 있음.
- 자동 폴백은 Transformers.js 의 공식 권장 패턴.

**대안 (기각)**:
- **사용자 강제 선택**: 위 이유로 기각.
- **Ollama 대신 Browser 로 자동 전환 조건 (Ollama 미탐지 시)**: DEC-003 철학 반대 (신규 vs 기존 판별 기준은 임베딩 데이터 유무).

### DEC-007: Electron vs Web 동일 코드 경로

**결정**: Electron(Chromium) 과 Web(Vite) 모두 Chromium 계열로 WebGPU/WASM 동일 지원.
별도 조건부 분기 없이 같은 코드를 사용.

**제약 문서화**:
- Safari 나 비-Chromium 웹브라우저에서는 WebGPU 미지원 → WASM 폴백은 동작하지만 속도 현저히 저하.
- Web 빌드 README 에 "Chromium 계열 브라우저 권장" 명시.
- Electron 은 항상 Chromium 이므로 문제 없음.

### DEC-008: 기존 `ollamaClient.ts` 파일 불수정 원칙

**결정**: SPEC-001 에서 구현된 `src/renderer/lib/ollamaClient.ts` 파일은 **내용을 수정하지 않는다**.
신규 `OllamaEmbeddingProvider` 클래스는 이 파일의 함수를 호출하는 얇은 래퍼로만 만든다.

**근거**:
- SPEC-001 은 `completed` 상태. dual-endpoint 폴백 등 미묘한 호환 로직이 이미 검증됨.
- 수정하면 SPEC-001 의 35개 ollamaClient 테스트가 리그레션 리스크에 노출.
- 래퍼는 독립 파일(`embeddingProvider.ts` 또는 `providers/ollamaProvider.ts`)에서 관리.

## 요구사항 (EARS)

### 어댑터 인터페이스

#### REQ-001: EmbeddingProvider 인터페이스 정의

**[Ubiquitous]** 시스템은 **항상** `EmbeddingProvider` 인터페이스를 노출해야 하며,
다음 필수 멤버를 포함해야 한다: `name`, `dimension`, `model`, `checkHealth`, `embed`.
선택 멤버: `preload`, `dispose`.

#### REQ-002: OllamaEmbeddingProvider 래퍼

**[Ubiquitous]** 시스템은 **항상** 기존 `ollamaClient.checkHealth` / `ollamaClient.listModels` / `ollamaClient.embed` 함수를
`OllamaEmbeddingProvider` 클래스로 래핑해야 한다. 클래스의 `name === 'ollama'`, `dimension === 384`,
`model === 'nomic-embed-text'`. `ollamaClient.ts` 파일 자체는 수정하지 않는다.

#### REQ-003: TransformersEmbeddingProvider 구현

**[Ubiquitous]** 시스템은 **항상** `@huggingface/transformers` 기반의 `TransformersEmbeddingProvider` 클래스를 제공해야 한다.
`name === 'transformers'`, `dimension === 768`, `model === 'Xenova/nomic-embed-text-v1.5'`.
`embed` 구현은 `pipeline('feature-extraction', model)` 의 결과에 `{ pooling: 'mean', normalize: true }` 옵션을 적용하여
768 길이 float 배열을 반환해야 한다.

#### REQ-004: Provider Factory

**[Ubiquitous]** 시스템은 **항상** 주어진 `backend: 'ollama' | 'transformers'` 값을 받아 해당 Provider 의
**싱글톤 인스턴스**를 반환하는 팩토리를 제공해야 한다. 동일 backend 에 대한 반복 호출은 동일 인스턴스를 반환한다.

### Backend 선택 & 초기화

#### REQ-005: `rag.backend` 설정 키

**[Ubiquitous]** 시스템은 **항상** `rag-settings` storage 키의 일부로 `backend: 'ollama' | 'transformers'` 필드를
영속화해야 한다. 기존 SPEC-001 의 `enabled`, `similarityThreshold` 필드는 유지.

#### REQ-006: 신규 사용자 기본값 결정

**[Event-Driven]** **When** 앱이 초기화되고 `rag-settings` 에 `backend` 필드가 존재하지 않으면,
시스템은 storage 의 `rag-embeddings` 키 존재 여부(및 비어있지 않음 여부)를 확인하여 다음과 같이 기본값을 설정**해야 한다**:
- 임베딩 데이터 존재 → `backend = 'ollama'`
- 임베딩 데이터 없음 → `backend = 'transformers'`

#### REQ-007: 모델 프리로드 (Browser)

**[Event-Driven]** **When** 활성 backend 가 `transformers` 이고 앱 초기화가 완료되면,
시스템은 `provider.preload(progressCb)` 를 백그라운드로 호출**해야 한다**.
`progressCb` 는 `ragStore.setDownloadProgress` 에 연결되어야 한다.
프리로드가 완료되기 전이라도 앱의 다른 기능은 정상 동작해야 한다.

### 차원 마이그레이션 (자동 재인덱싱)

#### REQ-008: 차원 불일치 감지

**[Event-Driven]** **When** 활성 Provider 가 설정되거나 변경되면,
시스템은 `embeddingStore.embeddings` 에서 임의의 첫 항목을 읽어 `dimension` 또는 `model` 필드를
현재 provider 와 비교**해야 한다**. 불일치가 감지되면 REQ-009 를 트리거한다.

#### REQ-009: 자동 재인덱싱 트리거

**[Event-Driven]** **When** REQ-008 에서 불일치가 감지되면 또는 사용자가 backend 를 전환하면,
시스템은 순서대로 다음을 수행**해야 한다**:
1. `embeddingStore.clearAll()` 호출.
2. `bookmarkStore` 의 모든 현재 북마크 `linkId` 를 수집하여 `embeddingStore.enqueueIndex(...)`.
3. `embeddingStore.runIndexBatch()` drain 시작.
4. UI 에 `ProgressToast` 로 "RAG 모델 전환 중... N/M" 표시.

#### REQ-010: 재인덱싱 중 검색 비활성화

**[State-Driven]** **While** 재인덱싱 drain 이 진행 중인 동안, `ragStore.search` 호출은 빈 배열을 반환**해야 한다**.
UI 는 배지를 `downloading` 또는 `reindexing` 상태로 표시.

### 상태 배지

#### REQ-011: 4가지 상태

**[Ubiquitous]** `RagStatusBadge` 는 **항상** 다음 상태 중 정확히 하나를 표시해야 한다:
- 녹색 "RAG 준비됨" — provider.checkHealth() 통과 + 재인덱싱 비진행
- 노랑 "모델 누락 — `ollama pull nomic-embed-text`" — Ollama backend + 모델 누락
- 빨강 "Ollama 미탐지" (Ollama backend) 또는 "브라우저 모델 로드 실패" (Transformers backend)
- 파랑 "RAG 모델 다운로드 중 (N%)" — Transformers backend + downloadProgress 진행 중

#### REQ-012: Backend informational 표시

**[Ubiquitous]** 시스템은 **항상** 현재 활성 backend(`ollama` 또는 `transformers`)를
배지 툴팁 또는 설정 화면에서 사용자에게 표시해야 한다.

### 설정 UI

#### REQ-013: Backend 드롭다운

**[Ubiquitous]** Settings RAG 섹션은 **항상** backend 드롭다운(옵션: "Ollama (로컬 서버)" / "Browser (WebGPU/WASM)")을 제공해야 한다.
현재 값은 `rag.backend` 에서 읽는다.

#### REQ-014: 전환 확인

**[Event-Driven]** **When** 사용자가 드롭다운에서 backend 를 변경하면,
시스템은 "전체 북마크를 새 모델로 재인덱싱합니다. 계속하시겠습니까?" 인라인 확인 UI를 표시하고,
확인 시에만 `ragStore.setBackend` 를 호출**해야 한다**. 취소 시 기존 값으로 복원.

#### REQ-015: WebGPU 감지 informational

**[Ubiquitous]** Settings UI 는 **항상** 현재 활성 device(`webgpu` 또는 `wasm`)와
모델 이름(`Xenova/nomic-embed-text-v1.5` 또는 `nomic-embed-text`)을 informational 으로 표시해야 한다.

### 회귀 금지

#### REQ-016: SPEC-001 회귀 0

**[Ubiquitous]** Ollama backend 로 선택된 상태에서 SPEC-SEARCH-RAG-001 의 AC-001 ~ AC-039 는
**항상** 통과 상태를 유지해야 한다. 특히 기존 ollamaClient 의 dual-endpoint 폴백(REQ-004 호환 전략)은 변경 없이 유지.

#### REQ-017: SPEC-002 호환

**[Ubiquitous]** SPEC-SEARCH-RAG-002 의 `GenericEmbedding.kind` 필드와 kind-aware embeddingStore 는
**항상** provider 와 독립적으로 동작해야 한다. 차원 마이그레이션(REQ-009)은 모든 kind 의 임베딩을 공평하게 clear 하고 재인덱싱.

## 비기능 요구사항

### NFR-001: 번들 크기

- `@huggingface/transformers` 추가로 인한 **초기 번들 증가 < 5MB** (gzip 기준).
- `TransformersEmbeddingProvider` 구현은 **dynamic import** (`await import('@huggingface/transformers')`) 로 로드하여
  Ollama backend 사용자의 초기 번들에는 포함되지 않도록 해야 한다.
- 모델 파일(137MB) 은 IndexedDB 캐시이며 번들에 포함하지 않는다.

### NFR-002: 성능

- **Transformers.js WebGPU**: 단일 임베딩 < 200ms (중급 GPU 기준)
- **Transformers.js WASM**: 단일 임베딩 < 500ms (중급 CPU 기준)
- **최초 모델 다운로드**: < 60초 (100Mbps 기준, 137MB)
- **모델 로드 (캐시 hit)**: < 2초
- **검색 응답**: < 1000ms (쿼리 임베딩 WASM 최악 500ms + 500개 벡터 cosine 비교)
- SPEC-001 NFR-002 의 Ollama 성능은 변경 없음 (래핑만 추가).

### NFR-003: 회귀 방지

- Ollama backend 경로는 **어댑터 래핑 외 기능 변화 없음**.
- SPEC-001 의 전체 테스트 100% 통과 유지.
- SPEC-002 가 머지되었다면 그 테스트도 100% 통과.

### NFR-004: 테스트 커버리지

- `embeddingProvider` 인터페이스 contract 테스트: 8개 이상
- `OllamaEmbeddingProvider` 래퍼 단위: 6개 이상
- `TransformersEmbeddingProvider` 단위 (pipeline mock): 10개 이상 — 최소 다음 포함:
  - `embed` 가 길이 768 배열 반환
  - `preload` progress_callback 이 누적 진행률 계산
  - WebGPU 감지 실패 시 WASM 폴백
  - pipeline 초기화 실패 시 HealthStatus `detail: 'error'`
- `providerFactory` 싱글톤 보장: 3개
- Backend switching & 차원 마이그레이션: 6개
- `RagStatusBadge` 4상태 렌더: 8개
- Settings 드롭다운 & 전환 확인 UI: 5개
- 신규 코드 커버리지 85% 유지

### NFR-005: TypeScript strict 0 오류, ESLint 0 오류 유지

## 제약사항

- React 19, TypeScript strict, Zustand 5
- Electron + Web 빌드 동일 코드 경로
- `@huggingface/transformers` 버전은 `package.json` 에 pin (최초 도입 시점 최신 안정판)
- Transformers.js 모델 `Xenova/nomic-embed-text-v1.5` 고정 (다른 모델 선택은 후속)
- Ollama 모델 `nomic-embed-text` 고정 (SPEC-001 유지)
- WebGPU 미지원 환경 WASM 자동 폴백 (Transformers.js 내장)
- 다운로드 실패 시 재시도는 사용자 명시적 액션 필요 (자동 재시도 없음 — 네트워크 부하 방지)
- `ollamaClient.ts` 파일 본문 수정 금지 (DEC-008)

## 데이터 스키마

```typescript
// src/renderer/lib/embeddingProvider.ts (신규 — 인터페이스 + 공용 타입)

export type ProviderName = 'ollama' | 'transformers'

export interface HealthStatus {
  available: boolean
  detail:
    | 'ready'
    | 'not-installed'       // Ollama 미탐지
    | 'model-missing'       // Ollama 모델 누락
    | 'downloading'         // Transformers 최초 다운로드 중
    | 'loading'             // Transformers 캐시에서 로드 중
    | 'error'               // 복구 불가 오류
  downloadProgress?: number // 0-100, downloading 시
  errorMessage?: string     // 사용자 표시용 상세 메시지
}

export interface EmbeddingProvider {
  readonly name: ProviderName
  readonly dimension: number
  readonly model: string
  checkHealth(): Promise<HealthStatus>
  embed(text: string): Promise<number[]>
  preload?(progressCb?: (pct: number) => void): Promise<void>
  dispose?(): void
}

// src/renderer/lib/providers/ollamaProvider.ts (신규)
export class OllamaEmbeddingProvider implements EmbeddingProvider {
  readonly name = 'ollama' as const
  readonly dimension = 384
  readonly model = 'nomic-embed-text'
  checkHealth(): Promise<HealthStatus> { /* ollamaClient.checkHealth + listModels */ }
  embed(text: string): Promise<number[]> { /* ollamaClient.embed(text) */ }
  // preload / dispose 불필요
}

// src/renderer/lib/providers/transformersProvider.ts (신규)
export class TransformersEmbeddingProvider implements EmbeddingProvider {
  readonly name = 'transformers' as const
  readonly dimension = 768
  readonly model = 'Xenova/nomic-embed-text-v1.5'
  private extractor: FeatureExtractionPipeline | null = null
  private loading: Promise<void> | null = null
  async checkHealth(): Promise<HealthStatus> { /* extractor 존재 여부 + 에러 상태 리턴 */ }
  async embed(text: string): Promise<number[]> { /* extractor 로드 보장 후 호출, 768 float array */ }
  async preload(progressCb?: (pct: number) => void): Promise<void> { /* dynamic import + pipeline() */ }
  dispose(): void { /* extractor 참조 해제 */ }
}

// src/renderer/lib/providerFactory.ts (신규)
export function getProvider(backend: ProviderName): EmbeddingProvider
// 모듈 스코프 싱글톤: Map<ProviderName, EmbeddingProvider>

// src/renderer/stores/ragStore.ts 확장
export interface RagState {
  // ── 기존 (SPEC-001) ─────────────────────────────────────────
  ollamaAvailable: boolean            // 의미 유지 (Ollama backend 전용으로 의미 축소)
  modelMissing: boolean
  lastHealthCheck: string | null
  enabled: boolean
  similarityThreshold: number
  loadSettings: () => Promise<void>
  checkHealth: () => Promise<void>
  setEnabled: (v: boolean) => void
  setThreshold: (v: number) => void
  search: (query: string) => Promise<RagResult[]>

  // ── 신규 (SPEC-004) ─────────────────────────────────────────
  backend: ProviderName
  downloadProgress: number | null     // null | 0-100
  providerHealthDetail: HealthStatus['detail']
  reindexing: boolean                 // 차원 마이그레이션 중
  reindexProgress: { done: number; total: number } | null

  setBackend: (v: ProviderName) => Promise<void>   // 전환 + 재인덱싱 트리거
  setDownloadProgress: (pct: number | null) => void
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
                         │ EmbeddingProvider    │ ◀── 어댑터 추상화 (DEC-001)
                         │  (active instance)   │
                         └──────────┬───────────┘
                         getProvider(backend)
                            ┌───────┴────────┐
                            ▼                ▼
                     ┌──────────────┐ ┌───────────────────┐
                     │ Ollama       │ │ Transformers      │
                     │  Provider    │ │  Provider         │
                     │              │ │                   │
                     │  localhost   │ │  브라우저 내부     │
                     │  :11434      │ │  (WebGPU/WASM)    │
                     │  384-dim     │ │  768-dim          │
                     └──────────────┘ └───────────────────┘

앱 초기화 체인:
  migration.run → bookmarkStore.load → embeddingStore.load
  → ragStore.loadSettings (backend 결정 포함, REQ-006)
  → providerFactory.getProvider(backend)
  → provider.preload(progressCb) (Transformers 한정, REQ-007)
  → dimension 검증 (REQ-008) → 불일치 시 재인덱싱 트리거 (REQ-009)
  → 기존 missing 북마크 enqueue → runIndexBatch

Backend 전환 (사용자 액션):
  사용자 드롭다운 변경 → 확인 UI (REQ-014)
  → ragStore.setBackend(new)
  → rag-settings 저장
  → providerFactory.getProvider(new).preload(progressCb)
  → embeddingStore.clearAll()
  → 전체 북마크 enqueue → runIndexBatch
  → ProgressToast "RAG 모델 전환 중... N/M"
```

## UI 변경

### RagStatusBadge (수정)

기존 3상태(녹/노/빨) + 신규 파랑 `downloading` 상태.

- 녹색: "RAG 준비됨" (기존)
- 노랑: "모델 누락 — `ollama pull nomic-embed-text`" (기존, Ollama 전용)
- 빨강: "Ollama 미탐지 — 설치 가이드" (Ollama) / "브라우저 모델 로드 실패 — 재시도" (Transformers)
- 파랑: "RAG 모델 다운로드 중 (42%)" (Transformers 첫 로드)

배지 툴팁에 현재 backend 명시 (예: "Ollama · 384-dim · nomic-embed-text").

### SidebarSettings — RAG 섹션 확장

기존 `enabled` 토글 + `similarityThreshold` 슬라이더 하단에 다음 추가:

- Backend 드롭다운 (Ollama / Browser)
- 전환 확인 인라인 UI (REQ-014)
- 현재 모델 informational (예: "모델: Xenova/nomic-embed-text-v1.5 · 768차원")
- 현재 device informational (예: "Device: WebGPU" / "Device: WASM")

### ProgressToast (확장)

기존 "인덱싱 진행 중" 메시지에 새 variant "RAG 모델 전환 중" 추가.
동일 컴포넌트 재사용, message prop 만 다름.

## 신규 파일

- `src/renderer/lib/embeddingProvider.ts` — 인터페이스 + 공용 타입
- `src/renderer/lib/providers/ollamaProvider.ts` + `.test.ts` — Ollama 래퍼
- `src/renderer/lib/providers/transformersProvider.ts` + `.test.ts` — Transformers.js 구현
- `src/renderer/lib/providerFactory.ts` + `.test.ts` — 싱글톤 팩토리
- `src/renderer/stores/ragStore.backend.test.ts` — backend 전환 + 재인덱싱 테스트

## 수정 파일

- `src/renderer/stores/ragStore.ts` — provider 추상화 도입, `backend`/`downloadProgress`/`reindexing` 상태 추가, `setBackend` 액션
- `src/renderer/stores/embeddingStore.ts` — embed 호출을 provider 주입으로 전환, `clearAll` 이 차원 전환 시 호출됨 (기존 API 유지, 호출 맥락만 추가)
- `src/renderer/components/CommandPalette/RagStatusBadge.tsx` — `downloading` 파랑 상태 + 진행률 %
- `src/renderer/components/ProgressToast/ProgressToast.tsx` — reindex variant 메시지
- `src/renderer/components/PivotLayout/SidebarSettings.tsx` — backend 드롭다운 + informational 필드
- `src/renderer/App.tsx` — initRag 체인에 preload + dimension 검증 + 재인덱싱 트리거
- `package.json` — `@huggingface/transformers` 의존성 추가 (버전 pin)
- `README.md` — RAG 섹션에 "Browser backend (기본)" / "Ollama backend (선택)" 설명 추가

## Exclusions (What NOT to Build)

- **모델 선택 UI**: `Xenova/all-MiniLM-L6-v2`, `Xenova/bge-m3` 등 다른 모델 선택은 후속 SPEC. 현재는 `nomic-embed-text-v1.5` 고정.
- **서버 사이드 embedding (OpenAI/Anthropic/Cohere API)**: 외부 API key 관리, 과금, 프라이버시 경계 등 완전히 다른 설계. 범위 외.
- **오프라인 모델 번들링 (ONNX 파일 사전 포함)**: 현재는 최초 다운로드. 번들 포함은 번들 크기 트레이드오프. 후속 SPEC.
- **Ollama 완전 제거**: 명시적으로 공존 유지. 기존 사용자 프라이버시/성능 요구 존중.
- **원격 Ollama (다른 머신의 Ollama 서버)**: SPEC-001 과 동일하게 범위 외. URL override 는 별도 SPEC.
- **차원 부분 재인덱싱**: 모든 벡터가 새 차원과 호환 불가 → 전체 clear 만 지원.
- **자동 다운로드 재시도**: 네트워크 부하/요금 리스크. 사용자가 "재시도" 버튼 명시적 클릭.
- **Web Worker 로 Transformers.js 실행 분리**: 메인 스레드 UI 블로킹 우려 있으나 초기 구현은 메인 스레드. 성능 NFR 미달 시 후속.
- **Service Worker 기반 모델 캐시 제어**: IndexedDB 기본 캐시만 사용. 수동 캐시 무효화 UI 는 범위 외.
- **SPEC-SEARCH-RAG-002 동시 구현**: 002는 병렬 orthogonal. 004 구현이 002 `GenericEmbedding.kind` 머지 전에 시작하면 임시 타입 alias(`kind?: 'bookmark'`) 로 전방 호환 유지 후 002 머지 시 통합.
- **Transformers.js device 사용자 강제 선택**: 자동 감지만 지원 (DEC-006). 수동 override 옵션은 후속.
- **모델 삭제 / 캐시 정리 UI**: 사용자가 DevTools → IndexedDB 로 수동 가능. 전용 UI 는 후속.
