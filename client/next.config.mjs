import "../config/index.mjs"
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
  webpack: (config) => {
    // 客户端构建时，忽略 react-native 模块
    config.resolve.alias["@react-native-async-storage/async-storage"] = false

    return config
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
