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

// --- NEW: Notification Helper Function ---
function create_admin_notification($conn, $message_key, $related_entity_type = null, $related_entity_id = null) {
    $stmt_get_admins = $conn->prepare("SELECT id FROM users WHERE role = 'admin' AND is_active = 1");
    if (!$stmt_get_admins) {
        error_log("Error preparing to get admins for notification: " . $conn->error);
        return false;
    }
    if (!$stmt_get_admins->execute()) {
        error_log("Error executing get admins for notification: " . $stmt_get_admins->error);
        $stmt_get_admins->close();
        return false;
    }
    $admin_results = $stmt_get_admins->get_result();
    $admin_ids = [];
    while ($admin_row = $admin_results->fetch_assoc()) {
        $admin_ids[] = (int)$admin_row['id'];
    }
    $stmt_get_admins->close();

    if (empty($admin_ids)) {
        error_log("No active admins found to send notification: " . $message_key);
        return false; // No admins to notify
    }

    $sql_insert_notification = "INSERT INTO notifications (user_id, message_key, related_entity_type, related_entity_id, is_read, created_at)
                                  VALUES (?, ?, ?, ?, 0, NOW())";
    $stmt_insert_notification = $conn->prepare($sql_insert_notification);
    if (!$stmt_insert_notification) {
        error_log("Error preparing notification insert: " . $conn->error);
        return false;
    }

    $success_count = 0;
    foreach ($admin_ids as $admin_id) {
        // Bind params: i (user_id), s (message_key), s (related_entity_type), i (related_entity_id)
        if ($related_entity_type === null && $related_entity_id === null) {
             // This case might occur if we only have a message key without related entities.
             // Prepare a version of bind_param that only includes user_id and message_key.
             // However, the table schema for related_entity_type and related_entity_id allows NULL.
             // So, we can always bind them as null.
            $stmt_insert_notification->bind_param("issi", $admin_id, $message_key, $related_entity_type, $related_entity_id);
        } else {
             $stmt_insert_notification->bind_param("issi", $admin_id, $message_key, $related_entity_type, $related_entity_id);
        }

        if ($stmt_insert_notification->execute()) {
            $success_count++;
        } else {
            error_log("Failed to insert notification for admin_id {$admin_id} with message_key '{$message_key}': " . $stmt_insert_notification->error);
        }
    }
    $stmt_insert_notification->close();
    return $success_count > 0;
}
// --- END NEW Notification Helper Function ---

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
        $new_user_id_for_notification = $stmt->insert_id; // Get new user ID
        send_json_response(201, ['message' => 'User registered successfully.']);
        // Create notification for admins
        create_admin_notification($conn, 'new_user_registered', 'user', $new_user_id_for_notification);
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

// NEW: Get My Profile Details (Authenticated User)
elseif ($action === 'get_my_profile_details' && $method === 'GET') {
    $authenticated_user = require_authentication($conn);
    $user_id = (int)$authenticated_user['id'];

    // Fetch full user details from users table
    $sql_user = "SELECT id, username, email, role, name, phone_number, company, experience, hourly_rate, avatar_url, is_active, created_at, updated_at
                 FROM users
                 WHERE id = ?";
    $stmt_user = $conn->prepare($sql_user);
    if ($stmt_user === false) {
        error_log("Prepare failed (get_my_profile_details - user): " . $conn->error);
        send_json_response(500, ['error' => 'Failed to prepare statement for user details.']);
    }
    $stmt_user->bind_param("i", $user_id);
    if (!$stmt_user->execute()) {
        error_log("Execute failed (get_my_profile_details - user): " . $stmt_user->error);
        send_json_response(500, ['error' => 'Failed to execute statement for user details.']);
    }
    $result_user = $stmt_user->get_result();
    $user_details = $result_user->fetch_assoc();
    $stmt_user->close();

    if (!$user_details) {
        send_json_response(404, ['error' => 'User profile not found.']); // Should not happen if authenticated
    }

    // Cast numeric types and boolean
    if (isset($user_details['hourly_rate'])) {
        $user_details['hourly_rate'] = $user_details['hourly_rate'] === null ? null : (float)$user_details['hourly_rate'];
    }
    $user_details['is_active'] = (bool)$user_details['is_active'];
    $user_details['id'] = (int)$user_details['id'];


    // Fetch user's skills
    $user_details['skills'] = [];
    $sql_skills = "SELECT s.id, s.name
                   FROM user_skills us
                   JOIN skills s ON us.skill_id = s.id
                   WHERE us.user_id = ?
                   ORDER BY s.name ASC";
    $stmt_skills = $conn->prepare($sql_skills);
    if ($stmt_skills) {
        $stmt_skills->bind_param("i", $user_id);
        if ($stmt_skills->execute()) {
            $result_skills = $stmt_skills->get_result();
            while ($skill_row = $result_skills->fetch_assoc()) {
                $user_details['skills'][] = [
                    'id' => (int)$skill_row['id'],
                    'name' => $skill_row['name']
                ];
            }
        } else {
            error_log("Execute failed (get_my_profile_details - skills): " . $stmt_skills->error);
            // Non-critical, proceed without skills if this fails
        }
        $stmt_skills->close();
    } else {
        error_log("Prepare failed (get_my_profile_details - skills): " . $conn->error);
    }

    send_json_response(200, $user_details);

} // END NEW: Get My Profile Details

// NEW: Update My Profile (Authenticated User)
elseif ($action === 'update_my_profile' && ($method === 'POST' || $method === 'PUT')) {
    $authenticated_user = require_authentication($conn);
    $user_id = (int)$authenticated_user['id'];
    $user_role = $authenticated_user['role'];

    $data = json_decode(file_get_contents('php://input'), true);
    if (empty($data) && !isset($data['skill_ids'])) { // Allow skill_ids to be an empty array for removing all skills
        send_json_response(400, ['error' => 'No update data provided or invalid JSON.']);
    }

    $fields_to_update_sql = [];
    $params_for_bind = [];
    $param_types = "";

    // Updatable string fields
    foreach (['name', 'phone_number', 'company', 'avatar_url'] as $field) {
        if (array_key_exists($field, $data)) {
            $fields_to_update_sql[] = "$field = ?"; $params_for_bind[] = $data[$field]; $param_types .= "s";
        }
    }
    // Updatable text field
    if (array_key_exists('experience', $data)) {
        $fields_to_update_sql[] = "experience = ?"; $params_for_bind[] = $data['experience']; $param_types .= "s";
    }

    // Hourly rate (only for freelancers)
    if (array_key_exists('hourly_rate', $data)) {
        if ($user_role === 'freelancer') {
            $hourlyRate = $data['hourly_rate'] === null || $data['hourly_rate'] === '' ? null : (float)$data['hourly_rate'];
            if ($hourlyRate !== null && $hourlyRate < 0) {
                send_json_response(400, ['error'=>'Hourly rate cannot be negative.']);
            }
            $fields_to_update_sql[] = "hourly_rate = ?"; $params_for_bind[] = $hourlyRate; $param_types .= "d";
        } else {
            // Non-freelancers trying to set hourly_rate - ignore or send error. Let's ignore for now.
            // send_json_response(400, ['error'=>'Hourly rate can only be set by freelancers.']);
        }
    }

    $conn->begin_transaction();
    try {
        $user_table_updated = false;
        if (!empty($fields_to_update_sql)) {
            $fields_to_update_sql[] = "updated_at = NOW()"; // Always update this timestamp

            $sql_update_user = "UPDATE users SET " . implode(", ", $fields_to_update_sql) . " WHERE id = ?";
            $current_params_for_user = $params_for_bind; // Use a copy for user table update
            $current_params_for_user[] = $user_id;
            $current_types_for_user = $param_types . "i";

            $stmt_update_user = $conn->prepare($sql_update_user);
            if ($stmt_update_user === false) {
                throw new Exception('Failed to prepare user profile update statement: ' . $conn->error);
            }
            if (strlen($current_types_for_user) !== count($current_params_for_user)){
                 throw new Exception('Param count mismatch for users table update. Types: '.$current_types_for_user.' Params: '.count($current_params_for_user));
            }
            $stmt_update_user->bind_param($current_types_for_user, ...$current_params_for_user);

            if (!$stmt_update_user->execute()) {
                throw new Exception('Failed to update user profile: ' . $stmt_update_user->error);
            }
            if($stmt_update_user->affected_rows > 0) $user_table_updated = true;
            $stmt_update_user->close();
        }

        $skills_updated = false;
        if (isset($data['skill_ids']) && is_array($data['skill_ids'])) {
            $skill_ids = array_map('intval', $data['skill_ids']);

            // Delete existing skills for this user
            $stmt_delete_skills = $conn->prepare("DELETE FROM user_skills WHERE user_id = ?");
            if (!$stmt_delete_skills) { throw new Exception('Failed to prepare deleting user skills: ' . $conn->error); }
            $stmt_delete_skills->bind_param("i", $user_id);
            if (!$stmt_delete_skills->execute()) { throw new Exception('Failed to delete user skills: ' . $stmt_delete_skills->error); }
            // We consider skills updated if the key 'skill_ids' is present, even if it's empty or same as before.
            // More precise check would involve comparing old and new skill sets.
            $skills_updated = true; // Mark as attempt to update skills
            $stmt_delete_skills->close();

            if (!empty($skill_ids)) {
                // Validate skill IDs
                $placeholders = implode(',', array_fill(0, count($skill_ids), '?'));
                $stmt_check_skills = $conn->prepare("SELECT id FROM skills WHERE id IN ($placeholders)");
                if (!$stmt_check_skills) { throw new Exception('Failed to prepare skill ID validation: ' . $conn->error); }
                $types_skills = str_repeat('i', count($skill_ids));
                $stmt_check_skills->bind_param($types_skills, ...$skill_ids);
                if (!$stmt_check_skills->execute()) { throw new Exception('Failed to execute skill ID validation: ' . $stmt_check_skills->error); }
                $valid_skill_result = $stmt_check_skills->get_result();
                if ($valid_skill_result->num_rows !== count($skill_ids)) {
                    throw new Exception('One or more provided skill IDs are invalid.');
                }
                $stmt_check_skills->close();

                // Insert new skills
                $sql_insert_skill = "INSERT INTO user_skills (user_id, skill_id) VALUES (?, ?)";
                $stmt_insert_skill = $conn->prepare($sql_insert_skill);
                if (!$stmt_insert_skill) { throw new Exception('Failed to prepare adding user skill: ' . $conn->error); }
                foreach ($skill_ids as $skill_id) {
                    $stmt_insert_skill->bind_param("ii", $user_id, $skill_id);
                    if (!$stmt_insert_skill->execute()) {
                        // Check for duplicate entry error specifically (MySQL error code 1062)
                        if ($conn->errno === 1062) {
                            // Potentially ignore duplicate skill if desired, or log it
                            // For now, let it be part of a general failure for this skill
                        }
                        throw new Exception('Failed to add skill ID ' . $skill_id . ': ' . $stmt_insert_skill->error);
                    }
                }
                $stmt_insert_skill->close();
            }
        }

        if (!$user_table_updated && !$skills_updated) {
             // This means skill_ids key was not present AND no other user fields were updated.
             // If skill_ids was present but empty (to remove all skills), $skills_updated would be true.
            $conn->rollback(); // Nothing to commit
            send_json_response(200, ['message' => 'No profile data provided or no changes made.']);
        } else {
            $conn->commit();
            send_json_response(200, ['message' => 'Profile updated successfully.']);
        }

    } catch (Exception $e) {
        $conn->rollback();
        // Check for specific error types if needed, e.g., duplicate entry for skills if not handled above
        if (strpos($e->getMessage(), 'invalid') !== false || strpos($e->getMessage(), 'cannot be negative') !== false ) {
             send_json_response(400, ['error' => $e->getMessage()]);
        } else {
             send_json_response(500, ['error' => 'Failed to update profile: ' . $e->getMessage()]);
        }
    }
} // END NEW: Update My Profile

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

// NEW: Admin - Create User
elseif ($action === 'admin_create_user' && $method === 'POST') {
    $authenticated_user = require_authentication($conn);
    if ($authenticated_user['role'] !== 'admin') {
        send_json_response(403, ['error' => 'Forbidden: Only admins can create users.']);
    }

    $data = json_decode(file_get_contents('php://input'), true);

    // Required fields
    $username = $data['username'] ?? null;
    $email = $data['email'] ?? null;
    $password = $data['password'] ?? null;
    $role = $data['role'] ?? null;

    // Optional fields from User type (subset for creation)
    $name = $data['name'] ?? $username; // Default name to username if not provided
    $phoneNumber = $data['phoneNumber'] ?? null;
    $company = $data['company'] ?? null;
    $experience = $data['experience'] ?? null; // Bio/Experience
    $hourlyRate = null;
    $avatarUrl = $data['avatarUrl'] ?? null;
    // skills field not handled here, will be part of user_skills table later

    if (empty($username) || empty($email) || empty($password) || empty($role)) {
        send_json_response(400, ['error' => 'Username, email, password, and role are required.']);
    }
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        send_json_response(400, ['error' => 'Invalid email format.']);
    }
    if (strlen($password) < 8) { // Basic password complexity
        send_json_response(400, ['error' => 'Password must be at least 8 characters long.']);
    }
    $allowed_roles = ['freelancer', 'client', 'admin'];
    if (!in_array($role, $allowed_roles)) {
        send_json_response(400, ['error' => 'Invalid role specified. Valid roles: ' . implode(', ', $allowed_roles)]);
    }

    if ($role === 'freelancer') {
        $hourlyRate = isset($data['hourlyRate']) && is_numeric($data['hourlyRate']) ? (float)$data['hourlyRate'] : null;
    }

    // Check for uniqueness of username and email
    $stmt_check_unique = $conn->prepare("SELECT id FROM users WHERE username = ? OR email = ?");
    if (!$stmt_check_unique) { send_json_response(500, ['error' => 'DB Error preparing uniqueness check.']);}
    $stmt_check_unique->bind_param("ss", $username, $email);
    $stmt_check_unique->execute();
    if ($stmt_check_unique->get_result()->num_rows > 0) {
        send_json_response(409, ['error' => 'Username or email already exists.']);
    }
    $stmt_check_unique->close();

    $hashed_password = password_hash($password, PASSWORD_BCRYPT);

    // For now, profile fields like name, phoneNumber, company, experience, hourlyRate, avatarUrl
    // are not directly in the `users` table based on original schema.
    // These would ideally be in a separate `user_profiles` table or users table expanded.
    // Assuming `users` table was expanded or these are ignored if not present.
    // Let's add them to the INSERT statement if they were added to `users` table schema.
    // If not, this part needs adjustment based on actual table structure.
    // For this subtask, let's assume users table has: name, phoneNumber, company, experience, hourly_rate, avatar_url
    // (and these fields were added to user table schema comment in db_connect.php previously).
    // If not, the INSERT query should only include username, email, password, role.

    // For simplicity, this example assumes users table was expanded with:
    // name VARCHAR(255) NULL, phone_number VARCHAR(50) NULL, company VARCHAR(255) NULL,
    // experience TEXT NULL, hourly_rate DECIMAL(10,2) NULL, avatar_url VARCHAR(2048) NULL
    // And these need to be added to db_connect.php comments for users table.
    // (This schema update is outside this subtask's direct instructions but implied by wanting full user edits)

    $sql_insert_user = "INSERT INTO users (username, email, password, role, name, phone_number, company, experience, hourly_rate, avatar_url, created_at, updated_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())";
    $stmt_insert = $conn->prepare($sql_insert_user);
    if ($stmt_insert === false) {
        send_json_response(500, ['error' => 'Server error: Could not prepare statement for user creation. ' . $conn->error]);
    }
    // Types: s (username), s (email), s (password), s (role), s (name), s (phoneNumber), s (company), s (experience), d (hourlyRate), s (avatarUrl)
    $stmt_insert->bind_param("ssssssssds",
        $username, $email, $hashed_password, $role,
        $name, $phoneNumber, $company, $experience, $hourlyRate, $avatarUrl
    );

    if ($stmt_insert->execute()) {
        $new_user_id = $stmt_insert->insert_id;
        send_json_response(201, [
            'message' => 'User created successfully.',
            'user_id' => $new_user_id
        ]);
    } else {
        send_json_response(500, ['error' => 'Server error: Could not create user. ' . $stmt_insert->error]);
    }
    $stmt_insert->close();

} // END NEW: Admin - Create User

// NEW: Admin - Get Specific User Details
elseif ($action === 'admin_get_user_details' && $method === 'GET') {
    $authenticated_user = require_authentication($conn);
    if ($authenticated_user['role'] !== 'admin') {
        send_json_response(403, ['error' => 'Forbidden: Only admins can view detailed user profiles.']);
    }

    $user_id_to_fetch = isset($_GET['user_id']) ? (int)$_GET['user_id'] : null;

    if (!$user_id_to_fetch) {
        send_json_response(400, ['error' => 'User ID is required.']);
    }

    // Fetch core user details
    $sql_user = "SELECT id, username, email, role, name, phone_number, company, experience, hourly_rate, avatar_url, is_active, created_at, updated_at
                 FROM users
                 WHERE id = ?";
    $stmt_user = $conn->prepare($sql_user);
    if ($stmt_user === false) {
        send_json_response(500, ['error' => 'Failed to prepare statement for user details: ' . $conn->error]);
    }
    $stmt_user->bind_param("i", $user_id_to_fetch);
    if (!$stmt_user->execute()) {
        send_json_response(500, ['error' => 'Failed to execute statement for user details: ' . $stmt_user->error]);
    }
    $result_user = $stmt_user->get_result();

    if ($user_details = $result_user->fetch_assoc()) {
        $stmt_user->close();

        // Cast numeric types
        if (isset($user_details['hourly_rate'])) {
            $user_details['hourly_rate'] = $user_details['hourly_rate'] === null ? null : (float)$user_details['hourly_rate'];
        }
        $user_details['is_active'] = (bool)$user_details['is_active'];

        // Fetch user's skills
        $user_details['skills'] = []; // Initialize as empty array
        $sql_skills = "SELECT s.id, s.name
                       FROM user_skills us
                       JOIN skills s ON us.skill_id = s.id
                       WHERE us.user_id = ?
                       ORDER BY s.name ASC";
        $stmt_skills = $conn->prepare($sql_skills);
        if ($stmt_skills) { // Proceed if statement prepared successfully
            $stmt_skills->bind_param("i", $user_id_to_fetch);
            if ($stmt_skills->execute()) {
                $result_skills = $stmt_skills->get_result();
                while ($skill_row = $result_skills->fetch_assoc()) {
                    $user_details['skills'][] = [
                        'id' => (int)$skill_row['id'],
                        'name' => $skill_row['name']
                    ];
                }
            } else {
                // Log error, but don't fail the whole request just for skills
                error_log("Failed to execute statement for user skills: " . $stmt_skills->error);
            }
            $stmt_skills->close();
        } else {
            error_log("Failed to prepare statement for user skills: " . $conn->error);
        }

        send_json_response(200, $user_details);

    } else {
        $stmt_user->close();
        send_json_response(404, ['error' => 'User not found.']);
    }
} // END NEW: Admin - Get Specific User Details

// NEW: Admin - Update Specific User Details
elseif ($action === 'admin_update_user_details' && ($method === 'POST' || $method === 'PUT')) {
    $authenticated_admin = require_authentication($conn);
    if ($authenticated_admin['role'] !== 'admin') {
        send_json_response(403, ['error' => 'Forbidden: Only admins can update user details.']);
    }
    $admin_id_making_request = (int)$authenticated_admin['id'];

    $user_id_to_update = isset($_GET['user_id']) ? (int)$_GET['user_id'] : null;

    $data = json_decode(file_get_contents('php://input'), true);
    if (!$user_id_to_update && isset($data['user_id'])) { // Allow user_id in payload as fallback
        $user_id_to_update = (int)$data['user_id'];
    }

    if (!$user_id_to_update) {
        send_json_response(400, ['error' => 'User ID to update is required (as GET param or in payload).']);
    }
    if (empty($data) || count($data) === 1 && isset($data['user_id']) ) { // Ensure other fields besides user_id are present
        send_json_response(400, ['error' => 'No update data provided or invalid JSON.']);
    }

    // Fetch current user data for validation (e.g., current email/username for uniqueness checks)
    $stmt_curr_user = $conn->prepare("SELECT username, email, role FROM users WHERE id = ?");
    if (!$stmt_curr_user) { send_json_response(500, ['error' => 'DB error fetching current user data.']);}
    $stmt_curr_user->bind_param("i", $user_id_to_update);
    $stmt_curr_user->execute();
    $result_curr_user = $stmt_curr_user->get_result();
    if ($result_curr_user->num_rows === 0) {
        send_json_response(404, ['error' => 'User to update not found.']);
    }
    $current_user_data = $result_curr_user->fetch_assoc();
    $stmt_curr_user->close();

    $fields_to_update_sql = [];
    $params_for_bind = [];
    $param_types = "";

    // Username
    if (isset($data['username']) && $data['username'] !== $current_user_data['username']) {
        $new_username = $data['username'];
        // Check uniqueness for new username
        $stmt_check_user = $conn->prepare("SELECT id FROM users WHERE username = ? AND id != ?");
        $stmt_check_user->bind_param("si", $new_username, $user_id_to_update);
        $stmt_check_user->execute();
        if ($stmt_check_user->get_result()->num_rows > 0) {
            send_json_response(409, ['error' => "Username '{$new_username}' already exists."]);
        }
        $stmt_check_user->close();
        $fields_to_update_sql[] = "username = ?"; $params_for_bind[] = $new_username; $param_types .= "s";
    }

    // Email
    if (isset($data['email']) && $data['email'] !== $current_user_data['email']) {
        $new_email = $data['email'];
        if (!filter_var($new_email, FILTER_VALIDATE_EMAIL)) {
            send_json_response(400, ['error' => 'Invalid new email format.']);
        }
        // Check uniqueness for new email
        $stmt_check_email = $conn->prepare("SELECT id FROM users WHERE email = ? AND id != ?");
        $stmt_check_email->bind_param("si", $new_email, $user_id_to_update);
        $stmt_check_email->execute();
        if ($stmt_check_email->get_result()->num_rows > 0) {
            send_json_response(409, ['error' => "Email '{$new_email}' already exists."]);
        }
        $stmt_check_email->close();
        $fields_to_update_sql[] = "email = ?"; $params_for_bind[] = $new_email; $param_types .= "s";
    }

    // Role
    if (isset($data['role']) && $data['role'] !== $current_user_data['role']) {
        $new_role = $data['role'];
        $allowed_roles = ['freelancer', 'client', 'admin'];
        if (!in_array($new_role, $allowed_roles)) {
            send_json_response(400, ['error' => 'Invalid new role specified.']);
        }
        if ($user_id_to_update === $admin_id_making_request && $new_role !== 'admin') {
             send_json_response(400, ['error' => 'Admins cannot change their own role to non-admin.']);
        }
        $fields_to_update_sql[] = "role = ?"; $params_for_bind[] = $new_role; $param_types .= "s";
    }

    // Optional String Fields (name, phone_number, company, avatar_url)
    foreach (['name', 'phone_number', 'company', 'avatar_url'] as $field) {
        if (array_key_exists($field, $data)) { // Use array_key_exists to allow setting to null or empty string
            $fields_to_update_sql[] = "$field = ?"; $params_for_bind[] = $data[$field]; $param_types .= "s";
        }
    }
    // Optional TEXT Field (experience)
    if (array_key_exists('experience', $data)) {
        $fields_to_update_sql[] = "experience = ?"; $params_for_bind[] = $data['experience']; $param_types .= "s";
    }
    // Optional DECIMAL Field (hourly_rate)
    if (array_key_exists('hourly_rate', $data)) {
        $hourlyRate = $data['hourly_rate'] === null || $data['hourly_rate'] === '' ? null : (float)$data['hourly_rate'];
        if ($hourlyRate !== null && $hourlyRate < 0) {send_json_response(400, ['error'=>'Hourly rate cannot be negative.']);}
        // Only allow setting hourly_rate if role is or is becoming freelancer
        $target_role_for_rate = $data['role'] ?? $current_user_data['role'];
        if ($target_role_for_rate !== 'freelancer' && $hourlyRate !== null) {
             send_json_response(400, ['error'=>'Hourly rate can only be set for freelancers.']);
        }
        $fields_to_update_sql[] = "hourly_rate = ?"; $params_for_bind[] = $hourlyRate; $param_types .= "d";
    }
    // Optional BOOLEAN Field (is_active)
    if (isset($data['is_active'])) {
        if (!is_bool($data['is_active'])) {
            send_json_response(400, ['error' => 'is_active must be a boolean.']);
        }
        if ($user_id_to_update === $admin_id_making_request && $data['is_active'] === false) {
             send_json_response(400, ['error' => 'Admins cannot deactivate their own account.']);
        }
        $fields_to_update_sql[] = "is_active = ?"; $params_for_bind[] = (int)$data['is_active']; $param_types .= "i";
    }

    if (empty($fields_to_update_sql)) {
        send_json_response(400, ['error' => 'No valid or changed fields provided for update.']);
    }

    $fields_to_update_sql[] = "updated_at = NOW()"; // Always update this

    $sql_update = "UPDATE users SET " . implode(", ", $fields_to_update_sql) . " WHERE id = ?";
    $params_for_bind[] = $user_id_to_update;
    $param_types .= "i";

    $stmt_update = $conn->prepare($sql_update);
    if ($stmt_update === false) {
        send_json_response(500, ['error' => 'Failed to prepare user update statement: ' . $conn->error]);
    }
    $stmt_update->bind_param($param_types, ...$params_for_bind);

    if ($stmt_update->execute()) {
        if ($stmt_update->affected_rows > 0) {
            send_json_response(200, ['message' => 'User details updated successfully.']);
        } else {
            // Check if user still exists to differentiate
            $stmt_exists = $conn->prepare("SELECT id FROM users WHERE id = ?");
            $stmt_exists->bind_param("i", $user_id_to_update);
            $stmt_exists->execute();
            if ($stmt_exists->get_result()->num_rows === 0) {
                 send_json_response(404, ['error' => 'User not found (possibly deleted during update attempt).']);
            } else {
                 send_json_response(200, ['message' => 'User data was the same; no changes made.']);
            }
            $stmt_exists->close();
        }
    } else {
        send_json_response(500, ['error' => 'Failed to update user details: ' . $stmt_update->error]);
    }
    $stmt_update->close();

} // END NEW: Admin - Update Specific User Details

// NEW: Admin - Soft Delete User (Deactivate)
elseif ($action === 'admin_delete_user' && ($method === 'POST' || $method === 'DELETE')) { // Allow POST for body if preferred
    $authenticated_admin = require_authentication($conn);
    if ($authenticated_admin['role'] !== 'admin') {
        send_json_response(403, ['error' => 'Forbidden: Only admins can deactivate users.']);
    }
    $admin_id_making_request = (int)$authenticated_admin['id'];

    $user_id_to_deactivate = null;
    if ($method === 'DELETE') {
        $user_id_to_deactivate = isset($_GET['user_id']) ? (int)$_GET['user_id'] : null;
    } elseif ($method === 'POST') {
        $data = json_decode(file_get_contents('php://input'), true);
        $user_id_to_deactivate = isset($data['user_id']) ? (int)$data['user_id'] : (isset($_GET['user_id']) ? (int)$_GET['user_id'] : null);
    }

    if (!$user_id_to_deactivate) {
        send_json_response(400, ['error' => 'User ID to deactivate is required.']);
    }

    // Prevent admin from deactivating themselves
    if ($user_id_to_deactivate === $admin_id_making_request) {
        send_json_response(400, ['error' => 'Admins cannot deactivate their own account via this endpoint.']);
    }

    // Check if user exists and is currently active
    $stmt_check_user = $conn->prepare("SELECT is_active FROM users WHERE id = ?");
    if (!$stmt_check_user) { send_json_response(500, ['error' => 'DB Error preparing user check.']); }
    $stmt_check_user->bind_param("i", $user_id_to_deactivate);
    $stmt_check_user->execute();
    $result_check_user = $stmt_check_user->get_result();
    if ($result_check_user->num_rows === 0) {
        send_json_response(404, ['error' => 'User to deactivate not found.']);
    }
    $user_data = $result_check_user->fetch_assoc();
    if ($user_data['is_active'] == 0) { // Check if already inactive (is_active stored as 0 or 1)
         send_json_response(200, ['message' => 'User is already inactive.']);
    }
    $stmt_check_user->close();

    // Soft delete: set is_active = false, clear session tokens
    $sql_deactivate = "UPDATE users
                       SET is_active = 0,
                           session_token = NULL,
                           session_token_expires_at = NULL,
                           updated_at = NOW()
                       WHERE id = ?";
    $stmt_deactivate = $conn->prepare($sql_deactivate);
    if ($stmt_deactivate === false) {
        send_json_response(500, ['error' => 'Failed to prepare user deactivation statement: ' . $conn->error]);
    }
    $stmt_deactivate->bind_param("i", $user_id_to_deactivate);

    if ($stmt_deactivate->execute()) {
        if ($stmt_deactivate->affected_rows > 0) {
            send_json_response(200, ['message' => 'User deactivated successfully.']);
        } else {
            // This might happen if the user was not found despite earlier check (race condition)
            // or if is_active was already 0 and tokens were already null.
            // The check for already inactive above should handle most cases.
            send_json_response(404, ['message' => 'User not found or no change needed for deactivation.']);
        }
    } else {
        send_json_response(500, ['error' => 'Failed to deactivate user: ' . $stmt_deactivate->error]);
    }
    $stmt_deactivate->close();

} // END NEW: Admin - Soft Delete User (Deactivate)

// NEW: Admin - Get Dashboard Statistics
elseif ($action === 'get_admin_dashboard_stats' && $method === 'GET') {
    $authenticated_user = require_authentication($conn);
    if ($authenticated_user['role'] !== 'admin') {
        send_json_response(403, ['error' => 'Forbidden: Only admins can access dashboard statistics.']);
    }

    $stats = [];

    // --- User Stats ---
    // Total users
    $result_total_users = $conn->query("SELECT COUNT(*) AS total_users FROM users WHERE is_active = 1");
    $stats['total_active_users'] = $result_total_users ? (int)$result_total_users->fetch_assoc()['total_users'] : 0;

    // Users by role
    $stats['users_by_role'] = [];
    $roles_to_count = ['admin', 'client', 'freelancer'];
    $stmt_roles = $conn->prepare("SELECT COUNT(*) AS count FROM users WHERE role = ? AND is_active = 1");
    if (!$stmt_roles) { send_json_response(500, ['error' => 'DB error preparing role count.']);}
    foreach ($roles_to_count as $role) {
        $stmt_roles->bind_param("s", $role);
        $stmt_roles->execute();
        $result_role = $stmt_roles->get_result();
        $stats['users_by_role'][$role] = $result_role ? (int)$result_role->fetch_assoc()['count'] : 0;
    }
    $stmt_roles->close();

    // --- Project Stats ---
    // Total projects
    $result_total_projects = $conn->query("SELECT COUNT(*) AS total_projects FROM projects");
    $stats['total_projects'] = $result_total_projects ? (int)$result_total_projects->fetch_assoc()['total_projects'] : 0;

    // Projects by status
    $stats['projects_by_status'] = [];
    // These should match the exact strings used in your database for projects.status
    $project_statuses_to_count = ['pending_approval', 'open', 'in_progress', 'completed', 'cancelled', 'archived'];

    $stmt_proj_status = $conn->prepare("SELECT COUNT(*) AS count FROM projects WHERE status = ?");
    if (!$stmt_proj_status) { send_json_response(500, ['error' => 'DB error preparing project status count.']);}
    foreach ($project_statuses_to_count as $p_status) {
        $stmt_proj_status->bind_param("s", $p_status);
        $stmt_proj_status->execute();
        $result_p_status = $stmt_proj_status->get_result();
        // Use a consistent key format for frontend, e.g., capitalize and replace underscores
        $display_status_key = ucwords(str_replace('_', ' ', $p_status));
        $stats['projects_by_status'][$display_status_key] = $result_p_status ? (int)$result_p_status->fetch_assoc()['count'] : 0;
    }
    $stmt_proj_status->close();

    // --- Application Stats ---
    // Total "active" applications (e.g., pending)
    $active_app_statuses = ['pending'];
    $status_placeholders_app = implode(',', array_fill(0, count($active_app_statuses), '?'));
    $sql_open_apps = "SELECT COUNT(*) AS total_open_applications FROM applications WHERE status IN (" . $status_placeholders_app . ")";

    $stmt_open_apps = $conn->prepare($sql_open_apps);
    if (!$stmt_open_apps) { send_json_response(500, ['error' => 'DB error preparing open applications count.']);}

    $types_app = str_repeat('s', count($active_app_statuses));
    $stmt_open_apps->bind_param($types_app, ...$active_app_statuses);

    $stmt_open_apps->execute();
    $result_open_apps = $stmt_open_apps->get_result();
    $stats['total_open_applications'] = $result_open_apps ? (int)$result_open_apps->fetch_assoc()['total_open_applications'] : 0;
    $stmt_open_apps->close();

    send_json_response(200, $stats);

} // END NEW: Admin - Get Dashboard Statistics

// NEW: Admin - Get Own Notifications
elseif ($action === 'get_admin_notifications' && $method === 'GET') {
    $authenticated_user = require_authentication($conn);
    if ($authenticated_user['role'] !== 'admin') {
        send_json_response(403, ['error' => 'Forbidden: Only admins can view these notifications.']);
    }
    $admin_user_id = (int)$authenticated_user['id'];

    // Pagination parameters
    $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 25; // Default limit
    $offset = isset($_GET['offset']) ? (int)$_GET['offset'] : 0;
    // Alternative: older_than_id for cursor-based pagination on 'id' or 'created_at'

    // Fetch notifications for this admin user
    // Or, if user_id in notifications can be NULL for "all admins", adjust query.
    // For now, assumes notifications are targeted to specific admin user_ids.
    $sql = "SELECT id, message_key, related_entity_type, related_entity_id, is_read, created_at
            FROM notifications
            WHERE user_id = ?
            ORDER BY created_at DESC
            LIMIT ? OFFSET ?";

    $stmt = $conn->prepare($sql);
    if ($stmt === false) {
        send_json_response(500, ['error' => 'Failed to prepare statement for getting notifications: ' . $conn->error]);
    }
    $stmt->bind_param("iii", $admin_user_id, $limit, $offset);

    if (!$stmt->execute()) {
        send_json_response(500, ['error' => 'Failed to execute statement for getting notifications: ' . $stmt->error]);
    }

    $result = $stmt->get_result();
    $notifications_list = [];
    while ($row = $result->fetch_assoc()) {
        $notifications_list[] = [
            'id' => (int)$row['id'],
            'message_key' => $row['message_key'],
            'related_entity_type' => $row['related_entity_type'],
            'related_entity_id' => $row['related_entity_id'] === null ? null : (int)$row['related_entity_id'],
            'is_read' => (bool)$row['is_read'], // Cast to boolean
            'created_at' => $row['created_at']
        ];
    }
    $stmt->close();

    // Optionally, also return total unread count or total notifications count for pagination UI
    $stmt_count = $conn->prepare("SELECT COUNT(*) as total_unread FROM notifications WHERE user_id = ? AND is_read = 0");
    $total_unread = 0;
    if($stmt_count){
        $stmt_count->bind_param("i", $admin_user_id);
        if($stmt_count->execute()){
            $count_result = $stmt_count->get_result()->fetch_assoc();
            $total_unread = (int)$count_result['total_unread'];
        }
        $stmt_count->close();
    }


    send_json_response(200, ['notifications' => $notifications_list, 'total_unread' => $total_unread]);

} // END NEW: Admin - Get Own Notifications

// NEW: Admin - Mark Notification(s) as Read
elseif ($action === 'mark_notification_as_read' && ($method === 'POST' || $method === 'PUT')) {
    $authenticated_user = require_authentication($conn);
    if ($authenticated_user['role'] !== 'admin') {
        send_json_response(403, ['error' => 'Forbidden: Only admins can mark these notifications as read.']);
    }
    $admin_user_id = (int)$authenticated_user['id'];

    $data = json_decode(file_get_contents('php://input'), true);
    $notification_ids_input = $data['notification_id'] ?? ($data['notification_ids'] ?? null);

    if (empty($notification_ids_input)) {
        send_json_response(400, ['error' => 'Notification ID(s) (notification_id or notification_ids) are required.']);
    }

    // Ensure it's an array
    if (!is_array($notification_ids_input)) {
        $notification_ids = [(int)$notification_ids_input];
    } else {
        $notification_ids = array_map('intval', $notification_ids_input);
    }

    if (empty($notification_ids)) { // After potential filtering of non-ints if not using intval strictly
        send_json_response(400, ['error' => 'Valid Notification ID(s) are required.']);
    }

    // Create placeholders for IN clause
    $id_placeholders = implode(',', array_fill(0, count($notification_ids), '?'));

    // Update is_read for notifications belonging to this admin
    $sql = "UPDATE notifications
            SET is_read = 1
            WHERE user_id = ? AND id IN (" . $id_placeholders . ") AND is_read = 0";

    $stmt = $conn->prepare($sql);
    if ($stmt === false) {
        send_json_response(500, ['error' => 'Failed to prepare statement for marking notifications read: ' . $conn->error]);
    }

    // Bind parameters: first admin_user_id, then all notification_ids
    $types = 'i' . str_repeat('i', count($notification_ids));
    $bind_params = array_merge([$admin_user_id], $notification_ids);

    $stmt->bind_param($types, ...$bind_params);

    if (!$stmt->execute()) {
        send_json_response(500, ['error' => 'Failed to execute statement for marking notifications read: ' . $stmt->error]);
    }

    $affected_rows = $stmt->affected_rows;
    $stmt->close();

    send_json_response(200, [
        'message' => "{$affected_rows} notification(s) marked as read.",
        'marked_read_count' => $affected_rows
    ]);

} // END NEW: Admin - Mark Notification(s) as Read

// NEW: Admin - Mark All Own Notifications as Read
elseif ($action === 'mark_all_admin_notifications_as_read' && ($method === 'POST' || $method === 'PUT')) {
    $authenticated_user = require_authentication($conn);
    if ($authenticated_user['role'] !== 'admin') {
        send_json_response(403, ['error' => 'Forbidden: Only admins can mark all their notifications as read.']);
    }
    $admin_user_id = (int)$authenticated_user['id'];

    // Update is_read for all unread notifications belonging to this admin
    $sql = "UPDATE notifications
            SET is_read = 1
            WHERE user_id = ? AND is_read = 0";

    $stmt = $conn->prepare($sql);
    if ($stmt === false) {
        send_json_response(500, ['error' => 'Failed to prepare statement for marking all notifications read: ' . $conn->error]);
    }

    $stmt->bind_param("i", $admin_user_id);

    if (!$stmt->execute()) {
        send_json_response(500, ['error' => 'Failed to execute statement for marking all notifications read: ' . $stmt->error]);
    }

    $affected_rows = $stmt->affected_rows;
    $stmt->close();

    send_json_response(200, [
        'message' => "All {$affected_rows} unread notification(s) marked as read.",
        'marked_read_count' => $affected_rows
    ]);

} // END NEW: Admin - Mark All Own Notifications as Read

// NEW: Skills Endpoints
elseif ($action === 'get_all_skills' && $method === 'GET') {
    require_authentication($conn); // Any authenticated user can fetch skills

    $sql = "SELECT id, name, created_at FROM skills ORDER BY name ASC";
    $stmt = $conn->prepare($sql);
    if ($stmt === false) {
        send_json_response(500, ['error' => 'Failed to prepare statement for getting skills: ' . $conn->error]);
    }

    if (!$stmt->execute()) {
        send_json_response(500, ['error' => 'Failed to execute statement for getting skills: ' . $stmt->error]);
    }

    $result = $stmt->get_result();
    $skills_list = [];
    while ($row = $result->fetch_assoc()) {
        $skills_list[] = [
            'id' => (int)$row['id'],
            'name' => $row['name'],
            'created_at' => $row['created_at']
        ];
    }
    $stmt->close();

    send_json_response(200, $skills_list);

} // END NEW: Get All Skills
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
        $new_application_id_for_notification = $stmt_insert_app->insert_id;
        send_json_response(201, [
            'message' => 'Application submitted successfully.',
            'application_id' => $new_application_id_for_notification
        ]);
        // Create notification for admins about a new application
        create_admin_notification($conn, 'application_submitted', 'application', $new_application_id_for_notification);
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

// NEW: Get Freelancer Dashboard Stats
elseif ($action === 'get_freelancer_dashboard_stats' && $method === 'GET') {
    $authenticated_user = require_authentication($conn);
    $freelancer_id = (int)$authenticated_user['id'];

    if ($authenticated_user['role'] !== 'freelancer') {
        send_json_response(403, ['error' => 'Forbidden: Only freelancers can access these statistics.']);
    }

    $stats = [
        'myTotalJobCards' => 0,
        'myInProgressJobCards' => 0,
        'openProjectsCount' => 0,
        'myApplicationsCount' => 0
    ];

    // My Total Job Cards
    $stmt_total_jc = $conn->prepare("SELECT COUNT(*) AS total FROM job_cards WHERE assigned_freelancer_id = ?");
    if ($stmt_total_jc) {
        $stmt_total_jc->bind_param("i", $freelancer_id);
        if ($stmt_total_jc->execute()) {
            $result = $stmt_total_jc->get_result()->fetch_assoc();
            $stats['myTotalJobCards'] = (int)$result['total'];
        } else { error_log("Execute failed (myTotalJobCards): " . $stmt_total_jc->error); }
        $stmt_total_jc->close();
    } else { error_log("Prepare failed (myTotalJobCards): " . $conn->error); }

    // My In-Progress Job Cards
    $stmt_inprogress_jc = $conn->prepare("SELECT COUNT(*) AS total FROM job_cards WHERE assigned_freelancer_id = ? AND status = 'in_progress'");
    if ($stmt_inprogress_jc) {
        $stmt_inprogress_jc->bind_param("i", $freelancer_id);
        if ($stmt_inprogress_jc->execute()) {
            $result = $stmt_inprogress_jc->get_result()->fetch_assoc();
            $stats['myInProgressJobCards'] = (int)$result['total'];
        } else { error_log("Execute failed (myInProgressJobCards): " . $stmt_inprogress_jc->error); }
        $stmt_inprogress_jc->close();
    } else { error_log("Prepare failed (myInProgressJobCards): " . $conn->error); }

    // Open Projects Count (system-wide)
    $stmt_open_proj = $conn->prepare("SELECT COUNT(*) AS total FROM projects WHERE status = 'open'");
    if ($stmt_open_proj) {
        if ($stmt_open_proj->execute()) {
            $result = $stmt_open_proj->get_result()->fetch_assoc();
            $stats['openProjectsCount'] = (int)$result['total'];
        } else { error_log("Execute failed (openProjectsCount): " . $stmt_open_proj->error); }
        $stmt_open_proj->close();
    } else { error_log("Prepare failed (openProjectsCount): " . $conn->error); }

    // My Applications Count
    $stmt_my_apps = $conn->prepare("SELECT COUNT(*) AS total FROM applications WHERE freelancer_id = ?");
    if ($stmt_my_apps) {
        $stmt_my_apps->bind_param("i", $freelancer_id);
        if ($stmt_my_apps->execute()) {
            $result = $stmt_my_apps->get_result()->fetch_assoc();
            $stats['myApplicationsCount'] = (int)$result['total'];
        } else { error_log("Execute failed (myApplicationsCount): " . $stmt_my_apps->error); }
        $stmt_my_apps->close();
    } else { error_log("Prepare failed (myApplicationsCount): " . $conn->error); }

    send_json_response(200, $stats);

} // END NEW: Get Freelancer Dashboard Stats

// NEW: Get My Job Cards (Freelancer)
elseif ($action === 'get_my_job_cards' && $method === 'GET') {
    $authenticated_user = require_authentication($conn);
    $freelancer_id = (int)$authenticated_user['id'];

    if ($authenticated_user['role'] !== 'freelancer') {
        send_json_response(403, ['error' => 'Forbidden: Only freelancers can access their job cards.']);
    }

    $sql = "SELECT
                jc.id, jc.project_id, jc.title, jc.description, jc.status,
                jc.assigned_freelancer_id, jc.estimated_hours,
                jc.created_at, jc.updated_at,
                p.title AS project_title
            FROM job_cards jc
            JOIN projects p ON jc.project_id = p.id
            WHERE jc.assigned_freelancer_id = ?
            ORDER BY jc.updated_at DESC";

    $stmt = $conn->prepare($sql);
    if ($stmt === false) {
        error_log("Prepare failed (get_my_job_cards): " . $conn->error);
        send_json_response(500, ['error' => 'Failed to prepare statement for fetching job cards.']);
    }

    $stmt->bind_param("i", $freelancer_id);

    if (!$stmt->execute()) {
        error_log("Execute failed (get_my_job_cards): " . $stmt->error);
        send_json_response(500, ['error' => 'Failed to execute statement for fetching job cards.']);
    }

    $result = $stmt->get_result();
    $my_job_cards = [];
    while ($row = $result->fetch_assoc()) {
        // Ensure numeric types are correctly typed if necessary, e.g., from strings
        if (isset($row['estimated_hours'])) {
            $row['estimated_hours'] = $row['estimated_hours'] === null ? null : (float)$row['estimated_hours'];
        }
        $row['id'] = (int)$row['id'];
        $row['project_id'] = (int)$row['project_id'];
        // assigned_freelancer_id will also be an int, but it's the current user, so less critical to cast for response here.

        $my_job_cards[] = $row;
    }
    $stmt->close();

    send_json_response(200, $my_job_cards);

} // END NEW: Get My Job Cards (Freelancer)

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
// MODIFIED: get_projects to handle single project fetch and join user tables
elseif ($action === 'get_projects' && $method === 'GET') {
    $project_id_filter = isset($_GET['id']) ? (int)$_GET['id'] : (isset($_GET['project_id']) ? (int)$_GET['project_id'] : null);

    if ($project_id_filter !== null) {
        // Fetch a single project by ID
        $sql = "SELECT p.id, p.title, p.description, p.client_id, p.freelancer_id, p.status, p.created_at, p.updated_at,
                       c.username as client_username, f.username as freelancer_username
                FROM projects p
                LEFT JOIN users c ON p.client_id = c.id
                LEFT JOIN users f ON p.freelancer_id = f.id
                WHERE p.id = ?";
        $stmt = $conn->prepare($sql);
        if ($stmt === false) {
            send_json_response(500, ['error' => 'Failed to prepare statement for single project: ' . $conn->error]);
        }
        $stmt->bind_param("i", $project_id_filter);
        if (!$stmt->execute()) {
            send_json_response(500, ['error' => 'Failed to execute statement for single project: ' . $stmt->error]);
        }
        $result = $stmt->get_result();
        if ($project = $result->fetch_assoc()) {
            if (isset($project['client_id'])) $project['client_id'] = (int)$project['client_id'];
            if (isset($project['freelancer_id'])) $project['freelancer_id'] = $project['freelancer_id'] === null ? null : (int)$project['freelancer_id'];

            // Fetch skills for the single project
            $project['skills_required'] = [];
            $stmt_skills_proj = $conn->prepare("SELECT s.id, s.name FROM project_skills ps JOIN skills s ON ps.skill_id = s.id WHERE ps.project_id = ? ORDER BY s.name ASC");
            if ($stmt_skills_proj) {
                $stmt_skills_proj->bind_param("i", $project_id_filter);
                if ($stmt_skills_proj->execute()) {
                    $result_skills_proj = $stmt_skills_proj->get_result();
                    while ($skill_row_proj = $result_skills_proj->fetch_assoc()) {
                        $project['skills_required'][] = ['id' => (int)$skill_row_proj['id'], 'name' => $skill_row_proj['name']];
                    }
                } else { error_log("Failed to execute skills fetch for single project: " . $stmt_skills_proj->error); }
                $stmt_skills_proj->close();
            } else { error_log("Failed to prepare skills fetch for single project: " . $conn->error); }

            send_json_response(200, $project); // Return single project object
        } else {
            send_json_response(404, ['error' => 'Project not found.']);
        }
        $stmt->close();
        // exit; // send_json_response includes exit
    } else {
        // Existing logic for fetching multiple projects with status filter
        $status_filter = isset($_GET['status']) ? $_GET['status'] : 'open';

        $sql = "SELECT p.id, p.title, p.description, p.client_id, p.freelancer_id, p.status, p.created_at, p.updated_at,
                       c.username as client_username, f.username as freelancer_username
                FROM projects p
                LEFT JOIN users c ON p.client_id = c.id
                LEFT JOIN users f ON p.freelancer_id = f.id";
        $params = [];
        $types = "";

        if ($status_filter) {
            if ($status_filter !== 'all' && $status_filter !== '') {
                 $sql .= " WHERE p.status = ?";
                 $params[] = $status_filter;
                 $types .= "s";
            } else if ($status_filter === '') {
                $sql .= " WHERE p.status = ?";
                $params[] = 'open';
                $types .= "s";
            }
        }
        $sql .= " ORDER BY p.created_at DESC";

        $stmt = $conn->prepare($sql);
        if ($stmt === false) {
            send_json_response(500, ['error' => 'Failed to prepare statement for projects list: ' . $conn->error]);
        }
        if (!empty($types)) {
            $stmt->bind_param($types, ...$params);
        }
        if (!$stmt->execute()) {
            send_json_response(500, ['error' => 'Failed to execute statement for projects list: ' . $stmt->error]);
        }
        $result = $stmt->get_result();
        $projects = [];
        while ($row = $result->fetch_assoc()) {
            if (isset($row['client_id'])) $row['client_id'] = (int)$row['client_id'];
            if (isset($row['freelancer_id'])) $row['freelancer_id'] = $row['freelancer_id'] === null ? null : (int)$row['freelancer_id'];
            $projects[] = $row;
        }
        $stmt->close();
        send_json_response(200, $projects);
    }
}
// MODIFIED: Create Project with Admin client_id assignment
elseif ($action === 'create_project' && $method === 'POST') {
    $authenticated_user = require_authentication($conn);
    $auth_user_id = (int)$authenticated_user['id'];
    $auth_user_role = $authenticated_user['role'];

    $data = json_decode(file_get_contents('php://input'), true);

    if (empty($data['title']) || empty($data['description'])) {
        send_json_response(400, ['error' => 'Missing required fields: title, description.']);
    }

    $title = $data['title'];
    $description = $data['description'];
    $final_client_id = null;

    // Determine client_id based on role and payload
    if ($auth_user_role === 'admin') {
        if (isset($data['client_id']) && !empty($data['client_id'])) {
            $payload_client_id = (int)$data['client_id'];
            // Validate this client_id
            $stmt_client_check = $conn->prepare("SELECT id, role FROM users WHERE id = ?");
            if (!$stmt_client_check) { send_json_response(500, ['error' => 'Server error preparing client validation.']); }
            $stmt_client_check->bind_param("i", $payload_client_id);
            if (!$stmt_client_check->execute()) { send_json_response(500, ['error' => 'Server error executing client validation.']); }
            $result_client_check = $stmt_client_check->get_result();
            if ($result_client_check->num_rows === 0) {
                send_json_response(404, ['error' => "Specified client_id '{$payload_client_id}' not found."]);
            }
            $client_to_assign = $result_client_check->fetch_assoc();
            if ($client_to_assign['role'] !== 'client') {
                send_json_response(400, ['error' => "User '{$payload_client_id}' is not a client. Project can only be assigned to a client user."]);
            }
            $stmt_client_check->close();
            $final_client_id = $payload_client_id;
        } else {
            // Admin creating project for themselves (no client_id in payload)
            $final_client_id = $auth_user_id;
        }
    } elseif ($auth_user_role === 'client') {
        $final_client_id = $auth_user_id;
    } else {
        // Other roles (e.g. freelancer) are not allowed to create projects
        send_json_response(403, ['error' => 'Forbidden: Your role does not have permission to create projects.']);
    }

    if ($final_client_id === null) { // Should be caught by role check, but as a safeguard
        send_json_response(500, ['error' => 'Could not determine client for the project.']);
    }

    $freelancer_id = isset($data['freelancer_id']) && !empty($data['freelancer_id']) ? (int)$data['freelancer_id'] : null;
    if ($freelancer_id !== null) { // Optional: Validate freelancer_id if provided
        $stmt_f_check = $conn->prepare("SELECT role FROM users WHERE id = ?");
        if (!$stmt_f_check) { send_json_response(500, ['error' => 'Server error: Freelancer validation prep failed.']);}
        $stmt_f_check->bind_param("i", $freelancer_id);
        if (!$stmt_f_check->execute()) { send_json_response(500, ['error' => 'Server error: Freelancer validation exec failed.']);}
        $res_f_check = $stmt_f_check->get_result();
        if ($res_f_check->num_rows === 0) { send_json_response(404, ['error' => 'Assigned freelancer not found.']); }
        if ($res_f_check->fetch_assoc()['role'] !== 'freelancer') { send_json_response(400, ['error' => 'Assigned user is not a freelancer.']);}
        $stmt_f_check->close();
    }

    $status = $data['status'] ?? 'open'; // Default status, or from payload
    $valid_project_statuses = ['open', 'pending_approval', 'in_progress', 'completed', 'cancelled']; // Extend as needed
    if (!in_array($status, $valid_project_statuses)) {
        send_json_response(400, ['error' => 'Invalid project status provided.']);
    }


    $stmt = $conn->prepare("INSERT INTO projects (title, description, client_id, freelancer_id, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NOW(), NOW())");
    if ($stmt === false) {
        send_json_response(500, ['error' => 'Failed to prepare statement for project creation: ' . $conn->error]);
    }

    $stmt->bind_param("ssiis", $title, $description, $final_client_id, $freelancer_id, $status);

    if ($stmt->execute()) {
        $new_project_id_for_notification = $stmt->insert_id;
        $current_project_status = $status; // $status variable from create_project scope

        // Send response first, then notify
        send_json_response(201, [
            'message' => 'Project created successfully.',
            'project_id' => $new_project_id_for_notification,
            'client_id' => $final_client_id
        ]);

        if ($current_project_status === 'pending_approval' || $current_project_status === 'Pending Approval') { // Case consistency
             create_admin_notification($conn, 'project_awaits_approval', 'project', $new_project_id_for_notification);
        }
    } else {
        send_json_response(500, ['error' => 'Failed to create project: ' . $stmt->error]);
    }
    $stmt->close();
}
// END MODIFIED: Create Project
// MODIFIED: update_project to allow admin client_id change and other enhancements
elseif ($action === 'update_project' && ($method === 'PUT' || $method === 'POST')) { // Allow POST too
    $authenticated_user = require_authentication($conn);
    $user_id = (int)$authenticated_user['id'];
    $user_role = $authenticated_user['role'];

    $project_id = isset($_GET['id']) ? (int)$_GET['id'] : null;

    $data = json_decode(file_get_contents('php://input'), true);
    if (!$project_id && isset($data['project_id_to_update'])) { // Use a distinct name to avoid conflict
        $project_id = (int)$data['project_id_to_update'];
    }


    if (!$project_id) {
        send_json_response(400, ['error' => 'Project ID is required for update.']);
    }
    // Remove project_id_to_update from $data if it exists, as it's not a table field
    if (isset($data['project_id_to_update'])) {
        unset($data['project_id_to_update']);
    }
    if (empty($data) && !isset($data['skill_ids'])) { // Check if $data is empty OR only skill_ids is set (which means no project table fields)
        send_json_response(400, ['error' => 'Invalid JSON or no data provided for project table update. If only updating skills, ensure skill_ids is provided.']);
    }

    $stmt_check_owner = $conn->prepare("SELECT client_id FROM projects WHERE id = ?");
    if ($stmt_check_owner === false) { send_json_response(500, ['error' => 'Server error: Failed to prepare ownership check. ' . $conn->error]); }
    $stmt_check_owner->bind_param("i", $project_id);
    if (!$stmt_check_owner->execute()) { send_json_response(500, ['error' => 'Server error: Failed to execute ownership check. ' . $stmt_check_owner->error]); }
    $result_owner_check = $stmt_check_owner->get_result();
    if ($result_owner_check->num_rows === 0) { send_json_response(404, ['error' => 'Project not found.']); }
    $project_data_db = $result_owner_check->fetch_assoc();
    $project_client_id_original = (int)$project_data_db['client_id'];
    $stmt_check_owner->close();

    if ($user_role !== 'admin' && $project_client_id_original !== $user_id) {
        send_json_response(403, ['error' => 'Forbidden: You do not have permission to update this project.']);
    }

    $conn->begin_transaction();
    try {
        $fields_to_update = [];
        $params = [];
        $types = "";

        if ($user_role === 'admin' && isset($data['client_id'])) {
            $new_client_id = (int)$data['client_id'];
            $stmt_new_client_check = $conn->prepare("SELECT id, role FROM users WHERE id = ?");
            if (!$stmt_new_client_check) { throw new Exception('Server error preparing new client validation.'); }
            $stmt_new_client_check->bind_param("i", $new_client_id);
            if (!$stmt_new_client_check->execute()) { throw new Exception('Server error executing new client validation.'); }
            $result_new_client_check = $stmt_new_client_check->get_result();
            if ($result_new_client_check->num_rows === 0) {
                throw new Exception("New client_id '{$new_client_id}' not found.");
            }
            $new_client_data = $result_new_client_check->fetch_assoc();
            if ($new_client_data['role'] !== 'client') {
                throw new Exception("User '{$new_client_id}' is not a client. Project can only be assigned to a client user.");
            }
            $stmt_new_client_check->close();
            $fields_to_update[] = "client_id = ?"; $params[] = $new_client_id; $types .= "i";
        }

        if (isset($data['title'])) {
            $fields_to_update[] = "title = ?"; $params[] = $data['title']; $types .= "s";
        }
        if (isset($data['description'])) {
            $fields_to_update[] = "description = ?"; $params[] = $data['description']; $types .= "s";
        }
        if (array_key_exists('freelancer_id', $data)) {
            $assign_freelancer_id = $data['freelancer_id'] === null ? null : (int)$data['freelancer_id'];
            if ($assign_freelancer_id !== null) {
                $stmt_f_check_update = $conn->prepare("SELECT role FROM users WHERE id = ?");
                if (!$stmt_f_check_update) { throw new Exception('Server error: Freelancer validation prep failed.');}
                $stmt_f_check_update->bind_param("i", $assign_freelancer_id);
                if (!$stmt_f_check_update->execute()) { throw new Exception('Server error: Freelancer validation exec failed.');}
                $res_f_check_update = $stmt_f_check_update->get_result();
                if ($res_f_check_update->num_rows === 0) { throw new Exception('Assigned freelancer for update not found.'); }
                if ($res_f_check_update->fetch_assoc()['role'] !== 'freelancer') { throw new Exception('Assigned user for update is not a freelancer.');}
                $stmt_f_check_update->close();
            }
            $fields_to_update[] = "freelancer_id = ?"; $params[] = $assign_freelancer_id; $types .= "i";
        }
        if (isset($data['status'])) {
            $valid_project_statuses_update = ['open', 'pending_approval', 'in_progress', 'completed', 'cancelled', 'archived'];
            if (!in_array($data['status'], $valid_project_statuses_update)) {
                throw new Exception('Invalid project status for update.');
            }
            $fields_to_update[] = "status = ?"; $params[] = $data['status']; $types .= "s";
        }

        $project_table_updated = false;
        if (!empty($fields_to_update)) {
            $fields_to_update[] = "updated_at = NOW()";
            $sql_update_project_table = "UPDATE projects SET " . implode(", ", $fields_to_update) . " WHERE id = ?";
            $current_params_for_project = $params;
            $current_params_for_project[] = $project_id;
            $current_types_for_project = $types . "i";

            $stmt_update_project_table = $conn->prepare($sql_update_project_table);
            if ($stmt_update_project_table === false) {
                throw new Exception('Failed to prepare project table update statement: ' . $conn->error);
            }
            if (strlen($current_types_for_project) !== count($current_params_for_project)){
                 throw new Exception('Param count mismatch for projects table update. Types: '.$current_types_for_project.' Params: '.count($current_params_for_project));
            }
             if (!empty($current_types_for_project)) { // Check if there are params to bind
                $stmt_update_project_table->bind_param($current_types_for_project, ...$current_params_for_project);
             }

            if (!$stmt_update_project_table->execute()) {
                throw new Exception('Failed to update project details in projects table: ' . $stmt_update_project_table->error);
            }
            if($stmt_update_project_table->affected_rows > 0) $project_table_updated = true;
            $stmt_update_project_table->close();
        }

        $skills_table_updated = false;
        if (isset($data['skill_ids']) && is_array($data['skill_ids'])) {
            $skill_ids_for_project = array_map('intval', $data['skill_ids']);

            $stmt_delete_proj_skills = $conn->prepare("DELETE FROM project_skills WHERE project_id = ?");
            if (!$stmt_delete_proj_skills) { throw new Exception('Failed to prepare deleting project skills. ' . $conn->error); }
            $stmt_delete_proj_skills->bind_param("i", $project_id);
            if (!$stmt_delete_proj_skills->execute()) { throw new Exception('Failed to delete project skills. ' . $stmt_delete_proj_skills->error); }
            // We consider skills updated if the key 'skill_ids' is present, even if it's empty (means remove all)
            // or if rows were deleted or inserted.
            if ($stmt_delete_proj_skills->affected_rows > 0 || !empty($skill_ids_for_project)) {
                $skills_table_updated = true;
            }
            $stmt_delete_proj_skills->close();

            if (!empty($skill_ids_for_project)) {
                $proj_skill_placeholders = implode(',', array_fill(0, count($skill_ids_for_project), '?'));
                $stmt_check_valid_proj_skills = $conn->prepare("SELECT id FROM skills WHERE id IN ($proj_skill_placeholders)");
                if (!$stmt_check_valid_proj_skills) { throw new Exception('Failed to prepare project skill ID validation. ' . $conn->error); }
                $proj_skill_types = str_repeat('i', count($skill_ids_for_project));
                $stmt_check_valid_proj_skills->bind_param($proj_skill_types, ...$skill_ids_for_project);
                if (!$stmt_check_valid_proj_skills->execute()) { throw new Exception('Failed to execute project skill ID validation. ' . $stmt_check_valid_proj_skills->error); }
                $valid_proj_skill_result = $stmt_check_valid_proj_skills->get_result();
                if ($valid_proj_skill_result->num_rows !== count($skill_ids_for_project)) {
                    throw new Exception('One or more provided skill IDs for project are invalid.');
                }
                $stmt_check_valid_proj_skills->close();

                $sql_insert_project_skill = "INSERT INTO project_skills (project_id, skill_id) VALUES (?, ?)";
                $stmt_insert_proj_skill = $conn->prepare($sql_insert_project_skill);
                if (!$stmt_insert_proj_skill) { throw new Exception('Failed to prepare adding project skill. ' . $conn->error); }

                $inserted_skill_rows = 0;
                foreach ($skill_ids_for_project as $skill_id_proj) {
                    $stmt_insert_proj_skill->bind_param("ii", $project_id, $skill_id_proj);
                    if (!$stmt_insert_proj_skill->execute()) {
                        throw new Exception('Failed to add skill ID ' . $skill_id_proj . ' for project. ' . $stmt_insert_proj_skill->error);
                    }
                    if ($stmt_insert_proj_skill->affected_rows > 0) $inserted_skill_rows++;
                }
                $stmt_insert_proj_skill->close();
                if ($inserted_skill_rows > 0) $skills_table_updated = true;
            }
        }

        if (!$project_table_updated && !$skills_table_updated && !(isset($data['skill_ids']) && empty($data['skill_ids']))) {
            // This condition means no project fields were in $data to update (so $fields_to_update was empty)
            // AND skill_ids was not provided at all (so no attempt to clear/update skills)
            // OR skill_ids was provided but was identical to existing skills (not easily checkable here without fetching old skills)
            // For simplicity now, if fields_to_update is empty and skill_ids key wasn't even set, it's "no data".
            // If skill_ids was set (even if empty, meaning "remove all skills"), it's an update.
            if (empty($fields_to_update) && !isset($data['skill_ids'])) {
                 $conn->rollback(); // Nothing to commit
                 send_json_response(200, ['message' => 'No update data provided for project or skills.']);
            }
        }

        $conn->commit();
        send_json_response(200, ['message' => 'Project details and/or skills updated successfully.']);

    } catch (Exception $e) {
        $conn->rollback();
        if (strpos($e->getMessage(), 'Duplicate entry') !== false || strpos($e->getMessage(), 'already exists') !== false) {
            send_json_response(409, ['error' => $e->getMessage()]);
        } elseif (strpos($e->getMessage(), 'not found') !== false) {
            send_json_response(404, ['error' => $e->getMessage()]);
        } else {
            send_json_response(500, ['error' => 'Failed to update project: ' . $e->getMessage()]);
        }
    }
}
// END MODIFIED: update_project
elseif ($action === 'delete_project' && $method === 'DELETE') {
elseif ($action === 'delete_project' && $method === 'DELETE') {
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
