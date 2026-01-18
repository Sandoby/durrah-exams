import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react()],
    define: {
      'import.meta.env.VITE_GEMINI_API_KEY': JSON.stringify(env.VITE_GEMINI_API_KEY),
      'import.meta.env.VITE_GROQ_API_KEY': JSON.stringify(env.VITE_GROQ_API_KEY),
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(env.VITE_SUPABASE_URL),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(env.VITE_SUPABASE_ANON_KEY),
      'import.meta.env.VITE_CONVEX_URL': JSON.stringify(env.VITE_CONVEX_URL),
      'import.meta.env.VITE_USE_CONVEX_PROCTORING': JSON.stringify(env.VITE_USE_CONVEX_PROCTORING),
      'import.meta.env.VITE_USE_CONVEX_CHAT': JSON.stringify(env.VITE_USE_CONVEX_CHAT),
      'import.meta.env.VITE_USE_CONVEX_LEADERBOARD': JSON.stringify(env.VITE_USE_CONVEX_LEADERBOARD),
    }
  }
})
