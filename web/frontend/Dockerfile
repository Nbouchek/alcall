FROM node:22-alpine

# Install Python3 and build tools for node-gyp
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Set Next.js public environment variables for build process
ENV NEXT_PUBLIC_AUTH_API_URL="https://unifiedchat-auth-service.onrender.com/api/v1"
ENV NEXT_PUBLIC_MESSAGE_API_URL="https://unifiedchat-message-service.onrender.com"
ENV NEXT_PUBLIC_REALTIME_API_URL="https://unifiedchat-realtime-service.onrender.com"
ENV NEXT_PUBLIC_JANUS_URL="wss://unifiedchat-janus-service.onrender.com/janus"
ENV NEXT_PUBLIC_JANUS_HTTP_URL="https://unifiedchat-janus-service.onrender.com"
ENV NEXT_PUBLIC_FORCE_NORMAL_MODE="true"

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

EXPOSE 3000
CMD ["npm", "start", "-p", "$PORT"]
