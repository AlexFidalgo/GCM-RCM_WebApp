# Use official Node.js image
FROM node:18

# Set working directory
WORKDIR /app

# Copy package.json and install dependencies
COPY package.json package-lock.json ./
RUN npm install

# Copy frontend files
COPY . .

# Expose the development port
EXPOSE 5173

# Start the frontend
CMD ["npm", "run", "dev"]
