#!/bin/bash
# Send a message (requires login, replace TOKEN and CONVERSATION_ID below)
TOKEN="<PASTE_JWT_TOKEN_HERE>"
CONVERSATION_ID=1
curl -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "conversation_id": '$CONVERSATION_ID',
    "content": "Hello from API test!"
  }' \
  "http://localhost:8080/backend/api.php?action=send_message"
