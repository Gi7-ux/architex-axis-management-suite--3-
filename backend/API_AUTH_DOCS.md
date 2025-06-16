# Backend API & Authentication Documentation

## Base URL

All API endpoints are accessed via:
`/backend/api.php`

Requests are typically made by appending a `?action=some_action` query parameter.

## Authentication Mechanism

- **Type**: Token-based authentication.
- **Token Retrieval**: A session token is provided upon successful login.
- **Token Usage**: For endpoints requiring authentication, the token must be included in the `Authorization` header as a Bearer token.
  - Example: `Authorization: Bearer <your_session_token>`

## Authentication Endpoints

### 1. User Registration

- **Action**: `register_user`
- **Method**: `POST`
- **URL**: `/backend/api.php?action=register_user`
- **Request Body (JSON)**:
  ```json
  {
    "username": "testuser",
    "email": "test@example.com",
    "password": "password123",
    "role": "freelancer" // or "client", "admin" (admin registration might be restricted)
  }
  ```
- **Response (Success - 201 Created)**:
  ```json
  {
    "message": "User registered successfully."
  }
  ```
- **Response (Error - 4xx/5xx)**:
  ```json
  {
    "error": "Error message describing the issue (e.g., Username or email already exists, Invalid email format)."
  }
  ```

### 2. User Login

- **Action**: `login_user`
- **Method**: `POST`
- **URL**: `/backend/api.php?action=login_user`
- **Request Body (JSON)**:
  ```json
  {
    "email": "test@example.com",
    "password": "password123"
  }
  ```
- **Response (Success - 200 OK)**:
  ```json
  {
    "message": "Login successful.",
    "user": {
      "id": 123,
      "username": "testuser",
      "email": "test@example.com",
      "role": "freelancer"
    },
    "token": "generated_session_token_string"
  }
  ```
- **Response (Error - 4xx/5xx)**:
  ```json
  {
    "error": "Error message (e.g., Invalid email or password)."
  }
  ```

### 3. Get User Profile

- **Action**: `get_user_profile`
- **Method**: `GET`
- **URL**: `/backend/api.php?action=get_user_profile`
- **Authentication**: **Required**.
- **Response (Success - 200 OK)**:
  ```json
  {
    "id": 123,
    "username": "testuser",
    "email": "test@example.com",
    "role": "freelancer",
    "created_at": "YYYY-MM-DD HH:MM:SS"
  }
  ```
  *(Note: `created_at` is returned by the current PHP implementation for `get_user_from_session_token`)*
- **Response (Error - 401 Unauthorized / 403 Forbidden)**:
  ```json
  {
    "error": "Authorization header missing or malformed. Usage: Bearer <token>"
    // or "Invalid or expired session token. Please log in again."
  }
  ```

## Admin Specific Endpoints

These endpoints are typically restricted to users with the 'admin' role.

### 1. Get All Users
- **Action**: `get_all_users`
- **Method**: `GET`
- **URL**: `/backend/api.php?action=get_all_users`
- **Authentication**: **Required** (User role must be 'admin').
- **Response (Success - 200 OK)**: Array of user objects.
  ```json
  [
    {
      "id": 123,
      "username": "testuser",
      "email": "test@example.com",
      "role": "freelancer",
      "created_at": "YYYY-MM-DD HH:MM:SS"
    },
    {
      "id": 124,
      "username": "clientuser",
      "email": "client@example.com",
      "role": "client",
      "created_at": "YYYY-MM-DD HH:MM:SS"
    }
    // ... more users
  ]
  ```
- **Response (Error - 403 Forbidden / 5xx Server Error)**:
  ```json
  {
    "error": "Error message (e.g., Forbidden: Only admins can view all users.)."
  }
  ```

### 2. Update User Role
- **Action**: `update_user_role`
- **Method**: `POST` (or `PUT`)
- **URL**: `/backend/api.php?action=update_user_role`
- **Authentication**: **Required** (User role must be 'admin').
- **Request Body (JSON)**:
  ```json
  {
    "user_id": 123, // ID of the user whose role is to be updated
    "new_role": "client" // Target role (e.g., "client", "freelancer", "admin")
  }
  ```
- **Response (Success - 200 OK)**:
  ```json
  {
    "message": "User role updated successfully."
  }
  ```
- **Response (Error - 4xx/5xx)**:
  ```json
  {
    "error": "Error message (e.g., User ID and new role are required, Invalid role, User not found, Admins cannot change their own role)."
  }
  ```

## Project Endpoints

### 1. Create Project
- **Action**: `create_project`
- **Method**: `POST`
- **URL**: `/backend/api.php?action=create_project`
- **Authentication**: **Required**.
  - Authenticated user's ID is used as `client_id`.
  - User role must be 'client' or 'admin'.
- **Request Body (JSON)**:
  ```json
  {
    "title": "New Project Title",
    "description": "Detailed project description.",
    "freelancer_id": null, // Optional, can be null or a user ID
    "status": "open"    // Optional, defaults to 'open'
  }
  ```
- **Response (Success - 201 Created)**:
  ```json
  {
    "message": "Project created successfully.",
    "project_id": 123,
    "client_id": 456 // ID of the authenticated client
  }
  ```
- **Response (Error - 4xx/5xx)**:
  ```json
  {
    "error": "Error message (e.g., Missing required fields, Forbidden)."
  }
  ```

### 2. Get Client's Own Projects
- **Action**: `get_client_projects`
- **Method**: `GET`
- **URL**: `/backend/api.php?action=get_client_projects&status=open` (status is optional)
- **Authentication**: **Required**.
  - User role must be 'client'.
- **Query Parameters (Optional)**:
  - `status`: Filter projects by status (e.g., 'open', 'in_progress').
- **Response (Success - 200 OK)**:
  ```json
  [
    {
      "id": 123,
      "title": "Client Project 1",
      "description": "...",
      "client_id": 456,
      "freelancer_id": 789,
      "status": "in_progress",
      "created_at": "YYYY-MM-DD HH:MM:SS",
      "updated_at": "YYYY-MM-DD HH:MM:SS"
    }
    // ... more projects
  ]
  ```
- **Response (Error - 4xx/5xx)**:
  ```json
  {
    "error": "Error message (e.g., Forbidden)."
  }
  ```

### 3. Update Project
- **Action**: `update_project`
- **Method**: `PUT`
- **URL**: `/backend/api.php?action=update_project&id=<project_id>`
- **Authentication**: **Required**.
  - User must be the client who owns the project, or an 'admin'.
- **Request Body (JSON) - Include only fields to update**:
  ```json
  {
    "title": "Updated Project Title",
    "description": "Updated description.",
    "freelancer_id": 789, // Can be null to remove freelancer
    "status": "completed"
  }
  ```
- **Response (Success - 200 OK)**:
  ```json
  {
    "message": "Project updated successfully."
    // or "Project data was the same; no changes made."
  }
  ```
- **Response (Error - 4xx/5xx)**:
  ```json
  {
    "error": "Error message (e.g., Project not found, Forbidden, No valid fields)."
  }
  ```

### 4. Delete Project
- **Action**: `delete_project`
- **Method**: `DELETE`
- **URL**: `/backend/api.php?action=delete_project&id=<project_id>`
- **Authentication**: **Required**.
  - User must be the client who owns the project, or an 'admin'.
- **Response (Success - 200 OK)**:
  ```json
  {
    "message": "Project deleted successfully."
  }
  ```
- **Response (Error - 4xx/5xx)**:
  ```json
  {
    "error": "Error message (e.g., Project not found, Forbidden)."
  }
  ```

### 5. Get All Projects (Public/Freelancer View)
- **Action**: `get_projects`
- **Method**: `GET`
- **URL**: `/backend/api.php?action=get_projects&status=open` (status is optional, defaults to 'open')
- **Authentication**: **Not Required**.
- **Query Parameters (Optional)**:
  - `status`: Filter projects by status. Defaults to 'open'. Use `status=all` to retrieve all projects regardless of status.
- **Response (Success - 200 OK)**: Array of project objects.
  ```json
  [
    {
      "id": 123,
      "title": "Open Project Title",
      "description": "...",
      "client_id": 456,
      "freelancer_id": null,
      "status": "open",
      "created_at": "YYYY-MM-DD HH:MM:SS",
      "updated_at": "YYYY-MM-DD HH:MM:SS"
    }
  ]
  ```

## Freelancer Specific Project Endpoints

### 1. Get Freelancer's Assigned Projects
- **Action**: `get_freelancer_assigned_projects`
- **Method**: `GET`
- **URL**: `/backend/api.php?action=get_freelancer_assigned_projects`
- **Authentication**: **Required** (User role must be 'freelancer').
- **Response (Success - 200 OK)**: Array of project objects assigned to the freelancer, including client username.
  ```json
  [
    {
      "id": 124,
      "title": "Assigned Project Title",
      "description": "Description of assigned project...",
      "client_id": 457,
      "freelancer_id": 789, // Matches authenticated freelancer's ID
      "status": "in_progress", // Or other active statuses
      "created_at": "YYYY-MM-DD HH:MM:SS",
      "updated_at": "YYYY-MM-DD HH:MM:SS",
      "client_username": "client_username_example"
    }
    // ... more assigned projects
  ]
  ```
- **Response (Error - 4xx/5xx)**:
  ```json
  {
    "error": "Error message (e.g., Forbidden)."
  }
  ```

## Application Endpoints

Endpoints for managing project applications.

### 1. Get Project Applications (Client/Admin View)
- **Action**: `get_project_applications`
- **Method**: `GET`
- **URL**: `/backend/api.php?action=get_project_applications&project_id=<project_id>`
- **Authentication**: **Required**.
  - User must be the client who owns the project, or an 'admin'.
- **Response (Success - 200 OK)**:
  ```json
  [
    {
      "id": 1,
      "project_id": 123,
      "freelancer_id": 789,
      "proposal_text": "I am a great fit for this project because...",
      "bid_amount": 500.00, // Will be a float/number
      "status": "pending",
      "applied_at": "YYYY-MM-DD HH:MM:SS",
      "updated_at": "YYYY-MM-DD HH:MM:SS",
      "freelancer_username": "freelancer_test",
      "freelancer_email": "freelancer@example.com"
    }
    // ... more applications
  ]
  ```
- **Response (Error - 4xx/5xx)**:
  ```json
  {
    "error": "Error message (e.g., Project ID is required, Project not found, Forbidden)."
  }
  ```

### 2. Update Application Status (Client/Admin Action)
- **Action**: `update_application_status`
- **Method**: `PUT`
- **URL**: `/backend/api.php?action=update_application_status&application_id=<application_id>`
- **Authentication**: **Required**.
  - User must be the client who owns the project associated with the application, or an 'admin'.
- **Request Body (JSON)**:
  ```json
  {
    "status": "accepted" // or "rejected", "archived_by_client"
  }
  ```
- **Response (Success - 200 OK)**:
  ```json
  {
    "message": "Application status updated successfully."
  }
  ```
  *(If status is 'accepted', the backend also updates the project's `freelancer_id` and `status`, and attempts to reject other pending applications for that project.)*
- **Response (Error - 4xx/5xx)**:
  ```json
  {
    "error": "Error message (e.g., Application ID required, Invalid status, Application not found, Forbidden)."
  }
  ```

### 3. Submit Application (Freelancer Action)
- **Action**: `submit_application`
- **Method**: `POST`
- **URL**: `/backend/api.php?action=submit_application`
- **Authentication**: **Required** (User role must be 'freelancer').
- **Request Body (JSON)**:
  ```json
  {
    "project_id": 123, // ID of the project to apply for
    "proposal_text": "My detailed proposal for this project...",
    "bid_amount": 750.00 // Optional, can be null
  }
  ```
- **Response (Success - 201 Created)**:
  ```json
  {
    "message": "Application submitted successfully.",
    "application_id": 2
  }
  ```
- **Response (Error - 4xx/5xx)**:
  ```json
  {
    "error": "Error message (e.g., Project ID and proposal text are required, Project not found, Project not open for applications, Already applied)."
  }
  ```

### 4. Get Freelancer's Own Applications
- **Action**: `get_freelancer_applications`
- **Method**: `GET`
- **URL**: `/backend/api.php?action=get_freelancer_applications`
- **Authentication**: **Required** (User role must be 'freelancer').
- **Response (Success - 200 OK)**: Array of application objects with project details.
  ```json
  [
    {
      "application_id": 2,
      "project_id": 123,
      "proposal_text": "My detailed proposal...",
      "bid_amount": 750.00,
      "application_status": "pending",
      "applied_at": "YYYY-MM-DD HH:MM:SS",
      "application_updated_at": "YYYY-MM-DD HH:MM:SS",
      "project_title": "Project Title",
      "project_status": "open",
      "project_client_id": 456
    }
    // ... more applications
  ]
  ```
- **Response (Error - 4xx/5xx)**:
  ```json
  {
    "error": "Error message (e.g., Forbidden)."
  }
  ```

### 5. Withdraw Application (Freelancer Action)
- **Action**: `withdraw_application`
- **Method**: `POST` (or `PUT`)
- **URL**: `/backend/api.php?action=withdraw_application`
- **Authentication**: **Required** (User role must be 'freelancer').
- **Request Body (JSON)**:
  ```json
  {
    "application_id": 2
  }
  ```
  *(Note: Backend also checks `$_GET['application_id']` as a fallback if not in payload)*
- **Response (Success - 200 OK)**:
  ```json
  {
    "message": "Application withdrawn successfully."
  }
  ```
- **Response (Error - 4xx/5xx)**:
  ```json
  {
    "error": "Error message (e.g., Application ID required, Application not found, Forbidden, Not pending)."
  }
  ```

## Job Card Endpoints

Endpoints for managing job cards (tasks) within projects.

### 1. Create Job Card
- **Action**: `create_job_card`
- **Method**: `POST`
- **URL**: `/backend/api.php?action=create_job_card`
- **Authentication**: **Required**.
  - User role must be 'admin' (any project) or 'client' (must own the project specified in `project_id`).
- **Request Body (JSON)**:
  ```json
  {
    "project_id": 123, // Required: ID of the project this job card belongs to
    "title": "Design initial mockups", // Required
    "description": "Detailed description of the task.", // Optional
    "status": "todo", // Optional, defaults to 'todo'. Valid: 'todo', 'in_progress', 'pending_review', 'completed'
    "assigned_freelancer_id": 789, // Optional, ID of the freelancer assigned to this specific task
    "estimated_hours": 8.5 // Optional, decimal
  }
  ```
- **Response (Success - 201 Created)**:
  ```json
  {
    "message": "Job card created successfully.",
    "job_card_id": 101
  }
  ```
- **Response (Error - 4xx/5xx)**:
  ```json
  {
    "error": "Error message (e.g., Project ID and title are required, Project not found, Forbidden, Invalid status, Assigned freelancer not found)."
  }
  ```

### 2. Get Project Job Cards
- **Action**: `get_project_job_cards`
- **Method**: `GET`
- **URL**: `/backend/api.php?action=get_project_job_cards&project_id=<project_id>`
- **Authentication**: **Required**.
  - User role: 'admin', or 'client' (if they own the project), or 'freelancer' (if assigned to the project via `projects.freelancer_id`).
- **Response (Success - 200 OK)**: Array of job card objects.
  ```json
  [
    {
      "id": 101,
      "project_id": 123,
      "title": "Design initial mockups",
      "description": "Detailed description...",
      "status": "todo",
      "assigned_freelancer_id": 789,
      "assigned_freelancer_username": "freelancer_test", // If assigned
      "estimated_hours": 8.50, // Will be a float/number
      "created_at": "YYYY-MM-DD HH:MM:SS",
      "updated_at": "YYYY-MM-DD HH:MM:SS"
    }
    // ... more job cards
  ]
  ```
- **Response (Error - 4xx/5xx)**:
  ```json
  {
    "error": "Error message (e.g., Project ID required, Project not found, Forbidden)."
  }
  ```

### 3. Update Job Card
- **Action**: `update_job_card`
- **Method**: `POST` (or `PUT`)
- **URL**: `/backend/api.php?action=update_job_card&job_card_id=<job_card_id>`
- **Authentication**: **Required**.
- **Authorization**:
  - 'admin': Can update any field on any job card.
  - 'client' (project owner): Can update any field on job cards in their projects.
  - 'freelancer' (assigned to job card OR project's main freelancer): Can update `status`. If directly assigned to job card (`job_cards.assigned_freelancer_id`), may update other fields like `description`. (Backend logic defines specifics).
- **Request Body (JSON) - Include only fields to update**:
  ```json
  {
    "title": "Revised mockups",
    "description": "Updated details.",
    "status": "in_progress",
    "assigned_freelancer_id": 790, // Can be null
    "estimated_hours": 10.0
  }
  ```
- **Response (Success - 200 OK)**:
  ```json
  {
    "message": "Job card updated successfully."
    // or "Job card data was the same; no changes made."
  }
  ```
- **Response (Error - 4xx/5xx)**:
  ```json
  {
    "error": "Error message (e.g., Job Card ID required, Job Card not found, Forbidden, No valid fields, Invalid status)."
  }
  ```

### 4. Delete Job Card
- **Action**: `delete_job_card`
- **Method**: `DELETE` (or `POST` if `job_card_id` is in payload)
- **URL**: `/backend/api.php?action=delete_job_card&job_card_id=<job_card_id>`
- **Authentication**: **Required**.
  - User role must be 'admin' or 'client' (must own the project associated with the job card).
- **Request Body (Optional for POST, if `job_card_id` is sent in payload)**:
  ```json
  {
    "job_card_id": 101
  }
  ```
- **Response (Success - 200 OK)**:
  ```json
  {
    "message": "Job card deleted successfully."
  }
  ```
- **Response (Error - 4xx/5xx)**:
  ```json
  {
    "error": "Error message (e.g., Job Card ID required, Job Card not found, Forbidden)."
  }
  ```

## Time Log Endpoints

Endpoints for managing time logs against job cards.

### 1. Log Time
- **Action**: `log_time`
- **Method**: `POST`
- **URL**: `/backend/api.php?action=log_time`
- **Authentication**: **Required**.
  - User must be authorized for the job card (admin, client owner, project-assigned freelancer, or job-card-assigned freelancer). Project must also be in an active status.
- **Request Body (JSON)**:
  ```json
  {
    "job_card_id": 101, // Required: ID of the job card
    "start_time": "YYYY-MM-DDTHH:MM:SSZ", // Required: ISO8601 format
    "end_time": "YYYY-MM-DDTHH:MM:SSZ",   // Required: ISO8601 format
    "notes": "Worked on initial design phase." // Optional
  }
  ```
  *(Backend calculates `duration_minutes` and uses authenticated `user_id`)*
- **Response (Success - 201 Created)**:
  ```json
  {
    "message": "Time logged successfully.",
    "time_log_id": 1,
    "duration_minutes": 120
  }
  ```
- **Response (Error - 4xx/5xx)**:
  ```json
  {
    "error": "Error message (e.g., Job Card ID, start time, and end time are required, Invalid time format, Start time must be before end time, Project not active, Forbidden)."
  }
  ```

### 2. Get Job Card Time Logs
- **Action**: `get_job_card_time_logs`
- **Method**: `GET`
- **URL**: `/backend/api.php?action=get_job_card_time_logs&job_card_id=<job_card_id>`
- **Authentication**: **Required**.
  - User must be authorized to view the job card (admin, client owner, project-assigned freelancer, or job-card-assigned freelancer).
- **Response (Success - 200 OK)**: Array of time log objects for the specified job card.
  ```json
  [
    {
      "id": 1,
      "job_card_id": 101,
      "user_id": 789,
      "start_time": "YYYY-MM-DD HH:MM:SS", // Note: DB format might be without 'T' and 'Z'
      "end_time": "YYYY-MM-DD HH:MM:SS",
      "duration_minutes": 120,
      "notes": "Worked on initial design phase.",
      "created_at": "YYYY-MM-DD HH:MM:SS",
      "updated_at": "YYYY-MM-DD HH:MM:SS",
      "logger_username": "freelancer_test"
    }
    // ... more time logs for this job card
  ]
  ```
- **Response (Error - 4xx/5xx)**:
  ```json
  {
    "error": "Error message (e.g., Job Card ID required, Job Card not found, Forbidden)."
  }
  ```

### 3. Get Project Time Logs (All logs for a project)
- **Action**: `get_project_time_logs`
- **Method**: `GET`
- **URL**: `/backend/api.php?action=get_project_time_logs&project_id=<project_id>`
- **Authentication**: **Required**.
  - User role must be 'admin' or 'client' (must own the project).
- **Response (Success - 200 OK)**: Array of time log objects for all job cards in the project.
  ```json
  [
    {
      "id": 1,
      "job_card_id": 101,
      "user_id": 789,
      "start_time": "YYYY-MM-DD HH:MM:SS",
      "end_time": "YYYY-MM-DD HH:MM:SS",
      "duration_minutes": 120,
      "notes": "Worked on initial design phase.",
      "created_at": "YYYY-MM-DD HH:MM:SS",
      "updated_at": "YYYY-MM-DD HH:MM:SS",
      "logger_username": "freelancer_test",
      "job_card_title": "Design initial mockups"
    }
    // ... more time logs for this project
  ]
  ```
- **Response (Error - 4xx/5xx)**:
  ```json
  {
    "error": "Error message (e.g., Project ID required, Project not found, Forbidden)."
  }
  ```

### 4. Update Time Log
- **Action**: `update_time_log`
- **Method**: `POST` (or `PUT`)
- **URL**: `/backend/api.php?action=update_time_log&time_log_id=<time_log_id>`
- **Authentication**: **Required**.
  - User must own the time log or be an 'admin'.
- **Request Body (JSON) - Include only fields to update**:
  ```json
  {
    "start_time": "YYYY-MM-DDTHH:MM:SSZ", // Optional
    "end_time": "YYYY-MM-DDTHH:MM:SSZ",   // Optional
    "notes": "Updated notes for the session." // Optional
  }
  ```
  *(Backend recalculates `duration_minutes` if times change)*
- **Response (Success - 200 OK)**:
  ```json
  {
    "message": "Time log updated successfully."
    // or "Time log data was the same or log not found; no changes made."
  }
  ```
- **Response (Error - 4xx/5xx)**:
  ```json
  {
    "error": "Error message (e.g., Time Log ID required, Time Log not found, Forbidden, Invalid time format, Start time must be before end time)."
  }
  ```

### 5. Delete Time Log
- **Action**: `delete_time_log`
- **Method**: `DELETE` (or `POST` if `time_log_id` is in payload)
- **URL**: `/backend/api.php?action=delete_time_log&time_log_id=<time_log_id>`
- **Authentication**: **Required**.
  - User must own the time log or be an 'admin'.
- **Request Body (Optional for POST)**:
  ```json
  {
    "time_log_id": 1
  }
  ```
- **Response (Success - 200 OK)**:
  ```json
  {
    "message": "Time log deleted successfully."
  }
  ```
- **Response (Error - 4xx/5xx)**:
  ```json
  {
    "error": "Error message (e.g., Time Log ID required, Time Log not found, Forbidden)."
  }
  ```

## Messaging Endpoints

Endpoints for 1-on-1 user communication.

### 1. Find or Create 1-on-1 Conversation
- **Action**: `find_or_create_conversation`
- **Method**: `POST`
- **URL**: `/backend/api.php?action=find_or_create_conversation`
- **Authentication**: **Required**.
- **Request Body (JSON)**:
  ```json
  {
    "recipient_user_id": 456 // ID of the user to start a conversation with
  }
  ```
- **Response (Success - 200 OK if found, 201 Created if new)**:
  ```json
  {
    "conversation_id": 12,
    "existed": true // or false if newly created
  }
  ```
- **Response (Error - 4xx/5xx)**:
  ```json
  {
    "error": "Error message (e.g., Recipient user ID is required, Recipient user not found, Cannot create a conversation with yourself)."
  }
  ```

### 2. Get User's Conversations
- **Action**: `get_user_conversations`
- **Method**: `GET`
- **URL**: `/backend/api.php?action=get_user_conversations`
- **Authentication**: **Required**.
- **Response (Success - 200 OK)**: Array of conversation preview objects.
  ```json
  [
    {
      "conversation_id": 12,
      "created_at": "YYYY-MM-DD HH:MM:SS",
      "updated_at": "YYYY-MM-DD HH:MM:SS",
      "last_message_at": "YYYY-MM-DD HH:MM:SS",
      "participants": [
        { "id": 123, "username": "currentUser" },
        { "id": 456, "username": "otherUser" }
      ],
      "last_message_snippet": "Okay, sounds good!",
      "last_message_sender_id": 456,
      "last_message_sender_username": "otherUser",
      "unread_message_count": 0
    }
    // ... more conversations, ordered by last_message_at DESC
  ]
  ```
  *(Note: `unread_message_count` is specific to the authenticated user for that conversation).*
- **Response (Error - 4xx/5xx)**:
  ```json
  {
    "error": "Error message."
  }
  ```

### 3. Get Conversation Messages
- **Action**: `get_conversation_messages`
- **Method**: `GET`
- **URL**: `/backend/api.php?action=get_conversation_messages&conversation_id=<id>&limit=50&before_message_id=<msg_id>`
  - `conversation_id`: Required.
  - `limit`: Optional, number of messages to fetch (default 50).
  - `before_message_id`: Optional, fetches messages older than this ID (for pagination).
- **Authentication**: **Required** (User must be a participant).
- **Response (Success - 200 OK)**: Array of message objects, typically oldest first from the batch.
  ```json
  [
    {
      "id": 101, // message_id
      "conversation_id": 12,
      "sender_id": 123,
      "sender_username": "currentUser",
      "content": "Hello there!",
      "created_at": "YYYY-MM-DD HH:MM:SS",
      "read_at": "YYYY-MM-DD HH:MM:SS" // or null
    },
    {
      "id": 102,
      "conversation_id": 12,
      "sender_id": 456,
      "sender_username": "otherUser",
      "content": "Hi! How are you?",
      "created_at": "YYYY-MM-DD HH:MM:SS",
      "read_at": null
    }
  ]
  ```
- **Response (Error - 4xx/5xx)**:
  ```json
  {
    "error": "Error message (e.g., Conversation ID required, Forbidden)."
  }
  ```

### 4. Send Message
- **Action**: `send_message`
- **Method**: `POST`
- **URL**: `/backend/api.php?action=send_message`
- **Authentication**: **Required** (User must be a participant).
- **Request Body (JSON)**:
  ```json
  {
    "conversation_id": 12,
    "content": "This is my message."
  }
  ```
- **Response (Success - 201 Created)**: The newly created message object.
  ```json
  {
    "id": 103, // New message_id
    "conversation_id": 12,
    "sender_id": 123, // Authenticated user's ID
    "sender_username": "currentUser",
    "content": "This is my message.",
    "created_at": "YYYY-MM-DD HH:MM:SS", // Server timestamp
    "read_at": null
  }
  ```
- **Response (Error - 4xx/5xx)**:
  ```json
  {
    "error": "Error message (e.g., Conversation ID and content are required, Forbidden, Conversation not found)."
  }
  ```

### 5. Mark Conversation as Read
- **Action**: `mark_conversation_as_read`
- **Method**: `POST` (or `PUT`)
- **URL**: `/backend/api.php?action=mark_conversation_as_read`
- **Authentication**: **Required** (User must be a participant).
- **Request Body (JSON)**:
  ```json
  {
    "conversation_id": 12
  }
  ```
  *(Backend also checks `$_GET['conversation_id']` as a fallback)*
- **Response (Success - 200 OK)**:
  ```json
  {
    "message": "Messages marked as read successfully.",
    "marked_read_count": 5 // Number of messages updated
  }
  ```
- **Response (Error - 4xx/5xx)**:
  ```json
  {
    "error": "Error message (e.g., Conversation ID required, Forbidden)."
  }
  ```
---

## Database Schemas Overview

This section provides an overview of key database tables involved in the API.

### `users` Table
- `id`: INT, PK, Auto Increment
- `username`: VARCHAR(255), Unique, NOT NULL
- `password`: VARCHAR(255), NOT NULL (hashed)
- `email`: VARCHAR(255), Unique, NOT NULL
- `role`: VARCHAR(50), NOT NULL (e.g., 'admin', 'client', 'freelancer')
- `name`: VARCHAR(255), NULLABLE (Full name)
- `phone_number`: VARCHAR(50), NULLABLE
- `company`: VARCHAR(255), NULLABLE
- `experience`: TEXT, NULLABLE (Bio, experience summary)
- `hourly_rate`: DECIMAL(10,2), NULLABLE (Primarily for freelancers)
- `avatar_url`: VARCHAR(2048), NULLABLE
- `is_active`: BOOLEAN, NOT NULL, DEFAULT true (For soft deletes)
- `session_token`: VARCHAR(255), NULLABLE, Unique
- `session_token_expires_at`: TIMESTAMP, NULLABLE
- `created_at`: TIMESTAMP, DEFAULT CURRENT_TIMESTAMP
- `updated_at`: TIMESTAMP, DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP

### `projects` Table
- `id`: Primary Key
- `client_id`: Foreign Key to `users.id`
- `freelancer_id`: Foreign Key to `users.id` (Nullable)
- `title`, `description`, `status`
- `created_at`, `updated_at`

### `applications` Table (New)
Stores applications submitted by freelancers for projects.
- `id`: INT, Primary Key, Auto Increment
- `project_id`: INT, Foreign Key (references `projects.id`), Not Null
- `freelancer_id`: INT, Foreign Key (references `users.id`), Not Null
- `proposal_text`: TEXT, Not Null
- `bid_amount`: DECIMAL(10, 2), Nullable
- `status`: VARCHAR(50), Not Null, Default 'pending' (e.g., 'pending', 'accepted', 'rejected', 'withdrawn_by_freelancer', 'archived_by_client')
- `applied_at`: TIMESTAMP, Default CURRENT_TIMESTAMP
- `updated_at`: TIMESTAMP, Default CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP

### `job_cards` Table (New)
Stores tasks or job cards associated with projects.
- `id`: INT, PK, Auto Increment
- `project_id`: INT, FK to `projects.id` (ON DELETE CASCADE), NOT NULL
- `title`: VARCHAR(255), NOT NULL
- `description`: TEXT, NULLABLE
- `status`: VARCHAR(50), NOT NULL, DEFAULT 'todo' (e.g., 'todo', 'in_progress', 'pending_review', 'completed')
- `assigned_freelancer_id`: INT, FK to `users.id` (ON DELETE SET NULL), NULLABLE
- `estimated_hours`: DECIMAL(5, 2), NULLABLE
- `created_at`: TIMESTAMP, DEFAULT CURRENT_TIMESTAMP
- `updated_at`: TIMESTAMP, DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP

### `time_logs` Table (New)
Stores time log entries against job cards.
- `id`: INT, PK, Auto Increment
- `job_card_id`: INT, FK to `job_cards.id` (ON DELETE CASCADE), NOT NULL
- `user_id`: INT, FK to `users.id` (user who logged time, ON DELETE CASCADE), NOT NULL
- `start_time`: TIMESTAMP, NOT NULL
- `end_time`: TIMESTAMP, NOT NULL
- `duration_minutes`: INT, NOT NULL (calculated)
- `notes`: TEXT, NULLABLE
- `created_at`: TIMESTAMP, DEFAULT CURRENT_TIMESTAMP
- `updated_at`: TIMESTAMP, DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP

### `conversations` Table (New)
Facilitates messaging between users.
- `id`: INT, PK, Auto Increment
- `created_at`: TIMESTAMP, DEFAULT CURRENT_TIMESTAMP
- `updated_at`: TIMESTAMP, DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
- `last_message_at`: TIMESTAMP, NULLABLE (indexed, updated by trigger or backend logic on new message)

### `conversation_participants` Table (New)
Links users to conversations, forming a many-to-many relationship.
- `id`: INT, PK, Auto Increment
- `conversation_id`: INT, FK to `conversations.id` (ON DELETE CASCADE), NOT NULL
- `user_id`: INT, FK to `users.id` (ON DELETE CASCADE), NOT NULL
- `joined_at`: TIMESTAMP, DEFAULT CURRENT_TIMESTAMP
- Unique Key: `(conversation_id, user_id)` to prevent duplicate participants.

### `messages` Table (New)
Stores individual messages within conversations.
- `id`: INT, PK, Auto Increment
- `conversation_id`: INT, FK to `conversations.id` (ON DELETE CASCADE), NOT NULL
- `sender_id`: INT, FK to `users.id` (ON DELETE CASCADE), NOT NULL
- `content`: TEXT, NOT NULL
- `created_at`: TIMESTAMP, DEFAULT CURRENT_TIMESTAMP (indexed)
- `read_at`: TIMESTAMP, NULLABLE (indicates when a recipient last read messages in this conversation up to this point, or individual message read receipts if more granular)
