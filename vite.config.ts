
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// 如果你的 GitHub 專案網址是 https://<USERNAME>.github.io/<REPO>/
// 請將 base 設定為 '/<REPO>/'
export default defineConfig({
  plugins: [react()],
  base: './', 
  build: {
    outDir: 'dist',
  }
});
