import "../config/index.mjs"

export default {
  // 新增这一项配置
  serverExternalPackages: [
    "pino",
    "pino-pretty",
    "thread-stream",
    "@walletconnect/logger",
  ],

  experimental: {
    optimizePackageImports: ["@chakra-ui/react"],
    proxyClientMaxBodySize: "100mb",
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
  async rewrites() {
    return [
      {
        source: "/ewp/:path*",
        destination: `${process.env.EPRESS_API_URL}/ewp/:path*`,
      },
      {
        source: "/api/:path*",
        destination: `${process.env.EPRESS_API_URL}/api/:path*`,
      },
    ]
  },
}
