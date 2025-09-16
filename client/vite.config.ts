import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/Gesture-Control-Summary/',  // 👈 这里换成你 GitHub 仓库的名字
  plugins: [react()]
})
