import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const resolveSupabaseFallbackAlias = (): Record<string, string> => {
  const supabaseModulePath = path.resolve(
    __dirname,
    'node_modules/@supabase/supabase-js',
  );

  if (fs.existsSync(supabaseModulePath)) {
    return {};
  }

  return {
    '@supabase/supabase-js': path.resolve(
      __dirname,
      'stubs/supabase-js.ts',
    ),
  };
};

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
      ...resolveSupabaseFallbackAlias(),
    },
  },
  server: {
    watch: {
      ignored: ["**/node_modules/**"],
    },
  },
  optimizeDeps: {
    exclude: ["@supabase/supabase-js"],
  },
});
