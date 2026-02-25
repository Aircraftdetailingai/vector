/** @type {import('next').NextConfig} */
const nextConfig = {
  devIndicators: false,
  experimental: {
    serverComponentsExternalPackages: ['bcryptjs', 'jose', 'nanoid']
  }
}

module.exports = nextConfig
