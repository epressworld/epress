module.exports = {
  apps: [
    {
      name: "epress-server",
      script: "./commands/server.mjs",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "512M",
      out_file: "./data/logs/server-out.log",
      error_file: "./data/logs/server-error.log",
      merge_logs: true,
      env: {
        NODE_ENV: "production",
      },
    },
    {
      name: "epress-client",
      script: "./node_modules/.bin/next",
      args: "start -p 8543",
      cwd: "./client",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "512M",
      out_file: "../data/logs/client-out.log",
      error_file: "../data/logs/client-error.log",
      merge_logs: true,
      env: {
        NODE_ENV: "production",
        EPRESS_API_URL: "http://localhost:8544",
      },
    },
  ],
}
