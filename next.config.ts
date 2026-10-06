import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'avatars.steamstatic.com' },
      { protocol: 'https', hostname: 'cdn.cloudflare.steamstatic.com' },
      { protocol: 'https', hostname: 'steamcommunity-a.akamaihd.net' },
    ],
  },
  async rewrites() {
    return [
      {
        source: '/matches/:id/focus',
        destination: '/match/:id/focus',
      },
      {
        source: '/matches/:id',
        destination: '/match/:id',
      },
    ];
  },
};

export default nextConfig;
