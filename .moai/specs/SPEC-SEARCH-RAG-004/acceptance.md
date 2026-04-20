# Acceptance Criteria — SPEC-SEARCH-RAG-004

## 수락 기준 (AC) 체크리스트

### A. 어댑터 인터페이스

- **AC-001**: `EmbeddingProvider` 인터페이스는 `name`, `dimension`, `model`, `checkHealth`, `embed` 다섯 필수 필드를 가지며 TypeScript strict 에서 타입 오류 없이 구현 가능하다.
- **AC-002**: `HealthStatus.detail` 유니온은 6개 값(`'ready' | 'not-installed' | 'model-missing' | 'downloading' | 'loading' | 'error'`)을 정확히 포함한다.
- **AC-003**: `EmbeddingProvider` 의 `preload`, `dispose` 는 optional 이며 미구현 시에도 인터페이스 만족이 가능하다.
- **AC-004**: `providerFactory.getProvider('ollama')` 반복 호출은 동일 `OllamaEmbeddingProvider` 인스턴스를 반환한다 (싱글톤).
- **AC-005**: `providerFactory.getProvider('transformers')` 반복 호출은 동일 `TransformersEmbeddingProvider` 인스턴스를 반환한다 (싱글톤).

### B. OllamaEmbeddingProvider 회귀 없음

- **AC-006**: `new OllamaEmbeddingProvider()` 의 상수는 `name === 'ollama'`, `dimension === 384`, `model === 'nomic-embed-text'` 이다.
- **AC-007**: `provider.checkHealth()` 는 내부적으로 `ollamaClient.checkHealth` + `ollamaClient.listModels` 를 호출하며 `HealthStatus` 를 올바르게 매핑한다 (fetch mock 검증).
- **AC-008**: `provider.embed(text)` 의 결과는 기존 `ollamaClient.embed(text)` 결과와 바이트 단위로 동일하다 (길이 384 float 배열).
- **AC-009**: `ollamaClient.ts` 파일은 Phase 1-5 전 과정에서 본문이 변경되지 않는다 (git diff 기준 0 라인 수정).
- **AC-010**: Ollama backend 가 활성일 때 SPEC-SEARCH-RAG-001 의 AC-001 ~ AC-039 전체가 통과 상태를 유지한다 (회귀 0).

### C. TransformersEmbeddingProvider

- **AC-011**: `new TransformersEmbeddingProvider()` 의 상수는 `name === 'transformers'`, `dimension === 768`, `model === 'Xenova/nomic-embed-text-v1.5'` 이다.
- **AC-012**: `provider.preload(cb)` 호출은 `@huggingface/transformers` 의 `pipeline('feature-extraction', 'Xenova/nomic-embed-text-v1.5', { device, dtype: 'fp32' })` 을 정확히 1회 호출한다 (dedupe).
- **AC-013**: `preload` 동작 중 `progress_callback` 이 여러 번 발화될 때, 제공한 cb 는 0 부터 100 사이의 누적 진행률 pct 를 단조 증가로 받는다 (weighted aggregate).
- **AC-014**: WebGPU 감지 성공 → `device: 'webgpu'`, 실패 또는 `navigator.gpu` 미존재 → `device: 'wasm'` 으로 자동 폴백한다.
- **AC-015**: extractor 가 로드되지 않은 상태에서 `embed('hello')` 를 호출하면 내부에서 자동으로 `preload()` 를 트리거한 뒤 임베딩을 반환한다 (lazy init).
- **AC-016**: `provider.embed('안녕')` 는 `{ pooling: 'mean', normalize: true }` 옵션으로 extractor 를 호출하고 길이 768 의 float 배열을 반환한다.
- **AC-017**: `provider.checkHealth()` 는 내부 state 기반 분기만 수행하며 네트워크 호출을 발생시키지 않는다. extractor 준비됨 → `{ detail: 'ready', available: true }`, 로딩 중 + progress 50 → `{ detail: 'downloading', downloadProgress: 50 }`, 초기화 실패 → `{ detail: 'error', errorMessage }`.
- **AC-018**: `@huggingface/transformers` 는 dynamic import 로만 로드되며 Ollama backend 사용자가 앱을 기동해도 해당 chunk 는 네트워크에서 다운로드되지 않는다 (Vite bundle analyzer 기준).

### D. Provider 전환 & 재인덱싱

- **AC-019**: `rag-settings` 에 `backend` 필드 미존재 + `rag-embeddings` 미존재(완전 신규 설치) → 기본값 `'transformers'` 로 초기화된다.
- **AC-020**: `rag-settings` 에 `backend` 필드 미존재 + `rag-embeddings` 존재(SPEC-001 사용자) → 기본값 `'ollama'` 로 초기화된다 (파괴적 업그레이드 금지).
- **AC-021**: 저장된 `rag-settings.backend` 값이 있으면 해당 값이 그대로 사용된다 (`'ollama'` 또는 `'transformers'`).
- **AC-022**: `ragStore.setBackend(new)` 호출 시: (1) storage 에 새 backend 저장, (2) 새 provider.preload 호출, (3) `embeddingStore.clearAll()`, (4) 모든 북마크 `enqueueIndex`, (5) `runIndexBatch` drain, (6) 완료 후 `reindexing === false` 가 순서대로 발생한다.
- **AC-023**: `setBackend` 를 현재 backend 와 동일 값으로 호출하면 NO-OP (재인덱싱 트리거되지 않음).
- **AC-024**: embeddings 에 dimension=384 벡터 존재 + 활성 provider.dimension=768 → 앱 초기화 시 자동 재인덱싱 트리거 (REQ-008/009).
- **AC-025**: embeddings dimension=provider.dimension 이지만 `model` 문자열이 다름 → 안전을 위해 재인덱싱 트리거.

### E. 재인덱싱 중 검색 비활성화

- **AC-026**: `reindexing === true` 인 동안 `ragStore.search(query)` 는 빈 배열을 반환한다.
- **AC-027**: 재인덱싱 drain 완료 후 `reindexing === false` 로 복원되고 `search` 는 새 provider 로 정상 동작한다.

### F. 상태 배지 (4상태)

- **AC-028**: `providerHealthDetail === 'ready'` + `reindexing === false` → 녹색 "RAG 준비됨" 배지.
- **AC-029**: `backend === 'ollama'` + `ollamaAvailable === false` → 빨강 "Ollama 미탐지 — 설치 가이드" 배지.
- **AC-030**: `backend === 'ollama'` + `modelMissing === true` → 노랑 "모델 누락 — `ollama pull nomic-embed-text`" 배지.
- **AC-031**: `backend === 'transformers'` + `providerHealthDetail === 'downloading'` + `downloadProgress === 42` → 파랑 "RAG 모델 다운로드 중 (42%)" 배지.
- **AC-032**: `backend === 'transformers'` + `providerHealthDetail === 'error'` → 빨강 "브라우저 모델 로드 실패" 배지 + 재시도 버튼 가시.
- **AC-033**: `reindexing === true` → 파랑 "RAG 모델 전환 중 (N/M)" 배지.
- **AC-034**: 배지 툴팁은 항상 현재 backend · dimension · model 정보를 표시한다 (예: "Ollama · 384 · nomic-embed-text").

### G. 설정 UI

- **AC-035**: Settings RAG 섹션에 backend `<select>` 가 렌더되며 옵션은 "Ollama (로컬 서버)" 와 "Browser (WebGPU/WASM)" 두 개이다.
- **AC-036**: 드롭다운 값 변경 → 인라인 확인 UI ("전체 북마크를 새 모델로 재인덱싱합니다. 계속?") 가 나타나며 `setBackend` 는 확인 후에만 호출된다.
- **AC-037**: 확인 UI 취소 시 드롭다운은 이전 값으로 복원되고 storage 에 기록되지 않는다.
- **AC-038**: Settings RAG 섹션에 현재 활성 `model` (예: "Xenova/nomic-embed-text-v1.5 · 768차원") 과 `device` (예: "WebGPU" 또는 "WASM") 가 informational 로 렌더된다.
- **AC-039**: SPEC-001 의 `rag.enabled` 토글 및 `similarityThreshold` 슬라이더는 변경 없이 유지되고 정상 동작한다.

### H. 품질 & 품질 게이트

- **AC-040**: 신규 코드 커버리지 85% 이상 (vitest 기준).
- **AC-041**: TypeScript strict 에서 신규 오류 0 건.
- **AC-042**: ESLint 신규 오류 0 건.
- **AC-043**: Ollama backend 로 설정된 상태에서 SPEC-001 전체 테스트 스위트 100% 통과 (회귀 0).
- **AC-044**: SPEC-SEARCH-RAG-002 가 머지되어 있다면 그 테스트 스위트도 100% 통과 (GenericEmbedding.kind 는 provider 와 독립 동작).

## 테스트 시나리오 (E2E)

### T-001: 신규 유저 첫 사용 (Zero-Install Happy Path)

1. 앱을 완전 신규 상태로 설치 (localStorage/electron-store 비어있음).
2. 앱 시작 → `rag-embeddings` 없음 → 기본 backend = `'transformers'` (AC-019).
3. Command Palette 상단에 파랑 "RAG 모델 다운로드 중 (0%)" 배지 표시.
4. 네트워크로 137MB 다운로드 진행 → progress 배지가 10% → 42% → 80% → 100% 로 단조 증가 (AC-013).
5. 다운로드 완료 → 배지 녹색 "RAG 준비됨" 전환.
6. 북마크 3개 추가 → 자동 배치 인덱싱 → ProgressToast "3/3 인덱싱 완료" 표시.
7. `Cmd+K` → "디자인 도구" 4자 이상 입력 → RAG 결과 상위 노출.
8. 엔터로 이동 정상 동작.

### T-002: 기존 Ollama 사용자 업데이트 경로 (회귀 0)

1. SPEC-001 버전 앱에서 북마크 20개 + 로컬 임베딩 20개 존재 상태.
2. 본 SPEC-004 가 포함된 버전으로 업데이트.
3. 앱 시작 → `rag-embeddings` 존재 확인 → backend 기본값 = `'ollama'` (AC-020).
4. `RagStatusBadge` 는 기존과 동일 녹색/노랑/빨강 3상태로 작동.
5. 기존 20개 임베딩 그대로 사용 가능 (재인덱싱 트리거 없음).
6. 검색 동작 SPEC-001 과 완전 동일.
7. 설정 화면에서 현재 backend 가 "Ollama · 384 · nomic-embed-text" 로 informational 표시됨 (AC-038).

### T-003: Ollama → Browser 수동 전환 + 자동 재인덱싱

1. Ollama backend + 북마크 50개 + 임베딩 50개 (384 dim) 상태.
2. Settings → RAG → backend 드롭다운 → "Browser" 선택.
3. 인라인 확인 UI 등장 ("전체 북마크를 새 모델로 재인덱싱합니다. 계속?") — AC-036.
4. 확인 → storage 에 `backend: 'transformers'` 저장.
5. 파랑 배지 "RAG 모델 다운로드 중" → 137MB 다운로드.
6. 다운로드 완료 → `clearAll()` 으로 기존 50개 임베딩 삭제.
7. 50개 북마크 전부 enqueue → runIndexBatch drain → ProgressToast "RAG 모델 전환 중... N/50".
8. 완료 후 배지 녹색 "RAG 준비됨", 새 768-dim 임베딩 50개 저장됨.
9. 검색 입력 → Transformers provider 경유 정상 결과.

### T-004: WebGPU 없는 환경 WASM 폴백

1. `navigator.gpu` 가 undefined 인 환경 (예: 구형 Chrome, Linux 특정 환경).
2. Transformers backend 선택 상태에서 앱 시작.
3. `detectDevice()` → `'wasm'` 반환 (AC-014).
4. pipeline 이 WASM backend 로 초기화 → 정상 동작 (속도는 느림).
5. Settings informational 에 "Device: WASM" 표시 (AC-038).
6. 검색 응답 < 1000ms 유지 (NFR-002 WASM 기준).

## 엣지 케이스

- **EC-001**: 다운로드 중 네트워크 단절 → Transformers preload 실패 → 빨강 "브라우저 모델 로드 실패" 배지 + 재시도 버튼. 사용자가 재시도 클릭 → 이어받기 또는 재시작 (Transformers.js 캐시 동작에 따름).
- **EC-002**: 다운로드 도중 앱 종료 → 재시작 시 IndexedDB 부분 캐시 상태에서 preload 재시도. Transformers.js 내부 로직이 부분 다운로드 재개를 지원하는 경우 그대로 동작, 아니면 재다운로드.
- **EC-003**: 사용자가 backend 전환 도중 앱 종료 → 재시작 시 `rag-settings.backend` 는 이미 새 값으로 저장되어 있음 → dimension 검사로 재인덱싱이 다시 시작되어 완성됨.
- **EC-004**: IndexedDB 쿼터 초과 → Transformers preload 실패 → HealthStatus `'error'` + `errorMessage` 에 "저장 공간 부족" 명시 → Settings 에서 Ollama 로 전환 권장.
- **EC-005**: 사용자가 동일한 backend 값으로 드롭다운 변경 (실수로 같은 값 선택) → 인라인 확인 UI 는 렌더되지 않거나 NO-OP (AC-023) → 재인덱싱 트리거되지 않음.

## 완료 정의 (Definition of Done)

- [ ] AC-001 ~ AC-044 모두 통과
- [ ] T-001 ~ T-004 자동화 (Vitest + RTL + mock transformers pipeline)
- [ ] 수동 테스트: 실제 네트워크 환경에서 T-001 (신규 유저) 전 시나리오 확인
- [ ] 수동 테스트: Electron 빌드에서 T-003 (전환 + 재인덱싱) 확인
- [ ] 수동 테스트: Safari 웹 빌드에서 WASM 폴백 확인 (T-004)
- [ ] TypeScript strict 0 오류, ESLint 0 오류
- [ ] 신규 코드 커버리지 85% 이상
- [ ] SPEC-001 기존 전체 테스트 100% 통과
- [ ] `@huggingface/transformers` 추가 후 vite bundle analyzer 로 초기 번들 증가 < 5MB (gzip) 확인
- [ ] README 에 "RAG Backend 선택" 섹션 업데이트 (Browser 기본 + Ollama 선택)
- [ ] `@MX:SPEC: SPEC-SEARCH-RAG-004` 태그 신규 파일 및 주요 변경 파일에 부착
