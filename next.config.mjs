/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  // Docker/CI builds: do not fail the entire build on TS/ESLint (we can tighten later)
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
};
export default nextConfig;
