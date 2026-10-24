import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Rewrites to proxy API calls to backend in dev
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
