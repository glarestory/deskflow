// @MX:NOTE: [AUTO] ImportModal — Chrome 북마크 HTML 파일 가져오기 모달
// @MX:SPEC: SPEC-IMPORT-001
import { useState, useRef } from 'react'
import { parseChromeBookmarkHtml } from '../../lib/bookmarkParser'
import type { ParseResult } from '../../lib/bookmarkParser'
import { useBookmarkStore } from '../../stores/bookmarkStore'
import type { Bookmark } from '../../types'

interface ImportModalProps {
  onClose: () => void
}

type ImportStep = 'select' | 'preview' | 'error'

export default function ImportModal({ onClose }: ImportModalProps): JSX.Element {
  const [step, setStep] = useState<ImportStep>('select')
  const [parseResult, setParseResult] = useState<ParseResult | null>(null)
  const [errorMessage, setErrorMessage] = useState<string>('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { importBookmarks } = useBookmarkStore()

  const handleFileButtonClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file === undefined) return

    try {
      const html = await file.text()
      const result = parseChromeBookmarkHtml(html)
      setParseResult(result)
      setStep('preview')
    } catch (err) {
      const message = err instanceof Error ? err.message : '파일을 읽는 중 오류가 발생했습니다'
      setErrorMessage(message)
      setStep('error')
    }
  }

  const handleImport = (mode: 'merge' | 'replace') => {
    if (parseResult === null) return
    importBookmarks(parseResult.categories as Bookmark[], mode)
    onClose()
  }

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose()
  }

  const handleRetry = () => {
    setStep('select')
    setErrorMessage('')
    setParseResult(null)
    if (fileInputRef.current !== null) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div
      data-testid="import-modal-overlay"
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
          maxWidth: 480,
          width: '100%',
          border: '1px solid var(--border)',
        }}
      >
        <h3
          style={{
            fontSize: 18,
            fontWeight: 700,
            color: 'var(--text-primary)',
            margin: '0 0 8px',
          }}
        >
          북마크 가져오기
        </h3>
        <p
          style={{
            fontSize: 13,
            color: 'var(--text-muted)',
            margin: '0 0 24px',
          }}
        >
          Chrome에서 내보낸 북마크 HTML 파일을 가져옵니다
        </p>

        {/* 숨겨진 파일 입력 */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".html"
          style={{ display: 'none' }}
          onChange={(e) => { void handleFileChange(e) }}
        />

        {step === 'select' && (
          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                border: '2px dashed var(--border)',
                borderRadius: 14,
                padding: '40px 20px',
                marginBottom: 20,
              }}
            >
              <div style={{ fontSize: 40, marginBottom: 12 }}>📂</div>
              <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: '0 0 16px' }}>
                Chrome 북마크 파일(.html)을 선택하세요
              </p>
              <button
                onClick={handleFileButtonClick}
                style={{
                  padding: '10px 24px',
                  borderRadius: 10,
                  border: 'none',
                  background: 'var(--accent)',
                  color: '#fff',
                  fontSize: 14,
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                파일 선택
              </button>
            </div>
            <button
              onClick={onClose}
              style={{
                padding: '8px 18px',
                borderRadius: 10,
                border: '1px solid var(--border)',
                background: 'transparent',
                color: 'var(--text-muted)',
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              닫기
            </button>
          </div>
        )}

        {step === 'preview' && parseResult !== null && (
          <div>
            {/* 파싱 결과 요약 */}
            <div
              style={{
                background: 'var(--link-bg)',
                borderRadius: 12,
                padding: '16px 20px',
                marginBottom: 20,
              }}
            >
              <p
                style={{
                  fontSize: 15,
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  margin: '0 0 8px',
                }}
              >
                {parseResult.categories.length}개 카테고리, {parseResult.totalLinks}개 링크 발견
              </p>
              {parseResult.skippedEmpty > 0 && (
                <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
                  빈 폴더 {parseResult.skippedEmpty}개 건너뜀
                </p>
              )}
            </div>

            {/* 카테고리 미리보기 (최대 5개) */}
            <div style={{ marginBottom: 20 }}>
              {parseResult.categories.slice(0, 5).map((cat) => (
                <div
                  key={cat.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '8px 0',
                    borderBottom: '1px solid var(--border)',
                  }}
                >
                  <span style={{ fontSize: 16 }}>{cat.icon}</span>
                  <span style={{ fontSize: 13, color: 'var(--text-primary)', flex: 1 }}>
                    {cat.name}
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    링크 {cat.links.length}개
                  </span>
                </div>
              ))}
              {parseResult.categories.length > 5 && (
                <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '8px 0 0', textAlign: 'center' }}>
                  외 {parseResult.categories.length - 5}개 카테고리
                </p>
              )}
            </div>

            {/* 가져오기 모드 버튼 */}
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => handleImport('merge')}
                style={{
                  flex: 1,
                  padding: '11px 0',
                  borderRadius: 10,
                  border: '1px solid var(--border)',
                  background: 'transparent',
                  color: 'var(--text-primary)',
                  fontSize: 13,
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                병합 (기존 유지)
              </button>
              <button
                onClick={() => handleImport('replace')}
                style={{
                  flex: 1,
                  padding: '11px 0',
                  borderRadius: 10,
                  border: 'none',
                  background: 'var(--accent)',
                  color: '#fff',
                  fontSize: 13,
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                교체 (전체 덮어쓰기)
              </button>
            </div>
          </div>
        )}

        {step === 'error' && (
          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                background: 'rgba(231, 76, 60, 0.1)',
                borderRadius: 12,
                padding: '20px',
                marginBottom: 20,
                border: '1px solid rgba(231, 76, 60, 0.3)',
              }}
            >
              <p style={{ fontSize: 14, color: '#e74c3c', margin: 0 }}>
                {errorMessage}
              </p>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button
                onClick={handleRetry}
                style={{
                  padding: '10px 24px',
                  borderRadius: 10,
                  border: '1px solid var(--border)',
                  background: 'transparent',
                  color: 'var(--text-muted)',
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                다시 선택
              </button>
              <button
                onClick={onClose}
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
                닫기
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
