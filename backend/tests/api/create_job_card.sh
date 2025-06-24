#!/bin/bash
# Create a job card (requires login, replace TOKEN and PROJECT_ID below)
TOKEN="<PASTE_JWT_TOKEN_HERE>"
PROJECT_ID=1
curl -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "project_id": '$PROJECT_ID',
    "title": "Test Job Card",
    "description": "This is a test job card."
  }' \
  "http://localhost:8080/backend/api.php?action=create_job_card"
