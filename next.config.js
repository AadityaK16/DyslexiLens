/** @type {import('next').NextConfig} */
const nextConfig = {
  // Tesseract.js uses Web Workers; allow loading from public
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = { fs: false, path: false };
    }
    return config;
  },
};

module.exports = nextConfig;
