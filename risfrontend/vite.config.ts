import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import fs from "fs";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src")
    }
  },
  server: {
    host: '0.0.0.0',
    port: 3000,
    https: {
      key: fs.readFileSync(path.resolve(__dirname, '../key.pem')),
      cert: fs.readFileSync(path.resolve(__dirname, '../cert.pem'))
    },
    proxy: {
      '/api': {
        target: 'https://localhost:5000',
        secure: false, // Ignore self-signed cert on backend
        changeOrigin: true
      },
      '/vosk': {
        target: 'http://localhost:5001',
        changeOrigin: true,
        ws: true, // Enable websocket proxying for V3 Dictation
        rewrite: (path) => path.replace(/^\/vosk/, '')
      }
    }
  }
});
