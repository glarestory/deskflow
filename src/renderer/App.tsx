// @MX:NOTE: [AUTO] App 루트 컴포넌트 — 스토어 초기화, 레이아웃 조합, 테마 적용, 인증 게이트
// @MX:NOTE: [AUTO] SPEC-UX-005: viewModeStore로 Pivot ↔ Widget 분기 (isPivotEnabled URL 파라미터 제거)
// @MX:SPEC: SPEC-AUTH-001, SPEC-LAYOUT-001, SPEC-UX-001, SPEC-UX-003, SPEC-UX-005
import { useEffect, useState } from 'react'
import { useBookmarkStore } from './stores/bookmarkStore'
import { useTodoStore } from './stores/todoStore'
import { useThemeStore } from './stores/themeStore'
import { useAuthStore } from './stores/authStore'
import { useLayoutStore } from './stores/layoutStore'
import type { WidgetLayout } from './stores/layoutStore'
import { useViewModeStore } from './stores/viewModeStore'
import { setUserStorage } from './lib/storage'
import { migrateLocalToFirestore } from './lib/migration'
import { darkTheme, lightTheme } from './styles/themes'
import EditModal from './components/EditModal/EditModal'
import ImportModal from './components/ImportModal/ImportModal'
import LoginScreen from './components/LoginScreen/LoginScreen'
import CommandPalette from './components/CommandPalette/CommandPalette'
import QuickCapture from './components/QuickCapture/QuickCapture'
import DedupModal from './components/DedupModal/DedupModal'
import { useCommandPalette } from './hooks/useCommandPalette'
import { useViewStore } from './stores/viewStore'
import PivotLayout from './components/PivotLayout/PivotLayout'
import WidgetLayoutComponent from './components/WidgetLayout/WidgetLayout'
import type { Category } from './types'

export default function App(): JSX.Element {
  const { user, loading: authLoading, initAuth, signOut } = useAuthStore()
  const { setContext: setPivotContext } = useViewStore()
  const { bookmarks, loadBookmarks, addBookmark, updateBookmark, removeBookmark } = useBookmarkStore()
  const { loaded: todoLoaded, loadTodos } = useTodoStore()
  const { mode, loaded: themeLoaded, loadTheme, toggleMode } = useThemeStore()
  const { layout: _layout, loaded: layoutLoaded, loadLayout, updateLayout, resetLayout } = useLayoutStore()
  // @MX:NOTE: [AUTO] SPEC-UX-005: viewModeStore로 Pivot ↔ Widget 분기 관리
  const { mode: viewMode, loaded: viewModeLoaded, loadMode, toggleMode: toggleViewMode } = useViewModeStore()

  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [showImportModal, setShowImportModal] = useState(false)
  const [showQuickCapture, setShowQuickCapture] = useState(false)
  const [showDedupModal, setShowDedupModal] = useState(false)

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
    }

    void setupAndLoad()
  }, [user, authLoading, loadBookmarks, loadTodos, loadTheme, loadLayout, loadMode])

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

  return (
    <div style={{ ...(theme as React.CSSProperties), height: '100%' }}>
      {/* @MX:NOTE: [AUTO] SPEC-UX-005: viewMode 분기 — pivot: PivotLayout, widgets: WidgetLayout */}
      {viewMode === 'pivot' ? (
        <PivotLayout />
      ) : (
        <WidgetLayoutComponent
          handleAddCategory={handleAddCategory}
          handleLayoutChange={handleLayoutChange}
          onOpenImport={() => setShowImportModal(true)}
          onOpenQuickCapture={() => setShowQuickCapture(true)}
          onOpenDedup={() => setShowDedupModal(true)}
          onSetEditingCategory={setEditingCategory}
          onTogglePivotMode={toggleViewMode}
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
      {/* Command Palette — REQ-001: Cmd+K / Ctrl+K, SPEC-UX-002 */}
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
