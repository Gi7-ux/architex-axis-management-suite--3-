#!/bin/bash
# Login as a user
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "email": "apitestuser@example.com",
    "password": "TestPassword123!"
  }' \
  "http://localhost:8080/backend/api.php?action=login_user"
