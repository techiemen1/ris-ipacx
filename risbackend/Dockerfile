# risbackend/Dockerfile
# Stage 1: Build
FROM node:18-alpine AS builder
WORKDIR /app

# Copy dependencies
COPY package*.json ./
RUN npm ci --production

# Copy source code
COPY . .

# Optional build step (for TypeScript / transpilation)
# RUN npm run build || true

# Stage 2: Production image
FROM node:18-alpine
WORKDIR /app
ENV NODE_ENV=production

# Copy built code from builder
COPY --from=builder /app ./

# Expose port
EXPOSE 5000

# Start server
CMD ["node", "server.js"]
