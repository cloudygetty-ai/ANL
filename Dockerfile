# Stage 1: Builder
FROM node:20-alpine AS builder
WORKDIR /app/backend
RUN apk add --no-cache openssl ffmpeg curl
COPY backend/package*.json ./
RUN npm ci --ignore-scripts
COPY backend/ ./

# Stage 2: Runner
FROM node:20-alpine AS runner
WORKDIR /app/backend
RUN apk add --no-cache openssl ffmpeg curl
COPY --from=builder /app/backend/node_modules ./node_modules
COPY --from=builder /app/backend/ ./
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1
CMD ["node", "server.js"]
