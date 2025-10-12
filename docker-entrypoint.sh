#!/bin/sh
set -e

# This script acts as a simple dispatcher for the container.

# Create a symlink for the .env file to the persistent data volume.
# This ensures user configuration is not lost when the container is removed.
# The -f flag ensures that if the link already exists, it is replaced.

# Check the first argument to decide what to do.
case "$1" in
  start)
    echo "Starting application..."
    # Run the main application
    exec npm run start
    ;;
  *)
    # If the command is not 'start', execute it directly.
    # This allows running arbitrary commands like `docker run ... sh` for debugging.
    exec "$@"
    ;;
esac