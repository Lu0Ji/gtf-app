import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vitest/config'

// Separate from vite.config.js (rather than merged via mergeConfig) so the
// dev/build config never has to think about test-only settings. Dummy
// VITE_SUPABASE_* values let src/lib/supabase.js's module-level
// createClient() call succeed under test without a real .env — no test
// here should ever actually reach the network.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'jsdom',
    env: {
      VITE_SUPABASE_URL: 'https://test.supabase.co',
      VITE_SUPABASE_PUBLISHABLE_KEY: 'test-anon-key',
    },
  },
})
