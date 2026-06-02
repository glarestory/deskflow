// @MX:NOTE: [AUTO] FeedWidget — RSS 피드 위젯 (피드별 탭 UI + 지연 로딩 + cap UX + ARIA tablist)
// @MX:SPEC: SPEC-WIDGET-003, SPEC-UX-009, SPEC-UX-013
import { useState, useRef, useCallback } from 'react'
import { useFeedStore } from '../../stores/feedStore'
// REQ-UX-009-003: 위젯 핸들 슬롯 컴포넌트
import { DragHandleSlot } from '../common/DragHandleSlot'
import { useEditMode } from '../../stores/editModeStore'

// ─── 상대 날짜 포맷 헬퍼 ────────────────────────────────────────────────

/** 발행일을 한국어 상대 날짜로 변환 (오늘, 어제, N일 전) */
function formatRelativeDate(pubDate: string): string {
  const date = new Date(pubDate)
  if (isNaN(date.getTime())) return ''

  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return '오늘'
  if (diffDays === 1) return '어제'
  return `${diffDays}일 전`
}

// ─── 컴포넌트 ────────────────────────────────────────────────────────────

export default function FeedWidget(): JSX.Element {
  // REQ-UX-009-003: 편집 모드 상태 — 핸들 슬롯 tabIndex 제어
  const { isEditing } = useEditMode()
  const {
    feeds,
    articlesByFeed,
    statusByFeed,
    activeFeedId,
    addFeed,
    removeFeed,
    setActiveFeed,
    refreshActiveFeed,
  } = useFeedStore()

  const [showAddForm, setShowAddForm] = useState(false)
  const [inputUrl, setInputUrl] = useState('')
  const [isAdding, setIsAdding] = useState(false)

  // REQ-UX-013-016: 탭 ref 배열 — roving tabindex 포커스 관리
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])

  const atCap = feeds.length >= 5

  const handleAddFeed = async (): Promise<void> => {
    if (atCap) return
    const trimmed = inputUrl.trim()
    if (!trimmed) return

    setIsAdding(true)
    await addFeed(trimmed)
    setIsAdding(false)
    setInputUrl('')
    setShowAddForm(false)
  }

  const handleRefresh = (): void => {
    void refreshActiveFeed()
  }

  const handleArticleClick = (link: string): void => {
    // REQ-003: 기사 링크를 기본 브라우저에서 열기
    window.open(link, '_blank')
  }

  // REQ-UX-013-016: 탭 화살표 키 내비게이션 (automatic activation + roving tabindex)
  const handleTabKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLButtonElement>, currentIndex: number) => {
      let nextIndex: number | null = null

      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault()
        nextIndex = (currentIndex + 1) % feeds.length
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault()
        nextIndex = (currentIndex - 1 + feeds.length) % feeds.length
      } else if (e.key === 'Home') {
        e.preventDefault()
        nextIndex = 0
      } else if (e.key === 'End') {
        e.preventDefault()
        nextIndex = feeds.length - 1
      }

      if (nextIndex !== null && nextIndex !== currentIndex) {
        // automatic activation: 포커스 이동 즉시 탭 선택
        const nextFeed = feeds[nextIndex]
        if (nextFeed) {
          setActiveFeed(nextFeed.id)
          tabRefs.current[nextIndex]?.focus()
        }
      }
    },
    [feeds, setActiveFeed],
  )

  // 현재 활성 탭의 기사 목록
  const activeArticles = activeFeedId !== null ? (articlesByFeed[activeFeedId] ?? []) : []
  const activeStatus = activeFeedId !== null ? statusByFeed[activeFeedId] : null

  return (
    <div
      style={{
        background: 'var(--card-bg)',
        borderRadius: 16,
        padding: '18px 20px',
        border: '1px solid var(--border)',
        height: '100%',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      {/* 헤더 — REQ-UX-013-018: DragHandleSlot level="widget" 보존 (SPEC-UX-009) */}
      <div
        className="widget-drag-handle"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'grab',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <DragHandleSlot
            level="widget"
            ariaLabel="위젯 이동: 뉴스 피드"
            isEditing={isEditing}
          />
          <span
            style={{
              fontWeight: 700,
              fontSize: 15,
              color: 'var(--text-primary)',
            }}
          >
            뉴스 피드
          </span>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {/* REQ-UX-013-012: 새로고침 — 활성 탭 재요청 + 나머지 stale */}
          <button
            data-testid="refresh-feeds-btn"
            onClick={handleRefresh}
            disabled={activeStatus === 'loading'}
            title="피드 새로고침"
            style={{
              background: 'none',
              border: '1px solid var(--border)',
              borderRadius: 8,
              padding: '4px 10px',
              fontSize: 12,
              color: 'var(--text-muted)',
              cursor: activeStatus === 'loading' ? 'not-allowed' : 'pointer',
              opacity: activeStatus === 'loading' ? 0.5 : 1,
            }}
          >
            새로고침
          </button>
          {/* REQ-UX-013-002: cap 도달 시 추가 버튼 비활성 */}
          <button
            data-testid="add-feed-btn"
            onClick={() => {
              if (!atCap) setShowAddForm((prev) => !prev)
            }}
            disabled={atCap}
            title={atCap ? '피드는 최대 5개까지 추가할 수 있습니다' : '피드 추가'}
            style={{
              background: 'none',
              border: '1px solid var(--border)',
              borderRadius: 8,
              padding: '4px 10px',
              fontSize: 12,
              color: atCap ? 'var(--text-muted)' : 'var(--text-muted)',
              cursor: atCap ? 'not-allowed' : 'pointer',
              opacity: atCap ? 0.5 : 1,
            }}
          >
            + 추가
          </button>
        </div>
      </div>

      {/* REQ-UX-013-002: cap 안내 메시지 */}
      {atCap && (
        <div
          style={{
            fontSize: 12,
            color: 'var(--text-muted)',
            padding: '4px 0',
          }}
        >
          피드는 최대 5개까지 추가할 수 있습니다
        </div>
      )}

      {/* 피드 URL 입력 폼 (cap 미도달 시) */}
      {showAddForm && !atCap && (
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="url"
            placeholder="RSS URL을 입력하세요 (예: https://...)"
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void handleAddFeed()
            }}
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: 8,
              border: '1px solid var(--border)',
              background: 'var(--link-bg)',
              color: 'var(--text-primary)',
              fontSize: 13,
            }}
          />
          <button
            onClick={() => void handleAddFeed()}
            disabled={isAdding || !inputUrl.trim()}
            style={{
              padding: '8px 14px',
              borderRadius: 8,
              border: '1px solid var(--border)',
              background: 'var(--accent)',
              color: '#fff',
              fontSize: 13,
              cursor: isAdding ? 'not-allowed' : 'pointer',
              opacity: isAdding ? 0.6 : 1,
            }}
          >
            {isAdding ? '...' : '추가'}
          </button>
        </div>
      )}

      {/* REQ-UX-013-015: 빈 상태 (피드 0개) */}
      {feeds.length === 0 && (
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-muted)',
            fontSize: 13,
          }}
        >
          피드를 추가해주세요
        </div>
      )}

      {/* REQ-UX-013-004/016: 탭 바 — role=tablist, 피드 1개 이상일 때 렌더 */}
      {feeds.length > 0 && (
        <>
          {/* 탭 바 (가로 스크롤로 셀 밖 넘침 방지) */}
          <div
            role="tablist"
            aria-label="뉴스 피드 탭"
            style={{
              display: 'flex',
              overflowX: 'auto',
              gap: 4,
              // 스크롤바 숨김 (macOS 기본)
              scrollbarWidth: 'none',
              flexShrink: 0,
            }}
          >
            {feeds.map((feed, index) => {
              const selected = feed.id === activeFeedId
              const feedStatus = statusByFeed[feed.id]
              const label = feed.title !== '' ? feed.title : feed.url

              return (
                <button
                  key={feed.id}
                  ref={(el) => { tabRefs.current[index] = el }}
                  role="tab"
                  id={`feed-tab-${feed.id}`}
                  aria-selected={selected}
                  aria-controls={`feed-panel-${feed.id}`}
                  tabIndex={selected ? 0 : -1}
                  onClick={() => setActiveFeed(feed.id)}
                  onKeyDown={(e) => handleTabKeyDown(e, index)}
                  style={{
                    // REQ-UX-013-006: 활성 탭 teal/navy 강조, 비활성 저강조
                    color: selected ? 'var(--text-primary)' : 'var(--text-muted)',
                    background: 'none',
                    border: 'none',
                    borderBottom: selected
                      ? '2px solid var(--accent)'
                      : '2px solid transparent',
                    borderRadius: 0,
                    padding: '6px 10px',
                    fontSize: 13,
                    fontWeight: selected ? 600 : 400,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    maxWidth: 120,
                    // NFR-002: 최소 터치 영역 44px
                    minHeight: 44,
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  {label}
                  {/* 로딩 인디케이터 */}
                  {feedStatus === 'loading' && (
                    <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>●</span>
                  )}
                  {/* stale 인디케이터 */}
                  {feedStatus === 'stale' && !selected && (
                    <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>↺</span>
                  )}
                </button>
              )
            })}
          </div>

          {/* REQ-UX-013-005/011: tabpanel — 활성 탭 기사만 표시 */}
          {activeFeedId !== null && (
            <div
              role="tabpanel"
              id={`feed-panel-${activeFeedId}`}
              aria-labelledby={`feed-tab-${activeFeedId}`}
              style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
            >
              {/* 로딩 상태 */}
              {activeStatus === 'loading' && (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 12, padding: '8px 0' }}>
                  불러오는 중...
                </div>
              )}

              {/* 오류 상태 */}
              {activeStatus === 'error' && activeFeedId !== null && (
                <div
                  style={{
                    padding: '8px 0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    flexWrap: 'wrap',
                  }}
                >
                  <span
                    style={{
                      padding: '2px 8px',
                      borderRadius: 6,
                      background: '#ff4d4f22',
                      color: '#ff4d4f',
                      fontSize: 11,
                      border: '1px solid #ff4d4f44',
                    }}
                  >
                    오류: {
                      feeds.find((f) => f.id === activeFeedId)?.title ||
                      feeds.find((f) => f.id === activeFeedId)?.url ||
                      '피드'
                    }
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    탭을 다시 클릭하거나 새로고침으로 재시도하세요
                  </span>
                </div>
              )}

              {/* 기사 목록 (loaded 또는 stale 상태) */}
              {(activeStatus === 'loaded' || activeStatus === 'stale') && (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4,
                    overflow: 'auto',
                    flex: 1,
                  }}
                >
                  {activeArticles.length === 0 ? (
                    <div
                      style={{
                        textAlign: 'center',
                        color: 'var(--text-muted)',
                        fontSize: 12,
                        padding: '16px 0',
                      }}
                    >
                      기사가 없습니다
                    </div>
                  ) : (
                    activeArticles
                      .slice()
                      .sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime())
                      .map((article, idx) => (
                        <div
                          key={`${article.feedId}-${idx}`}
                          onClick={() => handleArticleClick(article.link)}
                          style={{
                            padding: '10px 12px',
                            borderRadius: 10,
                            background: 'var(--link-bg)',
                            cursor: 'pointer',
                            transition: 'background .15s',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'var(--link-hover)'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'var(--link-bg)'
                          }}
                        >
                          {/* 기사 제목 (말줄임) */}
                          <div
                            style={{
                              fontSize: 13,
                              fontWeight: 500,
                              color: 'var(--text-primary)',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {article.title}
                          </div>
                          {/* 출처 및 날짜 */}
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              marginTop: 4,
                              fontSize: 11,
                              color: 'var(--text-muted)',
                            }}
                          >
                            <span
                              style={{
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {article.source}
                            </span>
                            <span style={{ flexShrink: 0, marginLeft: 8 }}>
                              {formatRelativeDate(article.pubDate)}
                            </span>
                          </div>
                        </div>
                      ))
                  )}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* 피드 관리: 등록된 피드 목록 (삭제 버튼) */}
      {feeds.length > 0 && (
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 8, flexShrink: 0 }}>
          {/* REQ-UX-013-002: N/5 표시 유지 */}
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>
            등록된 피드 ({feeds.length}/5)
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {feeds.map((feed) => (
              <div
                key={feed.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: 12,
                  color: 'var(--text-muted)',
                }}
              >
                <span
                  style={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    flex: 1,
                  }}
                >
                  {feed.title !== '' ? feed.title : feed.url}
                </span>
                <button
                  onClick={() => removeFeed(feed.id)}
                  title="피드 삭제"
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-muted)',
                    fontSize: 14,
                    padding: '0 4px',
                    flexShrink: 0,
                  }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
