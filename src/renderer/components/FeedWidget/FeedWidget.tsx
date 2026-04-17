// @MX:NOTE: [AUTO] FeedWidget — RSS 피드 위젯 (피드 관리, 기사 목록, 오류 상태)
// @MX:SPEC: SPEC-WIDGET-003
import { useState } from 'react'
import { useFeedStore } from '../../stores/feedStore'

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
  const { feeds, articles, loading, addFeed, removeFeed, refreshAll } = useFeedStore()
  const [showAddForm, setShowAddForm] = useState(false)
  const [inputUrl, setInputUrl] = useState('')
  const [isAdding, setIsAdding] = useState(false)

  const handleAddFeed = async (): Promise<void> => {
    const trimmed = inputUrl.trim()
    if (!trimmed) return

    setIsAdding(true)
    await addFeed(trimmed)
    setIsAdding(false)
    setInputUrl('')
    setShowAddForm(false)
  }

  const handleRefresh = (): void => {
    void refreshAll()
  }

  const handleArticleClick = (link: string): void => {
    // REQ-003: 기사 링크를 기본 브라우저에서 열기
    window.open(link, '_blank')
  }

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
      {/* 헤더 */}
      <div
        className="widget-drag-handle"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'grab',
        }}
      >
        <span
          style={{
            fontWeight: 700,
            fontSize: 15,
            color: 'var(--text-primary)',
          }}
        >
          뉴스 피드
        </span>
        <div style={{ display: 'flex', gap: 6 }}>
          {/* REQ-004: 새로고침 버튼 */}
          <button
            data-testid="refresh-feeds-btn"
            onClick={handleRefresh}
            disabled={loading}
            title="피드 새로고침"
            style={{
              background: 'none',
              border: '1px solid var(--border)',
              borderRadius: 8,
              padding: '4px 10px',
              fontSize: 12,
              color: 'var(--text-muted)',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.5 : 1,
            }}
          >
            새로고침
          </button>
          {/* 피드 추가 버튼 */}
          <button
            data-testid="add-feed-btn"
            onClick={() => setShowAddForm((prev) => !prev)}
            title="피드 추가"
            style={{
              background: 'none',
              border: '1px solid var(--border)',
              borderRadius: 8,
              padding: '4px 10px',
              fontSize: 12,
              color: 'var(--text-muted)',
              cursor: 'pointer',
            }}
          >
            + 추가
          </button>
        </div>
      </div>

      {/* 피드 URL 입력 폼 */}
      {showAddForm && (
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

      {/* 피드 오류 배지 영역 */}
      {feeds.filter((f) => f.error !== undefined).length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {feeds
            .filter((f) => f.error !== undefined)
            .map((f) => (
              <span
                key={f.id}
                data-testid={`feed-error-${f.id}`}
                title={f.error}
                style={{
                  padding: '2px 8px',
                  borderRadius: 6,
                  background: '#ff4d4f22',
                  color: '#ff4d4f',
                  fontSize: 11,
                  border: '1px solid #ff4d4f44',
                }}
              >
                오류: {f.title !== '' ? f.title : f.url}
              </span>
            ))}
        </div>
      )}

      {/* 빈 상태 */}
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

      {/* REQ-005: 로딩 스피너 */}
      {loading && feeds.length > 0 && (
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
          불러오는 중...
        </div>
      )}

      {/* 기사 목록 (날짜 내림차순) */}
      {articles.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, overflow: 'auto', flex: 1 }}>
          {articles
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
            ))}
        </div>
      )}

      {/* 피드 관리: 등록된 피드 목록 (삭제 버튼) */}
      {feeds.length > 0 && (
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 8 }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>
            등록된 피드 ({feeds.length}/{5})
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
