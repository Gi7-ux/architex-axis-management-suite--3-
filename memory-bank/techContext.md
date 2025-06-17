# Technical Context: Architex Axis Management Suite

## 1. Technologies Used

*   **Frontend:**
    *   **React:** JavaScript library for building user interfaces.
    *   **TypeScript:** Superset of JavaScript adding static typing.
    *   **Vite:** Build tool for modern web projects, providing a fast development server and optimized builds.
    *   **CSS/Styling:** (Details to be added - e.g., CSS Modules, Tailwind CSS, Styled Components). Currently, standard CSS or CSS-in-JS is assumed.

*   **Backend (Target for Migration):**
    *   **PHP:** Server-side scripting language, well-suited for shared cPanel hosting.
    *   **MySQL:** Relational database management system, commonly available on cPanel.
    *   **(Potentially) Composer:** Dependency manager for PHP, will be needed for libraries like JWT.

*   **Database:**
    *   **MySQL:** As specified in `backend/db_connect.php`.

*   **Version Control:**
    *   **Git:** (Assumed, standard for most projects).

## 2. Development Setup

*   **Frontend:**
    *   Node.js and npm/yarn for managing dependencies and running Vite development server.
    *   Code editor (e.g., VS Code).
*   **Backend (PHP):**
    *   Local PHP development environment (e.g., XAMPP, WAMP, MAMP, or Docker with a PHP-FPM/Apache/Nginx setup).
    *   MySQL server for local database development.
    *   Composer for PHP package management.

## 3. Technical Constraints & Considerations

*   **Shared cPanel Hosting:**
    *   PHP is the primary server-side language. Node.js support is often limited or non-existent.
    *   Database access is typically MySQL.
    *   File system structure: Publicly accessible files reside in `public_html`.
    *   URL rewriting is handled via `.htaccess`.
    *   Limited control over server configuration compared to VPS or dedicated servers.
*   **Stateless Backend:** API endpoints should be stateless. Authentication will rely on tokens (e.g., JWT) passed with each request.
*   **API Design:** The PHP API will use a single entry point (`api.php`) with an `action` query parameter for routing, as observed in the existing `api.php` file.
*   **Security:**
    *   Input validation and sanitization are critical on the PHP backend.
    *   Use prepared statements for all database queries to prevent SQL injection.
    *   Securely handle passwords (hashing with `password_hash()`).
    *   Implement HTTPS in production.

## 4. Dependencies

*   **Frontend (from `package.json` - to be reviewed):**
    *   `react`, `react-dom`
    *   `typescript`
    *   `vite`
    *   (Other UI libraries, state management, routing libraries - e.g., React Router)
*   **Backend (PHP - to be added via Composer):**
    *   `firebase/php-jwt` (for JWT authentication).
    *   (Potentially other libraries for specific tasks).

## 5. Tool Usage Patterns

*   **Frontend Development:**
    *   `npm run dev` (or `yarn dev`) to start the Vite development server.
    *   `npm run build` (or `yarn build`) to create a production build.
*   **Backend Development:**
    *   Directly editing PHP files.
    *   Using a local web server to test PHP scripts.
    *   `composer install/update` to manage PHP dependencies.
*   **Database Management:**
    *   Using tools like phpMyAdmin (common on cPanel) or a desktop SQL client (e.g., DBeaver, MySQL Workbench) to manage the database.
