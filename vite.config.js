import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],

  base: '/tita-mars-system/',

  server: {
    host: '0.0.0.0',
  },

  build: {
    // Firebase is isolated in its own cacheable vendor chunk; its compressed
    // transfer size is well below this uncompressed warning threshold.
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Keep stylesheet imports in the entry bundle so Bootstrap loads
          // before the Tita Mars theme exactly as declared in src/main.jsx.
          if (id.endsWith('.css')) return undefined;
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('/firebase/')) return 'firebase';
          if (id.includes('@phosphor-icons')) return 'icons';
          if (id.includes('/react/') || id.includes('/react-dom/'))
            return 'react';
          return 'vendor';
        },
      },
    },
  },
});
