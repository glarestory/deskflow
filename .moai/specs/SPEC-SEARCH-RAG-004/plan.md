# Implementation Plan — SPEC-SEARCH-RAG-004

## 개발 방법론

**TDD (RED-GREEN-REFACTOR)** — 기존 `ragStore` / `embeddingStore` 의 리팩터 성격이 강하므로
Phase 1 의 어댑터 인터페이스를 먼저 잠그고, 기존 동작은 래핑으로 보존한 뒤 신규 Provider 를 확장한다.
SPEC-001 회귀 0 을 RED 단계에서부터 안전망으로 삼는다.

## 구현 단계 (Phase)

총 5개 Phase. 각 Phase 는 독립 커밋 가능한 단위이며, Phase 1-3 완료 시점에 Ollama backend 는 완전히 어댑터 경로로 전환되어 있어야 한다 (아직 Transformers 는 미구현이어도 SPEC-001 회귀 0 유지).

---

### Phase 1: 어댑터 인터페이스 + OllamaEmbeddingProvider 래퍼

**목표**: 데이터 경로는 그대로 유지하되, 추상화 레이어를 먼저 도입하여 이후 Phase 가 안전하게 올라탈 수 있게 한다.

**RED**

- `embeddingProvider.interface.test.ts`:
  - `EmbeddingProvider` 인터페이스에 필수 필드(`name`, `dimension`, `model`, `checkHealth`, `embed`) 가 존재 (타입 수준 검증).
  - 선택 필드 `preload`, `dispose` 존재 여부 확인.
  - `HealthStatus` 의 `detail` 유니온이 6개 값을 포함 (`'ready' | 'not-installed' | 'model-missing' | 'downloading' | 'loading' | 'error'`).
- `ollamaProvider.test.ts`:
  - `new OllamaEmbeddingProvider().name === 'ollama'`, `dimension === 384`, `model === 'nomic-embed-text'`.
  - `checkHealth()` 가 내부에서 `ollamaClient.checkHealth` + `listModels` 를 호출 (fetch mock 으로 검증).
  - `checkHealth()` 반환 `detail` 값 매핑:
    - health false → `{ available: false, detail: 'not-installed' }`
    - health true + 모델 없음 → `{ available: false, detail: 'model-missing' }`
    - health true + 모델 있음 → `{ available: true, detail: 'ready' }`
  - `embed('hello')` 가 `ollamaClient.embed('hello')` 호출 결과를 그대로 반환 (길이 384 배열).
  - `embed` 내부 에러 throw → 그대로 propagate (OllamaError).
  - `preload`, `dispose` 가 undefined (Ollama 는 필요 없음).

**GREEN**

- `src/renderer/lib/embeddingProvider.ts` 신규 — 인터페이스 + 공용 타입(`ProviderName`, `HealthStatus`, `EmbeddingProvider`).
- `src/renderer/lib/providers/ollamaProvider.ts` 신규 — 래퍼 클래스.
  - `OllamaEmbeddingProvider` 클래스, readonly 상수 name/dimension/model.
  - `checkHealth()` 내부에서 `ollamaClient.checkHealth()` + (true 면) `ollamaClient.listModels()` 호출. 결과를 `HealthStatus` 매핑.
  - `embed(text)` 는 `ollamaClient.embed(text)` 위임.
- `ollamaClient.ts` **수정 금지** (DEC-008).

**REFACTOR**

- `nomic-embed-text` 매칭 로직을 `isNomicModel` 공유 유틸로 추출 (기존 `ragStore.ts` 의 helper 와 dedupe).
- 에러 상세 메시지를 `HealthStatus.errorMessage` 로 전달 (추후 UI 배지에서 활용).

**검증**: REQ-001, REQ-002

**MX 태그**:
- `embeddingProvider.ts`: `@MX:NOTE: [AUTO] EmbeddingProvider 어댑터 추상화 — SPEC-SEARCH-RAG-004 REQ-001`, `@MX:SPEC: SPEC-SEARCH-RAG-004`.
- `ollamaProvider.ts`: `@MX:NOTE: [AUTO] OllamaEmbeddingProvider — ollamaClient 얇은 래퍼, SPEC-001 회귀 방지`, `@MX:SPEC: SPEC-SEARCH-RAG-004`.

---

### Phase 2: providerFactory + ragStore/embeddingStore 통합

**목표**: 기존 `ragStore.search` 및 `embeddingStore.runIndexBatch` 내부의 `ollamaClient.embed` 직접 호출을
`providerFactory.getProvider(backend).embed` 로 교체한다. 이 시점까지 backend 는 항상 `'ollama'` 고정 (Transformers 미구현).

**RED**

- `providerFactory.test.ts`:
  - `getProvider('ollama')` 가 `OllamaEmbeddingProvider` 인스턴스 반환.
  - 동일 backend 반복 호출 → 동일 인스턴스 (싱글톤 보장).
  - 현재 Phase 에서는 `getProvider('transformers')` 는 dynamic import 스텁으로 테스트 (Phase 3 에서 실체 구현).
- `ragStore.provider-integration.test.ts`:
  - 기존 SPEC-001 동작 유지: `search('hello world')` → 여전히 Top K 결과 반환.
  - 내부적으로 `ollamaClient.embed` 대신 `provider.embed` 경유 호출 (spy 로 검증).
  - `checkHealth` 액션이 provider.checkHealth 를 호출하고 결과를 `ollamaAvailable` / `modelMissing` 으로 매핑 (후방 호환).
  - 신규 필드 `backend`, `downloadProgress`, `providerHealthDetail`, `reindexing`, `reindexProgress` 초기값 검증.
- `embeddingStore.provider-integration.test.ts`:
  - `runIndexBatch` 내부에서 provider.embed 호출 (spy).
  - 차원이 provider.dimension 과 일치하는 BookmarkEmbedding 저장 검증.

**GREEN**

- `src/renderer/lib/providerFactory.ts` 신규:
  - 모듈 스코프 `Map<ProviderName, EmbeddingProvider>` 싱글톤.
  - `getProvider('ollama')` → 즉시 인스턴스화.
  - `getProvider('transformers')` → 이 Phase 에서는 `throw new Error('not implemented yet')` 또는 lazy placeholder (Phase 3 에서 채움).
- `src/renderer/stores/ragStore.ts` 수정:
  - 신규 상태 추가: `backend: ProviderName` (초기값 `'ollama'`), `downloadProgress`, `providerHealthDetail`, `reindexing`, `reindexProgress`.
  - `checkHealth` 내부에서 `getProvider(get().backend).checkHealth()` 호출 → 결과를 기존 `ollamaAvailable` / `modelMissing` 및 신규 `providerHealthDetail` 로 매핑.
  - `search` 내부의 `ollamaClient.embed(query)` 를 `getProvider(get().backend).embed(query)` 로 교체.
  - 파일 상단의 `import * as ollamaClient` 는 제거 (ragStore 레벨에서 직접 의존 끊기).
- `src/renderer/stores/embeddingStore.ts` 수정:
  - `runIndexBatch` 가 provider 주입 가능하도록 시그니처 확장 (optional provider arg, 기본 `getProvider(ragStore.backend)`).
  - `BookmarkEmbedding.model` / `dimension` 필드를 provider 값으로 기록.

**REFACTOR**

- ragStore 의 `isNomicModel` 헬퍼는 Phase 1 에서 공유 유틸로 이동했으므로 중복 제거.
- provider factory 에서 dynamic import 타이밍을 깔끔하게 관리하기 위해 `ensureProvider(backend): Promise<EmbeddingProvider>` 유틸 추가 (Phase 3 Transformers 에서 사용).

**검증**: REQ-004, REQ-005(상태 필드만), REQ-016 (회귀)

**MX 태그**:
- `providerFactory.ts`: `@MX:ANCHOR: [AUTO] Provider 싱글톤 팩토리 — 모든 embed 경로의 단일 진입점`, `@MX:REASON: [AUTO] ragStore, embeddingStore, App.tsx 의존 (fan_in >= 3)`, `@MX:SPEC: SPEC-SEARCH-RAG-004`.
- `ragStore.ts` 기존 `@MX:ANCHOR` 는 유지하되 `@MX:SPEC` 라인에 `SPEC-SEARCH-RAG-004` 추가 병기.

---

### Phase 3: TransformersEmbeddingProvider 구현

**목표**: `@huggingface/transformers` 기반 Browser backend 를 실제로 동작하게 만든다. WebGPU 감지 + WASM 폴백 포함.

**RED**

- `transformersProvider.test.ts` (pipeline mock 기반):
  - `new TransformersEmbeddingProvider().name === 'transformers'`, `dimension === 768`, `model === 'Xenova/nomic-embed-text-v1.5'`.
  - `preload(cb)` 호출 시 `@huggingface/transformers` 의 `pipeline` 이 `'feature-extraction', 'Xenova/nomic-embed-text-v1.5'` 인자로 호출됨 (mock).
  - `preload` 의 `progress_callback` 이 여러 번 발화되면 cb 에 누적 pct(0~100) 전달 검증.
  - `preload` 가 두 번 호출되면 내부 loading promise 재사용 (dedupe).
  - WebGPU 감지: `navigator.gpu.requestAdapter` mock 성공 → `device: 'webgpu'` 로 pipeline 호출.
  - WebGPU 감지: `navigator.gpu` undefined → `device: 'wasm'` 폴백.
  - `checkHealth()` 상태 분기:
    - extractor null + loading null → `{ detail: 'loading', available: false }`
    - extractor null + loading 진행 중 + progress 50 → `{ detail: 'downloading', downloadProgress: 50, available: false }`
    - extractor 준비됨 → `{ detail: 'ready', available: true }`
    - preload 중 throw → `{ detail: 'error', errorMessage: ..., available: false }`
  - `embed('안녕')` → extractor 호출 시 `{ pooling: 'mean', normalize: true }` 옵션 전달 + 결과 `Array.from(output.data)` 가 길이 768 float 배열 반환.
  - extractor 미로드 상태에서 `embed` 호출 → 내부에서 `preload` 자동 트리거 후 embed (lazy init).
  - `dispose()` 호출 시 extractor 참조가 null 로 해제.
- `providerFactory.transformers.test.ts` (Phase 2 placeholder 실체화):
  - `getProvider('transformers')` 가 `TransformersEmbeddingProvider` 인스턴스 반환.
  - 싱글톤 보장 유지.

**GREEN**

- `package.json`: `@huggingface/transformers` 의존성 추가 (최신 안정판 버전 pin).
- `src/renderer/lib/providers/transformersProvider.ts` 신규:
  - 클래스 멤버: `extractor: FeatureExtractionPipeline | null`, `loading: Promise<void> | null`, `lastError: Error | null`, `lastProgress: number`, `device: 'webgpu' | 'wasm'`.
  - 상단에서 `@huggingface/transformers` 를 **dynamic import** — 초기 번들에 포함되지 않도록 (NFR-001).
    ```ts
    // preload 내부
    const { pipeline, env } = await import('@huggingface/transformers')
    env.allowLocalModels = true
    env.useBrowserCache = true
    ```
  - WebGPU 감지 유틸 `detectDevice(): Promise<'webgpu' | 'wasm'>` — `navigator.gpu?.requestAdapter()` 결과 기반.
  - `preload` 는 로딩 중이면 기존 promise 반환 (dedupe). 성공 시 extractor 설정, 실패 시 lastError 기록 및 throw.
  - `progress_callback`: Transformers.js 가 파일 단위 progress 를 발화하므로, 내부에서 파일별 바이트 누적을 weighted average 로 계산해 cb 에 단일 pct 전달.
  - `embed(text)`: extractor 가 null 이면 `await this.preload()` 후 `extractor(text, { pooling: 'mean', normalize: true })`.
  - `checkHealth`: state 기반 pure 분기 (fetch 호출 없음).
- `providerFactory.ts` 수정: `'transformers'` 분기를 실체 인스턴스로 연결.

**REFACTOR**

- `detectDevice` 를 `src/renderer/lib/providers/deviceDetection.ts` 파일로 분리 + 단위 테스트.
- `progress_callback` 의 weighted pct 계산을 `computeAggregateProgress(files, currentFile, currentPct): number` 순수 함수로 추출.
- 에러 메시지 i18n 대비 placeholder 구조화 (현재는 한국어 문자열 고정).

**검증**: REQ-003, REQ-007, REQ-015 (device informational 기반)

**MX 태그**:
- `transformersProvider.ts`: `@MX:ANCHOR: [AUTO] TransformersEmbeddingProvider — 브라우저 내부 임베딩 진입점`, `@MX:REASON: [AUTO] providerFactory 및 ragStore preload 경로에서 의존 (fan_in >= 3)`, `@MX:SPEC: SPEC-SEARCH-RAG-004`.
- `deviceDetection.ts`: `@MX:NOTE: [AUTO] WebGPU 감지 + WASM 폴백 — SPEC-SEARCH-RAG-004 DEC-006`.
- `transformersProvider.ts` preload 함수: `@MX:WARN: [AUTO] 최초 호출 시 137MB 다운로드 발생`, `@MX:REASON: [AUTO] 사용자 네트워크 사용량 — downloadProgress UI 필수 연결`.

---

### Phase 4: 차원 마이그레이션 로직 (자동 재인덱싱)

**목표**: backend 전환 및 신규 사용자 기본값 설정 시 embeddings 의 dimension 불일치를 감지하고 재인덱싱한다.

**RED**

- `ragStore.setBackend.test.ts`:
  - `setBackend('transformers')` 호출 시:
    - storage `rag-settings` 에 `backend: 'transformers'` 저장.
    - `getProvider('transformers').preload` 호출됨.
    - `embeddingStore.clearAll` 호출됨.
    - 모든 bookmark linkId 가 `enqueueIndex` 에 주입됨.
    - `reindexing === true` 설정, 완료 후 false 복원.
  - `setBackend('ollama')` from `'transformers'`: 역방향 전환도 동일 절차.
  - `setBackend` 가 현재 backend 와 동일하면 NO-OP (재인덱싱 트리거 X).
- `ragStore.loadSettings.backend-default.test.ts`:
  - `rag-settings` 에 backend 필드 없음 + `rag-embeddings` 에 데이터 있음 → `backend = 'ollama'` (REQ-006).
  - `rag-settings` 에 backend 필드 없음 + `rag-embeddings` 비어있음 → `backend = 'transformers'`.
  - `rag-settings.backend = 'transformers'` 있음 → 그 값 사용.
- `ragStore.dimension-mismatch.test.ts`:
  - embeddings 에 dimension=384 벡터 존재 + provider.dimension=768 → 재인덱싱 트리거.
  - dimension 동일하지만 model 다름 → 재인덱싱 트리거 (안전).
  - dimension & model 동일 → NO-OP.
- `App.tsx initRag chain.test.ts` (통합):
  - 앱 초기화 시 loadSettings → preload → dimension check → (필요시) 재인덱싱 순서로 진행.

**GREEN**

- `ragStore.setBackend(newBackend)` 액션 구현:
  ```ts
  setBackend: async (newBackend) => {
    const current = get().backend
    if (newBackend === current) return
    const provider = getProvider(newBackend)
    set({ backend: newBackend, reindexing: true })
    persistSettings({ ...settings, backend: newBackend })
    await provider.preload?.((pct) => set({ downloadProgress: pct }))
    set({ downloadProgress: null })
    const { clearAll, enqueueIndex, runIndexBatch } = useEmbeddingStore.getState()
    await clearAll()
    const allLinkIds = useBookmarkStore.getState().bookmarks.map(b => b.id) // or flatten from categories
    enqueueIndex(allLinkIds)
    set({ reindexProgress: { done: 0, total: allLinkIds.length } })
    await runIndexBatch() // drain은 내부에서 반복
    set({ reindexing: false, reindexProgress: null })
  }
  ```
- `ragStore.loadSettings` 확장: backend 필드 로드 + REQ-006 로직.
- `App.tsx` initRag 체인 확장:
  - `ragStore.loadSettings()` 직후 `checkDimensionMismatch()` 유틸 호출.
  - 불일치 시 `ragStore.setBackend(get().backend)` 를 내부적으로 트리거하거나 동등한 재인덱싱 drain 호출.
- `runIndexBatch` drain 진행률을 `ragStore.reindexProgress` 에 반영 (embeddingStore → ragStore 역방향 호출은 피하고, ragStore 가 polling 또는 subscribe).

**REFACTOR**

- 재인덱싱 절차를 `reindexAll(provider)` 유틸 함수로 추출 (setBackend 와 dimension-mismatch 감지 양쪽에서 재사용).
- `checkDimensionMismatch(provider, embeddings): boolean` 순수 함수 추출 + 단위 테스트.
- `runIndexBatch` 진행률 노출을 위해 embeddingStore 에 `indexingProgress` 계산 property 추가 (기존 `lastBatchProgress` 확장).

**검증**: REQ-006, REQ-008, REQ-009, REQ-010, REQ-014 (backend 전환 경로)

**MX 태그**:
- `ragStore.ts` setBackend 함수 상단: `@MX:NOTE: [AUTO] 차원 전환 시 전체 재인덱싱 — SPEC-SEARCH-RAG-004 REQ-009`.
- `App.tsx` initRag 체인: `@MX:NOTE: [AUTO] dimension mismatch 검사 — SPEC-SEARCH-RAG-004 REQ-008`.

---

### Phase 5: UI 통합 (RagStatusBadge 4상태 + Settings 드롭다운 + ProgressToast 확장)

**목표**: 사용자 체감 기능 완성 — 배지 파랑 상태, 설정 드롭다운, 전환 확인, informational 정보 노출.

**RED**

- `RagStatusBadge.test.tsx` 확장:
  - `providerHealthDetail === 'ready'` → 녹색 "RAG 준비됨".
  - `backend === 'ollama' && !ollamaAvailable` → 빨강 "Ollama 미탐지".
  - `backend === 'ollama' && modelMissing` → 노랑 "모델 누락".
  - `backend === 'transformers' && providerHealthDetail === 'downloading' && downloadProgress === 42` → 파랑 "RAG 모델 다운로드 중 (42%)".
  - `backend === 'transformers' && providerHealthDetail === 'error'` → 빨강 "브라우저 모델 로드 실패" + 재시도 버튼.
  - `reindexing === true` → 파랑 "RAG 모델 전환 중 (done/total)".
  - 배지 툴팁에 현재 backend 표기 ("Ollama · 384" / "Transformers · 768").
- `SidebarSettings.backend.test.tsx`:
  - backend 드롭다운 렌더 + 현재 값 표시.
  - 드롭다운 변경 → 인라인 확인 UI 렌더 ("재인덱싱이 시작됩니다. 계속?").
  - 확인 클릭 → `ragStore.setBackend` 호출 spy.
  - 취소 클릭 → drop-down 복원, setBackend 호출 안 함.
  - informational 텍스트: 현재 model, dimension, device 표기 (각 spec 값).
- `ProgressToast.test.tsx` 확장:
  - variant `'reindex'` + `reindexProgress: { done: 3, total: 10 }` → "RAG 모델 전환 중... 3/10" 렌더.
  - 기존 variant `'indexing'` 동작 유지 (회귀 없음).
- `CommandPalette.rag-backend.test.tsx`:
  - backend 전환 중(`reindexing === true`) + 쿼리 입력 → RAG 섹션 숨김 유지 (REQ-010).
  - 전환 완료 후 쿼리 입력 → 새 provider 로 검색 정상 동작.

**GREEN**

- `src/renderer/components/CommandPalette/RagStatusBadge.tsx` 수정:
  - 4상태 분기 함수 `resolveStatus(state): StatusVariant` 도입.
  - `StatusVariant = 'ready' | 'model-missing' | 'error-ollama' | 'error-transformers' | 'downloading' | 'reindexing'`.
  - 파랑 색상 토큰 추가 (`--color-info` 등 기존 토큰 재사용 가능한 경우 재사용).
  - 툴팁 컴포넌트에 backend · dimension · model 정보 포함.
- `src/renderer/components/PivotLayout/SidebarSettings.tsx` 수정:
  - RAG 섹션에 backend `<select>` 추가 (옵션: Ollama, Browser).
  - `onChange` 에서 임시 상태 `pendingBackend` 저장 + 인라인 확인 UI 렌더.
  - "확인" → `ragStore.setBackend(pendingBackend)` 호출.
  - 현재 provider 의 informational 텍스트 렌더 (`model`, `dimension`, `device`).
- `src/renderer/components/ProgressToast/ProgressToast.tsx` 수정:
  - `variant?: 'indexing' | 'reindex'` prop 추가. 메시지만 분기.
  - App 레벨에서 `ragStore.reindexing === true` 시 reindex variant 렌더.
- `src/renderer/components/CommandPalette/CommandPalette.tsx` 확인:
  - 기존 `ragStore.search` 호출 경로가 `reindexing` 중에는 빈 배열 반환함을 활용. 추가 UI 변경은 배지로 충분.
- `README.md` RAG 섹션 업데이트:
  - "Browser backend (기본)": 설치 불필요, 최초 137MB 다운로드.
  - "Ollama backend (선택)": 설치 가이드는 SPEC-001 섹션 재활용.
  - 전환 절차 문서화.

**REFACTOR**

- 배지 상태 분기 로직을 `resolveBadgeStatus(ragState): BadgeDescriptor` 순수 함수로 추출 + 단위 테스트. UI 컴포넌트는 descriptor 만 렌더.
- Settings 인라인 확인 UI 를 `ConfirmInline` 재사용 컴포넌트로 (다른 설정에도 적용 가능).
- Transformers 다운로드 실패 시 재시도 버튼 → `ragStore.retryPreload()` 액션 신설 (provider.preload 재호출).

**검증**: REQ-011, REQ-012, REQ-013, REQ-014, REQ-015, REQ-017 (SPEC-002 호환 확인 포함)

**MX 태그**:
- `RagStatusBadge.tsx`: 기존 `@MX:SPEC: SPEC-SEARCH-RAG-001` 옆에 `SPEC-SEARCH-RAG-004` 추가 병기.
- `SidebarSettings.tsx` RAG 섹션: `@MX:NOTE: [AUTO] backend 드롭다운 + 전환 확인 — SPEC-SEARCH-RAG-004 REQ-013/014`.
- `ProgressToast.tsx`: 기존 SPEC-001 태그 유지 + `@MX:NOTE: [AUTO] reindex variant — SPEC-SEARCH-RAG-004`.

---

## 파일 변경 범위 추정

### 신규 (10개)

1. `src/renderer/lib/embeddingProvider.ts`
2. `src/renderer/lib/providers/ollamaProvider.ts` + `.test.ts`
3. `src/renderer/lib/providers/transformersProvider.ts` + `.test.ts`
4. `src/renderer/lib/providers/deviceDetection.ts` + `.test.ts`
5. `src/renderer/lib/providerFactory.ts` + `.test.ts`
6. `src/renderer/stores/ragStore.backend.test.ts` (신규 테스트 파일 — backend 전환 전용)
7. `src/renderer/stores/ragStore.dimension-mismatch.test.ts`

### 수정 (8개)

1. `src/renderer/stores/ragStore.ts` — provider 추상화, 신규 상태(backend/downloadProgress/reindexing), setBackend 액션
2. `src/renderer/stores/embeddingStore.ts` — runIndexBatch provider 주입, BookmarkEmbedding.model/dimension 기록
3. `src/renderer/components/CommandPalette/RagStatusBadge.tsx` — 파랑 `downloading`/`reindexing` 상태 + 툴팁
4. `src/renderer/components/ProgressToast/ProgressToast.tsx` — reindex variant
5. `src/renderer/components/PivotLayout/SidebarSettings.tsx` — backend 드롭다운 + informational
6. `src/renderer/App.tsx` — initRag 체인 확장 (preload + dimension 검사)
7. `package.json` — `@huggingface/transformers` 의존성
8. `README.md` — RAG 섹션 업데이트 (Browser / Ollama 공존)

## MX 태그 계획 (요약)

| 파일 | 태그 | 용도 |
|------|------|------|
| `embeddingProvider.ts` | @MX:NOTE + @MX:SPEC | 인터페이스 도입 |
| `ollamaProvider.ts` | @MX:NOTE + @MX:SPEC | SPEC-001 회귀 방지 |
| `transformersProvider.ts` | @MX:ANCHOR + @MX:REASON + @MX:WARN + @MX:SPEC | fan_in >= 3 + 137MB 다운로드 경고 |
| `providerFactory.ts` | @MX:ANCHOR + @MX:REASON + @MX:SPEC | 모든 embed 경로 진입점 |
| `deviceDetection.ts` | @MX:NOTE + @MX:SPEC | WebGPU/WASM 감지 |
| `ragStore.ts` | 기존 @MX:ANCHOR 갱신 + @MX:SPEC 병기 | backend 상태 + setBackend |
| `App.tsx` initRag | @MX:NOTE + @MX:SPEC | dimension 검사 체인 |
| `RagStatusBadge.tsx` | @MX:SPEC 병기 | 4상태 분기 |
| `SidebarSettings.tsx` | @MX:NOTE + @MX:SPEC | backend 드롭다운 |

## 리스크 & 완화 방안

| 리스크 | 심각도 | 완화 |
|--------|--------|------|
| ragStore/embeddingStore 리팩터로 인한 SPEC-001 회귀 | High | Phase 1-2 에서 provider 도입 시 기존 동작 보존을 RED 테스트로 선검증. CI 에서 기존 SPEC-001 테스트 스위트 100% 유지 확인. |
| `@huggingface/transformers` 번들 크기 폭증 (NFR-001 위반) | High | Dynamic import 로 Ollama 사용자 초기 번들에서 제외. `vite` 빌드 후 실측 검증 (bundle analyzer). 5MB 초과 시 Phase 3 전에 재설계. |
| WebGPU 감지가 특정 환경에서 오탐 (있다고 했는데 실제로는 실패) | Medium | `requestAdapter()` 결과뿐 아니라 실제 small test tensor 를 한 번 실행해 WASM 폴백 판단. 실패 시 자동 폴백하되 사용자에게 informational 로 표시. |
| 137MB 다운로드가 사용자 대기 경험 저하 | Medium | DownloadProgress 를 배지에 상시 표시 + 다른 기능은 정상 동작 유지. README 에 "첫 실행 시 수십 초 대기" 명시. |
| 차원 전환 시 사용자가 수많은 북마크로 긴 재인덱싱 대기 | Medium | ProgressToast 로 진행률 표시 + 이탈해도 백그라운드 drain 계속. 재시작 후 이어서 처리 (SPEC-001 AC-011 패턴 재활용). |
| Transformers.js progress_callback 스펙 변동 | Medium | `computeAggregateProgress` 순수 함수로 추출해 단위 테스트에서 입력 shape 다양성 커버. 상위 버전 업그레이드 시 이 함수만 수정. |
| `indexCompletedTodos` 등 SPEC-002 설정과 `backend` 전환이 동시 발생 | Low | ragStore 설정 변경 트리거는 `setBackend` 가 독점 (대량 enqueue 진행 중에는 다른 설정 변경 비활성 UX). |
| 사용자가 backend 전환 도중 앱 종료 → 부분 재인덱싱 상태로 재시작 | Low | dimension 검사 (REQ-008) 가 앱 기동마다 실행됨. 남은 누락 북마크는 자동 enqueue (SPEC-001 기존 패턴). |
| IndexedDB 쿼터 초과 (브라우저별 상이) | Low | Transformers.js 기본 캐시는 대부분 환경에서 충분. 오류 발생 시 HealthStatus `'error'` + errorMessage 로 사용자에게 안내. |
| macOS/Windows 간 WebGPU 성능 차이 | Low | NFR-002 는 "중급" 하드웨어 기준 명시. 성능 극저조 시 사용자 수동 Ollama 전환 권장 (README). |

## 구현 순서 근거

1. **인터페이스 & Ollama 래퍼 먼저 (Phase 1)**: 이후 Phase 의 모든 변경이 `EmbeddingProvider` 에 의존하므로 계약을 먼저 잠근다. 이 단계는 외부 동작 변화 0.
2. **ragStore/embeddingStore 통합 (Phase 2) 을 Transformers 구현 전에**: 통합 리팩터가 먼저 안정되어야 Transformers 가 붙는 단일 엔드포인트가 확보된다. Transformers 는 Phase 2 까지의 경로를 그대로 재사용.
3. **Transformers 구현 (Phase 3) 은 실제 다운로드/WebGPU 가 얽힌 가장 복잡한 단위**: 앞서 안정된 factory 에 꽂기만 하면 되므로 변경 범위 명확.
4. **차원 마이그레이션 (Phase 4) 은 Transformers 실체가 있어야 end-to-end 검증 가능**: Phase 3 의 산출물을 factory 로 얻어 dimension 이 실제로 384 vs 768 로 갈라지는지 확인.
5. **UI (Phase 5) 마지막**: 데이터 파이프라인이 안정된 뒤에야 4상태 배지의 분기가 모두 자연스럽게 만들어진다.

## Run Phase 착수 전 확인 사항

- [x] 설계 결정 DEC-001 ~ DEC-008 확정 (2026-04-20)
- [x] spec.md · plan.md · acceptance.md 작성 완료
- [ ] `npm install @huggingface/transformers` 로컬 사전 검증 (번들 크기 실측)
- [ ] `navigator.gpu` API 접근 가능 확인 (Electron, Chrome, Safari)
- [ ] SPEC-SEARCH-RAG-002 머지 상태 확인 (머지되어 있으면 GenericEmbedding 타입 사용, 미머지면 임시 alias)
- [ ] `/moai run SPEC-SEARCH-RAG-004` 실행 준비

## 작업 로그

### 2026-04-20 (Plan 작성)

- Socratic 인터뷰 4문 완료 (공존 전략 · 기본값 · 모델 선택 · 차원 전환).
- spec.md 완성 (17 REQ + 5 NFR + 12 exclusions + 8 design decisions).
- acceptance.md 완성 (37 AC + 4 E2E 시나리오 + 5 엣지 케이스).
- plan.md 완성 (5 Phase + MX 계획 + 10 리스크).
