/** @type {import('next').NextConfig} */
const nextConfig = {
  skipTrailingSlashRedirect: true,
  async rewrites() {
    return [
      { source: "/", destination: "/legacy/index.html" },
      { source: "/show", destination: "/legacy/show/index.html" },
      { source: "/show/", destination: "/legacy/show/index.html" },
      { source: "/districts", destination: "/districts/index.html" },
      { source: "/districts/", destination: "/districts/index.html" },
      { source: "/districts/:slug", destination: "/districts/:slug/index.html" },
      { source: "/districts/:slug/", destination: "/districts/:slug/index.html" }
    ];
  }
};

export default nextConfig;
