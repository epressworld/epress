#!/bin/sh
set -e

case "$1" in
  start)
    echo "Starting application with PM2..."
    exec npm run start:pm2
    ;;
  *)
    exec "$@"
    ;;
esac