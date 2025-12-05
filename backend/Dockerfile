FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy application code
COPY . .

# Create necessary directories
RUN mkdir -p uploads logs

# Expose port
EXPOSE 5000

# Run the application
CMD ["npm", "start"]