import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/',
  define: {__HEXCRAWL_VTT_PREVIEW_URL__: 'null', __HEXCRAWL_VTT_PREVIEW_KEY__: 'null'},
  plugins: [react()]
});
