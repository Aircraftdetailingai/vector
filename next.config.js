/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['bcryptjs', 'jose', 'nanoid']
}

module.exports = nextConfig
