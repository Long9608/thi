import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    allowedHosts: [
      'passive-unproven-unlatch.ngrok-free.dev',
      '.ngrok-free.dev' // Thêm dòng này để sau này đổi mã ngrok khác vẫn chạy được
    ]
  }
});