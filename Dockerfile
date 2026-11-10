
# Stage 1: Build React Application
FROM node:22-alpine AS build

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy application source code
COPY . .

# Build production application
RUN npm run build

# Stage 2: Serve Application using Nginx
FROM nginx:alpine

# Copy production build files
COPY --from=build /app/dist /usr/share/nginx/html

# Expose application port
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
