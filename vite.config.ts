import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/jls-teacher-exam/',
  plugins: [react()],
});
