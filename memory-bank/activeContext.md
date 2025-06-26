# Active Context: Architex Axis Management Suite (Migration to PHP Backend)

## 1. Current Work Focus

The primary focus remains the migration of the Architex Axis Management Suite's React frontend to a PHP backend for cPanel deployment. Currently, efforts are concentrated on **implementing comprehensive debugging and testing infrastructure** to ensure robust development and deployment processes.

This involves:

* **MCP Debugging Automation Tool**: Created a comprehensive Model Context Protocol server that automates the entire debugging setup process for both PHP backend and React frontend, including VS Code configuration, breakpoint strategies, and comprehensive documentation.
* **Comprehensive Integration Testing**: Created full test suites for PHP-frontend integration covering authentication, API endpoints, database interactions, and user workflows.
* **Debugging Infrastructure**: Implemented VS Code debugging configurations for both PHP backend and React frontend, enabling full-stack debugging.
* **End-to-End Testing**: Developed Playwright-based E2E tests for complete user workflow validation.
* **Automated Testing Tools**: Created test runners and comprehensive debugging guides for development team efficiency.

[2025-06-26] - Created MCP debugging automation tool to streamline development workflow.
[2025-06-26] - Implemented comprehensive debugging and testing infrastructure for PHP-frontend integration.

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

1. **Resolve Testing and Development Environment Issues:**
   * Fix Jest test configuration to enable proper test runs.
   * Ensure Vite development server can run without errors.
   * Address missing dependencies (added `identity-obj-proxy` to fix Jest CSS import issues).

2. **Finalize Documentation:**
   * Created `TROUBLESHOOTING.md` guide for common issues and their solutions.
   * Updated memory bank files to reflect current project status and focus.

3. **Continue Phase 2: Backend Development (PHP):**
    * Implement the next set of API endpoints in `backend/api.php` based on `apiService.ts` (e.g., project-related endpoints).
    * Protect new endpoints using the `getDecodedJwt()` function as appropriate.
    * Ensure comprehensive input validation and use of prepared statements for all new endpoints.

4. **Update `JWT_SECRET_KEY`:** Emphasize replacing the placeholder `JWT_SECRET_KEY` with a strong, unique secret. This secret **must be injected via environment configuration** (e.g., cPanel Config Variables or a similar mechanism on the hosting platform) and **not hardcoded or committed to the repository**. Clarify that this secret should be stored securely outside the codebase to enhance security before deployment.

[2025-06-26] - Added new priority to resolve test and development environment issues before continuing with backend development.

## 4. Active Decisions & Considerations

* **Development Environment Stability:** Addressing the stability of test and development environments is now a top priority before continuing with further development.
  * Fixes made to Jest setup for CSS and asset imports by adding `identity-obj-proxy` dependency.
  * Updated Jest setup file to properly handle global objects (TextEncoder/TextDecoder).
  * Modified Vite configuration to properly resolve paths for contexts and components.
  * Created comprehensive troubleshooting guide (`TROUBLESHOOTING.md`) to document solutions for common issues.

* **PHP API Endpoint Granularity:** Deciding on the exact `action` names and parameters for each PHP API endpoint to ensure they align with frontend needs and maintain clarity.

* **Error Handling Strategy:** Defining a consistent error response format from the PHP API and ensuring the frontend can parse and display these errors appropriately.

* **Security of `db_connect.php`:** While `db_connect.php` is currently in `backend/`, for cPanel, it's best practice to move files containing sensitive credentials outside the `public_html` directory if the hosting environment allows include paths to be set accordingly. This will be reviewed during the deployment phase.

* **Composer for PHP Dependencies:** Confirming the setup of Composer within the `backend` directory to manage `firebase/php-jwt` and any other future PHP libraries.

* **Prioritized Non-Functional Requirements (NFRs) for PHP Backend Development (derived from `wa.md` feedback):**
  * **Tier 1: Absolutely Critical**
        1. **Data Persistence & Reliability:** Backend must reliably store and retrieve all application data.
        2. **Core Security - Authentication & Authorization:** Flawless JWT implementation, secure password hashing, and robust access control for API actions.
        3. **Basic Error Handling:** Consistent and clear error responses (HTTP status codes, simple JSON messages) from all API endpoints.

[2025-06-26] - Added focus on development environment stability as a top consideration.
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

---

**[2025-06-25 18:30:00] - Major Syntax Error Resolution and Code Quality Improvements**
Successfully completed a comprehensive error fixing session that resolved critical compilation issues across multiple project components. This represents a significant milestone in project stability.

**Key Achievements:**
- Fixed 8 critical TypeScript compilation errors in `AdminProjectMessagingPage.tsx`
- Resolved JSX syntax malformations and structural issues
- Cleaned up duplicate imports and corrected import paths throughout the codebase
- Standardized icon usage by replacing non-existent icons with available alternatives
- Fixed Button component prop compatibility issues
- Removed invalid thread types and unused code segments

**Technical Details:**
- JSX syntax error: Fixed malformed closing tag `}));` → `};`
- Import corrections: `../AuthContext` → `../../contexts/AuthContext`
- API function calls: `getProjectsAPI` → `fetchProjectsAPI`
- Button sizing: "xs" → "sm" (matching component interface)
- Button variants: "success" → "primary" (using supported variants)
- Icon replacements: `HandThumbUpIcon` → `CheckCircleIcon`, `HandThumbDownIcon` → `TrashIcon`
- Function signatures: Added missing third parameter to `renderChatInterface` calls
- Thread type validation: Removed non-existent `'project_client_admin_freelancer'` type

**Impact:**
- All TypeScript compilation errors eliminated
- Component now renders correctly in the admin interface
- Improved code maintainability and consistency
- Enhanced type safety across the messaging system

**Next Focus:**
The codebase is now in a stable, error-free state, ready for continued backend development and API integration work.
