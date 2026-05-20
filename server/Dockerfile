FROM node:20-bookworm-slim

# mediasoup compiles native C++ bindings during npm install
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    build-essential \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build

# Drop dev deps — mediasoup native binary is already compiled and stays
RUN npm prune --omit=dev

EXPOSE 3000

CMD ["node", "dist/index.js"]
