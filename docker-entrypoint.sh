#!/bin/sh
set -e

case "$1" in
  start)
    echo "Starting application with PM2..."
    exec pm2-runtime ecosystem.config.cjs
    ;;
  *)
    exec "$@"
    ;;
esac