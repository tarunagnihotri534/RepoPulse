/** @type {import('next').NextConfig} */
const nextConfig = {
  // Keep server-only Prisma/SQLite out of client bundles
  serverExternalPackages: ['@prisma/client', 'prisma'],

  // Images: allow GitHub avatar CDN
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
      },
    ],
  },
};

export default nextConfig;
