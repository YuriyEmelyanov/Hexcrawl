import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const vttPreviewUrl = process.env.HEXCRAWL_VTT_PREVIEW_URL;
const vttPreviewKey = process.env.HEXCRAWL_VTT_PREVIEW_KEY;
if (Boolean(vttPreviewUrl) !== Boolean(vttPreviewKey)) {
  throw new Error('Configure both HEXCRAWL_VTT_PREVIEW_URL and HEXCRAWL_VTT_PREVIEW_KEY');
}

export default defineConfig({
  base: '/',
  define: {
    __HEXCRAWL_VTT_PREVIEW_URL__: JSON.stringify(vttPreviewUrl ?? null),
    __HEXCRAWL_VTT_PREVIEW_KEY__: JSON.stringify(vttPreviewKey ?? null)
  },
  plugins: [react()]
});
