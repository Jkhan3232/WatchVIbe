# Use the official Node.js 19 image with Alpine Linux
FROM node:19-alpine

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN apk add --no-cache python3 make g++
RUN npm install

# Copy the rest of the application code
COPY . .

# Copy the .env file
COPY .env ./

# Rebuild bcrypt if necessary (using --build-from-source)
RUN npm rebuild bcrypt --build-from-source

# Expose the port the app runs on
EXPOSE 2000

# Command to run the application
CMD ["npm", "start"]
