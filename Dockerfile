# Use official Node.js LTS image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --omit=dev

# Copy source code
COPY . .

# Set registry path for filter
ENV REGISTRY_PATH=/app/torrent-registry.json

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S tracker -u 1001 -G nodejs

# Change ownership to non-root user
RUN chown -R tracker:nodejs /app
USER tracker

# Expose default ports
# 9887 for HTTP tracker (less common port)
# 9888 for UDP tracker (if using UDP)
EXPOSE 9887 9888/udp

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:9887/stats || exit 1

# Default command - start filtered tracker on port 9887
CMD ["node", "server-with-filter.js", "--port=9887"]