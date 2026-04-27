import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    // Code splitting — pisahkan recharts dari bundle utama
    // sehingga halaman login/dashboard tidak perlu load recharts
    rollupOptions: {
      output: {
        manualChunks: {
          // Pisahkan vendor besar
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-charts': ['recharts'],
          'vendor-supabase': ['@supabase/supabase-js'],
        },
      },
    },
    // Target modern browser untuk bundle lebih kecil
    target: 'es2020',
    // Minifikasi lebih agresif
    minify: 'esbuild',
    // Aktifkan CSS code splitting
    cssCodeSplit: true,
  },
  // Optimasi dependency pre-bundling
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', 'recharts', '@supabase/supabase-js'],
  },
})