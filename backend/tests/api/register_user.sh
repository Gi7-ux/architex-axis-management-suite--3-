#!/bin/bash
# Register a new user
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "username": "apitestuser",
    "email": "apitestuser@example.com",
    "password": "TestPassword123!",
    "role": "freelancer"
  }' \
  "http://localhost:8080/backend/api.php?action=register_user"
