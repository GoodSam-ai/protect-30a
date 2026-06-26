/** @type {import('next').NextConfig} */
const nextConfig = {
  skipTrailingSlashRedirect: true,
  async rewrites() {
    return [
      { source: "/", destination: "/legacy/index.html" },
      { source: "/show", destination: "/legacy/show/index.html" },
      { source: "/show/", destination: "/legacy/show/index.html" }
    ];
  }
};

export default nextConfig;
