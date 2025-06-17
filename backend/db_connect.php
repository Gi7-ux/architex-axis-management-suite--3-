<?php
/*
================================================================================
DATABASE CREDENTIALS CONFIGURATION
================================================================================

**IMPORTANT:** You need to update the database credentials below to connect
to your MySQL database.

Open this file (`backend/db_connect.php`) and replace the placeholder values
for `DB_SERVER`, `DB_USERNAME`, `DB_PASSWORD`, and `DB_NAME` with your
actual database connection details.

Example:
If your cPanel MySQL database details are:
- Host: localhost
- Database User: myuser_app
- Database Password: myStrongPassword123
- Database Name: myuser_mydatabase

You would change the defines to:
define('DB_SERVER', 'localhost');
define('DB_USERNAME', 'myuser_app');
define('DB_PASSWORD', 'myStrongPassword123');
define('DB_NAME', 'myuser_mydatabase');

**Security Note:**
In a shared hosting environment like cPanel without terminal access, ensure
this file has appropriate permissions if possible, though options might be
limited. Avoid committing actual credentials to a public version control
repository. Consider using environment variables or a configuration file
outside the web root if your hosting setup allows, though this script
currently uses constants defined directly in the file for simplicity given
the constraints.

================================================================================
*/

/*
Database Schema:

Users Table:
- id: INT, Primary Key, Auto Increment
- username: VARCHAR(255), Unique, Not Null
- password: VARCHAR(255), Not Null (should be hashed)
- email: VARCHAR(255), Unique, Not Null
- role: VARCHAR(50) (e.g., 'admin', 'client', 'freelancer'), Not Null
- name: VARCHAR(255), Nullable (Full name)
- phone_number: VARCHAR(50), Nullable
- company: VARCHAR(255), Nullable
- experience: TEXT, Nullable (Bio, experience summary)
- hourly_rate: DECIMAL(10,2), Nullable (Primarily for freelancers)
- avatar_url: VARCHAR(2048), Nullable
- is_active: BOOLEAN, Not Null, Default true (For soft deletes)
- session_token: VARCHAR(255), Nullable, Unique
- session_token_expires_at: TIMESTAMP, Nullable
- created_at: TIMESTAMP, Default CURRENT_TIMESTAMP
- updated_at: TIMESTAMP, Default CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP (Add this too)

Projects Table:
- id: INT, Primary Key, Auto Increment
- title: VARCHAR(255), Not Null
- description: TEXT
- client_id: INT, Foreign Key (references users.id)
- freelancer_id: INT, Foreign Key (references users.id), Nullable
- status: VARCHAR(50) (e.g., 'open', 'in_progress', 'completed', 'cancelled')
- created_at: TIMESTAMP, Default CURRENT_TIMESTAMP
- updated_at: TIMESTAMP, Default CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP

Applications Table:
- id: INT, Primary Key, Auto Increment
- project_id: INT, Foreign Key (references projects.id ON DELETE CASCADE), Not Null
- freelancer_id: INT, Foreign Key (references users.id ON DELETE CASCADE), Not Null
- proposal_text: TEXT, Not Null
- bid_amount: DECIMAL(10, 2), Nullable
- status: VARCHAR(50), Not Null, Default 'pending' (values: 'pending', 'accepted', 'rejected', 'withdrawn_by_freelancer', 'archived_by_client')
- applied_at: TIMESTAMP, Default CURRENT_TIMESTAMP
- updated_at: TIMESTAMP, Default CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP

Job Cards Table:
- id: INT, Primary Key, Auto Increment
- project_id: INT, Foreign Key (references projects.id ON DELETE CASCADE), Not Null
- title: VARCHAR(255), Not Null
- description: TEXT, Nullable
- status: VARCHAR(50), Not Null, Default 'todo' (values: 'todo', 'in_progress', 'pending_review', 'completed')
- assigned_freelancer_id: INT, Foreign Key (references users.id ON DELETE SET NULL), Nullable
- estimated_hours: DECIMAL(5, 2), Nullable
- created_at: TIMESTAMP, Default CURRENT_TIMESTAMP
- updated_at: TIMESTAMP, Default CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP

Time Logs Table:
- id: INT, Primary Key, Auto Increment
- job_card_id: INT, Foreign Key (references job_cards.id ON DELETE CASCADE), Not Null
- user_id: INT, Foreign Key (references users.id ON DELETE CASCADE), Not Null
- start_time: TIMESTAMP, Not Null
- end_time: TIMESTAMP, Not Null
- duration_minutes: INT, Not Null
- notes: TEXT, Nullable
- created_at: TIMESTAMP, Default CURRENT_TIMESTAMP
- updated_at: TIMESTAMP, Default CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP

Conversations Table:
- id: INT, Primary Key, Auto Increment
- created_at: TIMESTAMP, Default CURRENT_TIMESTAMP
- updated_at: TIMESTAMP, Default CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
- last_message_at: TIMESTAMP, Nullable, INDEX

Conversation Participants Table:
- id: INT, Primary Key, Auto Increment
- conversation_id: INT, Foreign Key (references conversations.id ON DELETE CASCADE), Not Null
- user_id: INT, Foreign Key (references users.id ON DELETE CASCADE), Not Null
- joined_at: TIMESTAMP, Default CURRENT_TIMESTAMP
- UNIQUE KEY uk_conversation_user (conversation_id, user_id)

Messages Table:
- id: INT, Primary Key, Auto Increment
- conversation_id: INT, Foreign Key (references conversations.id ON DELETE CASCADE), Not Null
- sender_id: INT, Foreign Key (references users.id ON DELETE CASCADE), Not Null
- content: TEXT, Not Null
- created_at: TIMESTAMP, Default CURRENT_TIMESTAMP, INDEX
- read_at: TIMESTAMP, Nullable

Skills Table:
- id: INT, Primary Key, Auto Increment
- name: VARCHAR(255), Unique, Not Null
- created_at: TIMESTAMP, Default CURRENT_TIMESTAMP

User Skills Table (Junction Table):
- user_id: INT, Foreign Key (references users.id ON DELETE CASCADE), Not Null
- skill_id: INT, Foreign Key (references skills.id ON DELETE CASCADE), Not Null
- PRIMARY KEY (user_id, skill_id)

Project Skills Table (Junction Table):
- project_id: INT, Foreign Key (references projects.id ON DELETE CASCADE), Not Null
- skill_id: INT, Foreign Key (references skills.id ON DELETE CASCADE), Not Null
- PRIMARY KEY (project_id, skill_id)

Notifications Table:
- id: INT, Primary Key, Auto Increment
- user_id: INT, Foreign Key (references users.id ON DELETE CASCADE), Nullable (Specific admin if assigned, or for user-specific notifications later)
- message_key: VARCHAR(255), Not Null (e.g., 'new_user_registered', 'project_awaits_approval')
- related_entity_type: VARCHAR(50), Nullable (e.g., 'user', 'project', 'application')
- related_entity_id: INT, Nullable
- is_read: BOOLEAN, Not Null, Default 0
- created_at: TIMESTAMP, Default CURRENT_TIMESTAMP
*/

// --- Database Connection ---
// Replace with your actual database credentials
define('DB_SERVER', 'your_db_host'); // e.g., 'localhost' or IP address
define('DB_USERNAME', 'your_db_username');
define('DB_PASSWORD', 'your_db_password');
define('DB_NAME', 'your_db_name');

// Attempt to connect to MySQL database
$conn = new mysqli(DB_SERVER, DB_USERNAME, DB_PASSWORD, DB_NAME);

// Check connection
if ($conn->connect_error) {
    // Log error to a file or use a more robust error handling mechanism
    // For now, we'll just output a generic error message
    // In a production environment, you should not display detailed error messages to the user
    header('Content-Type: application/json');
    http_response_code(500); // Internal Server Error
    echo json_encode(['error' => 'Database connection failed. Please try again later.']);
    // It's crucial to stop script execution if the connection fails
    exit;
}

// Set character set to utf8mb4 for better Unicode support
if (!$conn->set_charset("utf8mb4")) {
    // Log error or handle as appropriate
    // For now, we'll output an error if it fails
    // error_log("Error loading character set utf8mb4: %s
", $conn->error);
    // Depending on your requirements, you might want to exit if this fails
}

// --- Connection Successful ---
// The $conn object can now be used to perform database operations
// For example: $result = $conn->query("SELECT * FROM users");

// It's good practice to close the connection when it's no longer needed.
// However, in a typical web application, the connection might be closed
// at the end of the script execution automatically.
// If you have long-running scripts or specific needs, you might close it explicitly:
// $conn->close();

?>
