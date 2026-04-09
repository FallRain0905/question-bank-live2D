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
  webpack: (config, { isServer }) => {
    // Optimize webpack cache to reduce memory usage
    config.cache = {
      type: 'filesystem',
      compression: 'gzip',
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    };

    // Reduce parallelism to prevent memory issues
    if (!isServer) {
      config.parallelism = 1;
    }

    return config;
  },
};

export default nextConfig;
