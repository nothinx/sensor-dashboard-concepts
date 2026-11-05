FROM node:20-alpine
WORKDIR /app
COPY package.json .
RUN npm install --omit=dev --no-audit --no-fund
COPY sim.js .
USER node
CMD ["node", "sim.js"]
