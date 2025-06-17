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
| `assigned_freelancer_id` | INT         | FOREIGN KEY (`users`.`id`)                | ID of the freelancer assigned to the project (if any) |

### 3. `project_applications`
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

### 4. `messages`
Stores messages exchanged between users.

| Column Name     | Data Type        | Constraints                               | Description                                      |
|-----------------|------------------|-------------------------------------------|--------------------------------------------------|
| `id`            | INT              | PRIMARY KEY, AUTO_INCREMENT               | Unique identifier for the message                |
| `sender_id`     | INT              | NOT NULL, FOREIGN KEY (`users`.`id`)      | ID of the message sender                         |
| `receiver_id`   | INT              | NOT NULL, FOREIGN KEY (`users`.`id`)      | ID of the message receiver                       |
| `project_id`    | INT              | FOREIGN KEY (`projects`.`id`)             | Optional: ID of the project related to the message |
| `content`       | TEXT             | NOT NULL                                  | Message content                                  |
| `sent_at`       | DATETIME         | NOT NULL, DEFAULT CURRENT_TIMESTAMP       | Timestamp when the message was sent              |
| `is_read`       | BOOLEAN          | NOT NULL, DEFAULT FALSE                   | Whether the message has been read by the receiver|

### 5. `job_cards` (or `tasks`)
Manages individual tasks or job cards within a project.

| Column Name     | Data Type        | Constraints                               | Description                                      |
|-----------------|------------------|-------------------------------------------|--------------------------------------------------|
| `id`            | INT              | PRIMARY KEY, AUTO_INCREMENT               | Unique identifier for the job card/task          |
| `project_id`    | INT              | NOT NULL, FOREIGN KEY (`projects`.`id`)   | ID of the project this task belongs to           |
| `assigned_freelancer_id` | INT     | FOREIGN KEY (`users`.`id`)                | ID of the freelancer assigned to this task       |
| `title`         | VARCHAR(255)     | NOT NULL                                  | Task title                                       |
| `description`   | TEXT             |                                           | Detailed task description                        |
| `status`        | ENUM('todo', 'in_progress', 'completed', 'archived') | NOT NULL, DEFAULT 'todo' | Current status of the task                     |
| `due_date`      | DATE             |                                           | Task due date                                    |
| `created_at`    | DATETIME         | NOT NULL, DEFAULT CURRENT_TIMESTAMP       | Timestamp of task creation                       |
| `updated_at`    | DATETIME         | NOT NULL, DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | Timestamp of last update                     |

### 6. `time_logs`
Records time spent by freelancers on tasks/projects.

| Column Name     | Data Type        | Constraints                               | Description                                      |
|-----------------|------------------|-------------------------------------------|--------------------------------------------------|
| `id`            | INT              | PRIMARY KEY, AUTO_INCREMENT               | Unique identifier for the time log               |
| `job_card_id`   | INT              | NOT NULL, FOREIGN KEY (`job_cards`.`id`)  | ID of the task the time was logged for           |
| `freelancer_id` | INT              | NOT NULL, FOREIGN KEY (`users`.`id`)      | ID of the freelancer who logged the time         |
| `start_time`    | DATETIME         | NOT NULL                                  | Start time of the work session                   |
| `end_time`      | DATETIME         | NOT NULL                                  | End time of the work session                     |
| `duration_minutes` | INT           | NOT NULL                                  | Duration of work in minutes                      |
| `notes`         | TEXT             |                                           | Optional notes about the work done               |
| `logged_at`     | DATETIME         | NOT NULL, DEFAULT CURRENT_TIMESTAMP       | Timestamp when the log was created               |

### 7. `billing_info` (Placeholder - needs more specific requirements)
Stores billing related information. This is a basic placeholder.

| Column Name     | Data Type        | Constraints                               | Description                                      |
|-----------------|------------------|-------------------------------------------|--------------------------------------------------|
| `id`            | INT              | PRIMARY KEY, AUTO_INCREMENT               | Unique identifier for billing record             |
| `project_id`    | INT              | NOT NULL, FOREIGN KEY (`projects`.`id`)   | ID of the project being billed                   |
| `invoice_number`| VARCHAR(50)      | UNIQUE                                    | Invoice number                                   |
| `amount`        | DECIMAL(10, 2)   | NOT NULL                                  | Amount to be billed                            |
| `status`        | ENUM('pending', 'paid', 'overdue') | NOT NULL, DEFAULT 'pending' | Billing status                                 |
| `due_date`      | DATE             |                                           | Payment due date                                 |
| `created_at`    | DATETIME         | NOT NULL, DEFAULT CURRENT_TIMESTAMP       | Timestamp of billing record creation             |
| `updated_at`    | DATETIME         | NOT NULL, DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | Timestamp of last update                     |

## Relationships
- `users` to `projects`: One (client) to Many (projects). One (freelancer) to Many (assigned projects).
- `users` to `project_applications`: One (freelancer) to Many (applications).
- `projects` to `project_applications`: One (project) to Many (applications).
- `users` to `messages`: One (sender) to Many (messages), One (receiver) to Many (messages).
- `projects` to `messages`: One (project) to Many (messages) (optional link).
- `projects` to `job_cards`: One (project) to Many (job_cards/tasks).
- `users` to `job_cards`: One (freelancer) to Many (assigned job_cards/tasks).
- `job_cards` to `time_logs`: One (task) to Many (time_logs).
- `users` to `time_logs`: One (freelancer) to Many (time_logs).
- `projects` to `billing_info`: One (project) to Many (billing_info records).

Please review this initial schema. Let me know if this aligns with your requirements, or if you have any modifications, additions, or specific details for any of these tables or new ones.
