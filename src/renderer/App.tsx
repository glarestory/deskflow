// @MX:NOTE: [AUTO] App 루트 컴포넌트 — 스토어 초기화, 레이아웃 조합, 테마 적용, 인증 게이트
// @MX:NOTE: [AUTO] SPEC-UX-005: viewModeStore로 Pivot ↔ Widget 분기 (isPivotEnabled URL 파라미터 제거)
// @MX:NOTE: [AUTO] SPEC-SEARCH-RAG-001 AC-012 — 로그인 직후 누락 임베딩 자동 인덱싱
// @MX:SPEC: SPEC-AUTH-001, SPEC-LAYOUT-001, SPEC-UX-001, SPEC-UX-003, SPEC-UX-005, SPEC-SEARCH-RAG-001
import { useEffect, useState } from 'react'
import { useBookmarkStore } from './stores/bookmarkStore'
import { useTodoStore } from './stores/todoStore'
import { useThemeStore } from './stores/themeStore'
import { useAuthStore } from './stores/authStore'
import { useLayoutStore } from './stores/layoutStore'
import type { WidgetLayout } from './stores/layoutStore'
import { useViewModeStore } from './stores/viewModeStore'
import { useFeedStore } from './stores/feedStore'
import { usePomodoroStore } from './stores/pomodoroStore'
import { useCapsuleStore } from './stores/capsuleStore'
import { useEmbeddingStore } from './stores/embeddingStore'
import { useRagStore } from './stores/ragStore'
import { setUserStorage } from './lib/storage'
import { migrateLocalToFirestore } from './lib/migration'
import { darkTheme, lightTheme } from './styles/themes'
import EditModal from './components/EditModal/EditModal'
import ImportModal from './components/ImportModal/ImportModal'
import LoginScreen from './components/LoginScreen/LoginScreen'
import CommandPalette from './components/CommandPalette/CommandPalette'
import QuickCapture from './components/QuickCapture/QuickCapture'
import DedupModal from './components/DedupModal/DedupModal'
import CapsuleEditModal from './components/CapsuleEditModal/CapsuleEditModal'
import CapsuleListPanel from './components/CapsuleListPanel/CapsuleListPanel'
import ProgressToast from './components/ProgressToast/ProgressToast'
import { useCommandPalette } from './hooks/useCommandPalette'
import { useViewStore } from './stores/viewStore'
import PivotLayout from './components/PivotLayout/PivotLayout'
import WidgetLayoutComponent from './components/WidgetLayout/WidgetLayout'
import type { Category } from './types'
import type { Capsule } from './types/capsule'

export default function App(): JSX.Element {
  const { user, loading: authLoading, initAuth, signOut } = useAuthStore()
  const { setContext: setPivotContext } = useViewStore()
  const { bookmarks, loadBookmarks, addBookmark, updateBookmark, removeBookmark } = useBookmarkStore()
  const { loaded: todoLoaded, loadTodos } = useTodoStore()
  const { mode, loaded: themeLoaded, loadTheme, toggleMode } = useThemeStore()
  const { layout: _layout, loaded: layoutLoaded, loadLayout, updateLayout, resetLayout } = useLayoutStore()
  // @MX:NOTE: [AUTO] SPEC-UX-005: viewModeStore로 Pivot ↔ Widget 분기 관리
  const { mode: viewMode, loaded: viewModeLoaded, loadMode, toggleMode: toggleViewMode } = useViewModeStore()
  // @MX:NOTE: [AUTO] SPEC-WIDGET-003: feedStore의 저장된 피드 복원
  // 버그 수정: 기존엔 loadFeeds가 호출되지 않아 앱 재시작 시 피드 데이터가 사라짐
  const { loadFeeds } = useFeedStore()
  // @MX:NOTE: [AUTO] SPEC-WIDGET-004: pomodoroStore 설정 복원
  // 버그 수정: loadSettings 부재로 focus/break 설정이 앱 재시작 시 기본값으로 돌아감
  const { loadSettings: loadPomodoroSettings } = usePomodoroStore()
  // @MX:NOTE: [AUTO] SPEC-CAPSULE-001: capsuleStore 로드 + 캡슐 액션 (REQ-003, REQ-006, REQ-018)
  const {
    loadCapsules,
    createCapsule,
    updateCapsule,
    deleteCapsule,
  } = useCapsuleStore()

  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [showImportModal, setShowImportModal] = useState(false)
  const [showQuickCapture, setShowQuickCapture] = useState(false)
  const [showDedupModal, setShowDedupModal] = useState(false)
  // @MX:NOTE: [AUTO] SPEC-CAPSULE-001 REQ-009, REQ-015: 캡슐 편집 모달 / 목록 패널 상태
  // editingCapsule === 'new' → 신규 생성, Capsule → 기존 편집, null → 닫힘
  const [editingCapsule, setEditingCapsule] = useState<Capsule | 'new' | null>(null)
  const [showCapsuleList, setShowCapsuleList] = useState(false)

  // REQ-001: Cmd+K / Ctrl+K 단축키로 Command Palette 열기
  const { isOpen: isPaletteOpen, closePalette } = useCommandPalette()

  // 인증 상태 구독 초기화
  useEffect(() => {
    const unsubscribe = initAuth()
    return unsubscribe
  }, [initAuth])

  // 인증 상태 변경 시 저장소 전환 및 데이터 로드
  useEffect(() => {
    if (authLoading) return

    const setupAndLoad = async (): Promise<void> => {
      if (user !== null) {
        setUserStorage(user.uid)
        await migrateLocalToFirestore(user.uid)
      } else {
        setUserStorage(null)
      }
      void loadBookmarks()
      void loadTodos()
      void loadTheme()
      void loadLayout()
      // SPEC-UX-005: viewMode 로드
      void loadMode()
      // SPEC-WIDGET-003: 저장된 RSS 피드 복원 (버그 수정)
      void loadFeeds()
      // SPEC-WIDGET-004: 저장된 포모도로 설정 복원 (버그 수정)
      void loadPomodoroSettings()
      // SPEC-CAPSULE-001: 저장된 캡슐 복원
      void loadCapsules()

      // @MX:NOTE: [AUTO] SPEC-SEARCH-RAG-001 AC-012 — RAG 초기화 체인
      // 1) 임베딩 복원 → 2) RAG 설정 복원 → 3) health check (백그라운드) → 4) 누락 링크 인덱싱
      const initRag = async (): Promise<void> => {
        // 1. 임베딩 데이터 복원 (스토리지 → Map)
        await useEmbeddingStore.getState().loadEmbeddings()
        // 2. RAG 설정 복원 (enabled, similarityThreshold)
        await useRagStore.getState().loadSettings()
        // 3. Ollama health check (백그라운드 — UI 블로킹 없음)
        void useRagStore.getState().checkHealth()

        // 4. AC-012: 북마크에서 누락된 linkId를 큐에 추가 후 배치 인덱싱
        // loadBookmarks()가 비동기이므로 getState()로 현재 bookmarks 읽음
        // (bookmarks가 아직 빈 배열이면 enqueueIndex는 no-op)
        const { bookmarks } = useBookmarkStore.getState()
        const { embeddings } = useEmbeddingStore.getState()

        const missingLinkIds: string[] = []
        for (const category of bookmarks) {
          for (const link of category.links) {
            if (!embeddings.has(link.id)) {
              missingLinkIds.push(link.id)
            }
          }
        }

        if (missingLinkIds.length > 0) {
          useEmbeddingStore.getState().enqueueIndex(missingLinkIds)

          // 큐가 빌 때까지 배치 실행 (메인 스레드 양보 포함)
          const drainQueue = async (): Promise<void> => {
            while (useEmbeddingStore.getState().indexingQueue.length > 0) {
              await useEmbeddingStore.getState().runIndexBatch()
              // 메인 스레드에 양보
              await new Promise<void>((resolve) => { setTimeout(resolve, 50) })
            }
          }
          void drainQueue()
        }
      }
      void initRag()
    }

    void setupAndLoad()
  }, [user, authLoading, loadBookmarks, loadTodos, loadTheme, loadLayout, loadMode, loadFeeds, loadPomodoroSettings, loadCapsules])

  // @MX:NOTE: [AUTO] SPEC-CAPSULE-001 REQ-014: Cmd/Ctrl+Shift+N — 신규 캡슐 생성 단축키 (AC-023)
  // Hook은 early return 이전에 호출되어야 함 (React Hooks 규칙)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      // 입력 필드 포커스 중에는 동작 안 함
      const target = e.target as HTMLElement | null
      const tagName = target?.tagName
      if (tagName === 'INPUT' || tagName === 'TEXTAREA' || target?.isContentEditable === true) {
        return
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === 'N' || e.key === 'n')) {
        e.preventDefault()
        setEditingCapsule('new')
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  // 인증 로딩 중
  if (authLoading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          background: '#0f1117',
          color: '#6b7094',
        }}
      >
        로딩 중...
      </div>
    )
  }

  // 미로그인 상태
  if (user === null) {
    return <LoginScreen />
  }

  // @MX:NOTE: [AUTO] AC-011: viewModeLoaded 포함하여 로딩 중 깜빡임 방지
  const loaded = todoLoaded && themeLoaded && layoutLoaded && viewModeLoaded
  const theme = mode === 'dark' ? darkTheme : lightTheme

  if (!loaded) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          background: '#0f1117',
          color: '#6b7094',
        }}
      >
        로딩 중...
      </div>
    )
  }

  const handleSaveCategory = (updated: Category): void => {
    if (bookmarks.find((b) => b.id === updated.id)) {
      updateBookmark(updated)
    } else {
      addBookmark(updated)
    }
    setEditingCategory(null)
  }

  const handleDeleteCategory = (id: string): void => {
    removeBookmark(id)
    setEditingCategory(null)
  }

  const uid = (): string => Math.random().toString(36).slice(2, 9)

  const handleAddCategory = (): void => {
    const newCat: Category = {
      id: uid(),
      name: '새 카테고리',
      icon: '📌',
      links: [],
    }
    setEditingCategory(newCat)
  }

  const handleLayoutChange = (newLayout: WidgetLayout[]): void => {
    updateLayout(newLayout)
  }

  // SPEC-CAPSULE-001 REQ-009: 캡슐 저장 핸들러 (신규 생성 또는 기존 편집)
  const handleSaveCapsule = (data: Partial<Capsule>): void => {
    if (editingCapsule === 'new' || editingCapsule === null) {
      createCapsule(data)
    } else {
      updateCapsule(editingCapsule.id, data)
    }
    setEditingCapsule(null)
  }

  // SPEC-CAPSULE-001 REQ-018: 캡슐 삭제 핸들러
  const handleDeleteCapsule = (id: string): void => {
    deleteCapsule(id)
    setEditingCapsule(null)
  }

  return (
    <div style={{ ...(theme as React.CSSProperties), height: '100%' }}>
      {/* @MX:NOTE: [AUTO] SPEC-UX-005: viewMode 분기 — pivot: PivotLayout, widgets: WidgetLayout */}
      {viewMode === 'pivot' ? (
        <PivotLayout
          onOpenCapsuleList={() => setShowCapsuleList(true)}
          onOpenCreateCapsule={() => setEditingCapsule('new')}
        />
      ) : (
        <WidgetLayoutComponent
          handleAddCategory={handleAddCategory}
          handleLayoutChange={handleLayoutChange}
          onOpenImport={() => setShowImportModal(true)}
          onOpenQuickCapture={() => setShowQuickCapture(true)}
          onOpenDedup={() => setShowDedupModal(true)}
          onSetEditingCategory={setEditingCategory}
          onTogglePivotMode={toggleViewMode}
          onOpenCapsuleList={() => setShowCapsuleList(true)}
          onOpenCreateCapsule={() => setEditingCapsule('new')}
        />
      )}

      {/* 공통 UI — 두 모드 모두 사용 */}
      {editingCategory !== null && (
        <EditModal
          category={editingCategory}
          onSave={handleSaveCategory}
          onDelete={handleDeleteCategory}
          onClose={() => setEditingCategory(null)}
        />
      )}
      {showImportModal && (
        <ImportModal onClose={() => setShowImportModal(false)} />
      )}
      <QuickCapture
        isOpen={showQuickCapture}
        onClose={() => setShowQuickCapture(false)}
      />
      <DedupModal
        isOpen={showDedupModal}
        onClose={() => setShowDedupModal(false)}
      />
      {/* @MX:NOTE: [AUTO] SPEC-CAPSULE-001 REQ-009: 캡슐 편집 모달 */}
      {editingCapsule !== null && (
        <CapsuleEditModal
          capsule={editingCapsule === 'new' ? null : editingCapsule}
          onSave={handleSaveCapsule}
          onClose={() => setEditingCapsule(null)}
          onDelete={editingCapsule !== 'new' ? handleDeleteCapsule : undefined}
        />
      )}
      {/* @MX:NOTE: [AUTO] SPEC-CAPSULE-001 REQ-015: 캡슐 목록 패널 */}
      {showCapsuleList && (
        <CapsuleListPanel
          onEdit={(cap) => {
            setShowCapsuleList(false)
            setEditingCapsule(cap)
          }}
          onClose={() => setShowCapsuleList(false)}
        />
      )}
      {/* SPEC-SEARCH-RAG-001 AC-013 AC-014: 임베딩 인덱싱 진행률 Toast */}
      <ProgressToast />
      {/* Command Palette — REQ-001: Cmd+K / Ctrl+K, SPEC-UX-002, SPEC-CAPSULE-001 REQ-013 */}
      <CommandPalette
        isOpen={isPaletteOpen}
        onClose={closePalette}
        onToggleTheme={toggleMode}
        onOpenImport={() => setShowImportModal(true)}
        onResetLayout={resetLayout}
        onSignOut={() => { void signOut() }}
        onOpenQuickCapture={() => setShowQuickCapture(true)}
        onOpenDedup={() => setShowDedupModal(true)}
        onAddCategory={handleAddCategory}
        onToggleViewMode={toggleViewMode}
        onOpenCreateCapsule={() => setEditingCapsule('new')}
        onOpenCapsuleList={() => setShowCapsuleList(true)}
        onEditCapsule={(capsuleId) => {
          const cap = useCapsuleStore.getState().capsules.find((c) => c.id === capsuleId)
          if (cap !== undefined) setEditingCapsule(cap)
        }}
        onSelectCategory={(categoryId) => {
          // SPEC-UX-003: viewStore 카테고리 컨텍스트로 이동
          setPivotContext({ kind: 'category', categoryId })
          const cat = bookmarks.find((b) => b.id === categoryId)
          if (cat !== undefined) setEditingCategory(cat)
        }}
        onSelectTag={(tag) => {
          // SPEC-UX-003: viewStore 태그 컨텍스트로 이동
          setPivotContext({ kind: 'tag', tag })
        }}
      />
    </div>
  )
}
