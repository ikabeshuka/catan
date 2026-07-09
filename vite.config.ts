import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    watch: {
      // מונע מ-Vite לעקוב אחר קבצים בתיקיית ה-Backend של Tauri
      ignored: ['**/src-tauri/**'],
    },
  },
})