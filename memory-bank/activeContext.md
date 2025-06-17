# Active Context: Architex Axis Management Suite (Migration to PHP Backend)

## 1. Current Work Focus

The primary focus remains the migration of the Architex Axis Management Suite's React frontend to a PHP backend for cPanel deployment. Currently, efforts are concentrated on **Phase 2: Backend Development (PHP)**.

This involves:
*   **PHP API Endpoint Implementation:** Systematically developing all API endpoints in `backend/api.php` as required by `apiService.ts`.
*   **Authentication Refinement:** Ensuring robust JWT-based authentication for all protected endpoints.
*   **Security Hardening:** Implementing input validation, prepared statements, and other security best practices for each endpoint.
*   **Frontend API Integration (Upcoming):** Preparing `apiService.ts` for changes.
*   **Deployment Configuration (Completed for Phase 1):** Initial setup of `public_html`, Vite config, and `.htaccess` is done.

## 2. Recent Changes / Decisions

*   **Memory Bank Initialized:** All core memory bank files have been created.
*   **Phase 1 Completed:** Project restructuring and initial configuration (`public_html` directory, `vite.config.ts` update, `.htaccess` creation, `@vitejs/plugin-react` installation) are complete.
*   **PHP JWT Integration:**
    *   `firebase/php-jwt` library cloned into `backend/lib/php-jwt/`.
    *   Library included in `backend/api.php`.
    *   `JWT_SECRET_KEY` and `JWT_ALGORITHM` constants defined (placeholder secret key used).
*   **Login Endpoint Created:** `case 'login'` added to `backend/api.php` to handle user authentication and JWT generation.
*   **Route Protection Implemented:** A `getDecodedJwt()` helper function was created and used to protect the `getUsers` endpoint.
*   **Detailed Migration Plan:** A comprehensive plan for the PHP backend migration has been formulated, covering project restructuring, backend development, frontend development, and deployment.
*   **Technology Choices Confirmed:**
    *   Frontend: React, TypeScript, Vite.
    *   Backend: PHP, MySQL.
    *   Authentication: JWT.
    *   Deployment: Shared cPanel.
*   **Frontend Component Analysis Completed:** A detailed analysis of the React frontend component structure, organization, state management, API interaction, and key component functionalities has been performed and documented in `systemPatterns.md`.
*   **Project Goals Re-evaluated with User Feedback:** Project goals (from `productContext.md`) were re-evaluated against the frontend component analysis, incorporating detailed functional requirements and feedback from `memory-bank/wa.md`. This highlighted the need for increased functional depth in many components and identified a conflicting requirement regarding client-side project creation (see `productContext.md` section 4 for details).
*   **Backend Credentials Secured:** Sensitive credentials (JWT secret, DB details) centralized into `backend/config.php`. `db_connect.php` and `api.php` updated to use this config file.
*   **Prepared Statements Initiated:** `getUsers` action in `api.php` refactored to use prepared statements.
*   **Composer Integrated:** `composer.json` created in `backend/`, `firebase/php-jwt` installed via Composer, and `api.php` now uses `vendor/autoload.php`.
*   **Core Messaging Backend Implemented (Foundational):**
    *   API actions `postMessageToThread` (including attachment linking), `getJobMessageThread` (with moderation visibility), `approveMessage` (admin), `rejectMessage` (admin), and `uploadMessageAttachment` added to `api.php`.
    *   Helper function `isUserAuthorizedForJobMessaging` implemented and integrated into messaging actions for authorization.

## 3. Next Steps (Immediate)

1.  **Continue Phase 2: Backend Development (PHP):**
    *   Implement the next set of API endpoints in `backend/api.php` based on `apiService.ts` (e.g., project-related endpoints).
    *   Protect new endpoints using the `getDecodedJwt()` function as appropriate.
    *   Ensure comprehensive input validation and use of prepared statements for all new endpoints.
2.  **Update `JWT_SECRET_KEY`:** Remind the user to change the placeholder `JWT_SECRET_KEY` to a strong, unique secret and store it securely (e.g., environment variable on cPanel, or a config file outside `public_html` if possible).

## 4. Active Decisions & Considerations

*   **PHP API Endpoint Granularity:** Deciding on the exact `action` names and parameters for each PHP API endpoint to ensure they align with frontend needs and maintain clarity.
*   **Error Handling Strategy:** Defining a consistent error response format from the PHP API and ensuring the frontend can parse and display these errors appropriately.
*   **Security of `db_connect.php`:** While `db_connect.php` is currently in `backend/`, for cPanel, it's best practice to move files containing sensitive credentials outside the `public_html` directory if the hosting environment allows include paths to be set accordingly. This will be reviewed during the deployment phase.
*   **Composer for PHP Dependencies:** Confirming the setup of Composer within the `backend` directory to manage `firebase/php-jwt` and any other future PHP libraries.
*   **Prioritized Non-Functional Requirements (NFRs) for PHP Backend Development (derived from `wa.md` feedback):**
    *   **Tier 1: Absolutely Critical**
        1.  **Data Persistence & Reliability:** Backend must reliably store and retrieve all application data.
        2.  **Core Security - Authentication & Authorization:** Flawless JWT implementation, secure password hashing, and robust access control for API actions.
        3.  **Basic Error Handling:** Consistent and clear error responses (HTTP status codes, simple JSON messages) from all API endpoints.
        4.  **Core Messaging Functionality & Workflow Support:** Backend APIs to support job-specific threaded messages, attachments, and admin moderation states (e.g., pending approval, approved).
    *   **Tier 2: Highly Important**
        5.  **Data Deletion Policies & Admin Control:** Implement soft deletes or admin-controlled deletion; prevent permanent data loss by users.
        6.  **CAPTCHA for Login:** Basic bot protection for public login.
        7.  **Legal Compliance - POPIA Basics:** Consider secure data handling, simple retention policies, and basic user rights in backend design.
    *   **Tier 3: Important**
        8.  **UI Consistency & Workflow Smoothness (Backend Support):** API responses should facilitate smooth frontend updates.
        9.  **Mobile Usability (Backend Support):** APIs should be device-agnostic and support mobile needs (e.g., image renditions if necessary).

*   **Core Messaging Architecture Outlined:** A conceptual database schema and API action plan for the Tier 1 "Core Messaging Functionality" (including job-specific threads, admin moderation, attachments) has been developed and documented in `systemPatterns.md`.
*   **File Storage Strategy for Attachments Decided:** Messaging attachments will be stored within `public_html` (e.g., `public_html/uploads/messaging_attachments/`). This requires critical `.htaccess` rules to deny direct HTTP access and reliance on PHP scripts for all authenticated and authorized file downloads.
## 5. Important Patterns & Preferences

*   **Incremental Development:** The migration will proceed phase by phase, with backend API endpoints being developed and then integrated into the frontend.
*   **Clear Commit History:** Git commits should be descriptive, reflecting the specific part of the migration being addressed.
*   **Documentation First:** The Memory Bank will be updated as new patterns emerge or decisions are made.

## 6. Learnings & Project Insights

*   The existing `apiService.ts` provides a clear list of functionalities that need to be replicated in the PHP backend.
*   The existing `backend/api.php` and `backend/db_connect.php` provide a starting point for the PHP backend structure, though `api.php` will need significant expansion.
