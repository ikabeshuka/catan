import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      {
        find: 'three-original',
        replacement: fileURLToPath(new URL('./node_modules/three/build/three.module.js', import.meta.url)),
      },
      {
        find: /^three$/,
        replacement: fileURLToPath(new URL('./src/src/compat/threeTimerCompat.js', import.meta.url)),
      },
    ],
  },
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
