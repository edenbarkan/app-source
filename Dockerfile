FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY src/package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY src/ ./

# Create non-root user
RUN addgroup -g 1000 app && \
    adduser -D -u 1000 -G app app && \
    chown -R app:app /app

# Final stage
FROM node:18-alpine

WORKDIR /app

# Copy from builder
COPY --from=builder --chown=app:app /app /app

# Use non-root user
USER app

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/health', (r) => r.statusCode === 200 ? process.exit(0) : process.exit(1))"

EXPOSE 8080

CMD ["node", "index.js"]
