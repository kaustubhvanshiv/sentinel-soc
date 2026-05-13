FROM node:18

WORKDIR /app

# Copy only package files first
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy full project
COPY . .

# Build frontend (vite)
RUN npm run build || true

# Expose port (change if needed)
EXPOSE 3000

# Start backend
CMD ["npx", "tsx", "server.ts"]
