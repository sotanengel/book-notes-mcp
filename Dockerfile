FROM node:22-alpine

# better-sqlite3 native addon build tools
RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY package.json package-lock.json .npmrc ./
COPY mcp-server/package.json ./mcp-server/

RUN npm ci

COPY . .

ENV DB_PATH=/app/db/books.db

CMD ["node_modules/.bin/tsx", "mcp-server/src/index.ts"]
