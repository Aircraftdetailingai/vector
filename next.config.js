/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['bcryptjs', 'jose', 'nanoid']
  }
}

module.exports = nextConfig
