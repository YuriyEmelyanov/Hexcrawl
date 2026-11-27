import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const vttPreviewUrl = process.env.HEXCRAWL_VTT_PREVIEW_URL;

export default defineConfig({
  base: '/',
  define: {
    __HEXCRAWL_VTT_PREVIEW_URL__: JSON.stringify(vttPreviewUrl ?? null)
  },
  plugins: [react()]
});
