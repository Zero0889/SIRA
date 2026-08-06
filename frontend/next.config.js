/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  async rewrites() {
    const backend = process.env.BACKEND_INTERNAL_URL ?? "http://127.0.0.1:8000";
    return [
      { source: "/api/:path*", destination: `${backend}/:path*` },
    ];
  },
};
module.exports = nextConfig;
