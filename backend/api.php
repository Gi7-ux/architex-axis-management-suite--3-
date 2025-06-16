<?php
header("Access-Control-Allow-Origin: *"); // Allow requests from any origin (for development)
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS"); // Allow common methods
header("Access-Control-Max-Age: 3600"); // Cache preflight request for 1 hour
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

// Include database connection
require_once 'db_connect.php'; // $conn will be available from this file

// --- NEW: Authentication Helper Functions ---
function get_user_from_session_token($conn, $token) {
    if (empty($token)) {
        return null;
    }
    // Prepare statement to prevent SQL injection
    $stmt = $conn->prepare("SELECT id, username, email, role, created_at FROM users WHERE session_token = ? AND session_token_expires_at > NOW()");
    if ($stmt === false) {
        // error_log("Prepare failed (get_user_from_session_token): " . $conn->error);
        return null;
    }
    $stmt->bind_param("s", $token);
    if (!$stmt->execute()) {
        // error_log("Execute failed (get_user_from_session_token): " . $stmt->error);
        return null;
    }
    $result = $stmt->get_result();
    $user = $result->fetch_assoc();
    $stmt->close();
    return $user ? $user : null;
}

function require_authentication($conn) {
    $auth_header = $_SERVER['HTTP_AUTHORIZATION'] ?? null;
    if (!$auth_header || !preg_match('/^Bearer\s+(.+)$/', $auth_header, $matches)) {
        send_json_response(401, ['error' => 'Authorization header missing or malformed. Usage: Bearer <token>']);
        // exit; // exit is handled by send_json_response if it includes one
    }
    $token = $matches[1];
    $user = get_user_from_session_token($conn, $token);
    if (!$user) {
        send_json_response(403, ['error' => 'Invalid or expired session token. Please log in again.']);
        // exit; // exit is handled by send_json_response
    }
    return $user; // Return authenticated user data
}
// --- END NEW Authentication Helper Functions ---

// --- Helper function to send JSON response ---
function send_json_response($status_code, $data) {
    http_response_code($status_code);
    echo json_encode($data);
    exit;
}

// --- API Endpoint Logic ---
$action = isset($_GET['action']) ? $_GET['action'] : null;
$method = $_SERVER['REQUEST_METHOD'];

// Handle preflight OPTIONS request (for CORS)
if ($method === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// --- NEW: User Authentication API ---
if ($action === 'register_user' && $method === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    $username = $data['username'] ?? null;
    $email = $data['email'] ?? null;
    $password = $data['password'] ?? null;
    $role = $data['role'] ?? 'freelancer'; // Default role

    if (empty($username) || empty($email) || empty($password)) {
        send_json_response(400, ['error' => 'Username, email, and password are required.']);
    }
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        send_json_response(400, ['error' => 'Invalid email format.']);
    }
    if (strlen($password) < 8) {
        send_json_response(400, ['error' => 'Password must be at least 8 characters long.']);
    }
    $allowed_roles = ['freelancer', 'client', 'admin'];
    if (!in_array($role, $allowed_roles)) {
        send_json_response(400, ['error' => 'Invalid role specified. Valid roles: ' . implode(', ', $allowed_roles)]);
    }

    $stmt_check = $conn->prepare("SELECT id FROM users WHERE username = ? OR email = ?");
    $stmt_check->bind_param("ss", $username, $email);
    $stmt_check->execute();
    $stmt_check->store_result();
    if ($stmt_check->num_rows > 0) {
        send_json_response(409, ['error' => 'Username or email already exists.']);
    }
    $stmt_check->close();

    $hashed_password = password_hash($password, PASSWORD_BCRYPT);
    $stmt = $conn->prepare("INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)");
    if ($stmt === false) {
        send_json_response(500, ['error' => 'Server error: Could not prepare statement for user registration.']);
    }
    $stmt->bind_param("ssss", $username, $email, $hashed_password, $role);
    if ($stmt->execute()) {
        send_json_response(201, ['message' => 'User registered successfully.']);
    } else {
        send_json_response(500, ['error' => 'Server error: Could not register user. ' . $stmt->error]);
    }
    $stmt->close();

} elseif ($action === 'login_user' && $method === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    $email = $data['email'] ?? null;
    $password = $data['password'] ?? null;

    if (empty($email) || empty($password)) {
        send_json_response(400, ['error' => 'Email and password are required.']);
    }

    $stmt = $conn->prepare("SELECT id, username, email, role, password FROM users WHERE email = ?");
    if ($stmt === false) {
        send_json_response(500, ['error' => 'Server error: Could not prepare statement for login.']);
    }
    $stmt->bind_param("s", $email);
    $stmt->execute();
    $result = $stmt->get_result();
    $user = $result->fetch_assoc();
    $stmt->close();

    if ($user && password_verify($password, $user['password'])) {
        $session_token = bin2hex(random_bytes(32));
        $expires_at = date('Y-m-d H:i:s', strtotime('+1 day'));

        $stmt_update_token = $conn->prepare("UPDATE users SET session_token = ?, session_token_expires_at = ? WHERE id = ?");
        if ($stmt_update_token === false) {
            send_json_response(500, ['error' => 'Server error: Could not prepare statement for token update.']);
        }
        $stmt_update_token->bind_param("ssi", $session_token, $expires_at, $user['id']);
        if (!$stmt_update_token->execute()) {
            send_json_response(500, ['error' => 'Server error: Could not update session token. ' . $stmt_update_token->error]);
        }
        $stmt_update_token->close();

        send_json_response(200, [
            'message' => 'Login successful.',
            'user' => [
                'id' => $user['id'],
                'username' => $user['username'],
                'email' => $user['email'],
                'role' => $user['role']
            ],
            'token' => $session_token
        ]);
    } else {
        send_json_response(401, ['error' => 'Invalid email or password.']);
    }

} elseif ($action === 'get_user_profile' && $method === 'GET') {
    $authenticated_user = require_authentication($conn);
    // require_authentication itself sends a response and exits on failure.
    // If it returns, $authenticated_user contains 'id', 'username', 'email', 'role', 'created_at'.
    send_json_response(200, $authenticated_user);

}

// NEW: Admin - Get All Users
elseif ($action === 'get_all_users' && $method === 'GET') {
    $authenticated_user = require_authentication($conn);

    if ($authenticated_user['role'] !== 'admin') {
        send_json_response(403, ['error' => 'Forbidden: Only admins can view all users.']);
    }

    $sql = "SELECT id, username, email, role, created_at FROM users ORDER BY created_at DESC";
    $stmt = $conn->prepare($sql);
    if ($stmt === false) {
        send_json_response(500, ['error' => 'Failed to prepare statement for getting all users: ' . $conn->error]);
    }

    if (!$stmt->execute()) {
        send_json_response(500, ['error' => 'Failed to execute statement for getting all users: ' . $stmt->error]);
    }

    $result = $stmt->get_result();
    $users_list = [];
    while ($row = $result->fetch_assoc()) {
        $users_list[] = $row;
    }
    $stmt->close();

    send_json_response(200, $users_list);

} // END NEW: Admin - Get All Users


// NEW: Admin - Update User Role
elseif ($action === 'update_user_role' && ($method === 'POST' || $method === 'PUT')) { // PUT or POST
    $authenticated_user = require_authentication($conn);
    $admin_id = (int)$authenticated_user['id'];

    if ($authenticated_user['role'] !== 'admin') {
        send_json_response(403, ['error' => 'Forbidden: Only admins can update user roles.']);
    }

    $data = json_decode(file_get_contents('php://input'), true);
    $user_id_to_update = isset($data['user_id']) ? (int)$data['user_id'] : null;
    $new_role = $data['new_role'] ?? null;

    if (!$user_id_to_update || empty($new_role)) {
        send_json_response(400, ['error' => 'User ID and new role are required.']);
    }

    $allowed_roles = ['freelancer', 'client', 'admin']; // Roles that can be assigned
    if (!in_array($new_role, $allowed_roles)) {
        send_json_response(400, ['error' => 'Invalid role specified. Valid roles: ' . implode(', ', $allowed_roles)]);
    }

    // Safety check: Prevent admin from changing their own role via this generic endpoint
    if ($user_id_to_update === $admin_id) {
        send_json_response(400, ['error' => 'Admins cannot change their own role through this endpoint.']);
    }

    // Check if user exists
    $stmt_user_exists = $conn->prepare("SELECT id FROM users WHERE id = ?");
    if (!$stmt_user_exists) { send_json_response(500, ['error' => 'Server error preparing user check.']); }
    $stmt_user_exists->bind_param("i", $user_id_to_update);
    if (!$stmt_user_exists->execute()) { send_json_response(500, ['error' => 'Server error executing user check.']); }
    if ($stmt_user_exists->get_result()->num_rows === 0) {
        send_json_response(404, ['error' => 'User to update not found.']);
    }
    $stmt_user_exists->close();


    $stmt_update = $conn->prepare("UPDATE users SET role = ? WHERE id = ?");
    if ($stmt_update === false) {
        send_json_response(500, ['error' => 'Failed to prepare statement for updating user role: ' . $conn->error]);
    }
    $stmt_update->bind_param("si", $new_role, $user_id_to_update);

    if ($stmt_update->execute()) {
        if ($stmt_update->affected_rows > 0) {
            send_json_response(200, ['message' => 'User role updated successfully.']);
        } else {
            send_json_response(400, ['message' => 'User role was not changed (user not found or role was already set to this value).']);
        }
    } else {
        send_json_response(500, ['error' => 'Failed to update user role: ' . $stmt_update->error]);
    }
    $stmt_update->close();

} // END NEW: Admin - Update User Role
// --- END NEW User Authentication API ---

// NEW: Get Client's Own Projects
elseif ($action === 'get_client_projects' && $method === 'GET') {
    $authenticated_user = require_authentication($conn);

    if ($authenticated_user['role'] !== 'client') {
        // While admins *could* see projects, this endpoint is specifically for a client's own projects.
        // Admins might use a more general 'get_projects' with filters or a dedicated admin endpoint.
        send_json_response(403, ['error' => 'Forbidden: This action is for clients to view their own projects.']);
    }

    $client_id = (int)$authenticated_user['id'];
    $status_filter = isset($_GET['status']) ? $_GET['status'] : null;

    $sql = "SELECT id, title, description, client_id, freelancer_id, status, created_at, updated_at FROM projects WHERE client_id = ?";
    $params = [$client_id];
    $types = "i";

    if ($status_filter) {
        $sql .= " AND status = ?";
        $params[] = $status_filter;
        $types .= "s";
    }
    $sql .= " ORDER BY created_at DESC";

    $stmt = $conn->prepare($sql);
    if ($stmt === false) {
        send_json_response(500, ['error' => 'Failed to prepare statement: ' . $conn->error]);
    }

    $stmt->bind_param($types, ...$params);

    if (!$stmt->execute()) {
        send_json_response(500, ['error' => 'Failed to execute statement: ' . $stmt->error]);
    }

    $result = $stmt->get_result();
    $projects = [];
    while ($row = $result->fetch_assoc()) {
        $projects[] = $row;
    }
    $stmt->close();

    send_json_response(200, $projects);

} // END NEW: Get Client's Own Projects

// NEW: Get Applications for a Specific Project
elseif ($action === 'get_project_applications' && $method === 'GET') {
    $authenticated_user = require_authentication($conn);
    $user_id = (int)$authenticated_user['id'];
    $user_role = $authenticated_user['role'];

    $project_id = isset($_GET['project_id']) ? (int)$_GET['project_id'] : null;

    if (!$project_id) {
        send_json_response(400, ['error' => 'Project ID is required to fetch applications.']);
    }

    // Authorize: Check if the user owns the project or is an admin
    $stmt_check_owner = $conn->prepare("SELECT client_id FROM projects WHERE id = ?");
    if (!$stmt_check_owner) {
        send_json_response(500, ['error' => 'Server error preparing project ownership check.']);
    }
    $stmt_check_owner->bind_param("i", $project_id);
    if (!$stmt_check_owner->execute()) {
        send_json_response(500, ['error' => 'Server error executing project ownership check.']);
    }
    $result_owner_check = $stmt_check_owner->get_result();
    if ($result_owner_check->num_rows === 0) {
        send_json_response(404, ['error' => 'Project not found.']);
    }
    $project_data = $result_owner_check->fetch_assoc();
    $project_client_id = (int)$project_data['client_id'];
    $stmt_check_owner->close();

    if ($user_role !== 'admin' && $project_client_id !== $user_id) {
        send_json_response(403, ['error' => 'Forbidden: You do not have permission to view applications for this project.']);
    }

    // Fetch applications, joining with users table for freelancer info
    $sql = "SELECT
                a.id, a.project_id, a.freelancer_id,
                a.proposal_text, a.bid_amount, a.status,
                a.applied_at, a.updated_at,
                u.username AS freelancer_username,
                u.email AS freelancer_email
            FROM applications a
            JOIN users u ON a.freelancer_id = u.id
            WHERE a.project_id = ?
            ORDER BY a.applied_at DESC";

    $stmt_apps = $conn->prepare($sql);
    if ($stmt_apps === false) {
        send_json_response(500, ['error' => 'Failed to prepare statement for fetching applications: ' . $conn->error]);
    }
    $stmt_apps->bind_param("i", $project_id);

    if (!$stmt_apps->execute()) {
        send_json_response(500, ['error' => 'Failed to execute statement for fetching applications: ' . $stmt_apps->error]);
    }

    $result_apps = $stmt_apps->get_result();
    $applications = [];
    while ($row = $result_apps->fetch_assoc()) {
        // Convert bid_amount to float if it's not null
        if ($row['bid_amount'] !== null) {
            $row['bid_amount'] = (float)$row['bid_amount'];
        }
        $applications[] = $row;
    }
    $stmt_apps->close();

    send_json_response(200, $applications);

} // END NEW: Get Applications for a Specific Project

// NEW: Update Application Status
elseif ($action === 'update_application_status' && $method === 'PUT') { // Or POST, PUT is common for updates
    $authenticated_user = require_authentication($conn);
    $user_id = (int)$authenticated_user['id'];
    $user_role = $authenticated_user['role'];

    $application_id = isset($_GET['application_id']) ? (int)$_GET['application_id'] : null;
    if (!$application_id) {
        send_json_response(400, ['error' => 'Application ID is required.']);
    }

    $data = json_decode(file_get_contents('php://input'), true);
    $new_status = $data['status'] ?? null;

    $valid_statuses = ['accepted', 'rejected', 'archived_by_client']; // Client modifiable statuses
    if (empty($new_status) || !in_array($new_status, $valid_statuses)) {
        send_json_response(400, ['error' => 'Invalid or missing status. Valid statuses: ' . implode(', ', $valid_statuses)]);
    }

    // Authorize: Check if the user owns the project associated with the application or is an admin
    // Need to fetch project_id and freelancer_id from the application first
    $stmt_app_check = $conn->prepare(
        "SELECT a.project_id, a.freelancer_id, p.client_id AS project_client_id
         FROM applications a
         JOIN projects p ON a.project_id = p.id
         WHERE a.id = ?"
    );
    if (!$stmt_app_check) {
        send_json_response(500, ['error' => 'Server error preparing application ownership check. ' . $conn->error]);
    }
    $stmt_app_check->bind_param("i", $application_id);
    if (!$stmt_app_check->execute()) {
        send_json_response(500, ['error' => 'Server error executing application ownership check. ' . $stmt_app_check->error]);
    }
    $result_app_check = $stmt_app_check->get_result();
    if ($result_app_check->num_rows === 0) {
        send_json_response(404, ['error' => 'Application not found.']);
    }
    $app_data = $result_app_check->fetch_assoc();
    $project_client_id = (int)$app_data['project_client_id'];
    $project_id_from_app = (int)$app_data['project_id'];
    $freelancer_id_from_app = (int)$app_data['freelancer_id'];
    $stmt_app_check->close();

    if ($user_role !== 'admin' && $project_client_id !== $user_id) {
        send_json_response(403, ['error' => 'Forbidden: You do not have permission to update this application.']);
    }

    // Start transaction if we're updating multiple tables (applications and projects)
    $conn->begin_transaction();

    try {
        // Update application status
        $stmt_update_app = $conn->prepare("UPDATE applications SET status = ?, updated_at = NOW() WHERE id = ?");
        if (!$stmt_update_app) {
            throw new Exception('Server error preparing application status update. ' . $conn->error);
        }
        $stmt_update_app->bind_param("si", $new_status, $application_id);
        if (!$stmt_update_app->execute()) {
            throw new Exception('Server error executing application status update. ' . $stmt_update_app->error);
        }
        $affected_app_rows = $stmt_update_app->affected_rows;
        $stmt_update_app->close();

        if ($affected_app_rows === 0 && $new_status !== 'accepted') { // if status is 'accepted', project update might still occur
             // Check if application actually exists with a different status or if status was already set
            $check_current_status_stmt = $conn->prepare("SELECT status FROM applications WHERE id = ?");
            $check_current_status_stmt->bind_param("i", $application_id);
            $check_current_status_stmt->execute();
            $current_status_result = $check_current_status_stmt->get_result()->fetch_assoc();
            $check_current_status_stmt->close();
            if ($current_status_result && $current_status_result['status'] === $new_status) {
                 // Status was already set to the target status, consider it a success for idempotency
            } else {
                 throw new Exception('Application not found or status unchanged, and not accepting.');
            }
        }


        // If application is accepted, update the project
        if ($new_status === 'accepted') {
            $project_new_status = 'in_progress'; // Or 'assigned', 'active', etc.
            $stmt_update_project = $conn->prepare(
                "UPDATE projects SET freelancer_id = ?, status = ?, updated_at = NOW() WHERE id = ?"
            );
            if (!$stmt_update_project) {
                throw new Exception('Server error preparing project update on application acceptance. ' . $conn->error);
            }
            $stmt_update_project->bind_param("isi", $freelancer_id_from_app, $project_new_status, $project_id_from_app);
            if (!$stmt_update_project->execute()) {
                throw new Exception('Server error executing project update on application acceptance. ' . $stmt_update_project->error);
            }
            $stmt_update_project->close();

            // Optional: Reject other pending applications for this project
            $stmt_reject_others = $conn->prepare(
                "UPDATE applications SET status = 'rejected', updated_at = NOW()
                 WHERE project_id = ? AND id != ? AND status = 'pending'"
            );
            if (!$stmt_reject_others) {
                // Non-critical error, log it but don't necessarily fail the whole transaction
                error_log("Failed to prepare statement for rejecting other applications: " . $conn->error);
            } else {
                $stmt_reject_others->bind_param("ii", $project_id_from_app, $application_id);
                if (!$stmt_reject_others->execute()) {
                    error_log("Failed to execute statement for rejecting other applications: " . $stmt_reject_others->error);
                }
                $stmt_reject_others->close();
            }
        }

        $conn->commit();
        send_json_response(200, ['message' => 'Application status updated successfully.']);

    } catch (Exception $e) {
        $conn->rollback();
        // Differentiate between "not found" type errors and actual server errors if possible from exception message
        if (strpos($e->getMessage(), 'Application not found') !== false) {
            send_json_response(404, ['error' => $e->getMessage()]);
        } else {
            send_json_response(500, ['error' => $e->getMessage()]);
        }
    }
} // END NEW: Update Application Status

// NEW: Freelancer Submits an Application
elseif ($action === 'submit_application' && $method === 'POST') {
    $authenticated_user = require_authentication($conn);
    $freelancer_id = (int)$authenticated_user['id'];

    if ($authenticated_user['role'] !== 'freelancer') {
        send_json_response(403, ['error' => 'Forbidden: Only freelancers can submit applications.']);
    }

    $data = json_decode(file_get_contents('php://input'), true);
    $project_id = isset($data['project_id']) ? (int)$data['project_id'] : null;
    $proposal_text = $data['proposal_text'] ?? null;
    // bid_amount can be null if allowed by schema, or should be validated if required
    $bid_amount = isset($data['bid_amount']) ? (float)$data['bid_amount'] : null;

    if (!$project_id || empty($proposal_text)) {
        send_json_response(400, ['error' => 'Project ID and proposal text are required.']);
    }
    // Optional: Validate bid_amount if it's not nullable or has range constraints
    if ($bid_amount !== null && $bid_amount < 0) {
        send_json_response(400, ['error' => 'Bid amount cannot be negative.']);
    }

    // Check if project exists and is open for applications
    $stmt_proj_check = $conn->prepare("SELECT status FROM projects WHERE id = ?");
    if (!$stmt_proj_check) {
        send_json_response(500, ['error' => 'Server error preparing project check.']);
    }
    $stmt_proj_check->bind_param("i", $project_id);
    if (!$stmt_proj_check->execute()) {
        send_json_response(500, ['error' => 'Server error executing project check.']);
    }
    $result_proj_check = $stmt_proj_check->get_result();
    if ($result_proj_check->num_rows === 0) {
        send_json_response(404, ['error' => 'Project not found.']);
    }
    $project_details = $result_proj_check->fetch_assoc();
    // Define what statuses are considered "open for applications"
    $open_statuses = ['open', 'pending_approval']; // Example
    if (!in_array($project_details['status'], $open_statuses)) {
        send_json_response(403, ['error' => 'This project is not currently accepting applications (status: ' . $project_details['status'] . ').']);
    }
    $stmt_proj_check->close();

    // Check for duplicate active applications by the same freelancer for the same project
    $stmt_dup_check = $conn->prepare(
        "SELECT id FROM applications
         WHERE project_id = ? AND freelancer_id = ? AND (status = 'pending' OR status = 'accepted')"
    );
    if (!$stmt_dup_check) {
        send_json_response(500, ['error' => 'Server error preparing duplicate application check.']);
    }
    $stmt_dup_check->bind_param("ii", $project_id, $freelancer_id);
    if (!$stmt_dup_check->execute()) {
        send_json_response(500, ['error' => 'Server error executing duplicate application check.']);
    }
    if ($stmt_dup_check->get_result()->num_rows > 0) {
        send_json_response(409, ['error' => 'You have already submitted an application or have an accepted one for this project.']);
    }
    $stmt_dup_check->close();

    // Insert new application (status defaults to 'pending' as per schema)
    $stmt_insert_app = $conn->prepare(
        "INSERT INTO applications (project_id, freelancer_id, proposal_text, bid_amount)
         VALUES (?, ?, ?, ?)"
    );
    if (!$stmt_insert_app) {
        send_json_response(500, ['error' => 'Server error preparing application submission. ' . $conn->error]);
    }
    // Note: bid_amount is 'd' for decimal/double if it's required to be a number.
    // If bid_amount can be null, and your table allows nulls, the binding still works with null.
    $stmt_insert_app->bind_param("iisd", $project_id, $freelancer_id, $proposal_text, $bid_amount);

    if ($stmt_insert_app->execute()) {
        $new_application_id = $stmt_insert_app->insert_id;
        send_json_response(201, [
            'message' => 'Application submitted successfully.',
            'application_id' => $new_application_id
        ]);
    } else {
        send_json_response(500, ['error' => 'Failed to submit application. ' . $stmt_insert_app->error]);
    }
    $stmt_insert_app->close();

} // END NEW: Freelancer Submits an Application

// NEW: Get Applications Submitted by Authenticated Freelancer
elseif ($action === 'get_freelancer_applications' && $method === 'GET') {
    $authenticated_user = require_authentication($conn);
    $freelancer_id = (int)$authenticated_user['id'];

    if ($authenticated_user['role'] !== 'freelancer') {
        send_json_response(403, ['error' => 'Forbidden: Only freelancers can view their submitted applications.']);
    }

    $sql = "SELECT
                a.id AS application_id, a.project_id, a.proposal_text,
                a.bid_amount, a.status AS application_status,
                a.applied_at, a.updated_at AS application_updated_at,
                p.title AS project_title,
                p.status AS project_status,
                p.client_id AS project_client_id
                -- Optionally, join with users table again if client username is needed
                -- u_client.username AS client_username
            FROM applications a
            JOIN projects p ON a.project_id = p.id
            -- JOIN users u_client ON p.client_id = u_client.id -- If client username needed
            WHERE a.freelancer_id = ?
            ORDER BY a.applied_at DESC";

    $stmt = $conn->prepare($sql);
    if ($stmt === false) {
        send_json_response(500, ['error' => 'Failed to prepare statement for fetching freelancer applications: ' . $conn->error]);
    }
    $stmt->bind_param("i", $freelancer_id);

    if (!$stmt->execute()) {
        send_json_response(500, ['error' => 'Failed to execute statement for fetching freelancer applications: ' . $stmt->error]);
    }

    $result = $stmt->get_result();
    $applications_data = [];
    while ($row = $result->fetch_assoc()) {
        // Convert bid_amount to float if it's not null
        if ($row['bid_amount'] !== null) {
            $row['bid_amount'] = (float)$row['bid_amount'];
        }
        $applications_data[] = $row;
    }
    $stmt->close();

    send_json_response(200, $applications_data);

} // END NEW: Get Applications Submitted by Authenticated Freelancer

// NEW: Get Projects Assigned to Authenticated Freelancer
elseif ($action === 'get_freelancer_assigned_projects' && $method === 'GET') {
    $authenticated_user = require_authentication($conn);
    $freelancer_id = (int)$authenticated_user['id'];

    if ($authenticated_user['role'] !== 'freelancer') {
        send_json_response(403, ['error' => 'Forbidden: Only freelancers can view their assigned projects.']);
    }

    // Define statuses that indicate a project is "assigned" or "active" for a freelancer
    $active_project_statuses = ['in_progress', 'assigned', 'active']; // Customize as needed
    // Create placeholders for IN clause
    $status_placeholders = implode(',', array_fill(0, count($active_project_statuses), '?'));

    $sql = "SELECT
                p.id, p.title, p.description, p.client_id, p.freelancer_id,
                p.status, p.created_at, p.updated_at,
                u_client.username AS client_username
            FROM projects p
            JOIN users u_client ON p.client_id = u_client.id
            WHERE p.freelancer_id = ?
            AND p.status IN (" . $status_placeholders . ")
            ORDER BY p.updated_at DESC";
            // Note: Using IN clause with multiple params requires careful binding.
            // $types will be 'i' followed by 's' for each status.

    $stmt = $conn->prepare($sql);
    if ($stmt === false) {
        send_json_response(500, ['error' => 'Failed to prepare statement for assigned projects: ' . $conn->error]);
    }

    // Construct types string and params array for bind_param
    $bind_types = 'i' . str_repeat('s', count($active_project_statuses));
    $bind_params = array_merge([$freelancer_id], $active_project_statuses);

    $stmt->bind_param($bind_types, ...$bind_params);

    if (!$stmt->execute()) {
        send_json_response(500, ['error' => 'Failed to execute statement for assigned projects: ' . $stmt->error]);
    }

    $result = $stmt->get_result();
    $assigned_projects = [];
    while ($row = $result->fetch_assoc()) {
        // Ensure numeric fields are correctly typed
        $row['id'] = (int)$row['id'];
        $row['client_id'] = (int)$row['client_id'];
        $row['freelancer_id'] = (int)$row['freelancer_id'];
        $assigned_projects[] = $row;
    }
    $stmt->close();

    send_json_response(200, $assigned_projects);

} // END NEW: Get Projects Assigned to Authenticated Freelancer

// NEW: Freelancer Withdraws an Application
elseif ($action === 'withdraw_application' && ($method === 'POST' || $method === 'PUT')) { // PUT or POST can be suitable
    $authenticated_user = require_authentication($conn);
    $freelancer_id = (int)$authenticated_user['id'];

    if ($authenticated_user['role'] !== 'freelancer') {
        send_json_response(403, ['error' => 'Forbidden: Only freelancers can withdraw their applications.']);
    }

    // Get application_id, e.g., from query param or payload
    $application_id = null;
    if ($method === 'PUT' || $method === 'POST') { // Assuming it might come in payload for PUT/POST
        $data = json_decode(file_get_contents('php://input'), true);
        $application_id = isset($data['application_id']) ? (int)$data['application_id'] : null;
    }
    // Fallback or primary way: check GET param if not in payload (or if method was GET, though less common for state changes)
    if ($application_id === null && isset($_GET['application_id'])) {
         $application_id = (int)$_GET['application_id'];
    }

    if (!$application_id) {
        send_json_response(400, ['error' => 'Application ID is required.']);
    }

    // Verify application ownership and current status
    $stmt_check_app = $conn->prepare(
        "SELECT freelancer_id, status FROM applications WHERE id = ?"
    );
    if (!$stmt_check_app) {
        send_json_response(500, ['error' => 'Server error preparing application check. ' . $conn->error]);
    }
    $stmt_check_app->bind_param("i", $application_id);
    if (!$stmt_check_app->execute()) {
        send_json_response(500, ['error' => 'Server error executing application check. ' . $stmt_check_app->error]);
    }
    $result_app_check = $stmt_check_app->get_result();
    if ($result_app_check->num_rows === 0) {
        send_json_response(404, ['error' => 'Application not found.']);
    }
    $app_data = $result_app_check->fetch_assoc();
    $stmt_check_app->close();

    if ((int)$app_data['freelancer_id'] !== $freelancer_id) {
        send_json_response(403, ['error' => 'Forbidden: You do not own this application.']);
    }

    if ($app_data['status'] !== 'pending') {
        send_json_response(400, ['error' => 'Application cannot be withdrawn as its status is currently: ' . $app_data['status'] . '. Only pending applications can be withdrawn.']);
    }

    // Update application status to 'withdrawn_by_freelancer'
    $new_status = 'withdrawn_by_freelancer';
    $stmt_update_app = $conn->prepare("UPDATE applications SET status = ?, updated_at = NOW() WHERE id = ?");
    if (!$stmt_update_app) {
        send_json_response(500, ['error' => 'Server error preparing application withdrawal. ' . $conn->error]);
    }
    $stmt_update_app->bind_param("si", $new_status, $application_id);

    if ($stmt_update_app->execute()) {
        if ($stmt_update_app->affected_rows > 0) {
            send_json_response(200, ['message' => 'Application withdrawn successfully.']);
        } else {
            // Should not happen if previous checks passed and status was 'pending'
            send_json_response(400, ['message' => 'Application status was not changed (already withdrawn or an issue occurred).']);
        }
    } else {
        send_json_response(500, ['error' => 'Failed to withdraw application. ' . $stmt_update_app->error]);
    }
    $stmt_update_app->close();

} // END NEW: Freelancer Withdraws an Application

// NEW: Create Job Card
elseif ($action === 'create_job_card' && $method === 'POST') {
    $authenticated_user = require_authentication($conn);
    $user_id = (int)$authenticated_user['id'];
    $user_role = $authenticated_user['role'];

    $data = json_decode(file_get_contents('php://input'), true);
    $project_id = isset($data['project_id']) ? (int)$data['project_id'] : null;
    $title = $data['title'] ?? null;
    $description = $data['description'] ?? null;
    $status = $data['status'] ?? 'todo'; // Default status
    $assigned_freelancer_id = isset($data['assigned_freelancer_id']) && !empty($data['assigned_freelancer_id']) ? (int)$data['assigned_freelancer_id'] : null;
    $estimated_hours = isset($data['estimated_hours']) && $data['estimated_hours'] !== '' ? (float)$data['estimated_hours'] : null;

    if (!$project_id || empty($title)) {
        send_json_response(400, ['error' => 'Project ID and title are required for a job card.']);
    }

    // Validate status value if provided
    $valid_statuses = ['todo', 'in_progress', 'pending_review', 'completed'];
    if (!in_array($status, $valid_statuses)) {
        send_json_response(400, ['error' => 'Invalid status value. Valid statuses: ' . implode(', ', $valid_statuses)]);
    }

    // Check project existence and ownership for clients
    $stmt_proj_check = $conn->prepare("SELECT client_id FROM projects WHERE id = ?");
    if (!$stmt_proj_check) { send_json_response(500, ['error' => 'Server error preparing project check.']); }
    $stmt_proj_check->bind_param("i", $project_id);
    if (!$stmt_proj_check->execute()) { send_json_response(500, ['error' => 'Server error executing project check.']); }
    $result_proj_check = $stmt_proj_check->get_result();
    if ($result_proj_check->num_rows === 0) {
        send_json_response(404, ['error' => 'Project not found.']);
    }
    $project_data = $result_proj_check->fetch_assoc();
    $project_client_id = (int)$project_data['client_id'];
    $stmt_proj_check->close();

    // Authorization check: Admin or owning client
    if ($user_role !== 'admin' && ($user_role !== 'client' || $project_client_id !== $user_id)) {
        send_json_response(403, ['error' => 'Forbidden: You do not have permission to add job cards to this project.']);
    }

    // Optional: Validate assigned_freelancer_id if provided (check if user exists and is a freelancer)
    if ($assigned_freelancer_id !== null) {
        $stmt_freelancer_check = $conn->prepare("SELECT role FROM users WHERE id = ?");
        if (!$stmt_freelancer_check) { send_json_response(500, ['error' => 'Server error preparing freelancer check.']); }
        $stmt_freelancer_check->bind_param("i", $assigned_freelancer_id);
        if (!$stmt_freelancer_check->execute()) { send_json_response(500, ['error' => 'Server error executing freelancer check.']); }
        $result_freelancer_check = $stmt_freelancer_check->get_result();
        if ($result_freelancer_check->num_rows === 0) {
            send_json_response(404, ['error' => 'Assigned freelancer not found.']);
        }
        $freelancer_data = $result_freelancer_check->fetch_assoc();
        if ($freelancer_data['role'] !== 'freelancer') {
            send_json_response(400, ['error' => 'Assigned user is not a freelancer.']);
        }
        $stmt_freelancer_check->close();
    }


    // Insert new job card
    $sql = "INSERT INTO job_cards (project_id, title, description, status, assigned_freelancer_id, estimated_hours)
            VALUES (?, ?, ?, ?, ?, ?)";
    $stmt_insert_jc = $conn->prepare($sql);
    if (!$stmt_insert_jc) {
        send_json_response(500, ['error' => 'Server error preparing job card creation. ' . $conn->error]);
    }
    // Types: i (project_id), s (title), s (description), s (status), i (assigned_freelancer_id), d (estimated_hours)
    $stmt_insert_jc->bind_param("isssid", $project_id, $title, $description, $status, $assigned_freelancer_id, $estimated_hours);

    if ($stmt_insert_jc->execute()) {
        $new_job_card_id = $stmt_insert_jc->insert_id;
        send_json_response(201, [
            'message' => 'Job card created successfully.',
            'job_card_id' => $new_job_card_id
        ]);
    } else {
        send_json_response(500, ['error' => 'Failed to create job card. ' . $stmt_insert_jc->error]);
    }
    $stmt_insert_jc->close();

} // END NEW: Create Job Card

// NEW: Get Job Cards for a Project
elseif ($action === 'get_project_job_cards' && $method === 'GET') {
    $authenticated_user = require_authentication($conn);
    $user_id = (int)$authenticated_user['id'];
    $user_role = $authenticated_user['role'];

    $project_id = isset($_GET['project_id']) ? (int)$_GET['project_id'] : null;

    if (!$project_id) {
        send_json_response(400, ['error' => 'Project ID is required to fetch job cards.']);
    }

    // Check project existence and get its client_id and assigned_freelancer_id for authorization
    $stmt_proj_check = $conn->prepare("SELECT client_id, freelancer_id AS project_assigned_freelancer_id FROM projects WHERE id = ?");
    if (!$stmt_proj_check) { send_json_response(500, ['error' => 'Server error preparing project details check.']); }
    $stmt_proj_check->bind_param("i", $project_id);
    if (!$stmt_proj_check->execute()) { send_json_response(500, ['error' => 'Server error executing project details check.']); }
    $result_proj_check = $stmt_proj_check->get_result();
    if ($result_proj_check->num_rows === 0) {
        send_json_response(404, ['error' => 'Project not found.']);
    }
    $project_details = $result_proj_check->fetch_assoc();
    $project_client_id = (int)$project_details['client_id'];
    $project_assigned_freelancer_id = $project_details['project_assigned_freelancer_id'] ? (int)$project_details['project_assigned_freelancer_id'] : null;
    $stmt_proj_check->close();

    // Authorization check:
    // Admin: always allowed
    // Client: allowed if they own the project
    // Freelancer: allowed if they are assigned to the project (via projects.freelancer_id)
    $is_authorized = false;
    if ($user_role === 'admin') {
        $is_authorized = true;
    } elseif ($user_role === 'client' && $project_client_id === $user_id) {
        $is_authorized = true;
    } elseif ($user_role === 'freelancer' && $project_assigned_freelancer_id === $user_id) {
        $is_authorized = true;
    }

    if (!$is_authorized) {
        send_json_response(403, ['error' => 'Forbidden: You do not have permission to view job cards for this project.']);
    }

    // Fetch job cards, joining with users table for assigned freelancer's username
    $sql = "SELECT
                jc.id, jc.project_id, jc.title, jc.description, jc.status,
                jc.assigned_freelancer_id, jc.estimated_hours,
                jc.created_at, jc.updated_at,
                u.username AS assigned_freelancer_username
            FROM job_cards jc
            LEFT JOIN users u ON jc.assigned_freelancer_id = u.id
            WHERE jc.project_id = ?
            ORDER BY jc.created_at ASC"; // Or by another field like a sequence number if added

    $stmt_jc = $conn->prepare($sql);
    if ($stmt_jc === false) {
        send_json_response(500, ['error' => 'Failed to prepare statement for fetching job cards: ' . $conn->error]);
    }
    $stmt_jc->bind_param("i", $project_id);

    if (!$stmt_jc->execute()) {
        send_json_response(500, ['error' => 'Failed to execute statement for fetching job cards: ' . $stmt_jc->error]);
    }

    $result_jc = $stmt_jc->get_result();
    $job_cards_list = [];
    while ($row = $result_jc->fetch_assoc()) {
        // Ensure numeric fields are correctly typed
        if ($row['estimated_hours'] !== null) {
            $row['estimated_hours'] = (float)$row['estimated_hours'];
        }
        if ($row['assigned_freelancer_id'] !== null) {
            $row['assigned_freelancer_id'] = (int)$row['assigned_freelancer_id'];
        }
        $job_cards_list[] = $row;
    }
    $stmt_jc->close();

    send_json_response(200, $job_cards_list);

} // END NEW: Get Job Cards for a Project

// NEW: Update Job Card
elseif ($action === 'update_job_card' && ($method === 'PUT' || $method === 'POST')) {
    $authenticated_user = require_authentication($conn);
    $user_id = (int)$authenticated_user['id'];
    $user_role = $authenticated_user['role'];

    $job_card_id = isset($_GET['job_card_id']) ? (int)$_GET['job_card_id'] : null;
    if (!$job_card_id) {
        // Try to get from payload if not in GET params, for flexibility
        if (($method === 'PUT' || $method === 'POST')) {
            $data_check = json_decode(file_get_contents('php://input'), true);
            if (isset($data_check['job_card_id'])) {
                $job_card_id = (int)$data_check['job_card_id'];
            }
        }
        if (!$job_card_id) { // Check again
            send_json_response(400, ['error' => 'Job Card ID is required for update (in URL query or payload).']);
        }
    }

    $data = json_decode(file_get_contents('php://input'), true);
    if (empty($data)) {
        send_json_response(400, ['error' => 'No data provided for update or invalid JSON.']);
    }

    // Fetch job card details including project client and project assigned freelancer
    $stmt_jc_check = $conn->prepare(
        "SELECT jc.project_id, jc.assigned_freelancer_id AS job_card_assignee,
                p.client_id AS project_client_id,
                p.freelancer_id AS project_main_freelancer_id
         FROM job_cards jc
         JOIN projects p ON jc.project_id = p.id
         WHERE jc.id = ?"
    );
    if (!$stmt_jc_check) { send_json_response(500, ['error' => 'Server error preparing job card details check.']); }
    $stmt_jc_check->bind_param("i", $job_card_id);
    if (!$stmt_jc_check->execute()) { send_json_response(500, ['error' => 'Server error executing job card details check.']); }
    $result_jc_check = $stmt_jc_check->get_result();
    if ($result_jc_check->num_rows === 0) {
        send_json_response(404, ['error' => 'Job Card not found.']);
    }
    $jc_details = $result_jc_check->fetch_assoc();
    $project_client_id = (int)$jc_details['project_client_id'];
    $job_card_assignee_id = $jc_details['job_card_assignee'] ? (int)$jc_details['job_card_assignee'] : null;
    $project_main_freelancer_id = $jc_details['project_main_freelancer_id'] ? (int)$jc_details['project_main_freelancer_id'] : null;
    $stmt_jc_check->close();

    // Authorization
    $can_edit_fully = false;
    $can_edit_status_only = false;

    if ($user_role === 'admin') {
        $can_edit_fully = true;
    } elseif ($user_role === 'client' && $project_client_id === $user_id) {
        $can_edit_fully = true;
    } elseif ($user_role === 'freelancer') {
        if ($job_card_assignee_id === $user_id) {
            $can_edit_fully = true;
        } elseif ($project_main_freelancer_id === $user_id) {
             if (isset($data['status']) && count($data) === 1) {
                $can_edit_status_only = true;
             } elseif (isset($data['status'])) {
                 $can_edit_status_only = true;
             }
        }
    }

    if (!$can_edit_fully && !$can_edit_status_only) {
        send_json_response(403, ['error' => 'Forbidden: You do not have permission to update this job card or specified fields.']);
    }

    if ($can_edit_status_only && !$can_edit_fully) {
        foreach ($data as $key => $value) {
            if ($key !== 'status') {
                send_json_response(403, ['error' => 'Forbidden: You only have permission to update the status of this job card.']);
            }
        }
    }

    $fields_to_update = [];
    $params = [];
    $types = "";

    if ($can_edit_fully) { // Only allow these fields if full edit permission
        if (isset($data['title'])) {
            $fields_to_update[] = "title = ?"; $params[] = $data['title']; $types .= "s";
        }
        if (isset($data['description'])) { // description can be set to empty string, so use array_key_exists if "" should be treated as null
            $fields_to_update[] = "description = ?"; $params[] = $data['description']; $types .= "s";
        }
        if (array_key_exists('assigned_freelancer_id', $data)) {
            $assigned_freelancer_id_update = $data['assigned_freelancer_id'] === null ? null : (int)$data['assigned_freelancer_id'];
            if ($assigned_freelancer_id_update !== null) {
                $stmt_f_check = $conn->prepare("SELECT role FROM users WHERE id = ?");
                if (!$stmt_f_check) { send_json_response(500, ['error' => 'Server error preparing freelancer validation.']);}
                $stmt_f_check->bind_param("i", $assigned_freelancer_id_update);
                if (!$stmt_f_check->execute()) { send_json_response(500, ['error' => 'Server error executing freelancer validation.']);}
                $res_f_check = $stmt_f_check->get_result();
                if ($res_f_check->num_rows === 0) { send_json_response(404, ['error' => 'New assigned freelancer not found.']); }
                if ($res_f_check->fetch_assoc()['role'] !== 'freelancer') { send_json_response(400, ['error' => 'New assigned user is not a freelancer.']);}
                $stmt_f_check->close();
            }
            $fields_to_update[] = "assigned_freelancer_id = ?"; $params[] = $assigned_freelancer_id_update; $types .= "i";
        }
        if (array_key_exists('estimated_hours', $data)) {
            $estimated_hours_update = $data['estimated_hours'] === null || $data['estimated_hours'] === '' ? null : (float)$data['estimated_hours'];
            if ($estimated_hours_update !== null && $estimated_hours_update < 0) {
                 send_json_response(400, ['error' => 'Estimated hours cannot be negative.']);
            }
            $fields_to_update[] = "estimated_hours = ?"; $params[] = $estimated_hours_update; $types .= "d";
        }
    }

    if (isset($data['status'])) { // Status can always be updated if $can_edit_status_only or $can_edit_fully
        $valid_statuses = ['todo', 'in_progress', 'pending_review', 'completed'];
        if (!in_array($data['status'], $valid_statuses)) {
            send_json_response(400, ['error' => 'Invalid status value. Valid statuses: ' . implode(", ", $valid_statuses)]);
        }
        $fields_to_update[] = "status = ?"; $params[] = $data['status']; $types .= "s";
    }

    if (empty($fields_to_update)) {
         send_json_response(400, ['error' => 'No valid fields provided for update or no permission to update specified fields.']);
    }

    $fields_to_update[] = "updated_at = NOW()";

    $sql = "UPDATE job_cards SET " . implode(", ", $fields_to_update) . " WHERE id = ?";
    $params[] = $job_card_id;
    $types .= "i";

    $stmt_update = $conn->prepare($sql);
    if ($stmt_update === false) {
        send_json_response(500, ['error' => 'Failed to prepare job card update statement: ' . $conn->error]);
    }
    $stmt_update->bind_param($types, ...$params);

    if ($stmt_update->execute()) {
        if ($stmt_update->affected_rows > 0) {
            send_json_response(200, ['message' => 'Job card updated successfully.']);
        } else {
            $stmt_exists_check = $conn->prepare("SELECT id FROM job_cards WHERE id = ?");
            $stmt_exists_check->bind_param("i", $job_card_id);
            $stmt_exists_check->execute();
            if ($stmt_exists_check->get_result()->num_rows === 0) {
                send_json_response(404, ['error' => 'Job Card not found (possibly deleted during update attempt).']);
            } else {
                send_json_response(200, ['message' => 'Job card data was the same; no changes made.']);
            }
            $stmt_exists_check->close();
        }
    } else {
        send_json_response(500, ['error' => 'Failed to update job card: ' . $stmt_update->error]);
    }
    $stmt_update->close();

} // END NEW: Update Job Card

// NEW: Delete Job Card
elseif ($action === 'delete_job_card' && ($method === 'DELETE' || $method === 'POST')) { // Allow POST for simplicity if DELETE is tricky for some clients
    $authenticated_user = require_authentication($conn);
    $user_id = (int)$authenticated_user['id'];
    $user_role = $authenticated_user['role'];

    $job_card_id = null;
    if ($method === 'DELETE') {
        $job_card_id = isset($_GET['job_card_id']) ? (int)$_GET['job_card_id'] : null;
    } elseif ($method === 'POST') { // Allow job_card_id in POST body as well
        $data = json_decode(file_get_contents('php://input'), true);
        $job_card_id = isset($data['job_card_id']) ? (int)$data['job_card_id'] : (isset($_GET['job_card_id']) ? (int)$_GET['job_card_id'] : null);
    }

    if (!$job_card_id) {
        send_json_response(400, ['error' => 'Job Card ID is required for deletion.']);
    }

    // Fetch job card's project's client_id for authorization
    $stmt_jc_owner_check = $conn->prepare(
        "SELECT p.client_id AS project_client_id
         FROM job_cards jc
         JOIN projects p ON jc.project_id = p.id
         WHERE jc.id = ?"
    );
    if (!$stmt_jc_owner_check) { send_json_response(500, ['error' => 'Server error preparing job card ownership check.']); }
    $stmt_jc_owner_check->bind_param("i", $job_card_id);
    if (!$stmt_jc_owner_check->execute()) { send_json_response(500, ['error' => 'Server error executing job card ownership check.']); }
    $result_jc_owner_check = $stmt_jc_owner_check->get_result();
    if ($result_jc_owner_check->num_rows === 0) {
        send_json_response(404, ['error' => 'Job Card not found.']);
    }
    $jc_owner_details = $result_jc_owner_check->fetch_assoc();
    $project_client_id = (int)$jc_owner_details['project_client_id'];
    $stmt_jc_owner_check->close();

    // Authorization check
    if (!($user_role === 'admin' || ($user_role === 'client' && $project_client_id === $user_id))) {
        send_json_response(403, ['error' => 'Forbidden: You do not have permission to delete this job card.']);
    }

    // Proceed with delete logic
    $stmt_delete = $conn->prepare("DELETE FROM job_cards WHERE id = ?");
    if ($stmt_delete === false) {
        send_json_response(500, ['error' => 'Failed to prepare delete statement for job card: ' . $conn->error]);
    }
    $stmt_delete->bind_param("i", $job_card_id);

    if ($stmt_delete->execute()) {
        if ($stmt_delete->affected_rows > 0) {
            send_json_response(200, ['message' => 'Job card deleted successfully.']);
        } else {
            // This case implies the job card was not found, though the check above should catch it.
            send_json_response(404, ['message' => 'Job card not found or already deleted.']);
        }
    } else {
        send_json_response(500, ['error' => 'Failed to delete job card: ' . $stmt_delete->error]);
    }
    $stmt_delete->close();

} // END NEW: Delete Job Card

// NEW: Log Time for a Job Card
elseif ($action === 'log_time' && $method === 'POST') {
    $authenticated_user = require_authentication($conn);
    $user_id_logging_time = (int)$authenticated_user['id'];
    $user_role = $authenticated_user['role'];

    $data = json_decode(file_get_contents('php://input'), true);
    $job_card_id = isset($data['job_card_id']) ? (int)$data['job_card_id'] : null;
    $start_time_str = $data['start_time'] ?? null;
    $end_time_str = $data['end_time'] ?? null;
    $notes = $data['notes'] ?? null;

    if (!$job_card_id || empty($start_time_str) || empty($end_time_str)) {
        send_json_response(400, ['error' => 'Job Card ID, start time, and end time are required.']);
    }

    // Validate and parse timestamps
    try {
        $start_time_ts = new DateTime($start_time_str);
        $end_time_ts = new DateTime($end_time_str);
    } catch (Exception $e) {
        send_json_response(400, ['error' => 'Invalid start or end time format. Please use ISO8601 format (e.g., YYYY-MM-DDTHH:MM:SSZ).']);
    }

    if ($start_time_ts >= $end_time_ts) {
        send_json_response(400, ['error' => 'Start time must be before end time.']);
    }

    // Calculate duration in minutes
    $duration_minutes = ($end_time_ts->getTimestamp() - $start_time_ts->getTimestamp()) / 60;
    if ($duration_minutes <= 0) { // Should be caught by above, but as safety
        send_json_response(400, ['error' => 'Duration must be positive. Ensure end time is after start time.']);
    }


    // Authorization: Check if user is allowed to log time for this job card
    $stmt_auth_jc = $conn->prepare(
        "SELECT jc.assigned_freelancer_id AS job_card_assignee,
                p.client_id AS project_client_id,
                p.freelancer_id AS project_main_freelancer_id,
                jc_proj.status AS project_status
         FROM job_cards jc
         JOIN projects p ON jc.project_id = p.id
         JOIN projects jc_proj ON jc.project_id = jc_proj.id
         WHERE jc.id = ?"
    );
    if (!$stmt_auth_jc) { send_json_response(500, ['error' => 'Server error preparing time log authorization check. ' . $conn->error]); }
    $stmt_auth_jc->bind_param("i", $job_card_id);
    if (!$stmt_auth_jc->execute()) { send_json_response(500, ['error' => 'Server error executing time log authorization check. ' . $stmt_auth_jc->error]); }
    $result_auth_jc = $stmt_auth_jc->get_result();
    if ($result_auth_jc->num_rows === 0) {
        send_json_response(404, ['error' => 'Job Card not found.']);
    }
    $jc_auth_details = $result_auth_jc->fetch_assoc();
    $project_client_id = (int)$jc_auth_details['project_client_id'];
    $job_card_assignee_id = $jc_auth_details['job_card_assignee'] ? (int)$jc_auth_details['job_card_assignee'] : null;
    $project_main_freelancer_id = $jc_auth_details['project_main_freelancer_id'] ? (int)$jc_auth_details['project_main_freelancer_id'] : null;
    $project_status = $jc_auth_details['project_status'];
    $stmt_auth_jc->close();

    // Project must be in progress to log time
    if ($project_status !== 'in_progress' && $project_status !== 'assigned' && $project_status !== 'active') { // 'active' if used
        send_json_response(403, ['error' => "Time cannot be logged for this job card as the project status is '{$project_status}'. Project must be active."]);
    }

    $is_authorized_to_log = false;
    if ($user_role === 'admin') {
        $is_authorized_to_log = true;
    } elseif ($user_role === 'client' && $project_client_id === $user_id_logging_time) {
        // Clients typically don't log time this way, but could be for record keeping if feature exists.
        // For now, let's restrict clients from logging time directly unless specific requirements arise.
        // send_json_response(403, ['error' => 'Clients cannot directly log time for job cards.']);
        // OR, allow it: $is_authorized_to_log = true; (Let's assume not for now)
    } elseif ($user_role === 'freelancer') {
        if ($job_card_assignee_id === $user_id_logging_time || $project_main_freelancer_id === $user_id_logging_time) {
            $is_authorized_to_log = true;
        }
    }

    if (!$is_authorized_to_log) {
        send_json_response(403, ['error' => 'Forbidden: You do not have permission to log time for this job card.']);
    }

    // Insert new time log
    $sql_insert_log = "INSERT INTO time_logs (job_card_id, user_id, start_time, end_time, duration_minutes, notes)
                       VALUES (?, ?, ?, ?, ?, ?)";
    $stmt_insert_log = $conn->prepare($sql_insert_log);
    if (!$stmt_insert_log) {
        send_json_response(500, ['error' => 'Server error preparing time log creation. ' . $conn->error]);
    }

    $formatted_start_time = $start_time_ts->format('Y-m-d H:i:s');
    $formatted_end_time = $end_time_ts->format('Y-m-d H:i:s');

    $stmt_insert_log->bind_param("iissis",
        $job_card_id,
        $user_id_logging_time,
        $formatted_start_time,
        $formatted_end_time,
        $duration_minutes,
        $notes
    );

    if ($stmt_insert_log->execute()) {
        $new_time_log_id = $stmt_insert_log->insert_id;
        send_json_response(201, [
            'message' => 'Time logged successfully.',
            'time_log_id' => $new_time_log_id,
            'duration_minutes' => $duration_minutes
        ]);
    } else {
        send_json_response(500, ['error' => 'Failed to log time. ' . $stmt_insert_log->error]);
    }
    $stmt_insert_log->close();

} // END NEW: Log Time for a Job Card

// NEW: Get All Time Logs for a Specific Project
elseif ($action === 'get_project_time_logs' && $method === 'GET') {
    $authenticated_user = require_authentication($conn);
    $user_id_requesting = (int)$authenticated_user['id'];
    $user_role = $authenticated_user['role'];

    $project_id = isset($_GET['project_id']) ? (int)$_GET['project_id'] : null;

    if (!$project_id) {
        send_json_response(400, ['error' => 'Project ID is required to fetch all project time logs.']);
    }

    // Authorization: Check if user is allowed to view all time logs for this project
    $stmt_auth_proj_logs = $conn->prepare("SELECT client_id FROM projects WHERE id = ?");
    if (!$stmt_auth_proj_logs) { send_json_response(500, ['error' => 'Server error preparing project ownership check for logs.']); }
    $stmt_auth_proj_logs->bind_param("i", $project_id);
    if (!$stmt_auth_proj_logs->execute()) { send_json_response(500, ['error' => 'Server error executing project ownership check for logs.']); }
    $result_auth_proj_logs = $stmt_auth_proj_logs->get_result();
    if ($result_auth_proj_logs->num_rows === 0) {
        send_json_response(404, ['error' => 'Project not found.']);
    }
    $project_auth_details = $result_auth_proj_logs->fetch_assoc();
    $project_client_id = (int)$project_auth_details['client_id'];
    $stmt_auth_proj_logs->close();

    $is_authorized_to_view_project_logs = false;
    if ($user_role === 'admin') {
        $is_authorized_to_view_project_logs = true;
    } elseif ($user_role === 'client' && $project_client_id === $user_id_requesting) {
        $is_authorized_to_view_project_logs = true;
    }
    // Freelancers are generally not authorized to see *all* project logs via this endpoint.

    if (!$is_authorized_to_view_project_logs) {
        send_json_response(403, ['error' => 'Forbidden: You do not have permission to view all time logs for this project.']);
    }

    // Fetch all time logs for the project
    $sql_get_all_logs = "SELECT
                            tl.id, tl.job_card_id, tl.user_id,
                            tl.start_time, tl.end_time, tl.duration_minutes, tl.notes,
                            tl.created_at, tl.updated_at,
                            u.username AS logger_username,
                            jc.title AS job_card_title
                         FROM time_logs tl
                         JOIN users u ON tl.user_id = u.id
                         JOIN job_cards jc ON tl.job_card_id = jc.id
                         WHERE jc.project_id = ?
                         ORDER BY tl.start_time DESC";

    $stmt_get_all_logs = $conn->prepare($sql_get_all_logs);
    if ($stmt_get_all_logs === false) {
        send_json_response(500, ['error' => 'Failed to prepare statement for fetching project time logs: ' . $conn->error]);
    }
    $stmt_get_all_logs->bind_param("i", $project_id);

    if (!$stmt_get_all_logs->execute()) {
        send_json_response(500, ['error' => 'Failed to execute statement for fetching project time logs: ' . $stmt_get_all_logs->error]);
    }

    $result_all_logs = $stmt_get_all_logs->get_result();
    $project_time_logs_list = [];
    while ($row = $result_all_logs->fetch_assoc()) {
        $row['duration_minutes'] = (int)$row['duration_minutes'];
        $project_time_logs_list[] = $row;
    }
    $stmt_get_all_logs->close();

    send_json_response(200, $project_time_logs_list);

} // END NEW: Get All Time Logs for a Specific Project

// NEW: Update a Specific Time Log
elseif ($action === 'update_time_log' && ($method === 'PUT' || $method === 'POST')) {
    $authenticated_user = require_authentication($conn);
    $user_id_requesting = (int)$authenticated_user['id'];
    $user_role = $authenticated_user['role'];

    $time_log_id = isset($_GET['time_log_id']) ? (int)$_GET['time_log_id'] : null;
    if (!$time_log_id) {
        send_json_response(400, ['error' => 'Time Log ID is required for update.']);
    }

    $data = json_decode(file_get_contents('php://input'), true);
    if (empty($data)) {
        send_json_response(400, ['error' => 'No data provided for update or invalid JSON.']);
    }

    // Fetch original time log to check ownership and get existing values
    $stmt_fetch_log = $conn->prepare("SELECT user_id, start_time, end_time FROM time_logs WHERE id = ?");
    if (!$stmt_fetch_log) { send_json_response(500, ['error' => 'Server error preparing original log fetch.']); }
    $stmt_fetch_log->bind_param("i", $time_log_id);
    if (!$stmt_fetch_log->execute()) { send_json_response(500, ['error' => 'Server error executing original log fetch.']); }
    $result_fetch_log = $stmt_fetch_log->get_result();
    if ($result_fetch_log->num_rows === 0) {
        send_json_response(404, ['error' => 'Time Log not found.']);
    }
    $original_log_data = $result_fetch_log->fetch_assoc();
    $log_owner_id = (int)$original_log_data['user_id'];
    $stmt_fetch_log->close();

    // Authorization check
    if (!($user_role === 'admin' || $log_owner_id === $user_id_requesting)) {
        send_json_response(403, ['error' => 'Forbidden: You do not have permission to update this time log.']);
    }

    // Determine new start and end times
    $new_start_time_str = $data['start_time'] ?? $original_log_data['start_time'];
    $new_end_time_str = $data['end_time'] ?? $original_log_data['end_time'];

    try {
        $new_start_time_ts = new DateTime($new_start_time_str);
        $new_end_time_ts = new DateTime($new_end_time_str);
    } catch (Exception $e) {
        send_json_response(400, ['error' => 'Invalid new start or end time format. Please use ISO8601.']);
    }

    if ($new_start_time_ts >= $new_end_time_ts) {
        send_json_response(400, ['error' => 'Start time must be before end time.']);
    }
    $new_duration_minutes = ($new_end_time_ts->getTimestamp() - $new_start_time_ts->getTimestamp()) / 60;
    if ($new_duration_minutes <= 0) {
        send_json_response(400, ['error' => 'Calculated duration must be positive.']);
    }

    $formatted_new_start_time = $new_start_time_ts->format('Y-m-d H:i:s');
    $formatted_new_end_time = $new_end_time_ts->format('Y-m-d H:i:s');

    // Build the SQL query dynamically for fields other than times/duration
    $fields_to_update = [];
    $params = [];
    $types = "";

    // Always update times and duration as they are derived or taken from original
    $fields_to_update[] = "start_time = ?"; $params[] = $formatted_new_start_time; $types .= "s";
    $fields_to_update[] = "end_time = ?"; $params[] = $formatted_new_end_time; $types .= "s";
    $fields_to_update[] = "duration_minutes = ?"; $params[] = $new_duration_minutes; $types .= "i";

    if (array_key_exists('notes', $data)) { // Allow setting notes to null or empty string
        $fields_to_update[] = "notes = ?"; $params[] = $data['notes']; $types .= "s";
    }

    if (count($fields_to_update) === 3 && !array_key_exists('notes', $data)) {
        // Only time fields were present, but maybe notes was intended to be cleared but not sent
        // Or, if only notes is sent, time fields are based on original log.
        // This logic means if only notes is sent, times/duration are not re-saved unless they were also sent.
        // For simplicity, if any of start_time, end_time, or notes is in $data, we update.
        // If $data only had notes, then $new_start_time_str and $new_end_time_str would be original values.
        // If $data was empty, it's caught earlier.
        // If $data had only start_time, end_time would be original, and duration calculated.
    }

    $fields_to_update[] = "updated_at = NOW()";

    $sql_update_log = "UPDATE time_logs SET " . implode(", ", $fields_to_update) . " WHERE id = ?";
    $params[] = $time_log_id;
    $types .= "i";

    $stmt_update_log = $conn->prepare($sql_update_log);
    if ($stmt_update_log === false) {
        send_json_response(500, ['error' => 'Failed to prepare time log update statement: ' . $conn->error]);
    }
    $stmt_update_log->bind_param($types, ...$params);

    if ($stmt_update_log->execute()) {
        if ($stmt_update_log->affected_rows > 0) {
            send_json_response(200, ['message' => 'Time log updated successfully.']);
        } else {
            send_json_response(200, ['message' => 'Time log data was the same or log not found; no changes made.']);
        }
    } else {
        send_json_response(500, ['error' => 'Failed to update time log: ' . $stmt_update_log->error]);
    }
    $stmt_update_log->close();

} // END NEW: Update a Specific Time Log

// NEW: Delete a Specific Time Log
elseif ($action === 'delete_time_log' && ($method === 'DELETE' || $method === 'POST')) {
    $authenticated_user = require_authentication($conn);
    $user_id_requesting = (int)$authenticated_user['id'];
    $user_role = $authenticated_user['role'];

    $time_log_id = null;
    if ($method === 'DELETE') {
        $time_log_id = isset($_GET['time_log_id']) ? (int)$_GET['time_log_id'] : null;
    } elseif ($method === 'POST') {
        $data = json_decode(file_get_contents('php://input'), true);
        $time_log_id = isset($data['time_log_id']) ? (int)$data['time_log_id'] : (isset($_GET['time_log_id']) ? (int)$_GET['time_log_id'] : null);
    }

    if (!$time_log_id) {
        send_json_response(400, ['error' => 'Time Log ID is required for deletion.']);
    }

    // Fetch original time log to check ownership
    $stmt_fetch_log_owner = $conn->prepare("SELECT user_id FROM time_logs WHERE id = ?");
    if (!$stmt_fetch_log_owner) { send_json_response(500, ['error' => 'Server error preparing log ownership check.']); }
    $stmt_fetch_log_owner->bind_param("i", $time_log_id);
    if (!$stmt_fetch_log_owner->execute()) { send_json_response(500, ['error' => 'Server error executing log ownership check.']); }
    $result_fetch_log_owner = $stmt_fetch_log_owner->get_result();
    if ($result_fetch_log_owner->num_rows === 0) {
        send_json_response(404, ['error' => 'Time Log not found.']);
    }
    $log_owner_data = $result_fetch_log_owner->fetch_assoc();
    $log_owner_id = (int)$log_owner_data['user_id'];
    $stmt_fetch_log_owner->close();

    // Authorization check
    if (!($user_role === 'admin' || $log_owner_id === $user_id_requesting)) {
        send_json_response(403, ['error' => 'Forbidden: You do not have permission to delete this time log.']);
    }

    // Proceed with delete logic
    $stmt_delete_log = $conn->prepare("DELETE FROM time_logs WHERE id = ?");
    if ($stmt_delete_log === false) {
        send_json_response(500, ['error' => 'Failed to prepare delete statement for time log: ' . $conn->error]);
    }
    $stmt_delete_log->bind_param("i", $time_log_id);

    if ($stmt_delete_log->execute()) {
        if ($stmt_delete_log->affected_rows > 0) {
            send_json_response(200, ['message' => 'Time log deleted successfully.']);
        } else {
            // This case implies the log was not found, though the check above should catch it.
            send_json_response(404, ['message' => 'Time log not found or already deleted.']);
        }
    } else {
        send_json_response(500, ['error' => 'Failed to delete time log: ' . $stmt_delete_log->error]);
    }
    $stmt_delete_log->close();

} // END NEW: Delete a Specific Time Log

// NEW: Find or Create 1-on-1 Conversation
elseif ($action === 'find_or_create_conversation' && $method === 'POST') {
    $authenticated_user = require_authentication($conn);
    $current_user_id = (int)$authenticated_user['id'];

    $data = json_decode(file_get_contents('php://input'), true);
    $recipient_user_id = isset($data['recipient_user_id']) ? (int)$data['recipient_user_id'] : null;

    if (!$recipient_user_id) {
        send_json_response(400, ['error' => 'Recipient user ID is required.']);
    }

    if ($recipient_user_id === $current_user_id) {
        send_json_response(400, ['error' => 'Cannot create a conversation with yourself.']);
    }

    // Check if recipient user exists
    $stmt_user_check = $conn->prepare("SELECT id FROM users WHERE id = ?");
    if (!$stmt_user_check) { send_json_response(500, ['error' => 'Server error preparing recipient check.']); }
    $stmt_user_check->bind_param("i", $recipient_user_id);
    if (!$stmt_user_check->execute()) { send_json_response(500, ['error' => 'Server error executing recipient check.']); }
    if ($stmt_user_check->get_result()->num_rows === 0) {
        send_json_response(404, ['error' => 'Recipient user not found.']);
    }
    $stmt_user_check->close();

    // Check for existing 1-on-1 conversation
    // This query finds conversations involving BOTH users, and only those two users.
    $sql_find_convo = "SELECT cp1.conversation_id
                       FROM conversation_participants cp1
                       JOIN conversation_participants cp2 ON cp1.conversation_id = cp2.conversation_id
                       WHERE cp1.user_id = ? AND cp2.user_id = ?
                       AND (SELECT COUNT(*) FROM conversation_participants cp_count WHERE cp_count.conversation_id = cp1.conversation_id) = 2";

    $stmt_find = $conn->prepare($sql_find_convo);
    if (!$stmt_find) { send_json_response(500, ['error' => 'Server error preparing conversation search. ' . $conn->error]); }
    // Bind params carefully for the two user IDs
    // The query above does not rely on order, but it's good practice if creating canonical pairs.
    // For this specific query, the order in WHERE doesn't matter as much as ensuring both users are present.
    $stmt_find->bind_param("ii", $current_user_id, $recipient_user_id);


    if (!$stmt_find->execute()) { send_json_response(500, ['error' => 'Server error executing conversation search. ' . $stmt_find->error]); }
    $result_find = $stmt_find->get_result();

    if ($existing_convo = $result_find->fetch_assoc()) {
        $stmt_find->close();
        send_json_response(200, ['conversation_id' => (int)$existing_convo['conversation_id'], 'existed' => true]);
    } else {
        $stmt_find->close();
        // No existing 1-on-1 conversation found, create a new one
        $conn->begin_transaction();
        try {
            // 1. Create conversation
            // last_message_at can be set to NOW() or remain NULL initially
            $stmt_create_convo = $conn->prepare("INSERT INTO conversations (last_message_at) VALUES (NOW())");
            if (!$stmt_create_convo) { throw new Exception('Failed to prepare conversation creation. ' . $conn->error); }
            if (!$stmt_create_convo->execute()) { throw new Exception('Failed to execute conversation creation. ' . $stmt_create_convo->error); }
            $new_conversation_id = $conn->insert_id;
            $stmt_create_convo->close();

            if (!$new_conversation_id) { throw new Exception('Failed to get new conversation ID.'); }

            // 2. Add participants
            $stmt_add_participant = $conn->prepare("INSERT INTO conversation_participants (conversation_id, user_id) VALUES (?, ?)");
            if (!$stmt_add_participant) { throw new Exception('Failed to prepare participant insertion. ' . $conn->error); }

            // Add current user
            $stmt_add_participant->bind_param("ii", $new_conversation_id, $current_user_id);
            if (!$stmt_add_participant->execute()) { throw new Exception('Failed to add current user to conversation. ' . $stmt_add_participant->error); }

            // Add recipient user
            $stmt_add_participant->bind_param("ii", $new_conversation_id, $recipient_user_id);
            if (!$stmt_add_participant->execute()) { throw new Exception('Failed to add recipient user to conversation. ' . $stmt_add_participant->error); }
            $stmt_add_participant->close();

            $conn->commit();
            send_json_response(201, ['conversation_id' => $new_conversation_id, 'existed' => false]);

        } catch (Exception $e) {
            $conn->rollback();
            send_json_response(500, ['error' => 'Failed to create conversation: ' . $e->getMessage()]);
        }
    }
} // END NEW: Find or Create 1-on-1 Conversation

// NEW: Get Messages for a Conversation
elseif ($action === 'get_conversation_messages' && $method === 'GET') {
    $authenticated_user = require_authentication($conn);
    $current_user_id = (int)$authenticated_user['id'];

    $conversation_id = isset($_GET['conversation_id']) ? (int)$_GET['conversation_id'] : null;
    if (!$conversation_id) {
        send_json_response(400, ['error' => 'Conversation ID is required.']);
    }

    // Authorize: Check if current user is part of this conversation
    $stmt_auth_convo = $conn->prepare(
        "SELECT COUNT(*) AS is_participant
         FROM conversation_participants
         WHERE conversation_id = ? AND user_id = ?"
    );
    if (!$stmt_auth_convo) { send_json_response(500, ['error' => 'Server error preparing conversation participation check.']); }
    $stmt_auth_convo->bind_param("ii", $conversation_id, $current_user_id);
    if (!$stmt_auth_convo->execute()) { send_json_response(500, ['error' => 'Server error executing conversation participation check.']); }
    $result_auth_convo = $stmt_auth_convo->get_result()->fetch_assoc();
    $stmt_auth_convo->close();

    if ((int)$result_auth_convo['is_participant'] === 0) {
        send_json_response(403, ['error' => 'Forbidden: You are not a participant in this conversation.']);
    }

    // Pagination parameters
    $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 50;
    $before_message_id = isset($_GET['before_message_id']) ? (int)$_GET['before_message_id'] : null;
    $offset = isset($_GET['offset']) ? (int)$_GET['offset'] : 0; // Alternative: offset based pagination

    $sql_messages = "SELECT
                        m.id AS message_id, m.conversation_id, m.sender_id, m.content,
                        m.created_at, m.read_at,
                        u.username AS sender_username
                     FROM messages m
                     JOIN users u ON m.sender_id = u.id
                     WHERE m.conversation_id = ?";

    $params = [$conversation_id];
    $types = "i";

    if ($before_message_id) {
        // Assumes IDs are auto-incrementing and somewhat time-ordered for this simple pagination
        // A more robust cursor pagination would use created_at + id
        $sql_messages .= " AND m.id < ?";
        $params[] = $before_message_id;
        $types .= "i";
    }

    $sql_messages .= " ORDER BY m.created_at DESC, m.id DESC"; // Get newest first
    $sql_messages .= " LIMIT ?";
    $params[] = $limit;
    $types .= "i";

    // If using offset pagination instead of cursor (before_message_id):
    // $sql_messages .= " LIMIT ? OFFSET ?";
    // $params[] = $limit; $params[] = $offset; $types .= "ii";


    $stmt_messages = $conn->prepare($sql_messages);
    if (!$stmt_messages) {
        send_json_response(500, ['error' => 'Server error preparing message fetch: ' . $conn->error]);
    }
    $stmt_messages->bind_param($types, ...$params);

    if (!$stmt_messages->execute()) {
        send_json_response(500, ['error' => 'Server error executing message fetch: ' . $stmt_messages->error]);
    }
    $result_messages = $stmt_messages->get_result();

    $messages_list = [];
    while ($row = $result_messages->fetch_assoc()) {
        $messages_list[] = [
            'id' => (int)$row['message_id'], // message_id aliased as id for frontend typically
            'conversation_id' => (int)$row['conversation_id'],
            'sender_id' => (int)$row['sender_id'],
            'sender_username' => $row['sender_username'],
            'content' => $row['content'],
            'created_at' => $row['created_at'], // ISO8601 format from DB
            'read_at' => $row['read_at'] // ISO8601 format from DB or null
        ];
    }
    $stmt_messages->close();

    // Messages are fetched newest first, client might want to reverse for display
    send_json_response(200, array_reverse($messages_list)); // Reverse to get oldest of the batch first for typical chat UI

} // END NEW: Get Messages for a Conversation
// --- Projects API ---
elseif ($action === 'get_projects' && $method === 'GET') { // Note the change to elseif
    $status_filter = isset($_GET['status']) ? $_GET['status'] : 'open'; // Default to 'open'

    $sql = "SELECT id, title, description, client_id, freelancer_id, status, created_at, updated_at FROM projects";
    $params = [];
    $types = "";

    if ($status_filter) {
        // Allow fetching all if status is explicitly set to 'all' or empty, otherwise filter
        if ($status_filter !== 'all' && $status_filter !== '') {
             $sql .= " WHERE status = ?";
             $params[] = $status_filter;
             $types .= "s";
        } else if ($status_filter === '') { // If status param is empty string, default to 'open'
            $sql .= " WHERE status = ?";
            $params[] = 'open';
            $types .= "s";
        }
        // If 'all', no WHERE clause for status is added
    }
    // If no status filter is provided at all (e.g. $_GET['status'] is not set), it defaults to 'open' due to initial assignment.

    $sql .= " ORDER BY created_at DESC";

    $stmt = $conn->prepare($sql);

    if ($stmt === false) {
        send_json_response(500, ['error' => 'Failed to prepare statement for projects: ' . $conn->error]);
    }

    if (!empty($types)) { // Bind parameters only if they exist
        $stmt->bind_param($types, ...$params);
    }

    if (!$stmt->execute()) {
        send_json_response(500, ['error' => 'Failed to execute statement for projects: ' . $stmt->error]);
    }

    $result = $stmt->get_result();
    $projects = [];
    while ($row = $result->fetch_assoc()) {
        // Ensure numeric fields are correctly typed if necessary (e.g., client_id, freelancer_id)
        if (isset($row['client_id'])) $row['client_id'] = (int)$row['client_id'];
        if (isset($row['freelancer_id'])) $row['freelancer_id'] = $row['freelancer_id'] === null ? null : (int)$row['freelancer_id'];
        $projects[] = $row;
    }
    $stmt->close();

    send_json_response(200, $projects);
} elseif ($action === 'create_project' && $method === 'POST') {
    $authenticated_user = require_authentication($conn); // 1. Require Authentication

    // 3. Role Check
    if ($authenticated_user['role'] !== 'client' && $authenticated_user['role'] !== 'admin') {
        send_json_response(403, ['error' => 'Forbidden: Only clients or admins can create projects.']);
    }

    $data = json_decode(file_get_contents('php://input'), true);

    // Validation: title and description are required from input
    if (empty($data['title']) || empty($data['description'])) {
        send_json_response(400, ['error' => 'Missing required fields: title, description.']);
    }

    $title = $data['title'];
    $description = $data['description'];
    // 2. Auto-set client_id from authenticated user
    $client_id = (int)$authenticated_user['id'];

    $freelancer_id = isset($data['freelancer_id']) ? (int)$data['freelancer_id'] : null;
    // If freelancer_id is an empty string or other non-null but "empty" value from JSON, convert to null.
    if ($freelancer_id === 0 && !empty($data['freelancer_id'])) { // Check if it was explicitly 0 vs. not set
        // allow 0 if it's a valid ID, otherwise, if it was an empty string that became 0, treat as null
    } else if (empty($data['freelancer_id'])) {
        $freelancer_id = null;
    }

    $status = isset($data['status']) ? $data['status'] : 'open'; // Default status

    $stmt = $conn->prepare("INSERT INTO projects (title, description, client_id, freelancer_id, status) VALUES (?, ?, ?, ?, ?)");
    if ($stmt === false) {
        send_json_response(500, ['error' => 'Failed to prepare statement: ' . $conn->error]);
    }

    // Bind parameters: ssiis (string, string, integer, integer, string)
    $stmt->bind_param("ssiis", $title, $description, $client_id, $freelancer_id, $status);

    if ($stmt->execute()) {
        $new_project_id = $stmt->insert_id;
        send_json_response(201, ['message' => 'Project created successfully.', 'project_id' => $new_project_id, 'client_id' => $client_id]);
    } else {
        send_json_response(500, ['error' => 'Failed to create project: ' . $stmt->error]);
    }
    $stmt->close();
} elseif ($action === 'update_project' && $method === 'PUT') {
    $authenticated_user = require_authentication($conn); // 1. Require Authentication
    $user_id = (int)$authenticated_user['id'];
    $user_role = $authenticated_user['role'];

    $project_id = isset($_GET['id']) ? (int)$_GET['id'] : null;
    if (!$project_id) {
        send_json_response(400, ['error' => 'Project ID is required for update.']);
    }

    // 2. Authorize User: Fetch project's client_id first
    $stmt_check_owner = $conn->prepare("SELECT client_id FROM projects WHERE id = ?");
    if ($stmt_check_owner === false) {
        send_json_response(500, ['error' => 'Server error: Failed to prepare ownership check. ' . $conn->error]);
    }
    $stmt_check_owner->bind_param("i", $project_id);
    if (!$stmt_check_owner->execute()) {
        send_json_response(500, ['error' => 'Server error: Failed to execute ownership check. ' . $stmt_check_owner->error]);
    }
    $result_owner_check = $stmt_check_owner->get_result();
    if ($result_owner_check->num_rows === 0) {
        send_json_response(404, ['error' => 'Project not found.']);
    }
    $project_data = $result_owner_check->fetch_assoc();
    $project_client_id = (int)$project_data['client_id'];
    $stmt_check_owner->close();

    // Authorization check
    if ($user_role !== 'admin' && $project_client_id !== $user_id) {
        send_json_response(403, ['error' => 'Forbidden: You do not have permission to update this project.']);
    }

    // Proceed with update logic
    $data = json_decode(file_get_contents('php://input'), true);

    if (empty($data)) { // Check if $data is null or empty after json_decode
        send_json_response(400, ['error' => 'Invalid JSON or no data provided for update.']);
    }

    $fields_to_update = [];
    $params = [];
    $types = "";

    if (isset($data['title'])) {
        $fields_to_update[] = "title = ?";
        $params[] = $data['title'];
        $types .= "s";
    }
    if (isset($data['description'])) {
        $fields_to_update[] = "description = ?";
        $params[] = $data['description'];
        $types .= "s";
    }
    // Ensure freelancer_id is handled correctly (can be set to null)
    if (array_key_exists('freelancer_id', $data)) { // Use array_key_exists to allow setting to null
        $fields_to_update[] = "freelancer_id = ?";
        $params[] = $data['freelancer_id'] === null ? null : (int)$data['freelancer_id'];
        $types .= "i";
    }
    if (isset($data['status'])) {
        $fields_to_update[] = "status = ?";
        $params[] = $data['status'];
        $types .= "s";
    }

    if (empty($fields_to_update)) {
         send_json_response(400, ['error' => 'No valid fields provided for update.']);
    }

    // Add updated_at timestamp
    $fields_to_update[] = "updated_at = NOW()";

    $sql = "UPDATE projects SET " . implode(", ", $fields_to_update) . " WHERE id = ?";
    $params[] = $project_id;
    $types .= "i";

    $stmt = $conn->prepare($sql);
    if ($stmt === false) {
        send_json_response(500, ['error' => 'Failed to prepare update statement: ' . $conn->error]);
    }

    // Note: number of elements in $types must match number of elements in $params
    $stmt->bind_param($types, ...$params);

    if ($stmt->execute()) {
        if ($stmt->affected_rows > 0) {
            send_json_response(200, ['message' => 'Project updated successfully.']);
        } else {
            // Could be project not found OR data submitted was same as existing data
             $stmt_check_again = $conn->prepare("SELECT id FROM projects WHERE id = ?");
             $stmt_check_again->bind_param("i", $project_id);
             $stmt_check_again->execute();
             if ($stmt_check_again->get_result()->num_rows === 0) {
                 send_json_response(404, ['message' => 'Project not found.']);
             } else {
                 send_json_response(200, ['message' => 'Project data was the same; no changes made.']);
             }
             $stmt_check_again->close();
        }
    } else {
        send_json_response(500, ['error' => 'Failed to update project: ' . $stmt->error]);
    }
    $stmt->close();
} elseif ($action === 'delete_project' && $method === 'DELETE') {
    $authenticated_user = require_authentication($conn); // 1. Require Authentication
    $user_id = (int)$authenticated_user['id'];
    $user_role = $authenticated_user['role'];

    $project_id = isset($_GET['id']) ? (int)$_GET['id'] : null;
    if (!$project_id) {
        send_json_response(400, ['error' => 'Project ID is required for deletion.']);
    }

    // 2. Authorize User: Fetch project's client_id first
    $stmt_check_owner = $conn->prepare("SELECT client_id FROM projects WHERE id = ?");
    if ($stmt_check_owner === false) {
        send_json_response(500, ['error' => 'Server error: Failed to prepare ownership check for delete. ' . $conn->error]);
    }
    $stmt_check_owner->bind_param("i", $project_id);
    if (!$stmt_check_owner->execute()) {
        send_json_response(500, ['error' => 'Server error: Failed to execute ownership check for delete. ' . $stmt_check_owner->error]);
    }
    $result_owner_check = $stmt_check_owner->get_result();
    if ($result_owner_check->num_rows === 0) {
        send_json_response(404, ['error' => 'Project not found, cannot delete.']);
    }
    $project_data = $result_owner_check->fetch_assoc();
    $project_client_id = (int)$project_data['client_id'];
    $stmt_check_owner->close();

    // Authorization check
    if ($user_role !== 'admin' && $project_client_id !== $user_id) {
        send_json_response(403, ['error' => 'Forbidden: You do not have permission to delete this project.']);
    }

    // Proceed with delete logic
    // TODO: Consider what happens to related data (e.g., applications, job cards) when a project is deleted.
    // For now, it's a direct delete. Future enhancements might involve soft deletes or cascading deletes/archiving.

    $stmt = $conn->prepare("DELETE FROM projects WHERE id = ?");
    if ($stmt === false) {
        send_json_response(500, ['error' => 'Failed to prepare delete statement: ' . $conn->error]);
    }

    $stmt->bind_param("i", $project_id);

    if ($stmt->execute()) {
        if ($stmt->affected_rows > 0) {
            send_json_response(200, ['message' => 'Project deleted successfully.']);
        } else {
            // This case should ideally not be reached if the ownership check found the project.
            // If it is, it means the project was deleted between the check and this operation.
            send_json_response(404, ['message' => 'Project not found or already deleted.']);
        }
    } else {
        send_json_response(500, ['error' => 'Failed to delete project: ' . $stmt->error]);
    }
    $stmt->close();
} else {
    // No action or invalid action/method combination
    send_json_response(404, ['error' => 'API endpoint not found or invalid request.']);
}

// Close the database connection
$conn->close();
?>
