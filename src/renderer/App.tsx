// @MX:NOTE: [AUTO] App 루트 컴포넌트 — 스토어 초기화, 레이아웃 조합, 테마 적용
// @MX:SPEC: SPEC-UI-001
import { useEffect, useState } from 'react'
import { useBookmarkStore } from './stores/bookmarkStore'
import { useTodoStore } from './stores/todoStore'
import { useThemeStore } from './stores/themeStore'
import { darkTheme, lightTheme } from './styles/themes'
import Clock from './components/Clock/Clock'
import SearchBar from './components/SearchBar/SearchBar'
import BookmarkCard from './components/BookmarkCard/BookmarkCard'
import EditModal from './components/EditModal/EditModal'
import TodoWidget from './components/TodoWidget/TodoWidget'
import NotesWidget from './components/NotesWidget/NotesWidget'
import type { Category } from './types'

const uid = () => Math.random().toString(36).slice(2, 9)

export default function App(): JSX.Element {
  const { bookmarks, loaded: bmLoaded, loadBookmarks, addBookmark, updateBookmark, removeBookmark } = useBookmarkStore()
  const { loaded: todoLoaded, loadTodos } = useTodoStore()
  const { mode, loaded: themeLoaded, loadTheme, toggleMode } = useThemeStore()

  const [editingCategory, setEditingCategory] = useState<Category | null>(null)

  useEffect(() => {
    void loadBookmarks()
    void loadTodos()
    void loadTheme()
  }, [loadBookmarks, loadTodos, loadTheme])

  const loaded = bmLoaded && todoLoaded && themeLoaded
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

  const handleSaveCategory = (updated: Category) => {
    // 새 카테고리인 경우 (bookmarks에 없는 id)
    if (bookmarks.find((b) => b.id === updated.id)) {
      updateBookmark(updated)
    } else {
      addBookmark(updated)
    }
    setEditingCategory(null)
  }

  const handleDeleteCategory = (id: string) => {
    removeBookmark(id)
    setEditingCategory(null)
  }

  const handleAddCategory = () => {
    const newCat: Category = {
      id: uid(),
      name: '새 카테고리',
      icon: '📌',
      links: [],
    }
    setEditingCategory(newCat)
  }

  return (
    <div
      style={{
        ...(theme as React.CSSProperties),
        background: 'var(--bg)',
        minHeight: '100vh',
        transition: 'background .3s',
      }}
    >
      {/* TopBar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 28px',
          maxWidth: 1200,
          margin: '0 auto',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 10,
              background: 'var(--accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 16,
            }}
          >
            🚀
          </div>
          <span
            style={{
              fontWeight: 700,
              fontSize: 16,
              color: 'var(--text-primary)',
              letterSpacing: -0.5,
            }}
          >
            My Hub
          </span>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button
            onClick={handleAddCategory}
            style={{
              padding: '7px 14px',
              borderRadius: 10,
              border: '1px solid var(--border)',
              background: 'var(--card-bg)',
              color: 'var(--text-muted)',
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            + 카테고리
          </button>
          <button
            data-testid="theme-toggle"
            onClick={toggleMode}
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              border: '1px solid var(--border)',
              background: 'var(--card-bg)',
              fontSize: 18,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {mode === 'dark' ? '☀️' : '🌙'}
          </button>
        </div>
      </div>

      <div
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          padding: '0 28px 40px',
        }}
      >
        {/* Hero: Clock (greeting included) + SearchBar */}
        <Clock />
        <div style={{ marginTop: 20, marginBottom: 36 }}>
          <SearchBar />
        </div>

        {/* Main Grid: Bookmarks | Sidebar */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 360px',
            gap: 24,
            alignItems: 'start',
          }}
        >
          {/* Bookmarks Grid */}
          <div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: 16,
              }}
            >
              {bookmarks.map((cat) => (
                <BookmarkCard
                  key={cat.id}
                  category={cat}
                  onEdit={setEditingCategory}
                />
              ))}
            </div>
          </div>

          {/* Sidebar: Todo + Notes */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <TodoWidget />
            <NotesWidget />
          </div>
        </div>
      </div>

      {/* EditModal */}
      {editingCategory && (
        <EditModal
          category={editingCategory}
          onSave={handleSaveCategory}
          onDelete={handleDeleteCategory}
          onClose={() => setEditingCategory(null)}
        />
      )}
    </div>
  )
}
