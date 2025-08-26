# Use official Node.js LTS image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files for tracker
COPY package*.json ./

# Copy API package files
COPY api/package*.json ./api/

# Install dependencies for tracker
RUN npm install --omit=dev

# Install dependencies for API
RUN cd api && npm install --omit=dev

# Copy source code
COPY . .

# Set registry path for filter
ENV REGISTRY_PATH=/app/torrent-registry.json

# Install PM2 for process management (as root)
RUN npm install -g pm2

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S tracker -u 1001 -G nodejs

# Change ownership to non-root user
RUN chown -R tracker:nodejs /app
USER tracker

# Expose ports
# 9887 for HTTP tracker
# 9888 for UDP tracker
# 8100 for API server
EXPOSE 9887 9888/udp 8100

# Create PM2 ecosystem file
RUN echo '{"apps":[{"name":"tracker","script":"server-with-filter.js","args":"--port=9887","cwd":"/app"},{"name":"api","script":"simple-api.js","cwd":"/app/api"}]}' > /app/ecosystem.config.json

# Health check for both services
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:9887/stats && \
      wget --no-verbose --tries=1 --spider http://localhost:8100/health || exit 1

# Start both services with PM2
CMD ["pm2-runtime", "start", "ecosystem.config.json"]