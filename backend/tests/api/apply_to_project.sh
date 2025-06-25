#!/bin/bash
# Apply to a project (requires login, replace TOKEN and PROJECT_ID below)
TOKEN="<PASTE_JWT_TOKEN_HERE>"
PROJECT_ID=1
curl -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "project_id": '$PROJECT_ID',
    "proposal_text": "I am a great fit for this project!",
    "bid_amount": 100.00
  }' \
  "http://localhost:8080/backend/api.php?action=apply_to_project"
