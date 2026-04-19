// @MX:NOTE: [AUTO] CapsuleSwitcher — 상단 바 캡슐 전환 드롭다운/바텀시트
// @MX:SPEC: SPEC-CAPSULE-001 REQ-012, AC-020~AC-023, DEC-004
import { useState, useEffect, useRef, useCallback } from 'react'
import { useCapsuleStore } from '../../stores/capsuleStore'
import type { Capsule } from '../../types/capsule'
import styles from './CapsuleSwitcher.module.css'

/** CapsuleSwitcher props */
interface CapsuleSwitcherProps {
  /** "모든 캡슐 보기…" 클릭 시 목록 패널 열기 */
  onOpenList: () => void
  /** "새 캡슐 만들기" 클릭 시 편집 모달 열기 */
  onOpenCreate: () => void
}

/**
 * 현재 활성 캡슐을 표시하고 빠른 캡슐 전환을 제공하는 드롭다운/바텀시트 컴포넌트.
 * DEC-004: CSS 미디어 쿼리 640px 기준으로 드롭다운(데스크톱) ↔ 바텀시트(모바일) 자동 전환.
 */
// @MX:ANCHOR: [AUTO] CapsuleSwitcher — 상단 바 캡슐 전환 UI 진입점
// @MX:REASON: [AUTO] WidgetLayout, PivotLayout 양쪽에서 사용되며 capsuleStore fan_in >= 3
export default function CapsuleSwitcher({
  onOpenList,
  onOpenCreate,
}: CapsuleSwitcherProps): JSX.Element {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // 셀렉터 분리로 불필요한 리렌더 방지
  const capsules = useCapsuleStore((s) => s.capsules)
  const activeCapsuleId = useCapsuleStore((s) => s.activeCapsuleId)
  const activateCapsule = useCapsuleStore((s) => s.activateCapsule)

  const activeCapsule = capsules.find((c) => c.id === activeCapsuleId) ?? null

  // 최근 5개 캡슐: 보관 제외, lastActivatedAt DESC, 활성 캡슐 제외
  const recentCapsules: Capsule[] = [...capsules]
    .filter((c) => !c.archived && c.id !== activeCapsuleId)
    .sort((a, b) => {
      const timeA = a.lastActivatedAt ? new Date(a.lastActivatedAt).getTime() : 0
      const timeB = b.lastActivatedAt ? new Date(b.lastActivatedAt).getTime() : 0
      return timeB - timeA
    })
    .slice(0, 5)

  const close = useCallback((): void => {
    setIsOpen(false)
  }, [])

  // Escape 키로 닫기 (AC-022 관련)
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        close()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, close])

  const handleTriggerClick = (): void => {
    setIsOpen((prev) => !prev)
  }

  const handleActivate = (id: string): void => {
    void activateCapsule(id)
    close()
  }

  const handleDeactivate = (): void => {
    void activateCapsule(null)
    close()
  }

  const handleOpenList = (): void => {
    onOpenList()
    close()
  }

  const handleOpenCreate = (): void => {
    onOpenCreate()
    close()
  }

  // 트리거 레이블
  const triggerLabel = activeCapsule
    ? `${activeCapsule.emoji ?? '📦'} ${activeCapsule.name}`
    : '캡슐 없음'

  return (
    <div
      ref={containerRef}
      style={{ position: 'relative', display: 'inline-block' }}
    >
      {/* 트리거 버튼 */}
      <button
        className={styles.trigger}
        onClick={handleTriggerClick}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={triggerLabel}
        data-testid="capsule-switcher-trigger"
      >
        {triggerLabel}
        <span aria-hidden="true" style={{ fontSize: 10, opacity: 0.6 }}>▼</span>
      </button>

      {/* 오버레이 (바텀시트 모드에서도 배경 클릭 닫기) */}
      {isOpen && (
        <div
          className={styles.overlay}
          onClick={close}
          aria-hidden="true"
        />
      )}

      {/* 드롭다운 / 바텀시트 패널 */}
      {isOpen && (
        <div
          className={styles.panel}
          role="listbox"
          aria-label="캡슐 선택"
          data-testid="capsule-switcher-panel"
          data-mode="dropdown"
        >
          {/* 활성 캡슐 섹션 */}
          {activeCapsule !== null && (
            <div className={styles.section}>
              <div className={styles.sectionLabel}>현재 캡슐</div>
              <div
                className={`${styles.item} ${styles.itemActive}`}
                role="option"
                aria-selected={true}
              >
                <span>{activeCapsule.emoji ?? '📦'}</span>
                <span>{activeCapsule.name}</span>
              </div>
            </div>
          )}

          {/* 최근 캡슐 목록 */}
          {recentCapsules.length > 0 && (
            <div className={styles.section}>
              <div className={styles.sectionLabel}>최근 캡슐</div>
              {recentCapsules.map((capsule) => (
                <button
                  key={capsule.id}
                  className={styles.item}
                  role="option"
                  aria-selected={false}
                  onClick={() => handleActivate(capsule.id)}
                  data-testid="capsule-recent-item"
                >
                  <span>{capsule.emoji ?? '📦'}</span>
                  <span>{capsule.name}</span>
                </button>
              ))}
            </div>
          )}

          {/* 공통 액션 */}
          <div className={styles.section}>
            <button
              className={`${styles.item} ${styles.accentItem}`}
              onClick={handleOpenList}
              data-testid="capsule-open-list"
            >
              모든 캡슐 보기…
            </button>
            <button
              className={`${styles.item} ${styles.accentItem}`}
              onClick={handleOpenCreate}
              data-testid="capsule-create"
            >
              새 캡슐 만들기
            </button>
            {/* 캡슐 해제 — 활성 캡슐이 있을 때만 표시 (AC-021) */}
            {activeCapsule !== null && (
              <button
                className={`${styles.item} ${styles.itemDestructive}`}
                onClick={handleDeactivate}
                data-testid="capsule-deactivate"
              >
                캡슐 해제
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
