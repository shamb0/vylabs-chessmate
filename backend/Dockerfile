# Stage 1: Build the TypeScript code
FROM node:18-slim as builder
WORKDIR /usr/src/app

# Install bun and dependencies
RUN npm install -g bun
COPY package.json bun.lockb* ./
RUN bun install --frozen-lockfile

# Copy source code and build
COPY . .
RUN bun run tsc

# Stage 2: Create the production image
FROM node:18-slim

# Install bun and curl for health checks
RUN npm install -g bun && \
    apt-get update && \
    apt-get install -y curl --no-install-recommends && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app

# Copy compiled code and dependencies
COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/package.json ./package.json

# Copy source files (needed for Jest to resolve @/ imports)
COPY --from=builder /usr/src/app/src ./src

# Copy test configuration
COPY --from=builder /usr/src/app/jest.config.js ./
COPY --from=builder /usr/src/app/tsconfig.json ./
COPY --from=builder /usr/src/app/tests ./tests

EXPOSE 8080

# Define the command to run the compiled app
CMD [ "node", "dist/index.js" ]