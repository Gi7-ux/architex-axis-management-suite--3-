# Web Application Test Plan

This document outlines the comprehensive test plan for validating the functionality, integration, and stability of the web application.

## 1. Database Layer Verification

### Checklist

| Test Case                  | Description                                                                                                                            | Expected Outcome                                                                                             | Suggested Tools        |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | ---------------------- |
| **Connectivity**           | Confirm the PHP backend can successfully establish and maintain a persistent connection to the MySQL database.                           | Successful connection without errors. Connection is persistent across multiple requests.                     | Custom PHP script, logs |
| **Schema Integrity**       | Validate that all database tables, columns, data types, indexes, and foreign key constraints match the application's data model specs. | Schema matches the entity-relationship diagram (ERD) and application requirements. No discrepancies found. | MySQL Workbench, `DESCRIBE table;` |
| **Data Seeding (Positive)**| Run scripts to populate the database with initial/test data.                                                                           | All data is inserted correctly, with correct data types, and without truncation or corruption.               | PHP seed scripts, SQL scripts |
| **Data Seeding (Negative)**| Attempt to run seeding scripts with invalid data (e.g., wrong data type, violating constraints).                                       | The script should fail gracefully, log errors, and not leave the database in a corrupted state.              | PHP seed scripts, SQL scripts |

## 2. Backend API and Logic (Integration Testing)

### Tools

* **Postman** or **Insomnia** for API endpoint testing.
* **PHPUnit** for backend unit and integration tests.

### Checklist: CRUD Operations

| Entity | Operation | Test Case Description | Expected Outcome |
| :--- | :--- | :--- | :--- |
| **User** | **Create (POST)** | **Positive:** Submit valid user registration data. | `201 Created` status, returns new user object (without sensitive data like password). |
| | | **Negative:** Submit with missing `email` field. | `400 Bad Request` status with a clear error message (e.g., "Email is required"). |
| | | **Negative:** Submit with a duplicate `email`. | `409 Conflict` status with an error message (e.g., "Email already exists"). |
| **User** | **Read (GET)** | **Positive:** Request a single user by a valid ID. | `200 OK` status, returns the correct user object. |
| | | **Positive:** Request all users. | `200 OK` status, returns a paginated list of users. |
| | | **Negative:** Request a user with a non-existent ID. | `404 Not Found` status. |
| **User** | **Update (PUT/PATCH)** | **Positive:** Update a user's profile information (e.g., name). | `200 OK` status, returns the updated user object. |
| | | **Negative:** Attempt to update a user with a non-existent ID. | `404 Not Found` status. |
| | | **Negative:** Attempt to change a user's email to one that already exists. | `409 Conflict` status. |
| **User** | **Delete (DELETE)** | **Positive:** Delete a user with a valid ID. | `204 No Content` status. The user is removed from the database. |
| | | **Negative:** Attempt to delete a user with a non-existent ID. | `404 Not Found` status. |
_Repeat for all major data entities (e.g., Products, Posts, etc.)_

### Checklist: Business Logic & Auth

| Category | Test Case Description | Expected Outcome |
| :--- | :--- | :--- |
| **Business Logic** | **User Registration:** Test the full registration flow. | A new user is created, a welcome email is sent (if applicable), and the database state is correct. |
| | **Payment Processing:** Simulate a successful payment transaction. | `200 OK` status, a new order record is created, and the payment status is marked as "Completed". |
| **Authentication** | **Login (Positive):** Submit valid user credentials. | `200 OK` status, returns a valid JWT token. |
| | **Login (Negative):** Submit invalid credentials. | `401 Unauthorized` status. |
| **Authorization** | **Protected Route (Positive):** Access a protected endpoint with a valid JWT token. | `200 OK` status, returns the requested resource. |
| | **Protected Route (Negative):** Access a protected endpoint with an invalid/expired token. | `401 Unauthorized` status. |
| | **Protected Route (Negative):** Access a protected endpoint with no token. | `401 Unauthorized` status. |
| | **Role-Based Access:** An admin user can access admin-only endpoints. | `200 OK` status. |
| | **Role-Based Access:** A non-admin user attempts to access an admin-only endpoint. | `403 Forbidden` status. |

## 3. Frontend-to-Backend Integration (End-to-End Testing)

### Tools

* **Cypress** or **Selenium** for browser automation.
* **Browser Developer Tools** (Network tab) for inspecting API calls.

### Checklist

| Category | Test Case Description | Expected Outcome |
| :--- | :--- | :--- |
| **Data Display** | Navigate to the user list page. | The UI displays a table of users that correctly matches the data fetched from the `/api/users` endpoint. |
| **User Input & Forms** | **Positive:** Fill out and submit the registration form with valid data. | The form submits successfully, an API call to `POST /api/users` is made, the user is redirected to the login page, and a success message is shown. |
| | **Negative:** Submit the registration form with an invalid email format. | A client-side validation message appears. The form is not submitted. |
| | **Negative:** Submit the registration form with a password mismatch. | A client-side validation message appears. The form is not submitted. |
| **State Changes** | On the user list page, click the "Delete" button for a user. | A confirmation modal appears. On confirmation, a `DELETE /api/users/{id}` call is made. The user is removed from the UI list without a page reload. |
| **Error Handling** | Submit a form that triggers a backend validation error (e.g., duplicate email). | The API returns a `409` error. The UI displays a user-friendly error message (e.g., "This email is already in use."). |

## 4. Security and Validation

### Checklist

| Category | Test Case Description | Expected Outcome | Suggested Tools |
| :--- | :--- | :--- | :--- |
| **SQL Injection** | In a login form's username field, enter `' OR '1'='1`. | The login should fail. The backend should use parameterized queries, preventing the injection from being executed. No database error should be exposed. | Manual testing, Burp Suite |
| **XSS (Cross-Site Scripting)** | In a user profile's "bio" text field, enter `<script>alert('XSS')</script>`. | When viewing the profile, the script tag should be rendered as plain text (`<script>...`) and not executed. The alert should not appear. | Manual testing |
| **Error Message Security** | Trigger a 500-level server error (e.g., by temporarily breaking the DB connection). | The API should return a generic `500 Internal Server Error` message. No stack traces, database credentials, or file paths should be exposed in the response body. | Manual testing |
| **Input Sanitization** | Submit form data with leading/trailing whitespace and special characters. | The backend should correctly trim whitespace and handle special characters without causing errors or data corruption. | Manual testing, Postman |

## 5. Performance

### Checklist

| Category | Test Case Description | Expected Outcome | Suggested Tools |
| :--- | :--- | :--- | :--- |
| **API Response Time** | Measure the response time for critical endpoints (e.g., `GET /api/products`, `POST /api/orders`) under normal load. | Response times should be within acceptable limits (e.g., < 500ms). | Postman, JMeter, k6 |
| **Database Query Performance** | Identify and analyze slow-running queries triggered by API calls, especially on pages with complex data joins or large datasets. | Use `EXPLAIN` to analyze query plans. Add indexes to columns used in `WHERE` clauses and `JOIN`s to optimize performance. | MySQL `EXPLAIN` command, New Relic, Datadog |
