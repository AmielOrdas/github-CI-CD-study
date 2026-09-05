# syntax=docker/dockerfile:1

# Single stage: one image that installs, builds, and runs.
# (A multi-stage version that keeps dev deps out of the final image is a
# good follow-up exercise — see docs/deployment.md.)

FROM node:22-alpine

RUN corepack enable

WORKDIR /app

# Workspace config + server package.json first → dependency layer is cached
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/server/package.json ./apps/server/
RUN pnpm install --frozen-lockfile --filter server

# Source + config, then compile TS → JS in apps/server/dist
COPY apps/server/tsconfig.json ./apps/server/
COPY apps/server/src ./apps/server/src
RUN pnpm --filter server build

# The server reads PORT from the environment (defaults to 4000)
EXPOSE 4000

# Run the COMPILED JavaScript with plain node — no TypeScript at runtime
CMD ["node", "apps/server/dist/index.js"]