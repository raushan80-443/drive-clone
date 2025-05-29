# Use official Node.js LTS slim image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install dependencies first (better caching)
COPY package*.json ./

# Install dependencies with specific flags and cache configuration
RUN npm config set cache /app/.npm --global && \
    npm install --legacy-peer-deps --no-audit --no-fund --prefer-offline && \
    npm audit fix --force && \
    npm update --force

# Copy application code
COPY . .

# Create uploads directory with proper permissions
RUN mkdir -p /app/uploads && \
    chown -R node:node /app && \
    chmod -R 755 /app

# Set environment variables
ENV NODE_ENV=production
ENV PORT=5000

# Switch to non-root user
USER node

# Expose port
EXPOSE 5000

# Start the server
CMD ["npm", "start"]
