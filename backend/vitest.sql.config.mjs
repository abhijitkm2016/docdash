import { defineConfig } from 'vitest/config'

// Runs against a LOCAL Supabase only (`supabase start`). Never point
// LOCAL_DB_URL at a remote project.
export default defineConfig({
  test: {
    include: ['tests/sql/**/*.test.js'],
    environment: 'node',
    testTimeout: 30000,
    fileParallelism: false,
  },
})
