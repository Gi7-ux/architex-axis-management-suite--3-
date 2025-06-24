# Active Context: Architex Axis Management Suite (Migration to PHP Backend)

## 1. Current Work Focus

The primary focus remains the migration of the Architex Axis Management Suite's React frontend to a PHP backend for cPanel deployment. Currently, efforts are concentrated on **resolving merge conflicts** to ensure a stable codebase before proceeding with further backend development.

This involves:

* **Resolving Git Merge Conflicts:** Systematically addressing merge conflicts in both frontend and backend files.
* **Fixing TypeScript Errors:** Correcting type errors and inconsistencies that arose from the merge conflicts.
* **Updating Documentation:** Ensuring the Memory Bank accurately reflects the current state of the project after resolving conflicts.

## 2. Recent Changes / Decisions

* **Merge Conflicts Resolved:** Successfully resolved merge conflicts in the following files:
  * `backend/vendor/` directory
  * `backend/composer.json`
  * `backend/composer.lock`
  * `backend/db_connect.php`
  * `contexts/AuthContext.tsx`
  * `components/freelancer/MyJobCards.tsx`
  * `components/admin/AdminTimeLogReportPage.test.tsx`
  * `components/client/ClientProjectTimeLogPage.test.tsx`
  * `components/freelancer/FreelancerTimeTrackingPage.test.tsx`
  * `components/shared/GlobalTimerDisplay.test.tsx`
  * `components/admin/ProjectManagement.test.tsx`
  * `components/MessagingPage.tsx`
* **TypeScript Errors Fixed:** Addressed numerous TypeScript errors related to type mismatches, duplicate declarations, and incorrect imports.
* **Memory Bank Updated:** Updated `changelog.md` to reflect the merge conflict resolutions.

## 3. Next Steps (Immediate)

1. **Finalize Documentation:** Ensure all memory bank files are up-to-date with the latest changes.
2. **Continue Phase 2: Backend Development (PHP):**
    * Implement the next set of API endpoints in `backend/api.php` based on `apiService.ts` (e.g., project-related endpoints).
    * Protect new endpoints using the `getDecodedJwt()` function as appropriate.
    * Ensure comprehensive input validation and use of prepared statements for all new endpoints.
3. **Update `JWT_SECRET_KEY`:** Emphasize replacing the placeholder `JWT_SECRET_KEY` with a strong, unique secret. This secret **must be injected via environment configuration** (e.g., cPanel Config Variables or a similar mechanism on the hosting platform) and **not hardcoded or committed to the repository**. Clarify that this secret should be stored securely outside the codebase to enhance security before deployment.

## 4. Active Decisions & Considerations

* **PHP API Endpoint Granularity:** Deciding on the exact `action` names and parameters for each PHP API endpoint to ensure they align with frontend needs and maintain clarity.
* **Error Handling Strategy:** Defining a consistent error response format from the PHP API and ensuring the frontend can parse and display these errors appropriately.
* **Security of `db_connect.php`:** While `db_connect.php` is currently in `backend/`, for cPanel, it's best practice to move files containing sensitive credentials outside the `public_html` directory if the hosting environment allows include paths to be set accordingly. This will be reviewed during the deployment phase.
* **Composer for PHP Dependencies:** Confirming the setup of Composer within the `backend` directory to manage `firebase/php-jwt` and any other future PHP libraries.
* **Prioritized Non-Functional Requirements (NFRs) for PHP Backend Development (derived from `wa.md` feedback):**
  * **Tier 1: Absolutely Critical**
        1. **Data Persistence & Reliability:** Backend must reliably store and retrieve all application data.
        2. **Core Security - Authentication & Authorization:** Flawless JWT implementation, secure password hashing, and robust access control for API actions.
        3. **Basic Error Handling:** Consistent and clear error responses (HTTP status codes, simple JSON messages) from all API endpoints.
        4. **Core Messaging Functionality & Workflow Support:** Backend APIs to support job-specific threaded messages, attachments, and admin moderation states (e.g., pending approval, approved).
  * **Tier 2: Highly Important**
        5.  **Data Deletion Policies & Admin Control:** Implement soft deletes or admin-controlled deletion; prevent permanent data loss by users.
        6.  **CAPTCHA for Login:** Basic bot protection for public login.
        7.  **Legal Compliance - POPIA Basics:** Consider secure data handling, simple retention policies, and basic user rights in backend design.
  * **Tier 3: Important**
        8.  **UI Consistency & Workflow Smoothness (Backend Support):** API responses should facilitate smooth frontend updates.
        9.  **Mobile Usability (Backend Support):** APIs should be device-agnostic and support mobile needs (e.g., image renditions if necessary).

* **Core Messaging Architecture Outlined:** A conceptual database schema and API action plan for the Tier 1 "Core Messaging Functionality" (including job-specific threads, admin moderation, attachments) has been developed and documented in `systemPatterns.md`.
* **File Storage Strategy for Attachments Decided:** Messaging attachments will be stored within `public_html` (e.g., `public_html/uploads/messaging_attachments/`). This requires critical `.htaccess` rules to deny direct HTTP access and reliance on PHP scripts for all authenticated and authorized file downloads.

## 5. Important Patterns & Preferences

* **Incremental Development:** The migration will proceed phase by phase, with backend API endpoints being developed and then integrated into the frontend.
* **Clear Commit History:** Git commits should be descriptive, reflecting the specific part of the migration being addressed.
* **Documentation First:** The Memory Bank will be updated as new patterns emerge or decisions are made.

## 6. Learnings & Project Insights

* The existing `apiService.ts` provides a clear list of functionalities that need to be replicated in the PHP backend.
* The existing `backend/api.php` and `backend/db_connect.php` provide a starting point for the PHP backend structure, though `api.php` will need significant expansion.

---

## 7. Codebase Analysis and Memory Bank Update (2025-06-24)

* **Codebase Analysis Completed:** A comprehensive, high-level analysis of the entire codebase was performed. The findings have been documented in `systemPatterns.md`.
* **Memory Bank Updated:** All memory bank files (`productContext.md`, `activeContext.md`, `systemPatterns.md`, `decisionLog.md`, `progress.md`, `changelog.md`) have been updated to reflect the current state of the project, as determined by the codebase analysis.
* **Current Status:** The memory bank is now up-to-date. The next focus will be on addressing any outstanding tasks or beginning new development efforts.
