// @MX:SPEC: SPEC-UX-003
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
        style={{
          width: 32,
          height: 32,
          borderRadius: 6,
          border: '1px solid var(--border)',
          background: 'var(--card-bg)',
          cursor: 'pointer',
          fontSize: 14,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-primary)',
        }}
      >
        {viewMode === 'list' ? '⊞' : '☰'}
      </button>

      {/* 밀도 선택 */}
      <select
        data-testid="density-select"
        value={density}
        onChange={handleDensityChange}
        aria-label="밀도 선택"
        style={{
          padding: '4px 8px',
          borderRadius: 6,
          border: '1px solid var(--border)',
          background: 'var(--card-bg)',
          color: 'var(--text-primary)',
          fontSize: 12,
          cursor: 'pointer',
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
          padding: '4px 8px',
          borderRadius: 6,
          border: '1px solid var(--border)',
          background: 'var(--card-bg)',
          color: 'var(--text-primary)',
          fontSize: 12,
          cursor: 'pointer',
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
