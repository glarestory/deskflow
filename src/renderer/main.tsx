import { createRoot } from 'react-dom/client'
import App from './App'
// @MX:NOTE: [AUTO] SPEC-LAYOUT-002 — globals.css 전역 스타일 로드 (CSS Reset, 높이 계층, 스크롤바)
import './styles/globals.css'

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('Root element #root not found in index.html')
createRoot(rootElement).render(<App />)
