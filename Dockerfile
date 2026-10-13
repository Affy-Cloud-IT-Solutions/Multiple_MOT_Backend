# ==============================================================================
# Production Dockerfile for MOT Reminder Management System Backend
# ==============================================================================
FROM node:20-alpine AS base

# Install dumb-init and curl/wget for reliable signal handling and health checks
RUN apk add --no-cache dumb-init wget

# Set production environment defaults
ENV NODE_ENV=production
ENV PORT=5000

# Set working directory
WORKDIR /app

# Copy package dependency manifests
COPY package*.json ./

# Install production dependencies only with clean cache
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

# Copy source code with non-root node ownership
COPY --chown=node:node . .

# Ensure uploads directory exists and has proper permissions
RUN mkdir -p /app/uploads && chown -R node:node /app/uploads

# Switch to non-root user (Security best practice: prevents container breakout)
USER node

# Expose internal application port
EXPOSE 5000

# Health check endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:5000/health || exit 1

# Start server using dumb-init for clean process reaping and graceful shutdown
ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["node", "server.js"]
