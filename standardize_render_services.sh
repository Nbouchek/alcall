#!/bin/bash

echo "Deleting old Render services..."
render delete service unifiedchat-auth-service --yes
render delete service unifiedchat-user-service --yes
render delete service unifiedchat-gateway-service --yes
render delete service unifiedchat-message-service --yes
render delete service unifiedchat-janus-service --yes
render delete service unifiedchat-realtime-service --yes
render delete service unifiedchat-frontend --yes
render delete service unifiedchat-ai-service --yes
render delete service unifiedchat-payment-service --yes

echo "Waiting for services to be deleted... (this may take a few minutes)"
sleep 60

echo "Creating new Render services with standardized names..."
render blueprints apply --yes

echo "Service standardization script finished. Please check your Render dashboard for the new services."
