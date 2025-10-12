# Stage 1: Builder
# This stage installs all dependencies (including dev) and builds the frontend.
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files and install all dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Copy the rest of the application source code (respecting .dockerignore)
COPY . .

RUN npm run build

# --- #

# Stage 2: Runner
# This is the final, optimized production image.
FROM node:20-alpine AS runner

WORKDIR /app

# Set Node.js environment to production
ENV NODE_ENV=production

# Create a non-root user and group for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy package files and install *only* production dependencies
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copy built frontend and necessary source code from the builder stage
COPY --from=builder /app/client/.next ./client/.next
COPY --from=builder /app/client/public ./client/public
COPY --from=builder /app/client/next.config.mjs ./client/next.config.mjs
COPY --from=builder /app/server ./server
COPY --from=builder /app/config ./config
COPY --from=builder /app/commands ./commands
COPY --from=builder /app/.env ./.env
COPY --from=builder /app/deploy/seeds ./deploy/seeds

# Copy the entrypoint script
COPY --from=builder /app/docker-entrypoint.sh ./

# Create the persistent data directory
RUN mkdir -p /app/data

# Change ownership of all application files and the data directory to the app user
# This is a security best practice.
RUN chown -R appuser:appgroup /app

# Make the entrypoint script executable
RUN chmod +x /app/docker-entrypoint.sh

# Declare the data directory as a volume
VOLUME /app/data

# Switch to the non-root user
USER appuser

# Expose the application ports
EXPOSE 8543
EXPOSE 8544

# Set the entrypoint script
ENTRYPOINT ["./docker-entrypoint.sh"]

# Default command to run when the container starts
CMD ["start"]
