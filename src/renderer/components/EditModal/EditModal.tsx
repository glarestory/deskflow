// @MX:NOTE: [AUTO] EditModal — 카테고리 및 링크 편집 모달, 저장/삭제/닫기 콜백
// @MX:SPEC: SPEC-UI-001, SPEC-BOOKMARK-003
import { useState } from 'react'
import type { Category, Link } from '../../types'
import TagInput from '../TagInput/TagInput'
import { useTagStore } from '../../stores/tagStore'

const uid = () => Math.random().toString(36).slice(2, 9)

interface EditModalProps {
  category: Category
  onSave: (category: Category) => void
  onDelete: (id: string) => void
  onClose: () => void
}

export default function EditModal({
  category,
  onSave,
  onDelete,
  onClose,
}: EditModalProps): JSX.Element {
  const [cat, setCat] = useState<Category>(JSON.parse(JSON.stringify(category)) as Category)
  const allTags = useTagStore((s) => s.allTags)
  const tagSuggestions = allTags.map((t) => t.tag)

  const updateLink = (idx: number, field: keyof Link, val: string) => {
    const links = [...cat.links]
    links[idx] = { ...links[idx], [field]: val }
    setCat({ ...cat, links })
  }

  const updateLinkTags = (idx: number, tags: string[]) => {
    const links = [...cat.links]
    links[idx] = { ...links[idx], tags }
    setCat({ ...cat, links })
  }

  const addLink = () => {
    setCat({ ...cat, links: [...cat.links, { id: uid(), name: '', url: '', tags: [] }] })
  }

  const removeLink = (idx: number) => {
    setCat({ ...cat, links: cat.links.filter((_, i) => i !== idx) })
  }

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose()
  }

  return (
    <div
      data-testid="modal-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 999,
        padding: 20,
      }}
      onClick={handleOverlayClick}
    >
      <div
        style={{
          background: 'var(--card-bg)',
          borderRadius: 20,
          padding: 28,
          maxWidth: 500,
          width: '100%',
          maxHeight: '80vh',
          overflowY: 'auto',
          border: '1px solid var(--border)',
        }}
      >
        <h3
          style={{
            fontSize: 18,
            fontWeight: 700,
            color: 'var(--text-primary)',
            margin: '0 0 20px',
          }}
        >
          카테고리 편집
        </h3>
        <div style={{ display: 'flex', gap: 10, marginBottom: 18 }}>
          <input
            value={cat.icon}
            onChange={(e) => setCat({ ...cat, icon: e.target.value })}
            style={{
              width: 50,
              textAlign: 'center',
              padding: 8,
              borderRadius: 10,
              border: '1px solid var(--border)',
              background: 'var(--link-bg)',
              color: 'var(--text-primary)',
              fontSize: 20,
              outline: 'none',
            }}
          />
          <input
            value={cat.name}
            onChange={(e) => setCat({ ...cat, name: e.target.value })}
            placeholder="카테고리 이름"
            style={{
              flex: 1,
              padding: '8px 14px',
              borderRadius: 10,
              border: '1px solid var(--border)',
              background: 'var(--link-bg)',
              color: 'var(--text-primary)',
              fontSize: 14,
              outline: 'none',
            }}
          />
        </div>
        {cat.links.map((link, i) => (
          <div
            key={link.id}
            style={{
              marginBottom: 12,
              padding: '8px 10px',
              borderRadius: 10,
              border: '1px solid var(--border)',
              background: 'var(--bg)',
            }}
          >
            <div style={{ display: 'flex', gap: 8, marginBottom: 6, alignItems: 'center' }}>
              <input
                value={link.name}
                onChange={(e) => updateLink(i, 'name', e.target.value)}
                placeholder="이름"
                style={{
                  flex: 1,
                  padding: '6px 10px',
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  background: 'var(--link-bg)',
                  color: 'var(--text-primary)',
                  fontSize: 13,
                  outline: 'none',
                }}
              />
              <input
                value={link.url}
                onChange={(e) => updateLink(i, 'url', e.target.value)}
                placeholder="URL"
                style={{
                  flex: 1.5,
                  padding: '6px 10px',
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  background: 'var(--link-bg)',
                  color: 'var(--text-primary)',
                  fontSize: 13,
                  outline: 'none',
                }}
              />
              <button
                onClick={() => removeLink(i)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 14,
                  color: '#e74c3c',
                  padding: 4,
                }}
              >
                ✕
              </button>
            </div>
            {/* SPEC-BOOKMARK-003: 링크별 태그 입력 */}
            <TagInput
              tags={link.tags ?? []}
              onChange={(tags) => updateLinkTags(i, tags)}
              suggestions={tagSuggestions}
            />
          </div>
        ))}
        <button
          onClick={addLink}
          style={{
            width: '100%',
            padding: 10,
            borderRadius: 10,
            border: '2px dashed var(--border)',
            background: 'transparent',
            color: 'var(--text-muted)',
            fontSize: 13,
            cursor: 'pointer',
            marginBottom: 20,
          }}
        >
          + 링크 추가
        </button>
        <div
          style={{
            display: 'flex',
            gap: 10,
            justifyContent: 'space-between',
          }}
        >
          <button
            onClick={() => onDelete(cat.id)}
            style={{
              padding: '10px 18px',
              borderRadius: 10,
              border: '1px solid #e74c3c',
              background: 'transparent',
              color: '#e74c3c',
              fontSize: 13,
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            삭제
          </button>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={onClose}
              style={{
                padding: '10px 18px',
                borderRadius: 10,
                border: '1px solid var(--border)',
                background: 'transparent',
                color: 'var(--text-muted)',
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              취소
            </button>
            <button
              onClick={() => onSave(cat)}
              style={{
                padding: '10px 24px',
                borderRadius: 10,
                border: 'none',
                background: 'var(--accent)',
                color: '#fff',
                fontSize: 13,
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              저장
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
