# syntax=docker/dockerfile:1

# ---------- Stage 1: build the React app ----------
FROM node:22-alpine AS build

# corepack ships with Node and reads the "packageManager" field in
# package.json, so the container uses the exact same pnpm version as locally.
RUN corepack enable

WORKDIR /app

# Copy workspace config + client package.json FIRST (without the source).
# Docker caches layers — as long as these files don't change, `pnpm install`
# below is skipped on rebuilds, which is what makes builds fast.
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/client/package.json ./apps/client/
RUN pnpm install --frozen-lockfile --filter client

# Now copy the source and build it (this layer is invalidated on every code change)
COPY apps/client ./apps/client
RUN pnpm --filter client build

# ---------- Stage 2: serve the static files with nginx ----------
# The final image contains ONLY nginx + the compiled dist/ — no node_modules,
# no source, no Node at all. That's why it's tiny and fast to deploy.
FROM nginx:alpine

COPY apps/client/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/client/dist /usr/share/nginx/html

EXPOSE 80