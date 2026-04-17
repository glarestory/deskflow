// @MX:NOTE: [AUTO] QuickCapture — URL 빠른 추가 팝오버 (클립보드 자동 붙여넣기)
// @MX:SPEC: SPEC-BOOKMARK-002, SPEC-BOOKMARK-003
import { useState, useEffect } from 'react'
import { useBookmarkStore } from '../../stores/bookmarkStore'
import { generateId } from '../../lib/bookmarkParser'
import TagInput from '../TagInput/TagInput'
import { useTagStore } from '../../stores/tagStore'

interface QuickCaptureProps {
  isOpen: boolean
  onClose: () => void
}

/** URL 유효성 검사 */
function isValidUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

/** URL에서 hostname 추출 */
function extractHostname(url: string): string {
  try {
    return new URL(url).hostname
  } catch {
    return url
  }
}

export default function QuickCapture({ isOpen, onClose }: QuickCaptureProps): JSX.Element | null {
  const { bookmarks, addLink } = useBookmarkStore()
  const allTags = useTagStore((s) => s.allTags)
  const tagSuggestions = allTags.map((t) => t.tag)
  const [url, setUrl] = useState('')
  const [title, setTitle] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [categoryId, setCategoryId] = useState<string>(bookmarks[0]?.id ?? '')
  const [error, setError] = useState<string>('')

  // 팝오버 열릴 때 클립보드 자동 붙여넣기
  useEffect(() => {
    if (!isOpen) return

    // 상태 초기화
    setUrl('')
    setTitle('')
    setTags([])
    setError('')
    setCategoryId(bookmarks[0]?.id ?? '')

    // 클립보드 URL 읽기
    navigator.clipboard
      .readText()
      .then((text) => {
        if (isValidUrl(text)) {
          setUrl(text)
        }
      })
      .catch(() => {
        // 클립보드 권한 없는 경우 무시
      })
  }, [isOpen, bookmarks])

  if (!isOpen) return null

  const handleConfirm = (): void => {
    if (!isValidUrl(url)) {
      setError('유효한 URL을 입력해주세요 (예: https://example.com)')
      return
    }

    const resolvedTitle = title.trim() !== '' ? title.trim() : extractHostname(url)
    addLink(categoryId, {
      id: generateId(),
      name: resolvedTitle,
      url,
      tags,
    })
    onClose()
  }

  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  }

  const cardStyle: React.CSSProperties = {
    background: 'var(--card-bg)',
    border: '1px solid var(--border)',
    borderRadius: 14,
    padding: 24,
    minWidth: 360,
    maxWidth: 480,
    width: '90%',
    boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 12px',
    borderRadius: 8,
    border: '1px solid var(--border)',
    background: 'var(--bg)',
    color: 'var(--text-primary)',
    fontSize: 14,
    outline: 'none',
    boxSizing: 'border-box',
  }

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 12,
    color: 'var(--text-muted)',
    marginBottom: 6,
    fontWeight: 600,
  }

  const btnBase: React.CSSProperties = {
    padding: '8px 18px',
    borderRadius: 8,
    border: 'none',
    fontSize: 13,
    cursor: 'pointer',
    fontWeight: 600,
  }

  return (
    <div style={overlayStyle} onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div style={cardStyle}>
        <div style={{ marginBottom: 20, fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
          빠른 북마크 추가
        </div>

        {/* URL 입력 */}
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>URL *</label>
          <input
            type="url"
            placeholder="https://"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value)
              setError('')
            }}
            style={inputStyle}
            autoFocus
          />
          {error !== '' && (
            <div style={{ fontSize: 12, color: '#e05c5c', marginTop: 4 }}>{error}</div>
          )}
        </div>

        {/* 제목 입력 */}
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>제목 (선택)</label>
          <input
            type="text"
            placeholder="제목 (비워두면 hostname 사용)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={inputStyle}
          />
        </div>

        {/* 태그 입력 */}
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>태그 (선택)</label>
          <TagInput
            tags={tags}
            onChange={setTags}
            suggestions={tagSuggestions}
          />
        </div>

        {/* 카테고리 선택 */}
        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>카테고리</label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            style={{ ...inputStyle, cursor: 'pointer' }}
          >
            {bookmarks.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.icon} {cat.name}
              </option>
            ))}
          </select>
        </div>

        {/* 버튼 영역 */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button
            onClick={onClose}
            style={{ ...btnBase, background: 'var(--card-bg)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
          >
            취소
          </button>
          <button
            onClick={handleConfirm}
            style={{ ...btnBase, background: 'var(--accent)', color: '#fff' }}
          >
            추가
          </button>
        </div>
      </div>
    </div>
  )
}
