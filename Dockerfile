# Use an official Node.js runtime as a parent image
FROM node:22

# Set the working directory
WORKDIR /app

# Copy package.json, package-lock.json, and tsconfig.json for better caching
COPY package*.json tsconfig.json ./

# Install dependencies (only production)
RUN npm install --omit=dev

# Copy the entire project
COPY . .

# Compile TypeScript
RUN npm run build

# Expose the port
EXPOSE 4000

# Start the app with module alias support
CMD ["node", "-r", "module-alias/register", "dist/index.js"]
