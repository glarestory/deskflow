// @MX:NOTE: [AUTO] 북마크 임베딩 도메인 타입
// @MX:SPEC: SPEC-SEARCH-RAG-001

/**
 * BookmarkEmbedding — 단일 북마크 링크의 벡터 임베딩 레코드.
 *
 * REQ-008: /users/{uid}/embeddings/{linkId} Firestore 서브컬렉션 경로
 * REQ-009: 미인증 시 'rag-embeddings' 로컬 스토리지 키에 배열로 저장
 */
export interface BookmarkEmbedding {
  /** 임베딩 대상 Link.id */
  linkId: string
  /** 소속 Category.id */
  categoryId: string
  /** 임베딩 소스 텍스트의 SHA-256 hex (변경 감지용) */
  contentHash: string
  /** float 벡터 (nomic-embed-text: 384 차원) */
  embedding: number[]
  /** 벡터 차원 수 — 버전 업그레이드 대비 명시 */
  dimension: number
  /** 사용된 임베딩 모델명 */
  model: string
  /** 임베딩 생성 시각 (ISO-8601) */
  embeddedAt: string
}
