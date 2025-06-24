# Product Context: Architex Axis Management Suite

## 1. Problem Solved

The Architex Axis Management Suite aims to address the common challenges faced in managing freelance projects, particularly in a distributed environment. These challenges include:

* **Fragmented Communication:** Difficulty in maintaining clear and centralized communication between clients, freelancers, and project administrators.
* **Inefficient Project Tracking:** Lack of a unified system to track project progress, deadlines, and deliverables.
* **Complex User Management:** The need to manage different user roles (clients seeking services, freelancers offering services, and administrators overseeing operations) with appropriate permissions and views.
* **Deployment Constraints:** The requirement for the platform to be deployable on common, cost-effective hosting solutions like shared cPanel, which often have limitations compared to dedicated or cloud-native environments (e.g., limited Node.js support, preference for PHP).

## 2. Target Users

* **Clients:** Individuals or businesses looking to hire freelancers for specific projects. They need a platform to post project requirements, review proposals, communicate with freelancers, and monitor project progress.
* **Freelancers:** Skilled professionals seeking project opportunities. They need a platform to browse available projects, submit applications, manage their job cards, communicate with clients, and potentially track their time.
* **Administrators:** Personnel responsible for overseeing the platform's operations. They need tools to manage users, projects, resolve disputes, and ensure the smooth functioning of the suite.

## 3. How It Should Work (User Experience Goals)

* **Intuitive Interface:** The platform should be easy to navigate for all user roles, with clear dashboards and workflows.
* **Seamless Collaboration:** Communication tools should be integrated and straightforward, allowing for efficient interaction.
* **Transparency:** Project status, applications, and communications should be transparent to relevant parties.
* **Reliability:** The system must be stable and performant, especially given the transition to a PHP backend on shared hosting.
* **Accessibility:** The platform should be accessible from various devices.

## 4. Detailed Functional Requirements & User Feedback (from `wa.md`)

The following detailed functional requirements and user feedback points, primarily sourced from `memory-bank/wa.md` (a log of user communication), significantly elaborate on the initial product goals and user experience expectations:

* **Messaging System:**
  * Must be contextualized to specific job cards, functioning like a group chat for all participants (client, freelancer, admin).
  * Admin moderation workflow: Freelancer messages are seen by admin first, who can then approve them to be visible to the client.
  * Support for attachments (screenshots, files) with previews and archiving under the job card.
  * Rich text formatting options for messages.
  * A general messaging channel (not tied to job cards) may also be useful for administrative discussions.

* **Project, Job, and Task Management:**
  * Job cards should integrate due date calendars for individual tasks.
  * File upload capabilities directly within job creation and job detail pages.
  * Automated notifications for job updates and status changes.
  * Client approval workflow for new/updated jobs, which automatically updates project status.
  * Admin ability to log their own billable time on projects/tasks.
  * Support for assigning multiple freelancers to a single job, potentially for different tasks within that job.
  * Clear visual distinction and management of project statuses (e.g., Open, In Progress, Submitted for Review, Approved, Completed, Archived).
  * Freelancers should be able to apply/bid for "posted" jobs, with closing dates for bids.

* **User Management & Roles:**
  * Freelancer self-registration option, followed by admin approval/sanctioning to activate their account.
  * Admins need tools to flag non-performing freelancers and block accounts (rather than users fully deleting their own data).
  * Robust password management: option to view typed password, auto-generation for new users, email notifications with login details and password reset links.
  * Revised data deletion policy: Users (freelancers, clients) should not be able to permanently delete their accounts. Data should be archived or soft-deleted, with admins having access to a "recycle bin" for restoration or permanent deletion.
  * Admin ability to assign jobs directly or post jobs to selected freelancers or all freelancers.
  * Conflict: Client ability to create projects (requested in `wa.md`) vs. admin-only project creation (current direction). This needs resolution.

* **Reporting & Dashboards:**
  * Comprehensive reporting for admins: by freelancer, by job, by client, including financial summaries (earnings, payments, profit), performance metrics, and visual aids (timelines, bar graphs).
  * Role-specific reporting: Freelancers should see reports for their own projects and hours. Clients should see reports for their own jobs.
  * Dashboards must display real-time, accurate data (not mockups) and include hyperlinks to drill down into specific items (jobs, user profiles, etc.).
  * Recent activity logs on dashboards should be functional.

* **UI/UX & General Functionality:**
  * High importance placed on UI consistency (aesthetics, button labels, fonts) across the platform and with the main website.
  * Clear tooltips or labels for action icons.
  * Improved error handling and informative error messages.
  * CAPTCHA or similar bot prevention for login.
  * Resolution of numerous reported bugs related to navigation, data persistence, and UI glitches.
  * Mobile accessibility and usability, especially for viewing images.
  * Integration of legal documents (T&Cs, Privacy Policy, NDAs) into user workflows (e.g., checkbox at login, pop-up for agreement before job creation).

* **Legal & Compliance:**
  * Address specific flaws identified in Privacy Policy and T&Cs regarding POPIA (South African data protection act).
  * Clauses regarding non-solicitation (clients/freelancers not poaching each other) and potential recruitment fees.

These detailed points provide critical context for feature development and refinement, ensuring the final product meets user expectations more closely.

## 4. Core Value Proposition

The Architex Axis Management Suite provides a centralized, user-friendly, and adaptable platform for managing the entire lifecycle of freelance projects, specifically designed to operate effectively within the constraints of shared cPanel hosting by leveraging a PHP backend.

---

## 5. System Analysis Summary (as of 2025-06-24)

A full codebase analysis confirmed the following:

* **Architecture:** A Client-Server model with a React SPA frontend and a PHP backend, designed for cPanel deployment.
* **Frontend:** Built with TypeScript, React, and Vite. Components are well-structured into role-based (`admin`, `client`, `freelancer`) and `shared` directories. Global state is managed via `AuthContext.tsx`.
* **Backend:** A PHP API handles business logic and database interaction with a MySQL database. It uses `firebase/php-jwt` for authentication.
* **Testing:** The project has a comprehensive testing suite, including Jest for frontend unit/integration tests, Playwright for E2E tests, and Pest/PHPUnit for backend tests.
* **Deployment:** The application is built using `npm run build` and deployed by uploading the `public_html` directory to a cPanel server. An `.htaccess` file manages routing.

---

## 6. PRD Sharding (as of 2025-06-24)

The `docs/prd.md` document has been sharded into multiple files within the `docs/prd/` directory to improve readability and maintainability. The new structure is indexed by `docs/prd/README.md`.
