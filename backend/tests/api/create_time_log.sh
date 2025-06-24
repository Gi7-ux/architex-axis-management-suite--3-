#!/bin/bash
# Create a time log (requires login, replace TOKEN and JOB_CARD_ID below)
TOKEN="<PASTE_JWT_TOKEN_HERE>"
JOB_CARD_ID=1
curl -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "job_card_id": '$JOB_CARD_ID',
    "start_time": "2025-06-24 09:00:00",
    "end_time": "2025-06-24 10:00:00",
    "duration_minutes": 60,
    "notes": "Worked on API tests."
  }' \
  "http://localhost:8080/backend/api.php?action=create_time_log"
