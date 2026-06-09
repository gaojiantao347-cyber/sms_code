FROM node:22-bookworm-slim AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig.json vite.config.ts ./
COPY src ./src
COPY web ./web
RUN npm run build && npm run build:web

FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV DATABASE_PATH=/app/data/sms-code.sqlite

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build /app/dist ./dist
COPY --from=build /app/dist-web ./dist-web

RUN mkdir -p /app/data
EXPOSE 3000
VOLUME ["/app/data"]

CMD ["npm", "start"]
