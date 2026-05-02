// @MX:SPEC: SPEC-UX-003
import { LayoutGrid, List } from 'lucide-react'
import { useViewStore } from '../../stores/viewStore'
import type { Density } from '../../stores/viewStore'

/** 정렬 옵션 */
export type SortOption = 'name' | 'createdAt' | 'usage'

interface ToolbarRightProps {
  /** 외부에서 정렬 상태를 제어할 때 (옵셔널) */
  sort?: SortOption
  onSortChange?: (s: SortOption) => void
}

/**
 * 메인 뷰 우측 툴바.
 * - 뷰 모드 토글 (list/grid)
 * - 밀도 dropdown (compact/comfortable/spacious)
 * - 정렬 dropdown (name/createdAt/usage)
 * REQ-006, REQ-007
 */
export function ToolbarRight({ sort = 'name', onSortChange }: ToolbarRightProps): JSX.Element {
  const { viewMode, density, setViewMode, setDensity } = useViewStore()

  const handleViewModeToggle = (): void => {
    setViewMode(viewMode === 'list' ? 'grid' : 'list')
  }

  const handleDensityChange = (e: React.ChangeEvent<HTMLSelectElement>): void => {
    setDensity(e.target.value as Density)
  }

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>): void => {
    onSortChange?.(e.target.value as SortOption)
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}
    >
      {/* 뷰 모드 토글 */}
      <button
        data-testid="view-mode-toggle"
        onClick={handleViewModeToggle}
        title={viewMode === 'list' ? '격자 보기로 전환' : '목록 보기로 전환'}
        aria-label={viewMode === 'list' ? '격자 보기로 전환' : '목록 보기로 전환'}
        style={{
          width: 30,
          height: 30,
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border)',
          background: 'var(--surface-1)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-secondary)',
          transition: 'background var(--motion-fast), color var(--motion-fast), border-color var(--motion-fast)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'var(--surface-2)'
          e.currentTarget.style.color = 'var(--text-primary)'
          e.currentTarget.style.borderColor = 'var(--border-strong)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'var(--surface-1)'
          e.currentTarget.style.color = 'var(--text-secondary)'
          e.currentTarget.style.borderColor = 'var(--border)'
        }}
      >
        {viewMode === 'list' ? <LayoutGrid size={15} strokeWidth={2} /> : <List size={15} strokeWidth={2} />}
      </button>

      {/* 밀도 선택 */}
      <select
        data-testid="density-select"
        value={density}
        onChange={handleDensityChange}
        aria-label="밀도 선택"
        style={{
          height: 30,
          padding: '0 var(--space-2)',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border)',
          background: 'var(--surface-1)',
          color: 'var(--text-secondary)',
          fontSize: 12,
          cursor: 'pointer',
          fontFamily: 'inherit',
        }}
      >
        <option value={'compact' satisfies Density}>조밀</option>
        <option value={'comfortable' satisfies Density}>보통</option>
        <option value={'spacious' satisfies Density}>여유</option>
      </select>

      {/* 정렬 선택 */}
      <select
        data-testid="sort-select"
        value={sort}
        onChange={handleSortChange}
        aria-label="정렬 기준"
        style={{
          height: 30,
          padding: '0 var(--space-2)',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border)',
          background: 'var(--surface-1)',
          color: 'var(--text-secondary)',
          fontSize: 12,
          cursor: 'pointer',
          fontFamily: 'inherit',
        }}
      >
        <option value={'name' satisfies SortOption}>이름순</option>
        <option value={'createdAt' satisfies SortOption}>추가순</option>
        <option value={'usage' satisfies SortOption}>빈도순</option>
      </select>
    </div>
  )
}

export default ToolbarRight
