// @MX:NOTE: [AUTO] Netscape HTML 형식으로 북마크 내보내기 유틸리티
// @MX:SPEC: SPEC-BOOKMARK-002
import type { Bookmark } from '../types'

/**
 * HTML 특수문자를 이스케이프 처리
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

/**
 * 카테고리 배열을 Netscape Bookmark Format HTML로 변환
 * Chrome/Firefox에서 재가져오기 가능한 표준 형식
 */
export function generateNetscapeHTML(categories: Bookmark[]): string {
  const lines: string[] = [
    '<!DOCTYPE NETSCAPE-Bookmark-file-1>',
    '<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">',
    '<TITLE>Bookmarks</TITLE>',
    '<H1>Bookmarks bar</H1>',
    '<DL><p>',
  ]

  for (const category of categories) {
    lines.push(`    <DT><H3>${escapeHtml(category.name)}</H3>`)
    lines.push('    <DL><p>')
    for (const link of category.links) {
      lines.push(`        <DT><A HREF="${escapeHtml(link.url)}">${escapeHtml(link.name)}</A>`)
    }
    lines.push('    </DL><p>')
  }

  lines.push('</DL><p>')

  return lines.join('\n')
}

/**
 * 내보내기 파일명 생성 (deskflow-bookmarks-YYYY-MM-DD.html)
 */
export function getExportFilename(date?: Date): string {
  const d = date ?? new Date()
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `deskflow-bookmarks-${year}-${month}-${day}.html`
}

/**
 * HTML 문자열을 파일로 다운로드
 * <a download> 방식 사용 (Electron과 웹 모두 지원)
 */
export function downloadBookmarks(html: string, filename: string): void {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
}
