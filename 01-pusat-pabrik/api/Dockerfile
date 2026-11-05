# Satu image untuk API dan simulator (beda perintah di compose).
FROM node:22-alpine
WORKDIR /app
COPY api/package.json ./
RUN npm install --omit=dev --no-audit --no-fund
COPY api/ ./api/
COPY simulator/ ./simulator/
USER node
