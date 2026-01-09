# Stage 1: Builder
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Runner
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# 复制 package 文件（包含新增的 pm2 依赖）
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# 复制应用文件
COPY --from=builder /app/client/.next ./client/.next
COPY --from=builder /app/client/public ./client/public
COPY --from=builder /app/client/next.config.mjs ./client/next.config.mjs
COPY --from=builder /app/knexfile.mjs ./knexfile.mjs
COPY --from=builder /app/server ./server
COPY --from=builder /app/config ./config
COPY --from=builder /app/commands ./commands
COPY --from=builder /app/.env ./.env

# 复制 PM2 配置文件
COPY --from=builder /app/ecosystem.config.cjs ./

COPY --from=builder /app/docker-entrypoint.sh ./

RUN chown -R appuser:appgroup /app
RUN chmod +x /app/docker-entrypoint.sh

VOLUME /app/data

USER appuser

EXPOSE 8543
EXPOSE 8544

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["start"]