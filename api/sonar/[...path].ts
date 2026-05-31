// SPDX-License-Identifier: MIT

// Vercel mount point: anything under /api/sonar/** is routed to this
// catch-all and forwarded into the proxy core via the Vercel adapter.
// Implementation lives in proxy/adapters/vercel.ts so it can be unit
// tested without involving Vercel's filesystem routing.
// Fluid Compute (Node.js) is the default runtime; no config export needed.
export { default } from '../../proxy/adapters/vercel.js';
