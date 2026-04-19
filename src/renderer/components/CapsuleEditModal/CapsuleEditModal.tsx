// @MX:NOTE: [AUTO] CapsuleEditModal — 캡슐 생성/편집 모달
// @MX:SPEC: SPEC-CAPSULE-001 REQ-009, AC-014~AC-016
import { useState } from 'react'
import type { Capsule, PomodoroPreset } from '../../types/capsule'
import TagInput from '../TagInput/TagInput'
import { useTagStore } from '../../stores/tagStore'

// 이름 최대 길이 (AC-015)
const NAME_MAX = 60
// 설명 최대 길이 (AC-015)
const DESC_MAX = 200

/** CapsuleEditModal props */
interface CapsuleEditModalProps {
  /** 편집할 캡슐 (null이면 신규 생성 모드) */
  capsule: Capsule | null
  /** 저장 콜백 — 신규 생성: Partial<Capsule>, 편집: Partial<Capsule> */
  onSave: (data: Partial<Capsule>) => void
  /** 닫기 콜백 */
  onClose: () => void
  /** 삭제 콜백 (편집 모드에서만 사용) */
  onDelete?: (id: string) => void
}

/**
 * 캡슐 생성 및 편집 모달.
 * REQ-009: 이름·이모지·색상·설명·태그·포모도로 프리셋 편집
 * AC-014: 빈 이름 저장 방지
 * AC-015: 이름 60자, 설명 200자 초과 방지
 * AC-016: 이모지 변경 시 미리보기 즉시 반영
 */
export default function CapsuleEditModal({
  capsule,
  onSave,
  onClose,
  onDelete,
}: CapsuleEditModalProps): JSX.Element {
  const isEdit = capsule !== null

  // 폼 상태
  const [name, setName] = useState(capsule?.name ?? '')
  const [emoji, setEmoji] = useState(capsule?.emoji ?? '📦')
  const [color, setColor] = useState(capsule?.color ?? '')
  const [description, setDescription] = useState(capsule?.description ?? '')
  const [tags, setTags] = useState<string[]>(capsule?.tags ?? [])
  const [pomodoroPreset, setPomodoroPreset] = useState<PomodoroPreset | null>(
    capsule?.pomodoroPreset ?? null,
  )
  const [nameError, setNameError] = useState('')

  const allTags = useTagStore((s) => s.allTags)
  const tagSuggestions = allTags.map((t) => t.tag)

  // 유효성 검사
  const isNameEmpty = name.trim().length === 0
  const isNameTooLong = name.length > NAME_MAX
  const isDescTooLong = description.length > DESC_MAX
  const isSaveDisabled = isNameEmpty || isNameTooLong || isDescTooLong

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault()
    if (isNameEmpty) {
      setNameError('이름은 필수입니다')
      return
    }
    if (isSaveDisabled) return

    setNameError('')
    onSave({
      name: name.trim(),
      emoji: emoji.trim() || '📦', // EC-005: 빈 이모지 기본값
      color: color.trim() || undefined,
      description: description.trim() || undefined,
      tags,
      pomodoroPreset,
    })
  }

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>): void => {
    if (e.target === e.currentTarget) onClose()
  }

  // 이모지 미리보기 (EC-005: 빈 문자열이면 기본값 📦)
  const emojiPreview = emoji.trim() || '📦'

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
      onClick={handleOverlayClick}
    >
      <div
        data-testid="capsule-edit-modal"
        style={{
          background: 'var(--card-bg)',
          borderRadius: 20,
          padding: 28,
          maxWidth: 480,
          width: '100%',
          maxHeight: '85vh',
          overflowY: 'auto',
          border: '1px solid var(--border)',
          boxShadow: '0 8px 40px var(--shadow)',
        }}
        role="dialog"
        aria-modal="true"
        aria-label={isEdit ? '캡슐 편집' : '새 캡슐'}
      >
        {/* 타이틀 */}
        <h3
          style={{
            fontSize: 18,
            fontWeight: 700,
            color: 'var(--text-primary)',
            margin: '0 0 20px',
          }}
        >
          {isEdit ? '캡슐 편집' : '새 캡슐'}
        </h3>

        <form data-testid="capsule-edit-form" onSubmit={handleSubmit}>
          {/* 이모지 + 이름 */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 6, alignItems: 'flex-start' }}>
            {/* 이모지 입력 + 미리보기 */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <span
                data-testid="capsule-emoji-preview"
                style={{ fontSize: 28, lineHeight: 1, display: 'block', textAlign: 'center' }}
              >
                {emojiPreview}
              </span>
              <input
                data-testid="capsule-emoji-input"
                value={emoji}
                onChange={(e) => setEmoji(e.target.value)}
                placeholder="📦"
                style={{
                  width: 52,
                  textAlign: 'center',
                  padding: '6px 4px',
                  borderRadius: 10,
                  border: '1px solid var(--border)',
                  background: 'var(--link-bg)',
                  color: 'var(--text-primary)',
                  fontSize: 18,
                  outline: 'none',
                }}
                aria-label="이모지"
                maxLength={4}
              />
            </div>

            {/* 이름 */}
            <div style={{ flex: 1 }}>
              <input
                data-testid="capsule-name-input"
                value={name}
                onChange={(e) => {
                  setName(e.target.value)
                  if (e.target.value.trim()) setNameError('')
                }}
                placeholder="캡슐 이름 (필수)"
                style={{
                  width: '100%',
                  padding: '8px 14px',
                  borderRadius: 10,
                  border: `1px solid ${isNameTooLong || nameError ? '#e74c3c' : 'var(--border)'}`,
                  background: 'var(--link-bg)',
                  color: 'var(--text-primary)',
                  fontSize: 14,
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
                aria-required="true"
                aria-describedby="name-error name-counter"
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
                {nameError && (
                  <span id="name-error" style={{ color: '#e74c3c', fontSize: 11 }}>
                    {nameError}
                  </span>
                )}
                <span
                  id="name-counter"
                  data-testid="name-counter"
                  className={isNameTooLong ? 'error' : ''}
                  style={{
                    fontSize: 11,
                    color: isNameTooLong ? '#e74c3c' : 'var(--text-muted)',
                    marginLeft: 'auto',
                  }}
                >
                  {name.length}/{NAME_MAX}
                </span>
              </div>
            </div>
          </div>

          {/* 색상 (OKLCH, DEC-002) */}
          <div style={{ marginBottom: 14 }}>
            <label
              style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}
            >
              색상 (OKLCH, 예: oklch(0.7 0.15 270))
            </label>
            <input
              data-testid="capsule-color-input"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              placeholder="oklch(0.7 0.15 270)"
              style={{
                width: '100%',
                padding: '8px 14px',
                borderRadius: 10,
                border: '1px solid var(--border)',
                background: 'var(--link-bg)',
                color: 'var(--text-primary)',
                fontSize: 13,
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* 설명 */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>설명</label>
              <span
                data-testid="desc-counter"
                style={{
                  fontSize: 11,
                  color: isDescTooLong ? '#e74c3c' : 'var(--text-muted)',
                }}
              >
                {description.length}/{DESC_MAX}
              </span>
            </div>
            <textarea
              data-testid="capsule-desc-input"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="캡슐 설명 (선택)"
              rows={3}
              style={{
                width: '100%',
                padding: '8px 14px',
                borderRadius: 10,
                border: `1px solid ${isDescTooLong ? '#e74c3c' : 'var(--border)'}`,
                background: 'var(--link-bg)',
                color: 'var(--text-primary)',
                fontSize: 13,
                outline: 'none',
                resize: 'vertical',
                boxSizing: 'border-box',
                fontFamily: 'inherit',
              }}
            />
          </div>

          {/* 태그 */}
          <div style={{ marginBottom: 14 }}>
            <label
              style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}
            >
              태그
            </label>
            <TagInput tags={tags} onChange={setTags} suggestions={tagSuggestions} />
          </div>

          {/* 포모도로 프리셋 */}
          <div style={{ marginBottom: 20 }}>
            <label
              style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}
            >
              포모도로 프리셋
            </label>
            {pomodoroPreset === null ? (
              <button
                type="button"
                data-testid="pomodoro-preset-add"
                onClick={() =>
                  setPomodoroPreset({
                    focusMinutes: 25,
                    breakMinutes: 5,
                    longBreakMinutes: 15,
                    cyclesBeforeLongBreak: 4,
                  })
                }
                style={{
                  padding: '6px 12px',
                  borderRadius: 8,
                  border: '1px dashed var(--border)',
                  background: 'transparent',
                  color: 'var(--text-muted)',
                  fontSize: 12,
                  cursor: 'pointer',
                }}
              >
                + 프리셋 추가
              </button>
            ) : (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  집중
                  <input
                    data-testid="pomodoro-focus"
                    type="number"
                    value={pomodoroPreset.focusMinutes}
                    onChange={(e) =>
                      setPomodoroPreset({ ...pomodoroPreset, focusMinutes: Number(e.target.value) })
                    }
                    min={1}
                    max={120}
                    style={{ width: 50, marginLeft: 4, padding: '3px 6px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--link-bg)', color: 'var(--text-primary)' }}
                  />분
                </label>
                <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  휴식
                  <input
                    type="number"
                    value={pomodoroPreset.breakMinutes}
                    onChange={(e) =>
                      setPomodoroPreset({ ...pomodoroPreset, breakMinutes: Number(e.target.value) })
                    }
                    min={1}
                    max={60}
                    style={{ width: 50, marginLeft: 4, padding: '3px 6px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--link-bg)', color: 'var(--text-primary)' }}
                  />분
                </label>
                <button
                  type="button"
                  onClick={() => setPomodoroPreset(null)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#e74c3c', fontSize: 12 }}
                >
                  제거
                </button>
              </div>
            )}
          </div>

          {/* 액션 버튼 */}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'space-between' }}>
            {/* 삭제 버튼 — 편집 모드에서만 표시 */}
            {isEdit && onDelete !== undefined && (
              <button
                type="button"
                onClick={() => {
                  if (capsule) onDelete(capsule.id)
                }}
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
            )}
            <div style={{ display: 'flex', gap: 10, marginLeft: 'auto' }}>
              <button
                type="button"
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
                type="submit"
                data-testid="capsule-save-btn"
                disabled={isSaveDisabled}
                style={{
                  padding: '10px 24px',
                  borderRadius: 10,
                  border: 'none',
                  background: isSaveDisabled ? 'var(--border)' : 'var(--accent)',
                  color: isSaveDisabled ? 'var(--text-muted)' : '#fff',
                  fontSize: 13,
                  cursor: isSaveDisabled ? 'not-allowed' : 'pointer',
                  fontWeight: 600,
                }}
              >
                저장
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
