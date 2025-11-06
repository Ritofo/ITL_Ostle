/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'export',
  images: {
    unoptimized: true,
  },
  // GitHub Pages用: リポジトリ名がサブパスになる場合は basePath を設定
  // 環境変数 BASE_PATH が設定されている場合はそれを使用
  // ローカル開発時は空文字列（ルートパス）
  basePath: process.env.BASE_PATH || '',
  assetPrefix: process.env.BASE_PATH || '',
  trailingSlash: true,
  experimental: {
    optimizePackageImports: [
    ]
  }
};

export default nextConfig;


