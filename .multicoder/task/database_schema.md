# Database Schema Design

This document outlines the proposed database schema for the Architex Axis Management Suite.

## General Conventions
- Primary Keys: `id` (INT, AUTO_INCREMENT)
- Foreign Keys: `[referenced_table_singular]_id` (INT)
- Timestamps: `created_at` (DATETIME, DEFAULT CURRENT_TIMESTAMP), `updated_at` (DATETIME, DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP)

## Tables

### 1. `users`
Manages user accounts and their roles.

| Column Name     | Data Type        | Constraints                               | Description                                  |
|-----------------|------------------|-------------------------------------------|----------------------------------------------|
| `id`            | INT              | PRIMARY KEY, AUTO_INCREMENT               | Unique identifier for the user               |
| `username`      | VARCHAR(100)     | NOT NULL, UNIQUE                          | User's login name                            |
| `password_hash` | VARCHAR(255)     | NOT NULL                                  | Hashed password                              |
| `email`         | VARCHAR(255)     | NOT NULL, UNIQUE                          | User's email address                         |
| `first_name`    | VARCHAR(100)     |                                           | User's first name                            |
| `last_name`     | VARCHAR(100)     |                                           | User's last name                             |
| `role`          | ENUM('admin', 'client', 'freelancer') | NOT NULL            | User's role in the system                    |
| `profile_picture_url` | VARCHAR(255) |                                       | URL to the user's profile picture            |
| `contact_number`| VARCHAR(20)      |                                           | User's contact number                        |
| `address`       | TEXT             |                                           | User's physical address                      |
| `bio`           | TEXT             |                                           | Short biography or description               |
| `is_active`     | BOOLEAN          | NOT NULL, DEFAULT TRUE                    | Whether the user account is active           |
| `last_login_at` | DATETIME         |                                           | Timestamp of the last login                  |
| `created_at`    | DATETIME         | NOT NULL, DEFAULT CURRENT_TIMESTAMP       | Timestamp of user creation                   |
| `updated_at`    | DATETIME         | NOT NULL, DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | Timestamp of last update                 |

### 2. `projects`
Stores information about projects.

| Column Name         | Data Type        | Constraints                               | Description                                      |
|---------------------|------------------|-------------------------------------------|--------------------------------------------------|
| `id`                | INT              | PRIMARY KEY, AUTO_INCREMENT               | Unique identifier for the project                |
| `client_id`         | INT              | NOT NULL, FOREIGN KEY (`users`.`id`)      | ID of the client who created the project         |
| `title`             | VARCHAR(255)     | NOT NULL                                  | Project title                                    |
| `description`       | TEXT             | NOT NULL                                  | Detailed project description                     |
| `status`            | ENUM('open', 'in_progress', 'completed', 'cancelled', 'on_hold') | NOT NULL, DEFAULT 'open' | Current status of the project                  |
| `budget`            | DECIMAL(10, 2)   |                                           | Project budget                                   |
| `deadline`          | DATE             |                                           | Project deadline                                 |
| `created_at`        | DATETIME         | NOT NULL, DEFAULT CURRENT_TIMESTAMP       | Timestamp of project creation                    |
| `updated_at`        | DATETIME         | NOT NULL, DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | Timestamp of last update                     |
<!-- `assigned_freelancer_id` is removed in favor of `project_assigned_freelancers` junction table -->

### 3. `project_assigned_freelancers` (New Junction Table)
Links projects to one or more freelancers.

| Column Name     | Data Type        | Constraints                               | Description                                      |
|-----------------|------------------|-------------------------------------------|--------------------------------------------------|
| `project_id`    | INT              | NOT NULL, FOREIGN KEY (`projects`.`id`) ON DELETE CASCADE | ID of the project                                |
| `user_id`       | INT              | NOT NULL, FOREIGN KEY (`users`.`id`) ON DELETE CASCADE    | ID of the freelancer (user with 'freelancer' role) |
| `role_in_project` | VARCHAR(50)    | NOT NULL, DEFAULT 'member'                | Role of the freelancer in the project (e.g., 'member', 'lead') |
| PRIMARY KEY (`project_id`, `user_id`) |                                       |                                                   | Ensures a freelancer is only assigned once per project |

### 4. `project_applications`
Tracks applications made by freelancers for projects.

| Column Name     | Data Type        | Constraints                               | Description                                      |
|-----------------|------------------|-------------------------------------------|--------------------------------------------------|
| `id`            | INT              | PRIMARY KEY, AUTO_INCREMENT               | Unique identifier for the application            |
| `project_id`    | INT              | NOT NULL, FOREIGN KEY (`projects`.`id`)   | ID of the project applied for                    |
| `freelancer_id` | INT              | NOT NULL, FOREIGN KEY (`users`.`id`)      | ID of the freelancer applying                    |
| `proposal`      | TEXT             | NOT NULL                                  | Freelancer's proposal for the project            |
| `status`        | ENUM('pending', 'accepted', 'rejected') | NOT NULL, DEFAULT 'pending' | Status of the application                      |
| `applied_at`    | DATETIME         | NOT NULL, DEFAULT CURRENT_TIMESTAMP       | Timestamp of application submission              |
| `updated_at`    | DATETIME         | NOT NULL, DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | Timestamp of last update                     |

### 5. `messages`
Stores messages exchanged between users.

| Column Name     | Data Type        | Constraints                               | Description                                      |
|-----------------|------------------|-------------------------------------------|--------------------------------------------------|
| `id`            | INT              | PRIMARY KEY, AUTO_INCREMENT               | Unique identifier for the message                |
| `sender_id`     | INT              | NOT NULL, FOREIGN KEY (`users`.`id`)      | ID of the message sender                         |
| `thread_id`     | INT              | NOT NULL, FOREIGN KEY (`message_threads`.`id`) | ID of the message thread this message belongs to |
| `content`       | TEXT             | NOT NULL                                  | Message content                                  |
| `sent_at`       | DATETIME         | NOT NULL, DEFAULT CURRENT_TIMESTAMP       | Timestamp when the message was sent              |
| `attachment_url`| VARCHAR(255)     | NULL                                      | URL to an attached file, if any                  |
| `attachment_type`| VARCHAR(50)     | NULL                                      | Type of attachment (e.g., 'image/jpeg', 'application/pdf') |
| `requires_approval` | BOOLEAN      | NOT NULL, DEFAULT FALSE                   | Indicates if this message needs admin approval (e.g. freelancer in project_client_admin_freelancer thread) |
| `approval_status`   | ENUM('pending', 'approved', 'rejected') | NULL            | Status of the approval, if required              |
| `approved_by_id`| INT              | FOREIGN KEY (`users`.`id`)                | ID of the admin who actioned the approval        |
| `approved_at`   | DATETIME         |                                           | Timestamp of approval/rejection action           |


### 6. `message_threads`
Groups messages, typically within a project context, defining a specific communication channel.

| Column Name     | Data Type        | Constraints                               | Description                                      |
|-----------------|------------------|-------------------------------------------|--------------------------------------------------|
| `id`            | INT              | PRIMARY KEY, AUTO_INCREMENT               | Unique identifier for the message thread         |
| `project_id`    | INT              | NULL, FOREIGN KEY (`projects`.`id`)       | ID of the project this thread belongs to (NULL for 'direct' type) |
| `title`         | VARCHAR(255)     |                                           | Optional title for the thread (e.g., "Project X: Client/Admin/Freelancer", or participant names for DMs) |
| `type`          | ENUM('direct', 'project_admin_freelancer', 'project_admin_client', 'project_client_admin_freelancer') | NOT NULL | Type of communication thread. |
| `created_by_id` | INT              | NOT NULL, FOREIGN KEY (`users`.`id`)      | User who initiated or created the thread        |
| `last_message_at`| DATETIME        | NULL                                      | Timestamp of the last message sent in this thread, for sorting/activity. |
| `created_at`    | DATETIME         | NOT NULL, DEFAULT CURRENT_TIMESTAMP       | Timestamp of thread creation                     |
| `updated_at`    | DATETIME         | NOT NULL, DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | Timestamp of last activity/update in thread    |
| `is_active`     | BOOLEAN          | NOT NULL, DEFAULT TRUE                    | Whether the thread is currently active           |
| `linked_folder_path` | VARCHAR(1024) | NULL                                   | Path or identifier for the linked project folder for file exchange |

### 7. `thread_participants`
Links users to message threads and defines their roles or permissions within that thread.

| Column Name       | Data Type        | Constraints                               | Description                                       |
|-------------------|------------------|-------------------------------------------|---------------------------------------------------|
| `id`              | INT              | PRIMARY KEY, AUTO_INCREMENT               | Unique identifier for the participant link        |
| `thread_id`       | INT              | NOT NULL, FOREIGN KEY (`message_threads`.`id`) ON DELETE CASCADE | ID of the message thread                          |
| `user_id`         | INT              | NOT NULL, FOREIGN KEY (`users`.`id`) ON DELETE CASCADE      | ID of the user participating in the thread      |
| `role_in_thread`  | ENUM('participant', 'observer') | NOT NULL, DEFAULT 'participant' | User's role (e.g. 'observer' for admin in certain contexts or future use) |
| `can_message`     | BOOLEAN          | NOT NULL, DEFAULT TRUE                    | Controls if a participant can send messages.      |
| `visibility_level`| ENUM('all', 'approved_only', 'none') | NOT NULL, DEFAULT 'all' | Controls what messages the user sees (e.g. Client in Type A sees only approved freelancer messages) |
| `joined_at`       | DATETIME         | NOT NULL, DEFAULT CURRENT_TIMESTAMP       | Timestamp when user joined the thread             |
| `last_read_message_id` | INT         | FOREIGN KEY (`messages`.`id`) ON DELETE SET NULL | ID of the last message read by this user in this thread |
| `unread_count`    | INT UNSIGNED     | NOT NULL, DEFAULT 0                       | Count of unread messages for this user in this thread |
| UNIQUE KEY `thread_user_unique` (`thread_id`, `user_id`) |                   | Ensures a user is only in a thread once       |

### 8. `message_emoticons` (Optional - for emoticon reactions to messages)
Stores emoticon reactions to messages.

| Column Name     | Data Type        | Constraints                               | Description                                      |
|-----------------|------------------|-------------------------------------------|--------------------------------------------------|
| `id`            | INT              | PRIMARY KEY, AUTO_INCREMENT               | Unique identifier for the reaction               |
| `message_id`    | INT              | NOT NULL, FOREIGN KEY (`messages`.`id`) ON DELETE CASCADE  | ID of the message being reacted to               |
| `user_id`       | INT              | NOT NULL, FOREIGN KEY (`users`.`id`) ON DELETE CASCADE     | ID of the user who reacted                       |
| `emoticon_char` | VARCHAR(10)      | NOT NULL                                  | The emoticon character (e.g., "👍", "❤️")         |
| `created_at`    | DATETIME         | NOT NULL, DEFAULT CURRENT_TIMESTAMP       | Timestamp of when the reaction was added         |
| UNIQUE KEY `message_user_emoticon` (`message_id`, `user_id`, `emoticon_char`) | | Prevents duplicate reactions by same user on same message with same emoticon |

### 9. `job_cards` (or `tasks`)
Manages individual tasks or job cards within a project.

| Column Name     | Data Type        | Constraints                               | Description                                      |
|-----------------|------------------|-------------------------------------------|--------------------------------------------------|
| `id`            | INT              | PRIMARY KEY, AUTO_INCREMENT               | Unique identifier for the job card/task          |
| `project_id`    | INT              | NOT NULL, FOREIGN KEY (`projects`.`id`) ON DELETE CASCADE | ID of the project this task belongs to           |
| `assigned_freelancer_id` | INT     | FOREIGN KEY (`users`.`id`) ON DELETE SET NULL | ID of the freelancer assigned to this task       |
| `title`         | VARCHAR(255)     | NOT NULL                                  | Task title                                       |
| `description`   | TEXT             |                                           | Detailed task description                        |
| `status`        | ENUM('todo', 'in_progress', 'completed', 'archived') | NOT NULL, DEFAULT 'todo' | Current status of the task                     |
| `due_date`      | DATE             |                                           | Task due date                                    |
| `created_at`    | DATETIME         | NOT NULL, DEFAULT CURRENT_TIMESTAMP       | Timestamp of task creation                       |
| `updated_at`    | DATETIME         | NOT NULL, DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | Timestamp of last update                     |

### 10. `time_logs`
Records time spent by freelancers on tasks/projects.

| Column Name     | Data Type        | Constraints                               | Description                                      |
|-----------------|------------------|-------------------------------------------|--------------------------------------------------|
| `id`            | INT              | PRIMARY KEY, AUTO_INCREMENT               | Unique identifier for the time log               |
| `job_card_id`   | INT              | NOT NULL, FOREIGN KEY (`job_cards`.`id`) ON DELETE CASCADE | ID of the task the time was logged for           |
| `freelancer_id` | INT              | NOT NULL, FOREIGN KEY (`users`.`id`) ON DELETE CASCADE    | ID of the freelancer who logged the time         |
| `start_time`    | DATETIME         | NOT NULL                                  | Start time of the work session                   |
| `end_time`      | DATETIME         | NOT NULL                                  | End time of the work session                     |
| `duration_minutes` | INT           | NOT NULL                                  | Duration of work in minutes                      |
| `notes`         | TEXT             |                                           | Optional notes about the work done               |
| `logged_at`     | DATETIME         | NOT NULL, DEFAULT CURRENT_TIMESTAMP       | Timestamp when the log was created               |

### 11. `billing_info` (Placeholder - needs more specific requirements)
Stores billing related information. This is a basic placeholder.

| Column Name     | Data Type        | Constraints                               | Description                                      |
|-----------------|------------------|-------------------------------------------|--------------------------------------------------|
| `id`            | INT              | PRIMARY KEY, AUTO_INCREMENT               | Unique identifier for billing record             |
| `project_id`    | INT              | NOT NULL, FOREIGN KEY (`projects`.`id`) ON DELETE CASCADE | ID of the project being billed                   |
| `invoice_number`| VARCHAR(50)      | UNIQUE                                    | Invoice number                                   |
| `amount`        | DECIMAL(10, 2)   | NOT NULL                                  | Amount to be billed                            |
| `status`        | ENUM('pending', 'paid', 'overdue') | NOT NULL, DEFAULT 'pending' | Billing status                                 |
| `due_date`      | DATE             |                                           | Payment due date                                 |
| `created_at`    | DATETIME         | NOT NULL, DEFAULT CURRENT_TIMESTAMP       | Timestamp of billing record creation             |
| `updated_at`    | DATETIME         | NOT NULL, DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | Timestamp of last update                     |

## Relationships
- `users` to `projects`: One (client) to Many (projects).
- `projects` to `project_assigned_freelancers`: One (project) to Many (freelancers assigned).
- `users` to `project_assigned_freelancers`: One (freelancer) to Many (projects assigned to).
- `users` to `project_applications`: One (freelancer) to Many (applications).
- `projects` to `project_applications`: One (project) to Many (applications).
- `message_threads` to `messages`: One (thread) to Many (messages).
- `users` to `messages`: One (sender) to Many (messages).
- `message_threads` to `thread_participants`: One (thread) to Many (participants).
- `users` to `thread_participants`: One (user) to Many (thread participations).
- `projects` to `message_threads`: One (project) to Many (project-specific threads).
- `projects` to `job_cards`: One (project) to Many (job_cards/tasks).
- `users` to `job_cards`: One (freelancer) to Many (assigned job_cards/tasks).
- `job_cards` to `time_logs`: One (task) to Many (time_logs).
- `users` to `time_logs`: One (freelancer) to Many (time_logs).
- `projects` to `billing_info`: One (project) to Many (billing_info records).

Please review this initial schema. Let me know if this aligns with your requirements, or if you have any modifications, additions, or specific details for any of these tables or new ones.
