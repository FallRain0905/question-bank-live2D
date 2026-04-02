/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
    ],
  },
  experimental: {
    // 增加服务器端请求体大小限制（50MB）
    serverExternalPackages: [],
  },
};

export default nextConfig;
