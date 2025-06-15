/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  basePath: '/tvm-roteador',
  assetPrefix: '/tvm-roteador',
  async redirects() {
    return [
      {
        source: '/tvm-roteador',
        destination: '/tvm-roteador/',
        permanent: true,
        basePath: false,
      },
    ]
  },
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: '/tvm-roteador/:path*',
          destination: '/:path*',
        },
      ],
    }
  },
}

export default nextConfig
