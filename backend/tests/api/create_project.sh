#!/bin/bash
# Create a new project (requires login, replace TOKEN below)
TOKEN="<PASTE_JWT_TOKEN_HERE>"
curl -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "title": "API Test Project",
    "description": "This is a test project created via API."
  }' \
  "http://localhost:8080/backend/api.php?action=create_project"
