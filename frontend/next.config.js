/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['three'],
  output: 'standalone',
  experimental: {
    esmExternals: 'loose',
  },
};

module.exports = nextConfig;
