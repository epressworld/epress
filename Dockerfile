# Stage 1: Builder
FROM node:25-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Runner
FROM node:25-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy package files and install production dependencies
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copy application files
COPY --from=builder /app/client/.next ./client/.next
COPY --from=builder /app/client/public ./client/public
COPY --from=builder /app/client/next.config.mjs ./client/next.config.mjs
COPY --from=builder /app/knexfile.mjs ./knexfile.mjs
COPY --from=builder /app/server ./server
COPY --from=builder /app/config ./config
COPY --from=builder /app/commands ./commands
COPY --from=builder /app/.env ./.env

RUN chown -R appuser:appgroup /app

VOLUME /app/data

USER appuser

EXPOSE 8543
EXPOSE 8544

CMD ["node", "commands/start.mjs"]
