// SPDX-License-Identifier: MIT
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8')) as {
  version: string;
};
const gitCommit = (() => {
  try {
    return execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim();
  } catch {
    return 'unknown';
  }
})();

export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __APP_COMMIT__: JSON.stringify(gitCommit),
  },
  server: {
    proxy: {
      // Dev-only: forward proxy requests directly to SonarCloud EU.
      // Production uses the edge function at api/sonar/[...path].ts.
      // The `region` query param is a proxy-routing signal; SonarCloud
      // ignores unknown params so it's safe to leave it in for local dev.
      '/api/sonar/v1': {
        target: 'https://sonarcloud.io',
        changeOrigin: true,
        rewrite: (path) => '/api' + path.replace(/^\/api\/sonar\/v1/, ''),
      },
    },
  },
});
