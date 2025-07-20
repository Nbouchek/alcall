FROM node:22-alpine

# Install Python3 and build tools for node-gyp
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Use environment variables from Render dashboard/render.yaml

COPY package.json package-lock.json ./
RUN npm install

COPY . ./
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
