import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './',
  resolve: {
    dedupe: ['@codemirror/state', '@codemirror/view', '@codemirror/language', '@codemirror/commands'],
  },
  optimizeDeps: {
    include: ['@codemirror/state', '@codemirror/view', '@codemirror/lang-javascript', '@codemirror/theme-one-dark'],
  },
})
