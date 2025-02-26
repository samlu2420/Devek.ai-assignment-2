# Build stage
FROM node:18 AS build

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

# Build the React app
RUN npm run build

# Production stage
FROM node:18-slim

WORKDIR /app

# Install production dependencies
COPY package*.json ./
RUN npm install --production

# Copy built files and server
COPY --from=build /app/build ./build
COPY combined-server.js .

EXPOSE 3001

CMD ["node", "combined-server.js"] 