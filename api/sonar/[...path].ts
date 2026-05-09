// SPDX-License-Identifier: MIT

// Vercel mount point: anything under /api/sonar/** is routed to this
// catch-all and forwarded into the proxy core via the Vercel adapter.
// Implementation lives in proxy/adapters/vercel.ts so it can be unit
// tested without involving Vercel's filesystem routing.

export { default, config } from '../../proxy/adapters/vercel';
