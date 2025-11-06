/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'export',
  images: {
    unoptimized: true,
  },
  // GitHub Pages用: リポジトリ名がサブパスになる場合は basePath を設定
  // 例: basePath: '/Ostle_web',
  // ルートドメインでホストする場合は basePath をコメントアウト
  basePath: process.env.NODE_ENV === 'production' && process.env.BASE_PATH ? process.env.BASE_PATH : '',
  assetPrefix: process.env.NODE_ENV === 'production' && process.env.BASE_PATH ? process.env.BASE_PATH : '',
  experimental: {
    optimizePackageImports: [
    ]
  }
};

export default nextConfig;


