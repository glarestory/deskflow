// @MX:NOTE: [AUTO] CapsuleListPanel — 전체 캡슐 목록 모달 (검색, 정렬, 보관 탭)
// @MX:SPEC: SPEC-CAPSULE-001 REQ-015, REQ-016, AC-025~AC-028
import { useState, useMemo, useCallback } from 'react'
import { useCapsuleStore } from '../../stores/capsuleStore'
import type { Capsule } from '../../types/capsule'

// 정렬 옵션 타입
type SortOption = 'lastActivated' | 'name' | 'createdAt'

// 날짜 포맷 헬퍼 (YYYY-MM-DD HH:mm)
function formatDate(isoString: string | null): string {
  if (!isoString) return '-'
  const d = new Date(isoString)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** CapsuleListPanel props */
interface CapsuleListPanelProps {
  /** 편집 버튼 클릭 시 편집 모달 열기 */
  onEdit: (capsule: Capsule) => void
  /** 패널 닫기 */
  onClose: () => void
}

/**
 * 전체 캡슐 목록 패널.
 * REQ-015: 행 포맷 (이모지·이름·항목수·최근 활성), 보관 탭 분리
 * REQ-016: 검색 + 정렬
 * AC-025~AC-028 검증
 */
export default function CapsuleListPanel({ onEdit, onClose }: CapsuleListPanelProps): JSX.Element {
  const capsules = useCapsuleStore((s) => s.capsules)
  const activeCapsuleId = useCapsuleStore((s) => s.activeCapsuleId)
  const activateCapsule = useCapsuleStore((s) => s.activateCapsule)
  const archiveCapsule = useCapsuleStore((s) => s.archiveCapsule)

  const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortOption, setSortOption] = useState<SortOption>('lastActivated')

  // 탭 기준 필터
  const tabFiltered = useMemo(
    () => capsules.filter((c) => (activeTab === 'active' ? !c.archived : c.archived)),
    [capsules, activeTab],
  )

  // 검색 필터 (이름, 설명, 태그 — 대소문자 무시)
  const searchFiltered = useMemo(() => {
    if (!searchQuery.trim()) return tabFiltered
    const q = searchQuery.toLowerCase()
    return tabFiltered.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.description ?? '').toLowerCase().includes(q) ||
        c.tags.some((t) => t.toLowerCase().includes(q)),
    )
  }, [tabFiltered, searchQuery])

  // 정렬
  const sortedCapsules = useMemo(() => {
    return [...searchFiltered].sort((a, b) => {
      if (sortOption === 'name') {
        // AC-028: locale-aware 정렬
        return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
      }
      if (sortOption === 'createdAt') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      }
      // 기본: 최근 활성 DESC
      const aTime = a.lastActivatedAt ? new Date(a.lastActivatedAt).getTime() : 0
      const bTime = b.lastActivatedAt ? new Date(b.lastActivatedAt).getTime() : 0
      return bTime - aTime
    })
  }, [searchFiltered, sortOption])

  const handleActivate = useCallback(
    (id: string): void => {
      void activateCapsule(id)
    },
    [activateCapsule],
  )

  const handleArchive = useCallback(
    (id: string, archived: boolean): void => {
      archiveCapsule(id, archived)
    },
    [archiveCapsule],
  )

  const archivedCount = capsules.filter((c) => c.archived).length

  return (
    <div
      data-testid="capsule-modal-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: 20,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        data-testid="capsule-list-panel"
        style={{
          background: 'var(--card-bg)',
          borderRadius: 20,
          padding: '24px 28px',
          maxWidth: 640,
          width: '100%',
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
          border: '1px solid var(--border)',
          boxShadow: '0 8px 40px var(--shadow)',
        }}
        role="dialog"
        aria-modal="true"
        aria-label="캡슐 목록"
      >
        {/* 헤더 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            캡슐 목록
          </h3>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--text-muted)' }}
            aria-label="닫기"
          >
            ✕
          </button>
        </div>

        {/* 탭 */}
        <div
          role="tablist"
          style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border)', marginBottom: 12 }}
        >
          <button
            role="tab"
            aria-selected={activeTab === 'active'}
            onClick={() => setActiveTab('active')}
            style={{
              padding: '8px 16px',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'active' ? '2px solid var(--accent)' : '2px solid transparent',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: activeTab === 'active' ? 700 : 400,
              color: activeTab === 'active' ? 'var(--accent)' : 'var(--text-muted)',
            }}
          >
            활성
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'archived'}
            onClick={() => setActiveTab('archived')}
            style={{
              padding: '8px 16px',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'archived' ? '2px solid var(--accent)' : '2px solid transparent',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: activeTab === 'archived' ? 700 : 400,
              color: activeTab === 'archived' ? 'var(--accent)' : 'var(--text-muted)',
            }}
          >
            보관 ({archivedCount})
          </button>
        </div>

        {/* 검색 + 정렬 */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <input
            data-testid="capsule-search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="이름, 설명, 태그 검색…"
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: 10,
              border: '1px solid var(--border)',
              background: 'var(--link-bg)',
              color: 'var(--text-primary)',
              fontSize: 13,
              outline: 'none',
            }}
            aria-label="캡슐 검색"
          />
          <select
            data-testid="capsule-sort-select"
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value as SortOption)}
            style={{
              padding: '8px 10px',
              borderRadius: 10,
              border: '1px solid var(--border)',
              background: 'var(--link-bg)',
              color: 'var(--text-primary)',
              fontSize: 13,
              outline: 'none',
              cursor: 'pointer',
            }}
            aria-label="정렬 기준"
          >
            <option value="lastActivated">최근 활성</option>
            <option value="name">이름</option>
            <option value="createdAt">생성일</option>
          </select>
        </div>

        {/* 목록 */}
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {sortedCapsules.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '40px 0',
                color: 'var(--text-muted)',
                fontSize: 14,
              }}
            >
              {searchQuery.trim() ? '검색 결과 없음' : '캡슐이 없습니다'}
            </div>
          ) : (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {sortedCapsules.map((capsule) => (
                <CapsuleRow
                  key={capsule.id}
                  capsule={capsule}
                  isActive={capsule.id === activeCapsuleId}
                  onActivate={handleActivate}
                  onEdit={onEdit}
                  onArchive={handleArchive}
                />
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

// ── 캡슐 행 컴포넌트 ──────────────────────────────────────────────────────────

interface CapsuleRowProps {
  capsule: Capsule
  isActive: boolean
  onActivate: (id: string) => void
  onEdit: (capsule: Capsule) => void
  onArchive: (id: string, archived: boolean) => void
}

/** AC-025: 행 포맷 — 이모지·이름·항목수·최근 활성 */
function CapsuleRow({ capsule, isActive, onActivate, onEdit, onArchive }: CapsuleRowProps): JSX.Element {
  return (
    <li
      data-testid={`capsule-row-${capsule.id}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 12px',
        borderRadius: 12,
        border: `1px solid ${isActive ? 'var(--accent)' : 'var(--border)'}`,
        background: isActive ? 'var(--link-bg)' : 'transparent',
        transition: 'background .15s',
      }}
    >
      {/* 이모지 */}
      <span style={{ fontSize: 20, flexShrink: 0 }}>{capsule.emoji ?? '📦'}</span>

      {/* 이름 + 항목 수 + 최근 활성 */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}>
            {capsule.name}
          </span>
          {isActive && (
            <span style={{ fontSize: 10, color: 'var(--accent)', fontWeight: 600, background: 'var(--accent)20', padding: '1px 6px', borderRadius: 20 }}>
              활성
            </span>
          )}
        </div>
        {/* AC-025 포맷: 🔖N · ✅N · 📝N · 최근 활성: YYYY-MM-DD HH:mm */}
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <span>🔖{capsule.bookmarkIds.length}</span>
          <span>✅{capsule.todoIds.length}</span>
          <span>📝{capsule.noteIds.length}</span>
          <span>최근 활성: {formatDate(capsule.lastActivatedAt)}</span>
        </div>
      </div>

      {/* 액션 버튼 */}
      <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
        {!capsule.archived && (
          <button
            data-testid={`capsule-activate-btn-${capsule.id}`}
            onClick={() => onActivate(capsule.id)}
            style={{
              padding: '4px 10px',
              borderRadius: 8,
              border: '1px solid var(--accent)',
              background: 'transparent',
              color: 'var(--accent)',
              fontSize: 11,
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            활성화
          </button>
        )}
        <button
          data-testid={`capsule-edit-btn-${capsule.id}`}
          onClick={() => onEdit(capsule)}
          style={{
            padding: '4px 10px',
            borderRadius: 8,
            border: '1px solid var(--border)',
            background: 'transparent',
            color: 'var(--text-muted)',
            fontSize: 11,
            cursor: 'pointer',
          }}
        >
          편집
        </button>
        {!capsule.archived ? (
          <button
            data-testid={`capsule-archive-btn-${capsule.id}`}
            onClick={() => onArchive(capsule.id, true)}
            style={{
              padding: '4px 10px',
              borderRadius: 8,
              border: '1px solid var(--border)',
              background: 'transparent',
              color: 'var(--text-muted)',
              fontSize: 11,
              cursor: 'pointer',
            }}
          >
            보관
          </button>
        ) : (
          <button
            data-testid={`capsule-restore-btn-${capsule.id}`}
            onClick={() => onArchive(capsule.id, false)}
            style={{
              padding: '4px 10px',
              borderRadius: 8,
              border: '1px solid var(--border)',
              background: 'transparent',
              color: 'var(--text-muted)',
              fontSize: 11,
              cursor: 'pointer',
            }}
          >
            복원
          </button>
        )}
      </div>
    </li>
  )
}
