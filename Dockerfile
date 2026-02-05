# syntax=docker/dockerfile:1
ENV TZ=Etc/UTC

FROM node:alpine

# Install dependencies for typical Node.js apps
RUN apk add --no-cache \
    bash \
    ca-certificates \
    nodejs \
    npm \
    curl \
    wget \
    tar \
    zstd

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml* ./

# Install pnpm and dependencies
RUN npm install -g pnpm && pnpm install --prod

# Copy source code
COPY . .

# Create public directory
RUN mkdir -p public

# Expose the local port
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Start the application
CMD ["node", "index.js"]
