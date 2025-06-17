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
- job_card_id: INT, Nullable, FK to job_cards.id (ON DELETE SET NULL) - For linking a conversation directly to a job card task.
- created_at: TIMESTAMP, Default CURRENT_TIMESTAMP
- updated_at: TIMESTAMP, Default CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
- last_message_at: TIMESTAMP, Nullable, INDEX
- INDEX (job_card_id) - For efficient querying by job_card_id.

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
- moderation_status: VARCHAR(25), Not Null, Default 'not_applicable' (e.g., 'not_applicable', 'pending_approval', 'approved', 'rejected')
- is_visible_to_client: BOOLEAN, Not Null, Default TRUE
- created_at: TIMESTAMP, Default CURRENT_TIMESTAMP, INDEX
- read_at: TIMESTAMP, Nullable

Message_Attachments Table:
- id: INT, PK, Auto Increment
- message_id: INT, Nullable, FK to messages.id (ON DELETE CASCADE)
- uploader_id: INT, FK to users.id (ON DELETE SET NULL), Nullable
- file_name: VARCHAR(255), Not Null (Stored file name, possibly sanitized or system-generated)
- original_file_name: VARCHAR(255), Not Null (Original name of the uploaded file)
- file_path: VARCHAR(1024), Not Null (Path to the stored file on the server)
- file_type: VARCHAR(100), Not Null (MIME type of the file)
- file_size_bytes: INT, Not Null
- created_at: TIMESTAMP, Default CURRENT_TIMESTAMP
- INDEX (message_id) - For efficient lookup of attachments for a message.

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
- user_id: INT, FK to users.id (ON DELETE CASCADE), Nullable (Recipient of the notification, if specific. Nullable.)
- actor_id: INT, Nullable, FK to users.id (ON DELETE SET NULL) (User who performed the action that triggered the notification)
- message_key: VARCHAR(255), Not Null (e.g., 'new_user_registered', 'project_awaits_approval', 'message_needs_moderation')
- related_entity_type: VARCHAR(50), Nullable (e.g., 'user', 'project', 'application', 'message')
- related_entity_id: INT, Nullable
- context_details: TEXT, Nullable (JSON or serialized string for extra context, e.g., old/new values for a status change, snippet of a message)
- is_read: BOOLEAN, Not Null, Default 0
- created_at: TIMESTAMP, Default CURRENT_TIMESTAMP

Project_Budgets Table:
- id: INT, PK, Auto Increment
- project_id: INT, FK to projects.id (ON DELETE CASCADE), Unique, Not Null
- budget_amount: DECIMAL(12,2), Not Null
- currency: VARCHAR(3), Not Null, Default 'USD'
- type: ENUM('fixed', 'hourly_estimate', 'not_set'), Not Null, Default 'not_set'
- notes: TEXT, Nullable
- created_at: TIMESTAMP, Default CURRENT_TIMESTAMP
- updated_at: TIMESTAMP, Default CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP

Client_Invoices Table:
- id: INT, PK, Auto Increment
- project_id: INT, FK to projects.id (ON DELETE CASCADE), Not Null
- client_id: INT, FK to users.id (ON DELETE CASCADE), Not Null
- invoice_number: VARCHAR(50), Unique, Not Null
- issue_date: DATE, Not Null
- due_date: DATE, Not Null
- total_amount: DECIMAL(12,2), Not Null
- status: ENUM('draft', 'sent', 'paid', 'overdue', 'cancelled', 'void'), Not Null, Default 'draft'
- payment_details: TEXT, Nullable (e.g., bank transfer info, payment link)
- notes_to_client: TEXT, Nullable
- created_at: TIMESTAMP, Default CURRENT_TIMESTAMP
- updated_at: TIMESTAMP, Default CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP

Invoice_Line_Items Table:
- id: INT, PK, Auto Increment
- invoice_id: INT, FK to Client_Invoices.id (ON DELETE CASCADE), Not Null
- description: TEXT, Not Null
- quantity: DECIMAL(10,2), Not Null, Default 1.00
- unit_price: DECIMAL(10,2), Not Null
- total_price: DECIMAL(12,2), Not Null (quantity * unit_price)
- created_at: TIMESTAMP, Default CURRENT_TIMESTAMP
- updated_at: TIMESTAMP, Default CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP

Freelancer_Payments Table:
- id: INT, PK, Auto Increment
- freelancer_id: INT, FK to users.id (ON DELETE CASCADE), Not Null
- project_id: INT, FK to projects.id (ON DELETE SET NULL), Nullable
- job_card_id: INT, FK to job_cards.id (ON DELETE SET NULL), Nullable
- related_invoice_id: INT, FK to Client_Invoices.id (ON DELETE SET NULL), Nullable (If payment is for a client invoice)
- payment_date: DATE, Not Null
- amount_paid: DECIMAL(12,2), Not Null
- currency: VARCHAR(3), Not Null, Default 'USD'
- payment_method_details: TEXT, Nullable (e.g., PayPal transaction ID, check number)
- notes: TEXT, Nullable
- created_at: TIMESTAMP, Default CURRENT_TIMESTAMP
- updated_at: TIMESTAMP, Default CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
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
