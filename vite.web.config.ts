import { resolve } from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ command }) => ({
  root: resolve(__dirname, 'src/renderer'),
  // @MX:NOTE: [AUTO] GitHub Pages project site 경로 — glarestory.github.io/deskflow/
  // dev 모드에서는 '/'로 유지해 localhost:5173에서 바로 동작. build 시에만 /deskflow/ prefix 적용.
  base: command === 'build' ? '/deskflow/' : '/',
  envDir: __dirname,
  build: {
    outDir: resolve(__dirname, 'web-dist'),
    emptyOutDir: true,
    rollupOptions: {
      input: resolve(__dirname, 'src/renderer/index.html'),
    },
  },
  resolve: {
    alias: {
      '@renderer': resolve(__dirname, 'src/renderer'),
    },
  },
  plugins: [react()],
}))
