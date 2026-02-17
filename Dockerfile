FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files
COPY src/package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY src/ ./

# Final stage
FROM node:22-alpine

WORKDIR /app

# Copy from builder (use node user which already exists)
COPY --from=builder --chown=node:node /app /app

# Use non-root user
USER node

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/health', (r) => r.statusCode === 200 ? process.exit(0) : process.exit(1))"

EXPOSE 8080

CMD ["node", "index.js"]
