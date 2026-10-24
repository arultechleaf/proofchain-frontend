import type { NextConfig } from 'next';

// The browser calls /api/... on the frontend's own address; Next.js forwards it to the backend.
// BACKEND_URL is read on the server only, so it never reaches the browser.
const BACKEND_URL = (process.env.BACKEND_URL ?? 'http://localhost:3001').replace(/\/+$/, '');

// Next.js dev mode only serves its scripts to localhost. To open the dev server from another device
// (e.g. http://192.168.1.14:3002), list this computer's address here, comma-separated.
const allowedDevOrigins = (process.env.ALLOWED_DEV_ORIGINS ?? '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

const nextConfig: NextConfig = {
  allowedDevOrigins,
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
