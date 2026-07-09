FROM node:18-alpine

WORKDIR /app

# Copy package locks and install node packages
COPY package*.json ./
RUN npm install

# Copy frontend source files
COPY . .

EXPOSE 3000

# Start Next.js development server
CMD ["npm", "run", "dev"]
