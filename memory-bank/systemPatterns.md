# System Patterns: Architex Axis Management Suite

## 1. System Architecture Overview

The system follows a client-server architecture, with a React single-page application (SPA) frontend and a PHP backend. The backend will serve as an API for the frontend, handling business logic and database interactions.

```mermaid
graph TD
    User[User/Browser] -->|HTTPS| ReactSPA[React SPA Frontend (in public_html/dist)]
    ReactSPA -->|API Calls (HTTPS)| PHPBackend[PHP API Backend (in public_html/backend/api.php)]
    PHPBackend -->|SQL Queries| MySQLDB[MySQL Database]

    subgraph "cPanel Shared Hosting Environment (public_html)"
        ReactSPA
        PHPBackend
    end
```

## 2. Frontend Architecture

The frontend is a React Single Page Application (SPA) built with TypeScript and Vite.

*   **Modularity & Organization:**
    *   Components are well-modularized with a clear separation of concerns.
    *   Role-based directories (`admin/`, `client/`, `freelancer/`) organize components specific to user roles.
    *   A `shared/` directory contains reusable UI elements (e.g., `Button.tsx`, `Modal.tsx`, `ProjectCard.tsx`, `LoadingSpinner.tsx`) and utility components (e.g., `ProtectedView.tsx`, `IconComponents.tsx`), promoting consistency and DRY principles.
    *   Core components like `AuthContext.tsx`, `Dashboard.tsx`, `HomePage.tsx`, `LoginPage.tsx` handle top-level application structure and functionality.

*   **State Management:**
    *   Global application state, particularly authentication details (user object, token), loading states, and a global timer, is managed using React Context API via `AuthContext.tsx`. This context also persists session information to `localStorage`.
    *   Component-local state (using `useState` hook) is employed for managing UI-specific logic, form data, and data fetched from APIs within individual components.

*   **API Interaction:**
    *   API communication is centralized and abstracted through an `apiService.ts` file. Components import specific API call functions (e.g., `loginAPI`, `fetchUsersAPI`, `submitApplicationAPI`) from this service layer.
    *   Components typically manage their own loading and error states related to API interactions.

*   **Routing and Navigation:**
    *   Client-side routing is handled by `react-router-dom` (inferred from usage of `Navigate`, `useLocation`, `useNavigate`).
    *   Route protection (authentication and role-based authorization) is implemented using the `ProtectedView.tsx` shared component.
    *   Navigation paths are managed using `NAV_LINKS` constants (defined in `constants.ts`), enhancing maintainability.

*   **Data Flow:**
    *   Data generally flows unidirectionally: API calls (initiated in components or context) fetch data, which updates component state, triggering re-renders.
    *   User interactions within components trigger event handlers that can modify local state or initiate further API calls.

*   **Styling:**
    *   The application utilizes Tailwind CSS for styling, as indicated by the prevalent utility-first class names in the component markup.

*   **Build Process:**
    *   Vite is used as the build tool, compiling TypeScript/JSX into static HTML, CSS, and JavaScript bundles suitable for deployment.

*   **Key Components Analyzed (Examples):**
    *   `AuthContext.tsx`: Manages global authentication, user session, and a global timer.
    *   `admin/UserManagement.tsx`: Complex component for CRUD operations on users, interacting with both existing and new (PHP) backend APIs.
    *   `freelancer/ProjectBrowser.tsx`: Allows freelancers to find and apply for projects, with filtering and modal interactions.
    *   `shared/ProtectedView.tsx`: HOC for route protection based on authentication and roles.
    *   `shared/ProjectCard.tsx`: Reusable UI card for displaying project summaries.
    *   `client/CreateProject.tsx`: Currently a placeholder, indicating evolution in project requirements.

*   **Migration Awareness:**
    *   Some components (e.g., `UserManagement.tsx`) demonstrate awareness of the ongoing migration to a PHP backend by including logic to interact with both the original API and the new PHP-based API endpoints.

*   **Functional Depth & User Feedback Impact (from `wa.md`):**
    *   The user feedback (primarily from `memory-bank/wa.md`) indicates that while the foundational component structure is sound, significant functional depth is required:
    *   **Messaging Components (e.g., `MessagingPage.tsx`):** Need to support job-card specific contextual chats (like group chats), admin moderation workflows for freelancer messages, rich text formatting, and robust attachment handling (images, files with previews, archived under job cards). This is a substantial increase in complexity beyond a simple general messaging system.
    *   **Project/Job/Task Management Components (e.g., `ProjectDetailsPage.tsx`, `admin/ProjectManagement.tsx`, `freelancer/MyJobCards.tsx`):** Require features like due date calendars per task, file uploads directly to jobs/tasks, notifications for updates, client approval workflows for job creation/changes, admin ability to log their own time on projects, and potentially support for multiple freelancers per job/task.
    *   **User Management Components (e.g., `admin/UserManagement.tsx`, `UserProfilePage.tsx`):** Need more nuanced admin controls (freelancer sanctioning/blocking, flagging), specific registration/onboarding workflows (freelancer self-registration with admin approval), robust password management (visibility, auto-generation, email notifications), and revised deletion workflows (soft deletes/archiving instead of permanent user-initiated deletion, admin recycle bin).
    *   **Reporting Components (e.g., `admin/AdminTimeLogReportPage.tsx`, `DashboardOverview.tsx`):** Require significant expansion to cover detailed reporting by freelancer, job, and client, including financial aspects, performance metrics, and visual representations (timeline/bar graphs). Role-specific reporting for freelancers and clients is also needed. Dashboards must reflect real-time data and provide hyperlinks to relevant sections.
    *   **General UI/UX:** Numerous specific UI/UX refinements are needed for consistency, clarity (button labels, tooltips), error handling, and addressing reported bugs. Data persistence issues (data not saving) are critical and must be resolved (primarily a backend concern but impacts frontend reliability).
    *   **Potential New Components:** The depth of some requested features (e.g., granular task management with scheduling, advanced file management per job, dedicated detailed reporting views) might necessitate the creation of new, specialized components.
## 3. Backend Architecture (PHP) - Current State & Evolution

The PHP backend currently consists of a single primary API file (`backend/api.php`) and a database connection script (`backend/db_connect.php`). It serves as the API for the React frontend, handling business logic and database interactions via MySQL.

*   **API Entry Point & Request Handling:**
    *   All API requests are directed to `backend/api.php`.
    *   CORS headers are set to allow all origins (for development; **must be restricted in production**).
    *   Handles `OPTIONS` pre-flight requests.
    *   Reads JSON input for `POST/PUT/DELETE` and `$_GET` for `GET` requests. Basic JSON validation is present.

*   **Routing:**
    *   A simple `action` query parameter (e.g., `api.php?action=getUsers`) combined with a `switch` statement handles routing.
    *   HTTP method (`$_SERVER['REQUEST_METHOD']`) is checked within each action.
    *   **Consideration:** This routing mechanism will become difficult to maintain as the API grows. A more structured routing approach (e.g., a micro-framework or class-based router) is recommended for scalability.

*   **Database Interaction:**
    *   `backend/db_connect.php` establishes a `mysqli` connection to the MySQL database.
    *   The `$conn` object is used globally within `api.php` for database operations.
    *   **Critical Improvement Needed:** Currently, not all SQL queries use prepared statements (e.g., `getUsers` action). **All database queries must be converted to use prepared statements** to prevent SQL injection vulnerabilities.
    *   Transaction management for complex operations involving multiple writes is not yet evident and may be required.

*   **Authentication & Authorization:**
    *   **JWT Implementation:** Uses the `firebase/php-jwt` library (manually included).
        *   `login` action: Validates credentials (using prepared statement and `password_verify()`), generates a JWT upon success, and updates `last_login_at`.
        *   `getDecodedJwt()` helper function: Reads and validates JWT from the `Authorization` header, handling various exceptions (expired, invalid signature, etc.).
        *   **Critical Security Flaw:** `JWT_SECRET_KEY` was moved from `api.php` to `backend/config.php` (which should be gitignored and managed securely in deployment).
    *   **Authorization:**
        *   Basic route protection is via `getDecodedJwt()`.
        *   For messaging, a specific helper function `isUserAuthorizedForJobMessaging(userId, userRole, jobId, conn)` was implemented to check if a user (admin, job client, or assigned freelancer) can interact with a specific job's messages. This is used by messaging API actions.
        *   Fine-grained RBAC for other actions remains a general requirement.

*   **Current Implemented Actions (Examples):**
    *   `getUsers`: Fetches users (requires JWT).
    *   `login`: Authenticates users and issues JWT.
    *   `createUser`: Public endpoint for user registration (uses prepared statement and password hashing).

*   **Error Handling:**
    *   JWT decoding includes specific exception handling and 401 responses.
    *   Some actions return basic JSON error messages with HTTP status codes.
    *   **Improvement Needed:** Error handling is not centralized. A consistent strategy is needed to log detailed errors server-side and return user-friendly, non-revealing error messages to the client.

*   **Dependency Management:**
    *   Composer has been set up (`backend/composer.json`).
    *   `firebase/php-jwt` is now managed by Composer.
    *   `api.php` uses `vendor/autoload.php`.

*   **File Structure & Uploads (Messaging Attachments Strategy):**
    *   **Storage Location:** Attachments will be stored within `public_html` (e.g., `public_html/uploads/messaging_attachments/`).
        *   A structured subdirectory approach (e.g., by `job_id`, then `thread_id` or `year/month`) will be used.
        *   **Critical Security:** This location necessitates robust `.htaccess` rules within `public_html/uploads/` (and subdirectories) to `Deny from all` direct HTTP access.
    *   **Access Control:** All file downloads **must** be mediated by a PHP script performing full authentication and authorization checks. Direct linking to files will not be used.
    *   **Upload Handling:** PHP scripts will manage secure file uploads, including:
        *   Strict validation of file types (MIME) and sizes.
        *   Generation of unique, sanitized filenames for storage (original names stored in DB).
    *   **Database:** A `message_attachments` table will store metadata, including original and stored filenames, paths (relative to `public_html`), MIME type, and size.
    *   This strategy requires diligent `.htaccess` configuration and thorough testing to prevent unauthorized file access.

*   **Key Development Areas based on Analysis:**
    *   **Massive Endpoint Expansion:** The majority of required API endpoints (for projects, tasks, messaging, reporting, etc.) are not yet implemented.
    *   **Security Hardening:** Universal prepared statements, secure JWT key management, comprehensive input validation for all actions, robust RBAC.
    *   **Messaging Backend:** Design and implementation of database schema and API logic for the detailed messaging requirements.
    *   **Refactoring for Maintainability:** Consider improved routing and dependency management (Composer) as the API grows.
    *   **File Handling:** Secure and robust file upload and management capabilities.
*   **Core Messaging Functionality - DB Schema & API Outline (Tier 1 NFR):**
    *   **Database Schema (Conceptual):**
        *   `message_threads`: Links to `jobs`, stores thread metadata.
        *   `messages`: Links to `message_threads` and `users` (sender), stores message content, `sent_at`, and `status` (e.g., 'pending_approval', 'approved' for admin moderation).
        *   `message_participants`: Manages users within a thread (optional, could be implicit).
        *   `message_attachments`: Links to `messages`, stores file metadata (name, path, type, size).
    *   **Key API Actions (Protected & Role-Based):**
        *   `getJobMessageThread(job_id)`: Fetches thread and messages, applying moderation visibility rules.
        *   `postMessageToThread(thread_id/job_id, content)`: Creates new message, sets initial status based on sender role (freelancer -> 'pending_approval'). Handles attachments.
        *   `approveMessage(message_id)` (Admin): Changes message status to 'approved'.
        *   `rejectMessage(message_id)` (Admin): Changes message status to 'rejected'.
        *   `uploadMessageAttachment(job_id, file)`: Handles secure file upload, stores file, and records metadata (returns `attachment_id`). `postMessageToThread` was updated to link this attachment.
        *   `getMessageThreadsList()`: Lists threads for the current user (Not yet implemented, but planned).
    *   **Implementation Notes:** Implemented actions use prepared statements. Authorization for messaging actions is handled by `isUserAuthorizedForJobMessaging`. Input validation and error handling are in place at a foundational level. Secure file storage strategy (within `public_html` with `.htaccess` protection) decided.

## 4. Data Flow Examples

*   **User Login:**
    1.  User submits credentials via React login form.
    2.  `apiService.ts` sends a POST request to `backend/api.php?action=login` with credentials.
    3.  `api.php` validates credentials against the `users` table in MySQL.
    4.  If valid, `api.php` generates a JWT and returns it in the JSON response.
    5.  `apiService.ts` receives the token; frontend stores it (e.g., localStorage).
*   **Fetching Projects:**
    1.  User navigates to the projects page in the React app.
    2.  A component (e.g., `MyProjects.tsx`) calls a function in `apiService.ts` (e.g., `fetchProjectsFromPhpAPI`).
    3.  `apiService.ts` sends a GET request to `backend/api.php?action=getProjects`, including the JWT in the `Authorization` header.
    4.  `api.php` validates the JWT.
    5.  If valid, `api.php` queries the `projects` table in MySQL.
    6.  `api.php` returns the project data as a JSON response.
    7.  `apiService.ts` receives the data; frontend updates the UI.

## 5. Key Technical Decisions

*   **PHP for Backend:** Chosen due to cPanel compatibility and existing backend files.
*   **React for Frontend:** Existing modern frontend framework.
*   **MySQL Database:** Standard relational database, compatible with cPanel.
*   **JWT for Authentication:** Suitable for stateless APIs and SPAs.
*   **Single `api.php` Entry Point:** Simplifies routing for the PHP backend in a shared hosting context.

## 6. Deployment Pattern

*   Frontend (React app) is built into static assets.
*   Static assets and PHP backend files are uploaded to the `public_html` directory (or a subdirectory) on the cPanel server.
*   `.htaccess` is used to:
    *   Route all non-file/non-directory requests to the React app's `index.html` (for client-side routing).
    *   Ensure requests to `/backend/api.php` are correctly handled by the PHP interpreter.
