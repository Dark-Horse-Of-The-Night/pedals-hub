/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['read-excel-file'],
  experimental: { serverActions: { bodySizeLimit: '8mb' } },
};
export default nextConfig;
