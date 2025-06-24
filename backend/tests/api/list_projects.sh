#!/bin/bash
# List projects (requires login, replace TOKEN below)
TOKEN="<PASTE_JWT_TOKEN_HERE>"
curl -X GET \
  -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8080/backend/api.php?action=list_projects"
