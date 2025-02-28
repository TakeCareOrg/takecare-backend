# Use Node.js 22 with Debian (Ubuntu-compatible)
FROM node:22

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json first (for caching)
COPY package*.json ./

# Install dependencies
RUN npm install --omit=dev

# Copy the rest of the app
COPY . .

# Expose the port
EXPOSE 4000

# Run the app
CMD ["npm", "start"]
