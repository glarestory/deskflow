// @MX:NOTE: [AUTO] DedupModal — 중복 북마크 탐지 및 정리 모달
// @MX:SPEC: SPEC-BOOKMARK-002
import { useState, useMemo } from 'react'
import { useBookmarkStore } from '../../stores/bookmarkStore'
import { findDuplicates } from '../../lib/bookmarkDedup'
import type { DuplicateGroup } from '../../lib/bookmarkDedup'

interface DedupModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function DedupModal({ isOpen, onClose }: DedupModalProps): JSX.Element | null {
  const { bookmarks, removeDuplicates } = useBookmarkStore()

  // 중복 그룹 계산
  const duplicateGroups: DuplicateGroup[] = useMemo(
    () => findDuplicates(bookmarks),
    [bookmarks],
  )

  // 각 그룹에서 유지할 linkId 선택 상태 (기본: 첫 번째 항목)
  const [keepSelections, setKeepSelections] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {}
    for (const group of duplicateGroups) {
      if (group.items.length > 0) {
        initial[group.url] = group.items[0].linkId
      }
    }
    return initial
  })

  if (!isOpen) return null

  // 선택이 초기화되지 않은 그룹에 대한 기본값 설정
  const resolvedSelections = { ...keepSelections }
  for (const group of duplicateGroups) {
    if (resolvedSelections[group.url] === undefined && group.items.length > 0) {
      resolvedSelections[group.url] = group.items[0].linkId
    }
  }

  const handleConfirm = (): void => {
    const keepLinkIds = Object.values(resolvedSelections)
    removeDuplicates(keepLinkIds)
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
    minWidth: 400,
    maxWidth: 600,
    width: '90%',
    maxHeight: '80vh',
    overflowY: 'auto',
    boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
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
          중복 북마크 정리
        </div>

        {duplicateGroups.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)', fontSize: 14 }}>
            중복 북마크가 없습니다.
          </div>
        ) : (
          <div>
            <div style={{ marginBottom: 12, fontSize: 13, color: 'var(--text-muted)' }}>
              {duplicateGroups.length}개의 중복 URL이 발견되었습니다. 유지할 항목을 선택하세요.
            </div>

            {duplicateGroups.map((group) => (
              <div
                key={group.url}
                style={{
                  marginBottom: 16,
                  padding: 14,
                  borderRadius: 10,
                  border: '1px solid var(--border)',
                  background: 'var(--bg)',
                }}
              >
                <div style={{ fontSize: 12, color: 'var(--accent)', marginBottom: 10, wordBreak: 'break-all' }}>
                  {group.url}
                </div>
                {group.items.map((item, idx) => (
                  <label
                    key={item.linkId}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '6px 0',
                      cursor: 'pointer',
                      fontSize: 13,
                      color: 'var(--text-primary)',
                      borderTop: idx > 0 ? '1px solid var(--border)' : 'none',
                    }}
                  >
                    <input
                      type="radio"
                      name={`group-${group.url}`}
                      value={item.linkId}
                      checked={resolvedSelections[group.url] === item.linkId}
                      onChange={() => {
                        setKeepSelections((prev) => ({ ...prev, [group.url]: item.linkId }))
                      }}
                    />
                    <span style={{ flex: 1 }}>
                      <strong>{item.title}</strong>
                      <span style={{ color: 'var(--text-muted)', marginLeft: 6 }}>
                        ({item.categoryName})
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
          <button
            onClick={onClose}
            style={{ ...btnBase, background: 'var(--card-bg)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
          >
            닫기
          </button>
          {duplicateGroups.length > 0 && (
            <button
              onClick={handleConfirm}
              style={{ ...btnBase, background: '#e05c5c', color: '#fff' }}
            >
              중복 제거
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
