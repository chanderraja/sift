// SPDX-License-Identifier: MIT

// Vercel mount point: anything under /api/sonar/** is routed to this
// catch-all and forwarded into the proxy core via the Vercel adapter.
// Implementation lives in proxy/adapters/vercel.ts so it can be unit
// tested without involving Vercel's filesystem routing.
//
// `config` is re-declared here (not re-exported via the adapter) because
// Vercel's build scanner does not follow re-export chains to detect the
// edge runtime; it must appear as a top-level named export in this file.
export const config = { runtime: 'edge' };
export { default } from '../../proxy/adapters/vercel.js';
