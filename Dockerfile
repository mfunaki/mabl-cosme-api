# APIサーバー用Dockerfile（フロントエンドビルド不要）
FROM node:20-alpine

WORKDIR /app

# 依存関係のインストール
COPY package.json package-lock.json* ./
RUN npm ci --only=production || npm install --only=production

# サーバーコードをコピー
COPY server ./server

EXPOSE 3000

CMD ["node", "server/index.js"]
