# Project Brief

**Project Name**: Architex Axis Management Suite

## 1. Project Goal

The primary goal of the Architex Axis Management Suite is to provide a comprehensive platform for managing freelance projects, connecting clients, freelancers, and administrators. The current task is to adapt the existing React frontend to work with a PHP backend, enabling deployment on shared cPanel hosting.

## 2. Core Requirements

*   **User Roles:** Support for distinct user roles (Admin, Client, Freelancer) with role-specific dashboards and functionalities.
*   **Project Management:** Allow clients to post projects, freelancers to apply, and admins to oversee project lifecycles.
*   **Communication:** Facilitate messaging between users.
*   **Time Tracking & Billing:** Enable freelancers to log time and admins to generate reports (future scope, but consider in architecture).
*   **Deployment:** The system must be deployable on a standard shared cPanel hosting environment.

## 3. Key Success Metrics

*   Successful migration of the frontend to communicate with the PHP backend.
*   All existing frontend functionalities remain operational after the migration.
*   The application is deployable and runs smoothly on a cPanel server.
*   Clear and maintainable codebase for both frontend and backend.

## 4. Scope

*   **In Scope (Current Task):**
    *   Modify the React frontend (`apiService.ts` and related components) to make API calls to a PHP backend.
    *   Develop PHP API endpoints (`api.php`) to handle all requests currently managed by the presumed Node.js/Express backend.
    *   Ensure database connectivity (`db_connect.php`) and interaction for all features.
    *   Configure the project for cPanel deployment (e.g., `.htaccess` for routing, build process adjustments).
    *   Implement basic authentication (e.g., JWT) between frontend and PHP backend.
*   **Out of Scope (Current Task, but for future consideration):**
    *   Advanced real-time features (e.g., live chat updates beyond basic polling).
    *   Complex reporting and analytics.
    *   Payment gateway integrations.

## 5. Stakeholders

*   Development Team (Cline)
*   Project Owner/User
