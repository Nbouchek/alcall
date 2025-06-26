#!/bin/bash

# === DELETE OLD SERVICES ===
# Replace these IDs with your actual service IDs from `render services list`
render services delete srv-d1dsg0p5pdvs73au0mg0   # janus-service
render services delete srv-d1ddbs6mcj7s73fokc80   # realtime-service
render services delete srv-d1cqmnje5dus73b7b9ig   # unifiedchat-auth
render services delete srv-d1cqr86mcj7s73b91d10   # unifiedchat-frontend
render services delete srv-d1cqq0emcj7s73b903jg   # unifiedchat-message
# Add/delete lines as needed for your actual services

# === CREATE NEW SERVICES ===

# Janus Service
render services create web \
  --name unifiedchat-janus-service \
  --root services/janus-service \
  --env PORT=8088 \
  --env JANUS_LOG_LEVEL=4 \
  --env JANUS_LOG_TIMESTAMPS=true \
  --branch repo-setup-fixes \
  --plan starter \
  --region oregon

# Realtime Service
render services create web \
  --name unifiedchat-realtime-service \
  --root services/realtime-service \
  --env PORT=8084 \
  --env MESSAGE_SERVICE_URL=https://unifiedchat-message-service.onrender.com \
  --branch repo-setup-fixes \
  --plan starter \
  --region oregon

# Auth Service
render services create web \
  --name unifiedchat-auth-service \
  --root services/auth-service \
  --env PORT=8082 \
  --env JWT_SECRET=your-super-secret-jwt-key-change-in-production \
  --branch repo-setup-fixes \
  --plan starter \
  --region oregon

# User Service
render services create web \
  --name unifiedchat-user-service \
  --root services/user-service \
  --env PORT=8081 \
  --env DB_HOST=localhost \
  --env DB_PORT=5432 \
  --env DB_NAME=unifiedchat \
  --env DB_USER=unifiedchat \
  --env DB_PASSWORD=password123 \
  --branch repo-setup-fixes \
  --plan starter \
  --region oregon

# Message Service
render services create web \
  --name unifiedchat-message-service \
  --root services/message-service \
  --env PORT=8083 \
  --env DB_HOST=localhost \
  --env DB_PORT=5432 \
  --env DB_NAME=unifiedchat \
  --env DB_USER=unifiedchat \
  --env DB_PASSWORD=password123 \
  --branch repo-setup-fixes \
  --plan starter \
  --region oregon

# Gateway Service
render services create web \
  --name unifiedchat-gateway-service \
  --root services/gateway-service \
  --env PORT=8080 \
  --env AUTH_SERVICE_URL=https://unifiedchat-auth-service.onrender.com \
  --env USER_SERVICE_URL=https://unifiedchat-user-service.onrender.com \
  --env MESSAGE_SERVICE_URL=https://unifiedchat-message-service.onrender.com \
  --branch repo-setup-fixes \
  --plan starter \
  --region oregon

# Frontend
render services create web \
  --name unifiedchat-frontend \
  --root web/frontend \
  --env PORT=3000 \
  --env NEXT_PUBLIC_AUTH_API_URL=https://unifiedchat-auth-service.onrender.com \
  --env NEXT_PUBLIC_MESSAGE_API_URL=https://unifiedchat-message-service.onrender.com \
  --env NEXT_PUBLIC_REALTIME_API_URL=https://unifiedchat-realtime-service.onrender.com \
  --env NEXT_PUBLIC_JANUS_URL=wss://unifiedchat-janus-service.onrender.com/janus \
  --env NEXT_PUBLIC_JANUS_HTTP_URL=https://unifiedchat-janus-service.onrender.com \
  --branch repo-setup-fixes \
  --plan starter \
  --region oregon

echo "✅ All services deleted and recreated with standardized names!"
