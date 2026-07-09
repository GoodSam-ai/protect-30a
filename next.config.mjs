/** @type {import('next').NextConfig} */
const nextConfig = {
  skipTrailingSlashRedirect: true,
  async rewrites() {
    return [
      { source: "/", destination: "/legacy/index.html" },
      { source: "/show", destination: "/legacy/show/index.html" },
      { source: "/show/", destination: "/legacy/show/index.html" },
      { source: "/source-library", destination: "/source-library/index.html" },
      { source: "/source-library/", destination: "/source-library/index.html" },
      { source: "/districts", destination: "/districts/index.html" },
      { source: "/districts/", destination: "/districts/index.html" },
      { source: "/districts/:slug", destination: "/districts/:slug/index.html" },
      { source: "/districts/:slug/", destination: "/districts/:slug/index.html" },
      { source: "/act", destination: "/act/index.html" },
      { source: "/act/", destination: "/act/index.html" },
      { source: "/records", destination: "/records/index.html" },
      { source: "/records/", destination: "/records/index.html" },
      { source: "/impact", destination: "/impact/index.html" },
      { source: "/impact/", destination: "/impact/index.html" },
      { source: "/records-privacy", destination: "/records-privacy/index.html" },
      { source: "/records-privacy/", destination: "/records-privacy/index.html" }
    ];
  },
  async redirects() {
    return [
      { source: "/transparency", destination: "/records", permanent: true },
      { source: "/transparency/:path*", destination: "/records/:path*", permanent: true }
    ];
  }
};

export default nextConfig;
