/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  // GitHub Pages project sites serve under /<repo>/. CI sets VITE_BASE from the
  // repo name so this same config works for any fork/template instance; local
  // dev and preview serve from root.
  base:
    command === 'build'
      ? (process.env.VITE_BASE ?? '/preference-ranker/')
      : '/',
  plugins: [react(), tailwindcss()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: true,
  },
}))
