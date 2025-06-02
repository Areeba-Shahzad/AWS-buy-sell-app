import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// Load environment variables based on the current mode (development/production)
// from the .env file in the project root.
// The third argument '' ensures all env variables are loaded, not just VITE_ ones.
// We specifically look for VITE_API_URL.
const env = loadEnv(process.env.NODE_ENV, process.cwd(), '');

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Proxy requests starting with /api
      '/api': {
        // Target the API server URL from the environment variable
        target: env.VITE_API_URL || 'http://127.0.0.1:8000', // Fallback if not set
        changeOrigin: true, // Recommended for virtual hosted sites
        secure: false, // Set to true if your backend API uses HTTPS with a valid certificate
        // The rewrite function ensures that the '/api' prefix is maintained
        // when forwarding the request to the target.
        // Example: Frontend request '/api/products' -> Proxied request to 'http://127.0.0.1:8000/api/products'
        // If your backend routes *don't* include '/api' (e.g., just '/products'),
        // you would change the rewrite to: path.replace(/^\/api/, '')
        rewrite: (path) => path.replace(/^\/api/, '/api'),
      },
    },
  },
  resolve: {
    alias: {
      stream: 'stream-browserify',
      process: 'process/browser',
      buffer: 'buffer',
    },
  },
  define: {
    global: 'globalThis',
  },
});