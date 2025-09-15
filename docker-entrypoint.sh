#!/bin/sh
set -e

# This script acts as a simple dispatcher for the container.

# Create a symlink for the .env file to the persistent data volume.
# This ensures user configuration is not lost when the container is removed.
# The -f flag ensures that if the link already exists, it is replaced.
ln -sf /app/data/.env /app/.env

# Check the first argument to decide what to do.
case "$1" in
  install)
    echo "Running interactive installation..."
    # Remove 'install' from the arguments list
    shift
    # Run the installation script, passing any extra args like --force or --non-interactive
    exec node commands/install.mjs "$@"
    ;;
  start)
    echo "Starting application..."
    # Run the main application
    exec npm run start
    ;;
  *)
    # If the command is not 'install' or 'start', execute it directly.
    # This allows running arbitrary commands like `docker run ... sh` for debugging.
    exec "$@"
    ;;
esac