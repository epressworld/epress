module.exports = {
  apps: [
    {
      name: "app",
      script: "npm", // 修改为 npm
      args: "run start",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
      },
      // 自动重启配置
      autorestart: true,
      max_restarts: 10,
      min_uptime: "10s",
      max_memory_restart: "1G", // 内存超过1G自动重启

      // 日志配置
      error_file: "./data/logs/pm2-error.log",
      out_file: "./data/logs/pm2-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      merge_logs: true,

      // 重启策略
      restart_delay: 4000,

      // 监控
      listen_timeout: 10000,
      kill_timeout: 5000,
    },
  ],
}
