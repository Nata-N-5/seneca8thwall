import { defineConfig } from 'vite'

export default defineConfig({
  base: './',
  server: {
    allowedHosts: ['.ngrok-free.dev'],
  },
  build: {
    rolldownOptions: {
      input: {
        main: 'index.html',
        ar: 'ar.html',
      },
    },
  },
});
