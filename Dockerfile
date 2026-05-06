FROM node:20-alpine

# ffmpeg for voice sample decode (webm/opus → PCM for VCS engine)
RUN apk add --no-cache curl ffmpeg

WORKDIR /app/backend

COPY backend/package*.json ./
RUN npm install --omit=dev

COPY backend/ ./

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

CMD ["node", "server.js"]
