// @MX:ANCHOR: [AUTO] CommandPalette — fuzzy search 기반 전역 검색 오버레이 컴포넌트
// @MX:REASON: [AUTO] App.tsx에서 마운트되며, 북마크/카테고리/태그/액션/RAG를 통합 검색하는 핵심 UI
// @MX:SPEC: SPEC-UX-002, SPEC-SEARCH-RAG-001
import { useEffect, useRef, useCallback, useMemo, useDeferredValue, useState } from 'react'
import { useBookmarkStore } from '../../stores/bookmarkStore'
import { useTagStore } from '../../stores/tagStore'
import { useCommandStore } from '../../stores/commandStore'
import { useUsageStore } from '../../stores/usageStore'
import { useViewModeStore } from '../../stores/viewModeStore'
import { useCapsuleStore } from '../../stores/capsuleStore'
import { useRagStore } from '../../stores/ragStore'
import { searchAll } from '../../lib/searchAll'
import type { PaletteAction, SearchResult, RagSearchResult } from '../../lib/searchAll'
import ResultItem from './ResultItem'
import RagStatusBadge from './RagStatusBadge'

/** CommandPalette 컴포넌트 props */
export interface CommandPaletteProps {
  isOpen: boolean
  onClose: () => void
  // 액션 핸들러 (App.tsx에서 주입)
  onToggleTheme?: () => void
  onOpenImport?: () => void
  onResetLayout?: () => void
  onSignOut?: () => void
  onOpenQuickCapture?: () => void
  onOpenDedup?: () => void
  onRefreshFeed?: () => void
  onAddCategory?: () => void
  /** SPEC-UX-005: Pivot ↔ 위젯 모드 전환 핸들러 */
  onToggleViewMode?: () => void
  /** SPEC-CAPSULE-001 REQ-013: 캡슐 편집 모달 열기 (신규 생성) */
  onOpenCreateCapsule?: () => void
  /** SPEC-CAPSULE-001 REQ-013: 캡슐 목록 패널 열기 */
  onOpenCapsuleList?: () => void
  /** SPEC-CAPSULE-001 REQ-013: 특정 캡슐 편집 모달 열기 */
  onEditCapsule?: (capsuleId: string) => void
  // 결과 선택 콜백 (SPEC-UX-003 통합 예정)
  onSelectBookmark?: (linkId: string, categoryId: string) => void
  onSelectCategory?: (categoryId: string) => void
  onSelectTag?: (tag: string) => void
  /** EditModal 열기 (Alt+Enter) */
  onEditBookmark?: (linkId: string) => void
}

// 그룹 레이블 표시명
const GROUP_LABELS: Record<string, string> = {
  bookmark: '북마크',
  category: '카테고리',
  tag: '태그',
  action: '액션',
  rag: 'RAG',
}

/**
 * 결과 배열에서 그룹 헤더와 함께 렌더링 가능한 아이템 목록으로 변환.
 * 그룹이 변경되는 경계에만 헤더를 삽입한다.
 */
interface RenderItem {
  type: 'header' | 'result'
  group?: string
  result?: SearchResult
  resultIndex?: number
}

function buildRenderItems(results: SearchResult[]): RenderItem[] {
  const items: RenderItem[] = []
  let lastGroup: string | null = null
  let resultIndex = 0

  for (const result of results) {
    const group = result.kind
    if (group !== lastGroup) {
      items.push({ type: 'header', group })
      lastGroup = group
    }
    items.push({ type: 'result', result, resultIndex })
    resultIndex++
  }

  return items
}

// @MX:ANCHOR: [AUTO] CommandPalette — 전역 fuzzy search 팔레트 컴포넌트
// @MX:REASON: [AUTO] App.tsx에서 직접 마운트되는 최상위 UI 진입점
export default function CommandPalette({
  isOpen,
  onClose,
  onToggleTheme,
  onOpenImport,
  onResetLayout,
  onSignOut,
  onOpenQuickCapture,
  onOpenDedup,
  onRefreshFeed,
  onAddCategory,
  onToggleViewMode,
  onOpenCreateCapsule,
  onOpenCapsuleList,
  onEditCapsule,
  onSelectBookmark,
  onSelectCategory,
  onSelectTag,
  onEditBookmark,
}: CommandPaletteProps): JSX.Element | null {
  const inputRef = useRef<HTMLInputElement>(null)

  // commandStore에서 상태 관리
  const { query, setQuery, selectedIndex, setSelectedIndex, close } = useCommandStore()
  const { bookmarks } = useBookmarkStore()
  const { allTags } = useTagStore()
  const { recordUsage, getScore } = useUsageStore()
  // @MX:NOTE: [AUTO] SPEC-UX-005: 현재 viewMode에 따라 토글 액션 레이블 동적 변경
  const { mode: viewMode } = useViewModeStore()
  // @MX:NOTE: [AUTO] SPEC-CAPSULE-001 REQ-013: 캡슐 동적 액션 + 해제 상태 판단
  const capsules = useCapsuleStore((s) => s.capsules)
  const activeCapsuleId = useCapsuleStore((s) => s.activeCapsuleId)
  const activateCapsuleAction = useCapsuleStore((s) => s.activateCapsule)
  const archiveCapsuleAction = useCapsuleStore((s) => s.archiveCapsule)

  // @MX:NOTE: [AUTO] SPEC-SEARCH-RAG-001 REQ-012 — RAG 결과 그룹 통합 + 상태 배지
  // ragStore 반응형 구독 (enabled, ollamaAvailable, modelMissing)
  const ragEnabled = useRagStore((s) => s.enabled)
  const ollamaAvailable = useRagStore((s) => s.ollamaAvailable)
  const modelMissing = useRagStore((s) => s.modelMissing)

  // RAG 검색 결과 상태 (비동기 search() 결과)
  const [ragResults, setRagResults] = useState<RagSearchResult[]>([])

  // 검색 성능 최적화: useDeferredValue로 타이핑 지연 처리
  const deferredQuery = useDeferredValue(query)

  // 팔레트 열림 시 상태 초기화 및 포커스
  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setSelectedIndex(0)
      // 다음 프레임에 포커스
      requestAnimationFrame(() => {
        inputRef.current?.focus()
      })
    }
  }, [isOpen, setQuery, setSelectedIndex])

  // 마운트 시 Ollama health check 1회 실행 (REQ-001)
  useEffect(() => {
    void useRagStore.getState().checkHealth()
  }, [])

  // @MX:NOTE: [AUTO] SPEC-SEARCH-RAG-001 REQ-012 — deferredQuery 변경 시 RAG 비동기 검색
  // stale 요청 방지를 위한 취소 플래그 패턴
  useEffect(() => {
    let cancelled = false

    // 조기 종료 조건: RAG 비활성, Ollama 미연결, 모델 없음
    if (!ragEnabled || !ollamaAvailable || modelMissing) {
      setRagResults([])
      return
    }
    // 쿼리 4자 미만 → 빈 결과
    if (deferredQuery.trim().length < 4) {
      setRagResults([])
      return
    }

    void useRagStore.getState().search(deferredQuery).then((raw) => {
      if (cancelled) return

      // RagResult(linkId, categoryId, score) → RagSearchResult(+ link + matchedRanges)
      const resolved: RagSearchResult[] = raw
        .map((r) => {
          const cat = bookmarks.find((c) => c.id === r.categoryId)
          const link = cat?.links.find((l) => l.id === r.linkId)
          if (link === undefined) return null
          return {
            kind: 'rag' as const,
            linkId: r.linkId,
            categoryId: r.categoryId,
            score: r.score,
            link,
            matchedRanges: [] as [number, number][],
          }
        })
        .filter((x): x is RagSearchResult => x !== null)

      setRagResults(resolved)
    })

    return () => {
      cancelled = true
    }
  }, [deferredQuery, ragEnabled, ollamaAvailable, modelMissing, bookmarks])

  // 내장 액션 목록
  const paletteActions: PaletteAction[] = useMemo(
    () => [
      {
        id: 'action-toggle-theme',
        label: '테마 전환',
        keywords: ['theme', '테마', 'dark', 'light', '다크', '라이트'],
        icon: '🎨',
        execute: () => {
          onToggleTheme?.()
          handleClose()
        },
      },
      {
        id: 'action-import',
        label: '북마크 가져오기',
        keywords: ['import', '가져오기', 'bookmark'],
        icon: '📥',
        execute: () => {
          onOpenImport?.()
          handleClose()
        },
      },
      {
        id: 'action-reset-layout',
        label: '레이아웃 초기화',
        keywords: ['reset', 'layout', '레이아웃', '초기화'],
        icon: '🔄',
        execute: () => {
          onResetLayout?.()
          handleClose()
        },
      },
      {
        id: 'action-sign-out',
        label: '로그아웃',
        keywords: ['logout', 'signout', '로그아웃', '나가기'],
        icon: '🚪',
        execute: () => {
          onSignOut?.()
          handleClose()
        },
      },
      {
        id: 'action-quick-capture',
        label: '빠른 추가',
        keywords: ['quick', 'capture', 'add', '빠른', '추가'],
        icon: '⚡',
        execute: () => {
          onOpenQuickCapture?.()
          handleClose()
        },
      },
      {
        id: 'action-dedup',
        label: '중복 탐지',
        keywords: ['dedup', 'duplicate', '중복', '탐지'],
        icon: '🔍',
        execute: () => {
          onOpenDedup?.()
          handleClose()
        },
      },
      {
        id: 'action-refresh-feed',
        label: '피드 새로고침',
        keywords: ['refresh', 'feed', '새로고침', '피드'],
        icon: '📡',
        execute: () => {
          onRefreshFeed?.()
          handleClose()
        },
      },
      {
        id: 'action-add-category',
        label: '카테고리 추가',
        keywords: ['add', 'category', '카테고리', '추가'],
        icon: '📁',
        execute: () => {
          onAddCategory?.()
          handleClose()
        },
      },
      // @MX:NOTE: [AUTO] SPEC-UX-005: Pivot ↔ 위젯 모드 전환 액션 (활성화)
      {
        id: 'action-toggle-view-mode',
        // REQ-009: 현재 모드와 반대 방향 레이블 표시
        label: viewMode === 'pivot' ? '위젯 모드로 전환' : 'Pivot 모드로 전환',
        keywords: ['pivot', 'widget', 'mode', '피벗', '위젯', '모드', '전환'],
        icon: '🔀',
        execute: () => {
          onToggleViewMode?.()
          handleClose()
        },
      },
      // @MX:NOTE: [AUTO] SPEC-CAPSULE-001 REQ-013: 캡슐 정적 액션 (new/list/deactivate)
      {
        id: 'action-capsule-new',
        label: '캡슐: 새로 만들기',
        keywords: ['capsule', '캡슐', 'new', '새로', '만들기', 'create'],
        icon: '📦',
        execute: () => {
          onOpenCreateCapsule?.()
          handleClose()
        },
      },
      {
        id: 'action-capsule-list',
        label: '캡슐: 모든 캡슐 보기',
        keywords: ['capsule', '캡슐', 'list', '목록', '모든'],
        icon: '📚',
        execute: () => {
          onOpenCapsuleList?.()
          handleClose()
        },
      },
      // REQ-013: 활성 캡슐이 있을 때만 편집/해제 액션 노출
      ...(activeCapsuleId !== null
        ? [
            {
              id: 'action-capsule-edit-active',
              label: '캡슐: 활성 캡슐 편집',
              keywords: ['capsule', '캡슐', 'edit', '편집'],
              icon: '✏️',
              execute: (): void => {
                if (activeCapsuleId !== null) {
                  onEditCapsule?.(activeCapsuleId)
                }
                handleClose()
              },
            },
            {
              id: 'action-capsule-deactivate',
              label: '캡슐: 해제',
              keywords: ['capsule', '캡슐', 'deactivate', '해제'],
              icon: '⏹️',
              execute: (): void => {
                void activateCapsuleAction(null)
                handleClose()
              },
            },
          ]
        : []),
      // REQ-013: 각 비보관 캡슐별 "활성화" 액션 (동적)
      ...capsules
        .filter((c) => !c.archived && c.id !== activeCapsuleId)
        .map(
          (c): PaletteAction => ({
            id: `action-capsule-activate-${c.id}`,
            label: `캡슐: 활성화 ${c.emoji ?? '📦'} ${c.name}`,
            keywords: ['capsule', '캡슐', 'activate', '활성화', c.name.toLowerCase(), ...(c.tags ?? [])],
            icon: c.emoji ?? '📦',
            execute: () => {
              void activateCapsuleAction(c.id)
              handleClose()
            },
          }),
        ),
      // REQ-013: 각 캡슐별 "보관/복원" 액션 (동적)
      ...capsules.map(
        (c): PaletteAction => ({
          id: `action-capsule-archive-${c.id}`,
          label: c.archived ? `캡슐: 복원 ${c.name}` : `캡슐: 보관 ${c.name}`,
          keywords: ['capsule', '캡슐', c.archived ? 'restore' : 'archive', c.archived ? '복원' : '보관', c.name.toLowerCase()],
          icon: c.archived ? '♻️' : '🗄️',
          execute: () => {
            archiveCapsuleAction(c.id, !c.archived)
            handleClose()
          },
        }),
      ),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onToggleTheme, onOpenImport, onResetLayout, onSignOut, onOpenQuickCapture, onOpenDedup, onRefreshFeed, onAddCategory, onToggleViewMode, viewMode, onOpenCreateCapsule, onOpenCapsuleList, onEditCapsule, capsules, activeCapsuleId, activateCapsuleAction, archiveCapsuleAction],
  )

  // 태그 문자열 배열 추출
  const tagStrings = useMemo(() => allTags.map((t) => t.tag), [allTags])

  // 통합 검색 실행 (deferredQuery 사용으로 성능 최적화)
  const searchResults = useMemo(() => {
    if (!deferredQuery.trim()) return []

    return searchAll(deferredQuery, {
      categories: bookmarks,
      tags: tagStrings,
      actions: paletteActions,
      getUsageScore: (type, id) => getScore(type as 'bookmark' | 'category' | 'tag' | 'action', id),
      // RAG 결과: 활성화된 경우에만 전달
      ragResults: (ragEnabled && ollamaAvailable && !modelMissing) ? ragResults : undefined,
    })
  }, [deferredQuery, bookmarks, tagStrings, paletteActions, getScore, ragEnabled, ollamaAvailable, modelMissing, ragResults])

  // 렌더링 아이템 목록 (그룹 헤더 포함)
  const renderItems = useMemo(() => buildRenderItems(searchResults), [searchResults])

  // 팔레트 닫기 핸들러
  const handleClose = useCallback(() => {
    close()
    onClose()
  }, [close, onClose])

  // 선택된 항목 실행
  const executeSelected = useCallback(
    (modifiers: { ctrl: boolean; alt: boolean }) => {
      const selected = searchResults[selectedIndex]
      if (selected === undefined) return

      if (selected.kind === 'bookmark') {
        recordUsage('bookmark', selected.link.id)
        if (modifiers.alt && onEditBookmark !== undefined) {
          // Alt+Enter: EditModal 열기
          onEditBookmark(selected.link.id)
          handleClose()
        } else if (modifiers.ctrl) {
          // Cmd/Ctrl+Enter: 새 창 열기
          window.open(selected.link.url, '_blank')
          handleClose()
        } else {
          // Enter: 같은 창 또는 새 탭 (기본 동작)
          if (onSelectBookmark !== undefined) {
            onSelectBookmark(selected.link.id, selected.categoryId)
          } else {
            window.open(selected.link.url, '_blank')
          }
          handleClose()
        }
      } else if (selected.kind === 'category') {
        recordUsage('category', selected.category.id)
        onSelectCategory?.(selected.category.id)
        handleClose()
      } else if (selected.kind === 'tag') {
        recordUsage('tag', selected.tag)
        onSelectTag?.(selected.tag)
        handleClose()
      } else if (selected.kind === 'action') {
        if (selected.action.disabled === true) return
        recordUsage('action', selected.action.id)
        selected.action.execute()
        // execute 내에서 handleClose 호출됨
      } else if (selected.kind === 'rag') {
        // RAG 결과: 북마크와 동일하게 새 탭으로 열기
        window.open(selected.link.url, '_blank', 'noopener')
        handleClose()
      }
    },
    [searchResults, selectedIndex, recordUsage, onEditBookmark, onSelectBookmark, onSelectCategory, onSelectTag, handleClose],
  )

  // 키보드 핸들러
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      switch (e.key) {
        case 'Escape':
          handleClose()
          break
        case 'ArrowDown':
          e.preventDefault()
          setSelectedIndex(Math.min(selectedIndex + 1, searchResults.length - 1))
          break
        case 'ArrowUp':
          e.preventDefault()
          setSelectedIndex(Math.max(selectedIndex - 1, 0))
          break
        case 'Enter': {
          e.preventDefault()
          const isCtrl = e.metaKey || e.ctrlKey
          const isAlt = e.altKey
          executeSelected({ ctrl: isCtrl, alt: isAlt })
          break
        }
        default:
          break
      }
    },
    [handleClose, setSelectedIndex, selectedIndex, searchResults.length, executeSelected],
  )

  // 오버레이 클릭 핸들러
  const handleOverlayMouseDown = (e: React.MouseEvent<HTMLDivElement>): void => {
    if (e.target === e.currentTarget) {
      handleClose()
    }
  }

  if (!isOpen) return null

  const isEmpty = query.trim() !== '' && searchResults.length === 0

  return (
    <div
      className="command-palette-overlay"
      data-testid="command-palette-overlay"
      onMouseDown={handleOverlayMouseDown}
    >
      <div
        className="command-palette"
        role="dialog"
        aria-modal="true"
        aria-label="명령 팔레트"
      >
        {/* RAG 상태 배지 (팔레트 헤더 영역) */}
        <div
          className="command-palette-rag-badge"
          style={{ padding: '4px 12px 0', display: 'flex', justifyContent: 'flex-end' }}
        >
          <RagStatusBadge
            ollamaAvailable={ollamaAvailable}
            modelMissing={modelMissing}
            onRetry={() => { void useRagStore.getState().checkHealth() }}
          />
        </div>

        {/* 검색 입력 */}
        <input
          ref={inputRef}
          role="combobox"
          aria-expanded={searchResults.length > 0}
          aria-autocomplete="list"
          aria-haspopup="listbox"
          aria-activedescendant={
            searchResults[selectedIndex] !== undefined
              ? `result-${selectedIndex}`
              : undefined
          }
          className="command-palette-input"
          placeholder="검색하거나 명령어를 입력하세요... (> 액션, # 태그, @ 카테고리, / 북마크)"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
          }}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          autoFocus
        />

        {/* 검색 결과 */}
        {searchResults.length > 0 && (
          <ul
            className="command-palette-results"
            role="listbox"
            aria-label="검색 결과"
          >
            {renderItems.map((item, idx) => {
              if (item.type === 'header') {
                return (
                  <li
                    key={`header-${item.group ?? idx}`}
                    className="command-palette-group-header"
                    role="presentation"
                  >
                    {GROUP_LABELS[item.group ?? ''] ?? item.group}
                  </li>
                )
              }

              const resultIdx = item.resultIndex ?? 0
              return (
                <ResultItem
                  key={`result-${resultIdx}`}
                  result={item.result!}
                  isSelected={resultIdx === selectedIndex}
                  onSelect={setSelectedIndex}
                  onHover={setSelectedIndex}
                  index={resultIdx}
                />
              )
            })}
          </ul>
        )}

        {/* Empty state */}
        {isEmpty && (
          <div className="command-palette-empty" data-testid="command-palette-empty">
            <p>결과 없음</p>
            <button
              className="command-palette-empty-action"
              onClick={() => {
                onOpenQuickCapture?.()
                handleClose()
              }}
            >
              이 텍스트로 새 북마크 추가
            </button>
          </div>
        )}

        {/* 푸터 키 가이드 */}
        <div className="command-palette-footer">
          <span>↑↓ 이동</span>
          <span>↵ 실행</span>
          <span>⌘↵ 새 창</span>
          <span>⌥↵ 편집</span>
          <span>Esc 닫기</span>
        </div>
      </div>
    </div>
  )
}
