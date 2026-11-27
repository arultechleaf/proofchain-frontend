import type { NextConfig } from 'next';

// The browser calls /api/... on the frontend's own address; Next.js forwards it to the backend.
// BACKEND_URL is read on the server only, so it never reaches the browser.
// Local development sets it in frontend/.env (http://localhost:3002). When it is not set (e.g. on Vercel),
// requests go to the hosted Render backend. It is read at build time: redeploy after changing it.
const DEFAULT_BACKEND_URL = 'https://proofchain-backend-q03r.onrender.com';
const BACKEND_URL = (process.env.BACKEND_URL || DEFAULT_BACKEND_URL).replace(/\/+$/, '');

// Next.js dev mode only serves its scripts to localhost. To open the dev server from another device
// (e.g. http://192.168.1.14:3002), list this computer's address here, comma-separated.
const allowedDevOrigins = (process.env.ALLOWED_DEV_ORIGINS ?? '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

const nextConfig: NextConfig = {
  allowedDevOrigins,
  typescript: {
    ignoreBuildErrors: false,
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${BACKEND_URL}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
