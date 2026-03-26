FROM node:20-alpine AS build

WORKDIR /app

# Install build dependencies for better-sqlite3
RUN apk add --no-cache python3 make g++

COPY package.json ./
RUN npm install --production

COPY . .

RUN npm run build

# ── Production image ─────────────────────────────────────────────────────────
FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production

# Copy built assets and node_modules from build stage
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/build ./build
COPY --from=build /app/dist ./dist
COPY --from=build /app/config ./config
COPY --from=build /app/src ./src
COPY --from=build /app/public ./public
COPY --from=build /app/package.json ./package.json

# SQLite data directory
RUN mkdir -p /app/.tmp && chown -R node:node /app/.tmp

USER node

EXPOSE 1337

CMD ["node_modules/.bin/strapi", "start"]
