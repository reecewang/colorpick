import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './', // 使用相对路径，适合静态部署
  root: '.',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      input: './index.html'
    },
    // 确保生成正确的资源路径
    assetsInlineLimit: 0
  },
  server: {
    port: 3000,
    open: true
  }
})
