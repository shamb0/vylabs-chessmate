# ---- Base Stage ----
FROM node:22.12.0-slim AS base
WORKDIR /usr/src/app


# ---- Dependencies Stage ----
FROM base AS deps
COPY package.json package-lock.json* ./
RUN npm install

# ---- Build Stage ----
FROM base AS builder
COPY --from=deps /usr/src/app/node_modules ./node_modules
COPY . .
RUN npm run build

# ---- Production Stage ----
FROM base AS production
ENV NODE_ENV=production
RUN npm install -g serve
COPY --from=builder /usr/src/app/dist ./dist
EXPOSE 3000
CMD ["serve", "-s", "dist", "-l", "tcp://0.0.0.0:3000"]

# ---- Development Stage ----
FROM base AS development
ENV NODE_ENV=development
RUN apt-get update && apt-get install -y wget
# Application code and node_modules will be mounted via docker-compose
EXPOSE 3000
CMD ["npm", "run", "dev", "--", "--host"]
