FROM node:22-alpine AS build
RUN corepack enable && corepack prepare pnpm@11.1.1 --activate
WORKDIR /app

# Install workspace deps with a frozen lockfile
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY server/package.json ./server/
COPY web/package.json ./web/
RUN pnpm install --frozen-lockfile

# Build server (Node) and web (Vite → static assets)
COPY server ./server
COPY web ./web
RUN pnpm --filter @vg/server build && pnpm --filter @vg/web build

FROM node:22-alpine AS runner
RUN corepack enable && corepack prepare pnpm@11.1.1 --activate
WORKDIR /app
ENV NODE_ENV=production
ENV TZ=Asia/Tashkent
ENV PORT=3000

COPY --from=build /app /app

WORKDIR /app/server
EXPOSE 3000

# Run pending migrations then start the server.
# tsc emits to dist/src/* because rootDir is the server package root (scripts/ is also included).
CMD ["sh", "-c", "pnpm db:migrate && node dist/src/index.js"]
