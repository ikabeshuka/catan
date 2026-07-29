import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          maxSize: 450 * 1024,
          groups: [
            { name: 'three', test: /node_modules[\\/](three|@react-three)[\\/]/, priority: 30 },
            { name: 'react', test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/, priority: 20 },
            { name: 'socket', test: /node_modules[\\/](socket\.io-client|engine\.io-client|socket\.io-parser)[\\/]/, priority: 20 },
            { name: 'vendor', test: /node_modules[\\/]/, priority: 1 },
          ],
        },
      },
    },
  },
  server: {
    watch: {
      // מונע מ-Vite לעקוב אחר קבצים בתיקיית ה-Backend של Tauri
      ignored: ['**/src-tauri/**'],
    },
  },
})
