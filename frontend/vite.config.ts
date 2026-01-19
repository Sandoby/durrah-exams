import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'react-quill-new': path.resolve(__dirname, 'src/vendor/react-quill-new.ts'),
    },
  },
})
