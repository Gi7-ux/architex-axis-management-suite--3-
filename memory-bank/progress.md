# Progress: Architex Axis Management Suite

## Current Date: 2025-06-16 (Updated)

## 1. What Works

*   **Frontend Application (Presumed):** Structure remains as initial state.
*   **PHP Backend Core:**
    *   `backend/db_connect.php`: Connects to MySQL.
    *   `backend/api.php`: Basic routing, CORS headers.
        *   **JWT Integration:** `firebase/php-jwt` library included. `JWT_SECRET_KEY` (placeholder) and `JWT_ALGORITHM` defined.
        *   **Login Endpoint (`action=login`):** Handles POST requests, validates credentials, generates JWT, updates `last_login_at`.
        *   **Protected Route Example (`action=getUsers`):** Requires a valid JWT for access using `getDecodedJwt()` helper function.
        *   **User Creation (`action=createUser`):** Public endpoint for user registration (as per initial implementation).
*   **Project Configuration for cPanel (Phase 1 Complete):**
    *   `public_html` directory created.
    *   `vite.config.ts` updated to build into `public_html/dist` and includes `@vitejs/plugin-react`.
    *   `.htaccess` file created in `public_html` for SPA routing and backend access.
*   **Database Schema (Presumed):** As initial state.

## 2. What's Left to Build / Implement (Current Task: PHP Backend Migration)

*   **Full PHP API Implementation:**
    *   Develop all required API endpoints in `backend/api.php` to cover functionalities listed in `apiService.ts`. This includes:
        *   Authentication (login, token validation).
        *   User management (CRUD operations for users).
        *   Project management (CRUD, status updates, archiving).
        *   Application management (submitting, accepting applications).
        *   Job card management (CRUD, status updates).
        *   Time log management.
        *   File management (upload, download, delete).
        *   Messaging (fetching conversations, messages, sending messages).
        *   Dashboard statistics.
        *   Skills and reports.
*   **Frontend API Integration:**
    *   Modify `apiService.ts` to change `API_BASE_URL` to point to `/backend/api.php`.
    *   Update all API call functions in `apiService.ts` to use the `?action=` query parameter format.
    *   Implement JWT handling in the frontend (storing token on login, sending with requests, clearing on logout).
*   **Project Restructuring for cPanel:**
    *   Create `public_html` directory.
    *   Configure Vite (`vite.config.ts`) to build into `public_html/dist`.
    *   Create and configure `.htaccess` in `public_html` for SPA routing and PHP backend access.
*   **PHP Backend Enhancements:**
    *   Integrate a PHP JWT library (e.g., `firebase/php-jwt`) using Composer.
    *   Implement robust input validation and sanitization for all API endpoints.
    *   Ensure all database queries use prepared statements.
*   **Deployment to cPanel:**
    *   Upload built frontend assets and backend PHP files to the cPanel server.
    *   Configure database connection on cPanel if different from local.
    *   Thoroughly test all functionalities in the live cPanel environment.

## 3. Current Status

*   **Phase 0: Planning & Documentation (Complete)**
    *   All core Memory Bank files (`projectbrief.md`, `productContext.md`, `techContext.md`, `systemPatterns.md`, `activeContext.md`, `progress.md`) created and updated.
    *   Detailed migration plan formulated.
*   Detailed analysis of frontend React component architecture and functionality completed.
*   **Phase 1: Project Restructuring and Configuration (Complete)**
    *   `public_html` directory created.
    *   `vite.config.ts` updated.
    *   `@vitejs/plugin-react` installed.
    *   `.htaccess` created in `public_html`.
*   **Phase 2: Backend Development (PHP) (In Progress)**
    *   JWT library integrated.
    *   Login endpoint (`action=login`) implemented.
    *   `getDecodedJwt()` helper function created.
    *   `getUsers` endpoint protected.
*   Architectural planning for core messaging functionality (DB schema, API actions) completed and documented.
*   Centralized sensitive credentials (JWT secret, DB details) to `backend/config.php`.
    *   Refactored `getUsers` action to use prepared statements.
    *   Integrated Composer for PHP dependency management (`firebase/php-jwt`).
    *   Implemented core messaging API actions in `backend/api.php`:
        *   `postMessageToThread` (with attachment linking logic).
        *   `getJobMessageThread` (with moderation visibility).
        *   `approveMessage` (admin).
        *   `rejectMessage` (admin).
        *   `uploadMessageAttachment`.
    *   Implemented `isUserAuthorizedForJobMessaging` helper for messaging authorization.
*   **Phase 3: Frontend Development (React) (Not Started)**
*   **Phase 4: Deployment and Testing (Not Started)**

## 4. Known Issues / Blockers

*   The full extent of API endpoints required by the frontend needs to be meticulously mapped from `apiService.ts` to PHP implementations.
*   Local PHP development environment needs to be set up or confirmed to mirror cPanel capabilities closely (PHP version, extensions). (User opted for manual JWT library inclusion via Git clone instead of Composer).
*   The placeholder `JWT_SECRET_KEY` in `backend/api.php` must be changed to a strong, unique secret and stored securely before any production deployment.
*   The `createUser` endpoint is currently public; its security implications (e.g., rate limiting, CAPTCHA) should be considered for a production environment.

## 5. Evolution of Project Decisions

*   **Initial Decision:** Migrate the existing React frontend to a PHP backend for cPanel deployment.
*   **Documentation Strategy:** Adopt the Memory Bank system for comprehensive project documentation from the outset.
