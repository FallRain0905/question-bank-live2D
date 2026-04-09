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

    // Reduce parallelism to prevent memory issues on servers
    config.parallelism = 1;

    // Optimize for lower memory usage
    config.optimization = {
      ...config.optimization,
      minimize: !isServer, // Only minimize on client side
      splitChunks: {
        chunks: 'all',
        maxSize: 244 * 1024, // 244KB chunks
      },
    };

    // Reduce memory pressure during build
    config.infrastructureLogging = {
      level: 'error', // Only log errors
    };

    return config;
  },
};

export default nextConfig;
