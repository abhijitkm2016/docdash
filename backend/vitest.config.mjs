import { defineConfig } from 'vitest/config'

// Unit + route tests only (mocks, no network, no database).
// SQL tests need a local Supabase and live in vitest.sql.config.mjs.
export default defineConfig({
  test: {
    include: ['tests/unit/**/*.test.js'],
    environment: 'node',
  },
})
