FROM node:20-alpine

WORKDIR /app

# Copy package locks and install node packages
COPY package*.json ./
RUN npm install

# Copy frontend source files
COPY . .

EXPOSE 3000

# Start Next.js development server binding to all interfaces
CMD ["npx", "next", "dev", "-H", "0.0.0.0"]
