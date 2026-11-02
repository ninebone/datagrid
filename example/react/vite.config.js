import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import path, { resolve } from 'path';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),          // 🎯 @를 src 경로로 절대 경로 설정
    }
  },
  server: {
    port: 9901
  }
})