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
  *Triggers an admin notification (`new_user_registered`).*

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

## Job Card Messaging Endpoints

These endpoints facilitate communication specifically tied to Job Cards. Messages sent via these endpoints are linked to a Job Card and have specific visibility rules.

### 1. Send Job Card Message
- **Action**: `send_job_card_message`
- **Method**: `POST`
- **URL**: `/backend/api.php?action=send_job_card_message`
- **Authentication**: **Required**. User must be authorized for the job card (admin, client, project freelancer, or job card assigned freelancer).
- **Request Body (JSON)**:
  ```json
  {
    "job_card_id": 123, // Required: ID of the job card
    "content": "This is a message about the task.", // Required if no attachments
    "attachment_ids": [1, 2] // Optional: Array of pre-uploaded attachment IDs
  }
  ```
- **Description**:
  - Sends a message linked to a specific job card.
  - Creates or uses an existing conversation tied to the `job_card_id`.
  - Participants (client, project freelancer, job card freelancer) are automatically managed for new conversations.
  - **Visibility Rules**:
    - If sender is 'freelancer': `moderation_status` is 'pending_approval', `is_visible_to_client` is `FALSE`.
    - Otherwise (client/admin): `moderation_status` is 'approved', `is_visible_to_client` is `TRUE`.
  - If `attachment_ids` are provided, they are linked to the newly created message. Attachments must be uploaded first via `upload_message_attachment` and their `message_id` must be `NULL`.
- **Response (Success - 201 Created)**: The newly created message object, including any linked attachments.
  ```json
  {
    "id": 105,
    "conversation_id": 15,
    "sender_id": 789,
    "content": "This is a message about the task.",
    "created_at": "YYYY-MM-DD HH:MM:SS",
    "moderation_status": "pending_approval", // Example if sent by freelancer
    "is_visible_to_client": false,        // Example if sent by freelancer
    "attachments": [
      {
        "id": 1,
        "original_file_name": "brief.pdf",
        "file_path": "message_attachments/unique_id_brief.pdf",
        "file_type": "application/pdf",
        "file_size_bytes": 102400,
        "created_at": "YYYY-MM-DD HH:MM:SS"
      }
      // ... other attachments
    ]
  }
  ```
- **Response (Error - 4xx/5xx)**:
  ```json
  {
    "error": "Error message (e.g., Job Card ID and content/attachments are required, Forbidden, Job Card not found, One or more attachments could not be linked)."
  }
  ```

### 2. Get Job Card Messages
- **Action**: `get_job_card_messages`
- **Method**: `GET`
- **URL**: `/backend/api.php?action=get_job_card_messages&job_card_id=<id>&limit=50&offset=0`
- **Authentication**: **Required**. User must be authorized for the job card.
- **Query Parameters**:
  - `job_card_id`: Required.
  - `limit`: Optional, number of messages (default 50).
  - `offset`: Optional, for pagination (default 0).
- **Description**:
  - Fetches messages for a conversation linked to a `job_card_id`.
  - **Role-based Visibility**:
    - Admins: See all messages.
    - Clients: See messages where `is_visible_to_client = TRUE`.
    - Freelancers: See their own messages OR messages where `is_visible_to_client = TRUE`.
  - Messages are ordered by `created_at ASC`.
  - Each message includes sender details (`sender_username`, `sender_avatar_url`) and an `attachments` array.
  - `moderation_status` and `is_visible_to_client` fields are included for relevant users (admins, or sender for their own messages).
- **Response (Success - 200 OK)**: Array of message objects.
  ```json
  [
    {
      "id": 101,
      "conversation_id": 15,
      "sender_id": 456, // Client ID
      "sender_username": "clientUser",
      "sender_avatar_url": "path/to/avatar.png",
      "content": "Please check the attached design file.",
      "created_at": "YYYY-MM-DD HH:MM:SS",
      "moderation_status": "approved",
      "is_visible_to_client": true,
      "attachments": [
        {
          "id": 1,
          "original_file_name": "design_v1.pdf",
          "file_path": "message_attachments/unique_design.pdf",
          "file_type": "application/pdf",
          "file_size_bytes": 123456,
          "created_at": "YYYY-MM-DD HH:MM:SS"
        }
      ]
    },
    {
      "id": 102,
      "sender_id": 789, // Freelancer ID
      "sender_username": "freelancerUser",
      "sender_avatar_url": "path/to/f_avatar.png",
      "content": "Thanks, reviewing it now. My feedback is attached.",
      "created_at": "YYYY-MM-DD HH:MM:SS",
      "moderation_status": "pending_approval", // If viewed by admin or this freelancer
      "is_visible_to_client": false,         // If viewed by admin or this freelancer
      "attachments": [
         {
          "id": 2,
          "original_file_name": "feedback.txt",
          "file_path": "message_attachments/unique_feedback.txt",
          "file_type": "text/plain",
          "file_size_bytes": 1024,
          "created_at": "YYYY-MM-DD HH:MM:SS"
        }
      ]
    }
    // ... more messages
  ]
  ```
- **Response (Error - 4xx/5xx)**:
  ```json
  {
    "error": "Error message (e.g., Job Card ID required, Forbidden, Job Card not found)."
  }
  ```

### 3. Upload Message Attachment
- **Action**: `upload_message_attachment`
- **Method**: `POST`
- **URL**: `/backend/api.php?action=upload_message_attachment`
- **Authentication**: **Required**. User must be authorized for the job card.
- **Request Body**: `multipart/form-data`
  - `job_card_id`: (Integer) ID of the job card for context and permission checking.
  - `attachment_file`: (File) The file to upload.
- **Description**:
  - Uploads a file intended to be an attachment for a job card message.
  - Validates file type (common images, PDF, text, Office documents) and size (e.g., up to 10MB).
  - Stores the file with a unique name in `uploads/message_attachments/`.
  - Creates a record in `message_attachments` with `message_id` initially `NULL`.
- **Response (Success - 201 Created)**: Details of the temporarily stored attachment.
  ```json
  {
    "id": 3, // ID of the entry in message_attachments table
    "original_file_name": "brief.docx",
    "file_type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "file_size_bytes": 25600,
    "file_path": "message_attachments/attachment_uniqueid.docx",
    "message": "File uploaded successfully and pending association with a message."
  }
  ```
- **Response (Error - 4xx/5xx)**:
  ```json
  {
    "error": "Error message (e.g., Job Card ID required, No file uploaded, File too large, Unsupported file type, Failed to move file, Server error)."
  }
  ```

### 4. Admin Moderate Message
- **Action**: `admin_moderate_message`
- **Method**: `POST` (or `PUT`)
- **URL**: `/backend/api.php?action=admin_moderate_message`
- **Authentication**: **Required** (User role must be 'admin').
- **Request Body (JSON)**:
  ```json
  {
    "message_id": 102,
    "new_moderation_status": "approved" // or "rejected"
  }
  ```
- **Description**:
  - Allows an admin to change the moderation status of a message.
  - If `new_moderation_status` is 'approved', `is_visible_to_client` is set to `TRUE`.
  - If `new_moderation_status` is 'rejected', `is_visible_to_client` is set to `FALSE`.
- **Response (Success - 200 OK)**:
  ```json
  {
    "message": "Message moderation status updated successfully."
  }
  ```
- **Response (Error - 4xx/5xx)**:
  ```json
  {
    "error": "Error message (e.g., Message ID and status required, Invalid status, Message not found, Forbidden)."
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

## User Profile Management

Endpoints for any authenticated user to manage their own profile.

### 1. Get My Profile Details
- **Action**: `get_my_profile_details`
- **Method**: `GET`
- **URL**: `/backend/api.php?action=get_my_profile_details`
- **Authentication**: **Required** (Bearer Token).
- **Description**: Fetches the detailed profile information for the currently authenticated user, including their associated skills.
- **Response (Success - 200 OK)**:
  ```json
  {
    "id": 123,
    "username": "testuser",
    "email": "test@example.com",
    "role": "freelancer",
    "name": "Test User Full Name",
    "phone_number": "555-1234",
    "company": "Test Inc.",
    "experience": "5 years in web development focusing on PHP and React.",
    "hourly_rate": 60.50, // Null if not applicable (e.g., for clients)
    "avatar_url": "https://example.com/avatars/testuser.png",
    "is_active": true,
    "created_at": "YYYY-MM-DD HH:MM:SS",
    "updated_at": "YYYY-MM-DD HH:MM:SS",
    "skills": [
      {"id": 1, "name": "PHP"},
      {"id": 2, "name": "React"}
      // ... other skills
    ]
  }
  ```
- **Response (Error - 401 Unauthorized / 403 Forbidden)**:
  ```json
  {
    "error": "Authorization header missing or malformed. Usage: Bearer <token>"
    // or "Invalid or expired session token. Please log in again."
  }
  ```
- **Response (Error - 404 Not Found)**:
  ```json
  {
    "error": "User profile not found." // Should be rare if user is authenticated
  }
  ```
- **Response (Error - 500 Server Error)**:
  ```json
  {
    "error": "Failed to prepare/execute statement for user details/skills."
  }
  ```

### 2. Update My Profile
- **Action**: `update_my_profile`
- **Method**: `POST` (or `PUT`)
- **URL**: `/backend/api.php?action=update_my_profile`
- **Authentication**: **Required** (Bearer Token).
- **Description**: Allows the authenticated user to update their own profile information.
- **Request Body (JSON) - Include only fields to update**:
  ```json
  {
    "name": "Updated Full Name", // Optional
    "phone_number": "555-5678", // Optional
    "company": "Updated Company LLC", // Optional
    "experience": "Updated bio with new achievements.", // Optional
    "avatar_url": "https://example.com/avatars/new_avatar.png", // Optional
    "hourly_rate": 75.00, // Optional; only applicable if user is 'freelancer'. Must not be negative.
    "skill_ids": [1, 3, 5] // Optional; replaces all existing skills with the new set. An empty array [] removes all skills.
  }
  ```
  *Fields like `username`, `email`, `role`, `password`, `is_active` cannot be updated via this endpoint.*
- **Response (Success - 200 OK)**:
  ```json
  {
    "message": "Profile updated successfully."
    // or "No profile data provided or no changes made."
  }
  ```
- **Response (Error - 400 Bad Request)**:
  ```json
  {
    "error": "No update data provided or invalid JSON."
    // or "Hourly rate cannot be negative."
    // or "One or more provided skill IDs are invalid."
  }
  ```
- **Response (Error - 401 Unauthorized / 403 Forbidden)**:
  ```json
  {
    "error": "Authorization header missing or malformed. Usage: Bearer <token>"
    // or "Invalid or expired session token. Please log in again."
  }
  ```
- **Response (Error - 500 Server Error)**:
  ```json
  {
    "error": "Failed to update profile: <specific DB error or preparation failure>"
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

### 3. Admin Create User
- **Action**: `admin_create_user`
- **Method**: `POST`
- **URL**: `/backend/api.php?action=admin_create_user`
- **Authentication**: **Required** (User role must be 'admin').
- **Request Body (JSON)**:
  ```json
  {
    "username": "newadminuser",
    "email": "newadmin@example.com",
    "password": "securePassword123",
    "role": "client", // Role to assign
    "name": "New User Full Name", // Optional
    "phone_number": "123-456-7890", // Optional
    "company": "New User Company", // Optional
    "experience": "Some initial experience details.", // Optional
    "hourly_rate": 50.00, // Optional, for freelancers
    "avatar_url": "https://example.com/avatar.jpg" // Optional
  }
  ```
- **Response (Success - 201 Created)**:
  ```json
  {
    "message": "User created successfully by admin.",
    "user_id": 125
  }
  ```
- **Response (Error - 4xx/5xx)**:
  ```json
  {
    "error": "Error message (e.g., Username or email already exists, Missing required fields)."
  }
  ```

### 4. Admin Get User Details
- **Action**: `admin_get_user_details`
- **Method**: `GET`
- **URL**: `/backend/api.php?action=admin_get_user_details&user_id=<user_id>`
- **Authentication**: **Required** (User role must be 'admin').
- **Response (Success - 200 OK)**: Full user details object.
  ```json
  {
    "id": 123,
    "username": "testuser",
    "email": "test@example.com",
    "role": "freelancer",
    "name": "Test User Full Name",
    "phone_number": "555-1234",
    "company": "Test Inc.",
    "experience": "5 years in web development.",
    "hourly_rate": 60.50,
    "avatar_url": "https://example.com/avatars/testuser.png",
    "is_active": true,
    "created_at": "YYYY-MM-DD HH:MM:SS",
    "updated_at": "YYYY-MM-DD HH:MM:SS",
    "skills": [
      {"id": 1, "name": "PHP"},
      {"id": 2, "name": "React"}
    ]
  }
  ```
- **Response (Error - 4xx/5xx)**:
  ```json
  {
    "error": "Error message (e.g., User ID required, User not found, Forbidden)."
  }
  ```

### 5. Admin Update User Details
- **Action**: `admin_update_user_details`
- **Method**: `POST` (or `PUT`)
- **URL**: `/backend/api.php?action=admin_update_user_details&user_id=<user_id>`
- **Authentication**: **Required** (User role must be 'admin').
- **Request Body (JSON) - Include only fields to update**:
  ```json
  {
    "username": "updateduser",
    "email": "updated@example.com",
    "role": "client",
    "name": "Updated Full Name",
    "phone_number": "555-5678",
    "company": "Updated Company LLC",
    "experience": "Updated bio and experience.",
    "hourly_rate": 75.00,
    "avatar_url": "https://example.com/avatars/updateduser.png",
    "is_active": false,
    "skill_ids": [1, 3]
  }
  ```
  *If `skill_ids` is provided, existing skills for the user will be replaced with this new set.*
- **Response (Success - 200 OK)**:
  ```json
  {
    "message": "User details updated successfully."
  }
  ```
- **Response (Error - 4xx/5xx)**:
  ```json
  {
    "error": "Error message (e.g., User ID required, User not found, Forbidden, Username or email already taken)."
  }
  ```

### 6. Admin Delete User (Soft Deactivate)
- **Action**: `admin_delete_user`
- **Method**: `POST` (or `DELETE`)
- **URL**: `/backend/api.php?action=admin_delete_user&user_id=<user_id>`
- **Authentication**: **Required** (User role must be 'admin').
- **Request Body (Optional if user_id in URL)**:
  ```json
  {
    "user_id": 123
  }
  ```
- **Response (Success - 200 OK)**:
  ```json
  {
    "message": "User deactivated successfully."
  }
  ```
- **Response (Error - 4xx/5xx)**:
  ```json
  {
    "error": "Error message (e.g., User ID required, User not found, Cannot deactivate self, Forbidden)."
  }
  ```

### 7. Admin Get Dashboard Stats
- **Action**: `get_admin_dashboard_stats`
- **Method**: `GET`
- **URL**: `/backend/api.php?action=get_admin_dashboard_stats`
- **Authentication**: **Required** (User role must be 'admin').
- **Response (Success - 200 OK)**:
  ```json
  {
    "total_users": 150,
    "users_by_role": {
      "admin": 2,
      "client": 50,
      "freelancer": 98
    },
    "total_projects": 75,
    "projects_by_status": {
      "open": 20,
      "in_progress": 30,
      "completed": 20,
      "pending_approval": 5
      // ... other statuses
    },
    "total_applications_pending": 45
  }
  ```
- **Response (Error - 4xx/5xx)**:
  ```json
  {
    "error": "Error message."
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
  *If project status is set to 'Pending Approval' (or similar), triggers an admin notification (`project_awaits_approval`).*

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
    "status": "completed",
    "skill_ids": [2, 7]
  }
  ```
  *If `skill_ids` is provided, existing required skills for the project will be replaced with this new set.*
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
  - `id`: If provided, fetches a single project by its ID.
- **Response (Success - 200 OK)**: Array of project objects (if no `id` param) or a single project object (if `id` param is used).
  ```json
  // Example for list of projects (action=get_projects&status=open)
  [
    {
      "id": 123,
      "title": "Open Project Title",
      "description": "...",
      "client_id": 456,
      "freelancer_id": null,
      "status": "open",
      "created_at": "YYYY-MM-DD HH:MM:SS",
      "updated_at": "YYYY-MM-DD HH:MM:SS",
      "client_username": "client_user_for_project_123",
      "freelancer_username": null
    }
    // ... more projects
  ]
  ```
  ```json
  // Example for single project fetch (action=get_projects&id=123)
  {
    "id": 123,
    "title": "Specific Project Title",
    "description": "Detailed description of project 123.",
    "client_id": 456,
    "freelancer_id": 789, // or null
    "status": "open", // or any other status
    "created_at": "YYYY-MM-DD HH:MM:SS",
    "updated_at": "YYYY-MM-DD HH:MM:SS",
    "client_username": "client_user_for_project_123",
    "freelancer_username": "freelancer_assigned_to_123_or_null",
    "skills_required": [
      {"id": 2, "name": "React"},
      {"id": 5, "name": "Graphic Design"}
    ]
  }
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

## Freelancer Dashboard Endpoints

### 1. Get Freelancer Dashboard Stats
- **Action**: `get_freelancer_dashboard_stats`
- **Method**: `GET`
- **URL**: `/backend/api.php?action=get_freelancer_dashboard_stats`
- **Authentication**: **Required** (Bearer Token), Role: `freelancer`.
- **Description**: Retrieves key statistics for the authenticated freelancer's dashboard.
  - `myTotalJobCards`: Total count of job cards where `assigned_freelancer_id` is the freelancer's ID.
  - `myInProgressJobCards`: Count of job cards assigned to the freelancer that have a status of 'in_progress'.
  - `openProjectsCount`: Total count of all projects in the system with a status of 'open'.
  - `myApplicationsCount`: Total count of applications submitted by the freelancer from the `applications` table.
- **Response (Success - 200 OK)**:
  ```json
  {
    "myTotalJobCards": 5,
    "myInProgressJobCards": 2,
    "openProjectsCount": 10,
    "myApplicationsCount": 7
  }
  ```
- **Response (Error - 401 Unauthorized)**:
  ```json
  {
    "error": "Authorization header missing or malformed. Usage: Bearer <token>"
  }
  ```
- **Response (Error - 403 Forbidden)**:
  ```json
  {
    "error": "Invalid or expired session token. Please log in again."
    // or "Forbidden: Only freelancers can access these statistics."
  }
  ```
- **Response (Error - 500 Server Error)**:
  ```json
  {
    "error": "Server error message if database queries fail."
  }
  ```

### 2. Get My Job Cards
- **Action**: `get_my_job_cards`
- **Method**: `GET`
- **URL**: `/backend/api.php?action=get_my_job_cards`
- **Authentication**: **Required** (Bearer Token), Role: `freelancer`.
- **Description**: Fetches all job cards assigned to the authenticated freelancer. Each job card includes `project_id` and `project_title` for context. Results are ordered by the job card's last update time (descending).
- **Response (Success - 200 OK)**:
  ```json
  [
    {
      "id": 101,
      "project_id": 123,
      "title": "Develop homepage banner",
      "description": "Create a responsive banner for the homepage.",
      "status": "in_progress",
      "assigned_freelancer_id": 789,
      "estimated_hours": 10.0,
      "created_at": "YYYY-MM-DD HH:MM:SS",
      "updated_at": "YYYY-MM-DD HH:MM:SS",
      "project_title": "E-commerce Website Redesign"
    },
    {
      "id": 105,
      "project_id": 124,
      "title": "Setup database schema",
      "description": null,
      "status": "todo",
      "assigned_freelancer_id": 789,
      "estimated_hours": 5.5,
      "created_at": "YYYY-MM-DD HH:MM:SS",
      "updated_at": "YYYY-MM-DD HH:MM:SS",
      "project_title": "Mobile App Development"
    }
    // ... more job cards
  ]
  ```
- **Response (Error - 401 Unauthorized)**:
  ```json
  {
    "error": "Authorization header missing or malformed. Usage: Bearer <token>"
  }
  ```
- **Response (Error - 403 Forbidden)**:
  ```json
  {
    "error": "Invalid or expired session token. Please log in again."
    // or "Forbidden: Only freelancers can access their job cards."
  }
  ```
- **Response (Error - 500 Server Error)**:
  ```json
  {
    "error": "Failed to prepare statement for fetching job cards."
    // or "Failed to execute statement for fetching job cards."
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
  *Triggers an admin notification (`application_submitted`).*

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

## Skills Endpoints

Endpoints for managing and retrieving skills.

### 1. Get All Skills
- **Action**: `get_all_skills`
- **Method**: `GET`
- **URL**: `/backend/api.php?action=get_all_skills`
- **Authentication**: **Required** (Any logged-in user).
- **Response (Success - 200 OK)**: Array of skill objects.
  ```json
  [
    {
      "id": 1,
      "name": "PHP",
      "created_at": "YYYY-MM-DD HH:MM:SS"
    },
    {
      "id": 2,
      "name": "React",
      "created_at": "YYYY-MM-DD HH:MM:SS"
    }
    // ... more skills
  ]
  ```
- **Response (Error - 403 Forbidden / 5xx Server Error)**:
  ```json
  {
    "error": "Error message."
  }
  ```

### 2. Admin Add Skill
- **Action**: `admin_add_skill`
- **Method**: `POST`
- **URL**: `/backend/api.php?action=admin_add_skill`
- **Authentication**: **Required** (User role must be 'admin').
- **Request Body (JSON)**:
  ```json
  {
    "name": "New Skill Name"
  }
  ```
- **Response (Success - 201 Created)**:
  ```json
  {
    "message": "Skill added successfully.",
    "skill": {
      "id": 3,
      "name": "New Skill Name",
      "created_at": "YYYY-MM-DD HH:MM:SS"
    }
  }
  ```
- **Response (Error - 4xx/5xx)**:
  ```json
  {
    "error": "Error message (e.g., Skill name is required, Skill already exists)."
  }
  ```

## Notification Endpoints (Admin Focus)

Endpoints for administrators to manage and view system notifications.

### 1. Get Admin Notifications
- **Action**: `get_admin_notifications`
- **Method**: `GET`
- **URL**: `/backend/api.php?action=get_admin_notifications&limit=25&offset=0`
  - `limit`: Optional, number of notifications to fetch (default 25).
  - `offset`: Optional, for pagination.
- **Authentication**: **Required** (User role must be 'admin').
- **Response (Success - 200 OK)**:
  ```json
  {
    "notifications": [
      {
        "id": 1,
        "message_key": "new_user_registered",
        "related_entity_type": "user",
        "related_entity_id": 125,
        "is_read": false,
        "created_at": "YYYY-MM-DD HH:MM:SS"
      },
      {
        "id": 2,
        "message_key": "project_awaits_approval",
        "related_entity_type": "project",
        "related_entity_id": 77,
        "is_read": true,
        "created_at": "YYYY-MM-DD HH:MM:SS"
      }
      // ... more notifications
    ],
    "total_unread": 5
  }
  ```
- **Response (Error - 403 Forbidden / 5xx Server Error)**:
  ```json
  {
    "error": "Error message."
  }
  ```

### 2. Mark Notification(s) as Read
- **Action**: `mark_notification_as_read`
- **Method**: `POST` (or `PUT`)
- **URL**: `/backend/api.php?action=mark_notification_as_read`
- **Authentication**: **Required** (User role must be 'admin').
- **Request Body (JSON)**:
  ```json
  {
    "notification_id": 1 // or "notification_ids": [1, 2, 3]
  }
  ```
- **Response (Success - 200 OK)**:
  ```json
  {
    "message": "X notification(s) marked as read.",
    "marked_read_count": X
  }
  ```
- **Response (Error - 4xx/5xx)**:
  ```json
  {
    "error": "Error message (e.g., Notification ID(s) required, Forbidden)."
  }
  ```

### 3. Mark All Admin Notifications as Read
- **Action**: `mark_all_admin_notifications_as_read`
- **Method**: `POST` (or `PUT`)
- **URL**: `/backend/api.php?action=mark_all_admin_notifications_as_read`
- **Authentication**: **Required** (User role must be 'admin').
- **Response (Success - 200 OK)**:
  ```json
  {
    "message": "All X unread notification(s) marked as read.",
    "marked_read_count": X
  }
  ```
- **Response (Error - 403 Forbidden / 5xx Server Error)**:
  ```json
  {
    "error": "Error message."
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
Facilitates messaging between users. Can be a general 1-on-1 conversation or linked to a specific `job_card_id`.
- `id`: INT, PK, Auto Increment
- `job_card_id`: INT, Nullable, FK to `job_cards.id` (ON DELETE SET NULL) - Links conversation to a job card.
- `created_at`: TIMESTAMP, DEFAULT CURRENT_TIMESTAMP
- `updated_at`: TIMESTAMP, DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
- `last_message_at`: TIMESTAMP, NULLABLE (indexed, updated by trigger or backend logic on new message)
- Index on `job_card_id`.

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
- `moderation_status`: VARCHAR(25), Not Null, Default 'not_applicable' (e.g., 'not_applicable', 'pending_approval', 'approved', 'rejected')
- `is_visible_to_client`: BOOLEAN, Not Null, Default TRUE
- `created_at`: TIMESTAMP, DEFAULT CURRENT_TIMESTAMP (indexed)
- `read_at`: TIMESTAMP, NULLABLE

### `message_attachments` Table (New)
Stores files attached to messages.
- `id`: INT, PK, Auto Increment
- `message_id`: INT, Nullable, FK to `messages.id` (ON DELETE CASCADE) - Initially NULL, updated when message is sent.
- `uploader_id`: INT, FK to `users.id` (ON DELETE SET NULL), Nullable
- `file_name`: VARCHAR(255), Not Null (Stored system file name)
- `original_file_name`: VARCHAR(255), Not Null (Original uploaded name)
- `file_path`: VARCHAR(1024), Not Null
- `file_type`: VARCHAR(100), Not Null
- `file_size_bytes`: INT, Not Null
- `created_at`: TIMESTAMP, Default CURRENT_TIMESTAMP
- Index on `message_id`.

### `skills` Table (New)
Stores a global list of definable skills.
- `id`: INT, PK, Auto Increment
- `name`: VARCHAR(255), UNIQUE, NOT NULL
- `created_at`: TIMESTAMP, DEFAULT CURRENT_TIMESTAMP

### `user_skills` Table (New - Junction)
Links users to skills (many-to-many).
- `user_id`: INT, FK to `users.id` (ON DELETE CASCADE), NOT NULL
- `skill_id`: INT, FK to `skills.id` (ON DELETE CASCADE), NOT NULL
- PRIMARY KEY (`user_id`, `skill_id`)

### `project_skills` Table (New - Junction)
Links projects to required skills (many-to-many).
- `project_id`: INT, FK to `projects.id` (ON DELETE CASCADE), NOT NULL
- `skill_id`: INT, FK to `skills.id` (ON DELETE CASCADE), NOT NULL
- PRIMARY KEY (`project_id`, `skill_id`)

### `notifications` Table (New)
Stores system notifications, primarily for administrators initially.
- `id`: INT, PK, Auto Increment
- `user_id`: INT, FK to `users.id` (ON DELETE CASCADE), NULLABLE (Recipient of the notification)
- `message_key`: VARCHAR(255), NOT NULL (Identifier for the type of notification message)
- `related_entity_type`: VARCHAR(50), NULLABLE (e.g., 'user', 'project', 'application' - the type of entity this notification is about)
- `related_entity_id`: INT, NULLABLE (The ID of the related entity)
- `is_read`: BOOLEAN, NOT NULL, DEFAULT 0 (0 for unread, 1 for read)
- `created_at`: TIMESTAMP, DEFAULT CURRENT_TIMESTAMP
