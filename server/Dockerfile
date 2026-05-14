FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@11.1.1 --activate
WORKDIR /app

FROM base AS deps
COPY pnpm-workspace.yaml package.json ./
COPY server/package.json ./server/
RUN pnpm install --frozen-lockfile --filter @vg/server

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/server/node_modules ./server/node_modules
COPY server ./server
COPY pnpm-workspace.yaml package.json ./
RUN pnpm --filter @vg/server build

FROM node:22-alpine AS runner
RUN corepack enable && corepack prepare pnpm@11.1.1 --activate
WORKDIR /app
ENV NODE_ENV=production
ENV TZ=Asia/Tashkent
COPY --from=build /app/server/dist ./server/dist
COPY --from=build /app/server/node_modules ./server/node_modules
COPY --from=build /app/server/package.json ./server/package.json
COPY --from=build /app/server/src/db/migrations ./server/src/db/migrations
WORKDIR /app/server
EXPOSE 3000
CMD ["node", "dist/index.js"]
