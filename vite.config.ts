// SPDX-License-Identifier: MIT
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

import { appCommit, appVersion } from './build-info';

export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
    __APP_COMMIT__: JSON.stringify(appCommit),
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
