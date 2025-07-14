/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: false,
  // Aggressive cache busting
  generateBuildId: async () => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    return `v1.0.5-${timestamp}-${random}`;
  },
  // Force no caching
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate, max-age=0",
          },
          {
            key: "Pragma",
            value: "no-cache",
          },
          {
            key: "Expires",
            value: "0",
          },
          {
            key: "X-Version",
            value: `1.0.5-${Date.now()}`,
          },
        ],
      },
    ];
  },
  // Disable static optimization to force server rendering
  experimental: {
    forceSwcTransforms: true,
  },
  // eslint: {
  //   ignoreDuringBuilds: true,
  // },
};

module.exports = nextConfig;
