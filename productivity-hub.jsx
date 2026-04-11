import { useState, useEffect, useCallback, useRef } from "react";

// ─── Default Data ───────────────────────────────────────────────
const DEFAULT_BOOKMARKS = [
  {
    id: "cat-1",
    name: "Work",
    icon: "💼",
    links: [
      { id: "l1", title: "Gmail", url: "https://mail.google.com", icon: "✉️" },
      { id: "l2", title: "Google Drive", url: "https://drive.google.com", icon: "📁" },
      { id: "l3", title: "Notion", url: "https://notion.so", icon: "📝" },
      { id: "l4", title: "Slack", url: "https://slack.com", icon: "💬" },
    ],
  },
  {
    id: "cat-2",
    name: "Dev",
    icon: "⚡",
    links: [
      { id: "l5", title: "GitHub", url: "https://github.com", icon: "🐙" },
      { id: "l6", title: "Stack Overflow", url: "https://stackoverflow.com", icon: "📚" },
      { id: "l7", title: "CodePen", url: "https://codepen.io", icon: "🖊️" },
      { id: "l8", title: "MDN Docs", url: "https://developer.mozilla.org", icon: "📖" },
    ],
  },
  {
    id: "cat-3",
    name: "Media",
    icon: "🎧",
    links: [
      { id: "l9", title: "YouTube", url: "https://youtube.com", icon: "▶️" },
      { id: "l10", title: "Spotify", url: "https://open.spotify.com", icon: "🎵" },
      { id: "l11", title: "Netflix", url: "https://netflix.com", icon: "🎬" },
      { id: "l12", title: "Reddit", url: "https://reddit.com", icon: "🗨️" },
    ],
  },
  {
    id: "cat-4",
    name: "Tools",
    icon: "🛠️",
    links: [
      { id: "l13", title: "ChatGPT", url: "https://chat.openai.com", icon: "🤖" },
      { id: "l14", title: "Claude", url: "https://claude.ai", icon: "🧠" },
      { id: "l15", title: "Figma", url: "https://figma.com", icon: "🎨" },
      { id: "l16", title: "Canva", url: "https://canva.com", icon: "🖼️" },
    ],
  },
];

const DEFAULT_TODOS = [
  { id: "t1", text: "프로젝트 기획서 작성", done: false },
  { id: "t2", text: "주간 회의 준비", done: false },
  { id: "t3", text: "디자인 리뷰", done: true },
];

const DEFAULT_NOTES = "여기에 메모를 작성하세요...";

const GREETINGS = () => {
  const h = new Date().getHours();
  if (h < 6) return "Good Night";
  if (h < 12) return "Good Morning";
  if (h < 18) return "Good Afternoon";
  return "Good Evening";
};

const uid = () => Math.random().toString(36).slice(2, 9);

// ─── Storage helpers ────────────────────────────────────────────
async function load(key, fallback) {
  try {
    const r = await window.storage.get(key);
    return r ? JSON.parse(r.value) : fallback;
  } catch {
    return fallback;
  }
}
async function save(key, value) {
  try {
    await window.storage.set(key, JSON.stringify(value));
  } catch (e) {
    console.error("Storage save error:", e);
  }
}

// ─── Components ─────────────────────────────────────────────────

function Clock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const time = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
  const secs = now.toLocaleTimeString("en-US", { second: "2-digit", hour12: false }).split(":")[2];
  const date = now.toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric", weekday: "long" });

  return (
    <div style={{ textAlign: "center", padding: "12px 0 4px" }}>
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 56, fontWeight: 700, letterSpacing: -2, color: "var(--text-primary)", lineHeight: 1 }}>
        {time}<span style={{ fontSize: 24, opacity: 0.4, marginLeft: 4 }}>{secs}</span>
      </div>
      <div style={{ fontFamily: "'Noto Sans KR', sans-serif", fontSize: 14, color: "var(--text-muted)", marginTop: 6 }}>{date}</div>
    </div>
  );
}

function SearchBar() {
  const [q, setQ] = useState("");
  const go = (e) => {
    e.preventDefault();
    if (q.trim()) window.open(`https://www.google.com/search?q=${encodeURIComponent(q)}`, "_blank");
  };
  return (
    <form onSubmit={go} style={{ display: "flex", alignItems: "center", background: "var(--card-bg)", border: "1.5px solid var(--border)", borderRadius: 14, padding: "0 16px", height: 48, maxWidth: 560, margin: "0 auto", transition: "border-color .2s" }}>
      <span style={{ fontSize: 18, marginRight: 10, opacity: 0.45 }}>🔍</span>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Google에서 검색..."
        style={{ flex: 1, background: "transparent", border: "none", outline: "none", fontSize: 15, color: "var(--text-primary)", fontFamily: "'Noto Sans KR', sans-serif" }}
      />
    </form>
  );
}

function BookmarkCard({ category, onEdit, onDelete }) {
  return (
    <div style={{ background: "var(--card-bg)", borderRadius: 16, padding: "18px 20px", border: "1px solid var(--border)", transition: "transform .15s, box-shadow .15s" }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 24px var(--shadow)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 20 }}>{category.icon}</span>
          <span style={{ fontFamily: "'Noto Sans KR', sans-serif", fontWeight: 700, fontSize: 15, color: "var(--text-primary)" }}>{category.name}</span>
        </div>
        <button onClick={() => onEdit(category)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, opacity: 0.35, color: "var(--text-primary)" }}>⚙️</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {category.links.map((link) => (
          <a key={link.id} href={link.url} target="_blank" rel="noopener noreferrer"
            style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderRadius: 10, background: "var(--link-bg)", textDecoration: "none", color: "var(--text-primary)", transition: "background .15s", fontSize: 13, fontFamily: "'Noto Sans KR', sans-serif" }}
            onMouseEnter={(e) => e.currentTarget.style.background = "var(--link-hover)"}
            onMouseLeave={(e) => e.currentTarget.style.background = "var(--link-bg)"}
          >
            <span style={{ fontSize: 16 }}>{link.icon}</span>
            <span style={{ fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{link.title}</span>
          </a>
        ))}
      </div>
    </div>
  );
}

function TodoWidget({ todos, setTodos }) {
  const [input, setInput] = useState("");
  const add = () => {
    if (!input.trim()) return;
    setTodos((p) => [...p, { id: uid(), text: input.trim(), done: false }]);
    setInput("");
  };
  const toggle = (id) => setTodos((p) => p.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  const remove = (id) => setTodos((p) => p.filter((t) => t.id !== id));

  return (
    <div style={{ background: "var(--card-bg)", borderRadius: 16, padding: "18px 20px", border: "1px solid var(--border)", height: "100%" }}>
      <div style={{ fontFamily: "'Noto Sans KR', sans-serif", fontWeight: 700, fontSize: 15, color: "var(--text-primary)", marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
        <span>✅</span> 할 일 목록
        <span style={{ fontSize: 12, fontWeight: 400, color: "var(--text-muted)", marginLeft: "auto" }}>{todos.filter((t) => !t.done).length}개 남음</span>
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="새 할 일 추가..."
          style={{ flex: 1, padding: "8px 12px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--link-bg)", color: "var(--text-primary)", fontSize: 13, fontFamily: "'Noto Sans KR', sans-serif", outline: "none" }} />
        <button onClick={add} style={{ padding: "8px 14px", borderRadius: 10, border: "none", background: "var(--accent)", color: "#fff", fontSize: 13, cursor: "pointer", fontWeight: 600 }}>추가</button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 220, overflowY: "auto" }}>
        {todos.map((t) => (
          <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 8, background: "var(--link-bg)", transition: "opacity .2s" }}>
            <div onClick={() => toggle(t.id)} style={{ width: 20, height: 20, borderRadius: 6, border: t.done ? "none" : "2px solid var(--border)", background: t.done ? "var(--accent)" : "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 12, color: "#fff", transition: "all .15s" }}>
              {t.done && "✓"}
            </div>
            <span style={{ flex: 1, fontSize: 13, fontFamily: "'Noto Sans KR', sans-serif", color: "var(--text-primary)", textDecoration: t.done ? "line-through" : "none", opacity: t.done ? 0.45 : 1 }}>{t.text}</span>
            <button onClick={() => remove(t.id)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, opacity: 0.3, color: "var(--text-primary)", padding: 4 }}>✕</button>
          </div>
        ))}
      </div>
    </div>
  );
}

function NotesWidget({ notes, setNotes }) {
  const timeout = useRef(null);
  const handleChange = (val) => {
    setNotes(val);
    clearTimeout(timeout.current);
    timeout.current = setTimeout(() => save("hub-notes", val), 600);
  };
  return (
    <div style={{ background: "var(--card-bg)", borderRadius: 16, padding: "18px 20px", border: "1px solid var(--border)", height: "100%" }}>
      <div style={{ fontFamily: "'Noto Sans KR', sans-serif", fontWeight: 700, fontSize: 15, color: "var(--text-primary)", marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
        <span>📒</span> 빠른 메모
      </div>
      <textarea value={notes} onChange={(e) => handleChange(e.target.value)}
        style={{ width: "100%", minHeight: 200, padding: 12, borderRadius: 10, border: "1px solid var(--border)", background: "var(--link-bg)", color: "var(--text-primary)", fontSize: 13, fontFamily: "'Noto Sans KR', sans-serif", outline: "none", resize: "vertical", lineHeight: 1.7, boxSizing: "border-box" }} />
    </div>
  );
}

// ─── Edit Modal ─────────────────────────────────────────────────
function EditModal({ category, onSave, onClose, onDeleteCategory }) {
  const [cat, setCat] = useState(JSON.parse(JSON.stringify(category)));
  const updateLink = (idx, field, val) => {
    const links = [...cat.links];
    links[idx] = { ...links[idx], [field]: val };
    setCat({ ...cat, links });
  };
  const addLink = () => setCat({ ...cat, links: [...cat.links, { id: uid(), title: "", url: "", icon: "🔗" }] });
  const removeLink = (idx) => setCat({ ...cat, links: cat.links.filter((_, i) => i !== idx) });

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999, padding: 20 }}
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{ background: "var(--card-bg)", borderRadius: 20, padding: 28, maxWidth: 500, width: "100%", maxHeight: "80vh", overflowY: "auto", border: "1px solid var(--border)" }}>
        <h3 style={{ fontFamily: "'Noto Sans KR', sans-serif", fontSize: 18, fontWeight: 700, color: "var(--text-primary)", margin: "0 0 20px" }}>카테고리 편집</h3>
        <div style={{ display: "flex", gap: 10, marginBottom: 18 }}>
          <input value={cat.icon} onChange={(e) => setCat({ ...cat, icon: e.target.value })} style={{ width: 50, textAlign: "center", padding: 8, borderRadius: 10, border: "1px solid var(--border)", background: "var(--link-bg)", color: "var(--text-primary)", fontSize: 20, outline: "none" }} />
          <input value={cat.name} onChange={(e) => setCat({ ...cat, name: e.target.value })} placeholder="카테고리 이름"
            style={{ flex: 1, padding: "8px 14px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--link-bg)", color: "var(--text-primary)", fontSize: 14, fontFamily: "'Noto Sans KR', sans-serif", outline: "none" }} />
        </div>
        {cat.links.map((link, i) => (
          <div key={link.id} style={{ display: "flex", gap: 8, marginBottom: 10, alignItems: "center" }}>
            <input value={link.icon} onChange={(e) => updateLink(i, "icon", e.target.value)} style={{ width: 40, textAlign: "center", padding: 6, borderRadius: 8, border: "1px solid var(--border)", background: "var(--link-bg)", color: "var(--text-primary)", fontSize: 16, outline: "none" }} />
            <input value={link.title} onChange={(e) => updateLink(i, "title", e.target.value)} placeholder="이름"
              style={{ flex: 1, padding: "6px 10px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--link-bg)", color: "var(--text-primary)", fontSize: 13, fontFamily: "'Noto Sans KR', sans-serif", outline: "none" }} />
            <input value={link.url} onChange={(e) => updateLink(i, "url", e.target.value)} placeholder="URL"
              style={{ flex: 1.5, padding: "6px 10px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--link-bg)", color: "var(--text-primary)", fontSize: 13, fontFamily: "'Noto Sans KR', sans-serif", outline: "none" }} />
            <button onClick={() => removeLink(i)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, color: "#e74c3c", padding: 4 }}>✕</button>
          </div>
        ))}
        <button onClick={addLink} style={{ width: "100%", padding: 10, borderRadius: 10, border: "2px dashed var(--border)", background: "transparent", color: "var(--text-muted)", fontSize: 13, cursor: "pointer", marginBottom: 20, fontFamily: "'Noto Sans KR', sans-serif" }}>+ 링크 추가</button>
        <div style={{ display: "flex", gap: 10, justifyContent: "space-between" }}>
          <button onClick={() => onDeleteCategory(cat.id)} style={{ padding: "10px 18px", borderRadius: 10, border: "1px solid #e74c3c", background: "transparent", color: "#e74c3c", fontSize: 13, cursor: "pointer", fontWeight: 600 }}>삭제</button>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={onClose} style={{ padding: "10px 18px", borderRadius: 10, border: "1px solid var(--border)", background: "transparent", color: "var(--text-muted)", fontSize: 13, cursor: "pointer" }}>취소</button>
            <button onClick={() => onSave(cat)} style={{ padding: "10px 24px", borderRadius: 10, border: "none", background: "var(--accent)", color: "#fff", fontSize: 13, cursor: "pointer", fontWeight: 600 }}>저장</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main App ───────────────────────────────────────────────────
export default function ProductivityHub() {
  const [dark, setDark] = useState(true);
  const [bookmarks, setBookmarks] = useState(DEFAULT_BOOKMARKS);
  const [todos, setTodos] = useState(DEFAULT_TODOS);
  const [notes, setNotes] = useState(DEFAULT_NOTES);
  const [editing, setEditing] = useState(null);
  const [loaded, setLoaded] = useState(false);

  // Load from storage
  useEffect(() => {
    (async () => {
      const [bm, td, nt, dk] = await Promise.all([
        load("hub-bookmarks", DEFAULT_BOOKMARKS),
        load("hub-todos", DEFAULT_TODOS),
        load("hub-notes", DEFAULT_NOTES),
        load("hub-dark", true),
      ]);
      setBookmarks(bm);
      setTodos(td);
      setNotes(nt);
      setDark(dk);
      setLoaded(true);
    })();
  }, []);

  // Auto-save bookmarks & todos
  useEffect(() => { if (loaded) save("hub-bookmarks", bookmarks); }, [bookmarks, loaded]);
  useEffect(() => { if (loaded) save("hub-todos", todos); }, [todos, loaded]);
  useEffect(() => { if (loaded) save("hub-dark", dark); }, [dark, loaded]);

  const handleSaveCategory = (updated) => {
    setBookmarks((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    setEditing(null);
  };
  const handleDeleteCategory = (id) => {
    setBookmarks((prev) => prev.filter((c) => c.id !== id));
    setEditing(null);
  };
  const addCategory = () => {
    const newCat = { id: uid(), name: "새 카테고리", icon: "📌", links: [] };
    setBookmarks((prev) => [...prev, newCat]);
    setEditing(newCat);
  };

  const theme = dark
    ? {
        "--bg": "#0f1117",
        "--bg-pattern": "#161822",
        "--card-bg": "#1a1d2b",
        "--border": "#2a2d3d",
        "--text-primary": "#e4e6f0",
        "--text-muted": "#6b7094",
        "--link-bg": "#22253a",
        "--link-hover": "#2c3050",
        "--accent": "#6366f1",
        "--shadow": "rgba(0,0,0,0.25)",
        "--glow": "rgba(99,102,241,0.08)",
      }
    : {
        "--bg": "#f0f1f5",
        "--bg-pattern": "#e8e9ef",
        "--card-bg": "#ffffff",
        "--border": "#e0e2ea",
        "--text-primary": "#1a1d2b",
        "--text-muted": "#8b8fa8",
        "--link-bg": "#f5f6fa",
        "--link-hover": "#ecedf3",
        "--accent": "#6366f1",
        "--shadow": "rgba(0,0,0,0.06)",
        "--glow": "rgba(99,102,241,0.05)",
      };

  if (!loaded)
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "#0f1117", color: "#6b7094", fontFamily: "'Noto Sans KR', sans-serif" }}>
        로딩 중...
      </div>
    );

  return (
    <div style={{ ...theme, background: "var(--bg)", minHeight: "100vh", fontFamily: "'Noto Sans KR', sans-serif", transition: "background .3s" }}>
      <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&family=Noto+Sans+KR:wght@400;500;700&display=swap" rel="stylesheet" />

      {/* Top bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 28px", maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 10, background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🚀</div>
          <span style={{ fontWeight: 700, fontSize: 16, color: "var(--text-primary)", letterSpacing: -0.5 }}>My Hub</span>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button onClick={addCategory} style={{ padding: "7px 14px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--card-bg)", color: "var(--text-muted)", fontSize: 12, cursor: "pointer", fontFamily: "'Noto Sans KR', sans-serif" }}>+ 카테고리</button>
          <button onClick={() => setDark(!dark)} style={{ width: 38, height: 38, borderRadius: 10, border: "1px solid var(--border)", background: "var(--card-bg)", fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {dark ? "☀️" : "🌙"}
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 28px 40px" }}>
        {/* Greeting + Clock + Search */}
        <div style={{ textAlign: "center", marginBottom: 8 }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: "var(--text-primary)", marginBottom: 2 }}>{GREETINGS()} 👋</div>
        </div>
        <Clock />
        <div style={{ marginTop: 20, marginBottom: 36 }}>
          <SearchBar />
        </div>

        {/* Main Grid: Bookmarks + Sidebar */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 24, alignItems: "start" }}>
          {/* Bookmarks Grid */}
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
              {bookmarks.map((cat) => (
                <BookmarkCard key={cat.id} category={cat} onEdit={setEditing} onDelete={handleDeleteCategory} />
              ))}
            </div>
          </div>

          {/* Sidebar: Todo + Notes */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <TodoWidget todos={todos} setTodos={setTodos} />
            <NotesWidget notes={notes} setNotes={setNotes} />
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {editing && (
        <EditModal category={editing} onSave={handleSaveCategory} onClose={() => setEditing(null)} onDeleteCategory={handleDeleteCategory} />
      )}

      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }
        ::placeholder { color: var(--text-muted); }
        textarea::-webkit-scrollbar { width: 4px; }
        @media (max-width: 900px) {
          div[style*="gridTemplateColumns: \"1fr 360px\""] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
