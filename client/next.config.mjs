export default {
  experimental: {
    optimizePackageImports: ["@chakra-ui/react"],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin-allow-popups",
          },
          {
            key: "Cross-Origin-Embedder-Policy",
            value: "unsafe-none",
          },
        ],
      },
      {
        source: "/manifest.json",
        headers: [
          {
            key: "Content-Type",
            value: "application/manifest+json",
          },
        ],
      },
      {
        source: "/sw.js",
        headers: [
          {
            key: "Content-Type",
            value: "application/javascript",
          },
          {
            key: "Cache-Control",
            value: "public, max-age=0, must-revalidate",
          },
        ],
      },
    ]
  },
  // async redirects() {
  //   return [
  //     {
  //       source: "/",
  //       destination: "/publications",
  //       permanent: false, // 使用 302 重定向而不是 301
  //     },
  //   ]
  // },
  async rewrites() {
    const apiUrl = process.env.EPRESS_API_URL || "http://localhost:8544"
    return [
      {
        source: "/ewp/:path*",
        destination: `${apiUrl}/ewp/:path*`,
      },
      {
        source: "/api/:path*",
        destination: `${apiUrl}/api/:path*`,
      },
    ]
  },
}
