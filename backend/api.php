<?php
// Allow requests from any origin (for development).
// For production, you should restrict this to your frontend's domain.

// Composer Autoloader
require_once __DIR__ . '/vendor/autoload.php';

// JWT Library is now loaded via Composer

use Firebase\JWT\JWT;
use Firebase\JWT\Key;

// Define a secret key for signing the JWT. This should be stored securely and not hardcoded in production.
// For now, we'll define it here. In a real app, use an environment variable.
// JWT_SECRET_KEY and JWT_ALGORITHM are now defined in config.php (included via db_connect.php)

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json; charset=UTF-8");

// Handle OPTIONS request (pre-flight request)
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(204); // No Content for OPTIONS
    exit(0);
}

// Include the database connection script
require_once 'db_connect.php'; // $conn variable is now available

// Get the HTTP method
$method = $_SERVER['REQUEST_METHOD'];

// A simple way to get the action from the URL, e.g., /api.php?action=getUsers
// For a more robust API, consider a dedicated routing library or a more structured URL pattern.
$action = isset($_GET['action']) ? $_GET['action'] : null;

// Get input data
$input = [];

// Helper function to get and decode JWT from Authorization header
function getDecodedJwt() {
    $authHeader = null;
    if (isset($_SERVER['Authorization'])) {
        $authHeader = $_SERVER['Authorization'];
    } elseif (isset($_SERVER['HTTP_AUTHORIZATION'])) { // Nginx or fast CGI
        $authHeader = $_SERVER['HTTP_AUTHORIZATION'];
    } elseif (function_exists('apache_request_headers')) {
        $requestHeaders = apache_request_headers();
        // Server-side fix for bug in old Android versions (a nice to have)
        if (isset($requestHeaders['Authorization'])) {
            $authHeader = $requestHeaders['Authorization'];
        }
    }

    if (!$authHeader) {
        http_response_code(401); // Unauthorized
        echo json_encode(['status' => 'error', 'message' => 'Authorization header not found.']);
        exit;
    }

    list($jwt) = sscanf($authHeader, 'Bearer %s');

    if (!$jwt) {
        http_response_code(401); // Unauthorized
        echo json_encode(['status' => 'error', 'message' => 'Bearer token not found in Authorization header.']);
        exit;
    }

    try {
        $decoded = JWT::decode($jwt, new Key(JWT_SECRET_KEY, JWT_ALGORITHM));
        return (array) $decoded->data; // Return user data from JWT payload
    } catch (Firebase\JWT\ExpiredException $e) {
        http_response_code(401); // Unauthorized
        echo json_encode(['status' => 'error', 'message' => 'Token has expired.']);
        exit;
    } catch (Firebase\JWT\SignatureInvalidException $e) {
        http_response_code(401); // Unauthorized
        echo json_encode(['status' => 'error', 'message' => 'Token signature invalid.']);
        exit;
    } catch (Firebase\JWT\BeforeValidException $e) {
        http_response_code(401); // Unauthorized
        echo json_encode(['status' => 'error', 'message' => 'Token not yet valid.']);
        exit;
    } catch (Exception $e) {
        http_response_code(401); // Unauthorized
        echo json_encode(['status' => 'error', 'message' => 'Invalid token: ' . $e->getMessage()]);
        exit;
    }
}

// Helper function to check if a user is authorized for messaging in a specific job context
function isUserAuthorizedForJobMessaging($userId, $userRole, $jobId, $conn) {
    if ($userRole === 'admin') {
        return true; // Admins can access any job's messages
    }

    // Check if the user is the client for the job
    $sql_check_client = "SELECT client_id FROM jobs WHERE id = ? LIMIT 1";
    $stmt_check_client = $conn->prepare($sql_check_client);
    if ($stmt_check_client) {
        $stmt_check_client->bind_param("i", $jobId);
        $stmt_check_client->execute();
        $result_client = $stmt_check_client->get_result();
        if ($client_row = $result_client->fetch_assoc()) {
            if ($client_row['client_id'] == $userId) {
                $stmt_check_client->close();
                return true;
            }
        }
        $stmt_check_client->close();
    } else {
        error_log("Error preparing client check statement for job messaging auth: " . $conn->error);
        return false; // Fail safe
    }

    // Check if the user is an assigned freelancer for the job
    // This assumes a 'job_assignments' table linking jobs to freelancers
    // TODO: Adjust table and column names if your schema is different (e.g., 'job_freelancers', 'user_id' instead of 'freelancer_id')
    $sql_check_freelancer = "SELECT freelancer_id FROM job_assignments WHERE job_id = ? AND freelancer_id = ? LIMIT 1";
    $stmt_check_freelancer = $conn->prepare($sql_check_freelancer);
    if ($stmt_check_freelancer) {
        $stmt_check_freelancer->bind_param("ii", $jobId, $userId);
        $stmt_check_freelancer->execute();
        $result_freelancer = $stmt_check_freelancer->get_result();
        if ($result_freelancer->num_rows > 0) {
            $stmt_check_freelancer->close();
            return true;
        }
        $stmt_check_freelancer->close();
    } else {
        error_log("Error preparing freelancer check statement for job messaging auth: " . $conn->error);
        return false; // Fail safe
    }
    
    return false; // Not authorized if none of the above
}


if ($method == "POST" || $method == "PUT" || $method == "DELETE") { // DELETE might also have a body, or use query params
    $json_input = file_get_contents('php://input');
    if (!empty($json_input)) {
        $input = json_decode($json_input, true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            http_response_code(400);
            echo json_encode(["message" => "Invalid JSON input: " . json_last_error_msg()]);
            exit;
        }
    }
} else if ($method == "GET") {
    $input = $_GET; // For GET requests, parameters are usually in the query string
}

$response = [];

// Basic routing based on the 'action' parameter
switch ($action) {
    case 'getUsers':
        if ($method == 'GET') {
            $currentUser = getDecodedJwt(); // Protect this route
            // Example: Restrict access or filter data based on $currentUser['role'] or $currentUser['userId'] if needed
            // if ($currentUser['role'] !== 'admin') {
            //    http_response_code(403); // Forbidden
            //    echo json_encode(['status' => 'error', 'message' => 'Access denied.']);
            //    exit;
            // }

            $sql = "SELECT id, username, email, first_name, last_name, role, profile_picture_url, contact_number, address, bio, is_active, last_login_at FROM users";
            $stmt = $conn->prepare($sql);
            
            if ($stmt === false) {
                $response['status'] = 'error';
                $response['message'] = 'Error preparing statement: ' . $conn->error;
                http_response_code(500);
            } else {
                if ($stmt->execute()) {
                    $result = $stmt->get_result();
                    $users = [];
                    while($row = $result->fetch_assoc()) {
                        $users[] = $row;
                    }
                    $response['status'] = 'success';
                    $response['data'] = $users;
                    http_response_code(200);
                } else {
                    $response['status'] = 'error';
                    $response['message'] = "Error executing statement: " . $stmt->error;
                    http_response_code(500);
                }
                $stmt->close();
            }
        } else {
            $response['status'] = 'error';
            $response['message'] = "Invalid request method for action: getUsers. Expected GET.";
            http_response_code(405); // Method Not Allowed
        }
        break;
    
    case 'login':
        if ($method == 'POST') {
            if (!isset($input['email']) || !isset($input['password'])) {
                $response['status'] = 'error';
                $response['message'] = 'Email and password are required.';
                http_response_code(400);
                break;
            }

            $email = trim($input['email']);
            $password = $input['password'];

            $sql = "SELECT id, username, email, first_name, last_name, role, password_hash, profile_picture_url, is_active FROM users WHERE email = ? LIMIT 1";
            $stmt = $conn->prepare($sql);
            if ($stmt === false) {
                $response['status'] = 'error';
                $response['message'] = 'Error preparing statement: ' . $conn->error;
                http_response_code(500);
                break;
            }
            $stmt->bind_param("s", $email);
            $stmt->execute();
            $result = $stmt->get_result();
            $user = $result->fetch_assoc();
            $stmt->close();

            if ($user && password_verify($password, $user['password_hash'])) {
                if (!$user['is_active']) {
                    $response['status'] = 'error';
                    $response['message'] = 'Account is inactive. Please contact support.';
                    http_response_code(403); // Forbidden
                    break;
                }

                // Password is correct, generate JWT
                $issuedAt = time();
                $expirationTime = $issuedAt + (60 * 60 * 24); // Token valid for 24 hours
                $payload = [
                    'iat' => $issuedAt,
                    'exp' => $expirationTime,
                    'data' => [
                        'userId' => $user['id'],
                        'username' => $user['username'],
                        'role' => $user['role'],
                        'email' => $user['email']
                    ]
                ];

                $jwt = JWT::encode($payload, JWT_SECRET_KEY, JWT_ALGORITHM);

                // Remove password_hash from user data before sending
                unset($user['password_hash']);

                $response['status'] = 'success';
                $response['message'] = 'Login successful.';
                $response['data'] = [
                    'token' => $jwt,
                    'user' => $user
                ];
                http_response_code(200);

                // Update last_login_at
                $updateSql = "UPDATE users SET last_login_at = NOW() WHERE id = ?";
                $updateStmt = $conn->prepare($updateSql);
                if ($updateStmt) {
                    $updateStmt->bind_param("i", $user['id']);
                    $updateStmt->execute();
                    $updateStmt->close();
                }

            } else {
                $response['status'] = 'error';
                $response['message'] = 'Invalid email or password.';
                http_response_code(401); // Unauthorized
            }
        } else {
            $response['status'] = 'error';
            $response['message'] = "Invalid request method for action: login. Expected POST.";
            http_response_code(405); // Method Not Allowed
        }
        break;

    case 'createUser':
        if ($method == 'POST') {
            // Validate input (basic example)
            if (!isset($input['username']) || !isset($input['email']) || !isset($input['password']) || !isset($input['role'])) {
                $response['status'] = 'error';
                $response['message'] = 'Missing required fields (username, email, password, role).';
                http_response_code(400);
                break;
            }

            $username = trim($input['username']);
            $email = trim($input['email']);
            $password = $input['password']; // Raw password from frontend
            $role = $input['role'];
            
            // Optional fields
            $first_name = isset($input['first_name']) ? trim($input['first_name']) : null;
            $last_name = isset($input['last_name']) ? trim($input['last_name']) : null;

            // Validate email format
            if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
                $response['status'] = 'error';
                $response['message'] = 'Invalid email format.';
                http_response_code(400);
                break;
            }

            // Validate role
            $allowed_roles = ['admin', 'client', 'freelancer'];
            if (!in_array($role, $allowed_roles)) {
                $response['status'] = 'error';
                $response['message'] = 'Invalid role specified.';
                http_response_code(400);
                break;
            }

            // Hash the password
            $password_hash = password_hash($password, PASSWORD_DEFAULT);
            if ($password_hash === false) {
                $response['status'] = 'error';
                $response['message'] = 'Error hashing password.';
                http_response_code(500);
                break;
            }

            // Prepare SQL statement to prevent SQL injection
            $sql = "INSERT INTO users (username, email, password_hash, role, first_name, last_name) VALUES (?, ?, ?, ?, ?, ?)";
            $stmt = $conn->prepare($sql);
            
            if ($stmt === false) {
                $response['status'] = 'error';
                $response['message'] = 'Error preparing statement: ' . $conn->error;
                http_response_code(500);
                break;
            }
            
            $stmt->bind_param("ssssss", $username, $email, $password_hash, $role, $first_name, $last_name);

            if ($stmt->execute()) {
                $new_user_id = $stmt->insert_id;
                $response['status'] = 'success';
                $response['message'] = 'User created successfully.';
                $response['data'] = ['id' => $new_user_id, 'username' => $username, 'email' => $email, 'role' => $role, 'first_name' => $first_name, 'last_name' => $last_name];
                http_response_code(201); // Created
            } else {
                // Check for duplicate entry (MySQL error code 1062)
                if ($conn->errno == 1062) {
                    $response['status'] = 'error';
                    $response['message'] = 'Username or email already exists.';
                    http_response_code(409); // Conflict
                } else {
                    $response['status'] = 'error';
                    $response['message'] = 'Error creating user: ' . $stmt->error;
                    http_response_code(500);
                }
            }
            $stmt->close();
        } else {
            $response['status'] = 'error';
            $response['message'] = "Invalid request method for action: createUser. Expected POST.";
            http_response_code(405); // Method Not Allowed
        }
        break;

    case 'getJobMessageThread':
        if ($method == 'GET') {
            $currentUser = getDecodedJwt();
            $current_user_id = $currentUser['userId'];
            $current_user_role = $currentUser['role'];

            if (!isset($input['job_id'])) {
                $response['status'] = 'error';
                $response['message'] = 'job_id is required.';
                http_response_code(400);
                break;
            }

            $job_id = filter_var($input['job_id'], FILTER_VALIDATE_INT);

            if ($job_id === false || $job_id <= 0) {
                $response['status'] = 'error';
                $response['message'] = 'Invalid job_id.';
                http_response_code(400);
                break;
            }

            if (!isUserAuthorizedForJobMessaging($current_user_id, $current_user_role, $job_id, $conn)) {
                $response['status'] = 'error';
                $response['message'] = 'Forbidden: You are not authorized to view messages for this job.';
                http_response_code(403);
                break;
            }

            $thread_id = null;
            $thread_title = null;

            $sql_find_thread = "SELECT id, title FROM message_threads WHERE job_id = ? LIMIT 1";
            $stmt_find_thread = $conn->prepare($sql_find_thread);

            if (!$stmt_find_thread) {
                $response['status'] = 'error';
                $response['message'] = 'Error preparing to find thread: ' . $conn->error;
                http_response_code(500);
                break;
            }
            
            $stmt_find_thread->bind_param("i", $job_id);
            $stmt_find_thread->execute();
            $result_thread = $stmt_find_thread->get_result();
            if ($thread_row = $result_thread->fetch_assoc()) {
                $thread_id = $thread_row['id'];
                $thread_title = $thread_row['title'];
            }
            $stmt_find_thread->close();

            if ($thread_id === null) {
                $response['status'] = 'success';
                $response['message'] = 'No message thread found for this job.';
                $response['data'] = ['thread_id' => null, 'job_id' => $job_id, 'messages' => []];
                http_response_code(200); // Or 404 if preferred when no thread exists
                break;
            }

            // Fetch messages
            $messages = [];
            // Base query to fetch messages and sender's username
            $sql_messages = "SELECT m.id, m.thread_id, m.sender_id, u.username as sender_username, m.content, m.sent_at, m.status, m.is_edited, m.edited_at
                             FROM messages m
                             JOIN users u ON m.sender_id = u.id
                             WHERE m.thread_id = ?";

            // Append conditions based on user role for moderation
            if ($current_user_role !== 'admin') {
                $sql_messages .= " AND (m.status = 'approved' OR (m.status = 'pending_approval' AND m.sender_id = ?))";
            }
            $sql_messages .= " ORDER BY m.sent_at ASC";

            $stmt_messages = $conn->prepare($sql_messages);
            if (!$stmt_messages) {
                $response['status'] = 'error';
                $response['message'] = 'Error preparing to fetch messages: ' . $conn->error;
                http_response_code(500);
                break;
            }

            if ($current_user_role !== 'admin') {
                $stmt_messages->bind_param("ii", $thread_id, $current_user_id);
            } else {
                $stmt_messages->bind_param("i", $thread_id);
            }
            
            if ($stmt_messages->execute()) {
                $result_messages = $stmt_messages->get_result();
                while($msg_row = $result_messages->fetch_assoc()) {
                    // Convert is_edited to boolean if it's stored as tinyint
                    $msg_row['is_edited'] = (bool)$msg_row['is_edited'];
                    $messages[] = $msg_row;
                }
                $response['status'] = 'success';
                $response['data'] = [
                    'thread_id' => $thread_id,
                    'job_id' => $job_id,
                    'thread_title' => $thread_title, // Added thread title
                    'messages' => $messages
                ];
                http_response_code(200);
            } else {
                $response['status'] = 'error';
                $response['message'] = 'Error fetching messages: ' . $stmt_messages->error;
                http_response_code(500);
            }
            $stmt_messages->close();

        } else {
            $response['status'] = 'error';
            $response['message'] = "Invalid request method for action: getJobMessageThread. Expected GET.";
            http_response_code(405); // Method Not Allowed
        }
        break;

    case 'postMessageToThread':
        if ($method == 'POST') {
            $currentUser = getDecodedJwt();
            $sender_id = $currentUser['userId'];
            $sender_role = $currentUser['role'];

            if (!isset($input['job_id']) || !isset($input['content'])) {
                $response['status'] = 'error';
                $response['message'] = 'job_id and content are required.';
                http_response_code(400);
                break;
            }

            $job_id = filter_var($input['job_id'], FILTER_VALIDATE_INT);
            $content = trim($input['content']);
            $attachment_id = isset($input['attachment_id']) ? filter_var($input['attachment_id'], FILTER_VALIDATE_INT) : null;

            if ($job_id === false || $job_id <= 0) {
                $response['status'] = 'error';
                $response['message'] = 'Invalid job_id.';
                http_response_code(400);
                break;
            }
            if (empty($content)) {
                $response['status'] = 'error';
                $response['message'] = 'Message content cannot be empty.';
                http_response_code(400);
                break;
            }

            if (!isUserAuthorizedForJobMessaging($sender_id, $sender_role, $job_id, $conn)) {
                $response['status'] = 'error';
                $response['message'] = 'Forbidden: You are not authorized to post messages for this job.';
                http_response_code(403);
                break;
            }

            $thread_id = null;
            // Find or create thread
            $sql_find_thread = "SELECT id FROM message_threads WHERE job_id = ? LIMIT 1";
            $stmt_find_thread = $conn->prepare($sql_find_thread);
            if ($stmt_find_thread) {
                $stmt_find_thread->bind_param("i", $job_id);
                $stmt_find_thread->execute();
                $result_thread = $stmt_find_thread->get_result();
                if ($thread_row = $result_thread->fetch_assoc()) {
                    $thread_id = $thread_row['id'];
                }
                $stmt_find_thread->close();
            } else {
                $response['status'] = 'error';
                $response['message'] = 'Error preparing to find message thread: ' . $conn->error;
                http_response_code(500);
                break;
            }

            if ($thread_id === null) {
                // Create new thread
                // For title, we could fetch job title or leave it null for now
                $sql_create_thread = "INSERT INTO message_threads (job_id, title) VALUES (?, NULL)";
                $stmt_create_thread = $conn->prepare($sql_create_thread);
                if ($stmt_create_thread) {
                    $stmt_create_thread->bind_param("i", $job_id);
                    if ($stmt_create_thread->execute()) {
                        $thread_id = $stmt_create_thread->insert_id;
                    } else {
                        $response['status'] = 'error';
                        $response['message'] = 'Error creating message thread: ' . $stmt_create_thread->error;
                        http_response_code(500);
                        $stmt_create_thread->close();
                        break;
                    }
                    $stmt_create_thread->close();
                } else {
                    $response['status'] = 'error';
                    $response['message'] = 'Error preparing to create message thread: ' . $conn->error;
                    http_response_code(500);
                    break;
                }
            }

            // Determine initial message status
            $message_status = 'sent'; // Default for client/admin
            if ($sender_role === 'freelancer') {
                $message_status = 'pending_approval';
            }

            // Insert message
            $sql_insert_message = "INSERT INTO messages (thread_id, sender_id, content, status) VALUES (?, ?, ?, ?)";
            $stmt_insert_message = $conn->prepare($sql_insert_message);
            if ($stmt_insert_message) {
                $stmt_insert_message->bind_param("iiss", $thread_id, $sender_id, $content, $message_status);
                if ($stmt_insert_message->execute()) {
                    $new_message_id = $stmt_insert_message->insert_id;
                    $response['status'] = 'success';
                    $response['message'] = 'Message posted successfully.';
                    $response['data'] = ['message_id' => $new_message_id, 'thread_id' => $thread_id, 'status' => $message_status];
                    
                    // Link attachment if provided
                    if ($attachment_id && $attachment_id > 0) {
                        $sql_link_attachment = "UPDATE message_attachments SET message_id = ? WHERE id = ? AND uploader_user_id = ? AND message_id IS NULL";
                        $stmt_link_attachment = $conn->prepare($sql_link_attachment);
                        if ($stmt_link_attachment) {
                            $stmt_link_attachment->bind_param("iii", $new_message_id, $attachment_id, $sender_id);
                            if ($stmt_link_attachment->execute()) {
                                if ($stmt_link_attachment->affected_rows > 0) {
                                    $response['data']['attachment_linked'] = true;
                                    $response['data']['linked_attachment_id'] = $attachment_id;
                                } else {
                                    // Attachment not found, already linked, or not owned by user. Log this.
                                    error_log("Failed to link attachment_id: $attachment_id to message_id: $new_message_id for user_id: $sender_id. Or attachment already linked/not found.");
                                    $response['data']['attachment_linking_error'] = 'Could not link attachment. It might be already linked, not found, or not uploaded by you.';
                                }
                            } else {
                                error_log("Error executing link attachment statement: " . $stmt_link_attachment->error);
                                $response['data']['attachment_linking_error'] = 'Database error linking attachment.';
                            }
                            $stmt_link_attachment->close();
                        } else {
                             error_log("Error preparing link attachment statement: " . $conn->error);
                             $response['data']['attachment_linking_error'] = 'Database error preparing to link attachment.';
                        }
                    }
                    http_response_code(201);
                } else {
                    $response['status'] = 'error';
                    $response['message'] = 'Error posting message: ' . $stmt_insert_message->error;
                    http_response_code(500);
                }
                $stmt_insert_message->close();
            } else {
                $response['status'] = 'error';
                $response['message'] = 'Error preparing to post message: ' . $conn->error;
                http_response_code(500);
            }
            // TODO: Attachment handling logic would go here or be a separate call.
        } else {
            $response['status'] = 'error';
            $response['message'] = "Invalid request method for action: postMessageToThread. Expected POST.";
            http_response_code(405); // Method Not Allowed
        }
        break;

    case 'approveMessage': // Admin only
        if ($method == 'POST') {
            $currentUser = getDecodedJwt();
            if ($currentUser['role'] !== 'admin') {
                $response['status'] = 'error';
                $response['message'] = 'Forbidden: Only admins can approve messages.';
                http_response_code(403);
                break;
            }

            if (!isset($input['message_id'])) {
                $response['status'] = 'error';
                $response['message'] = 'message_id is required.';
                http_response_code(400);
                break;
            }

            $message_id = filter_var($input['message_id'], FILTER_VALIDATE_INT);
            if ($message_id === false || $message_id <= 0) {
                $response['status'] = 'error';
                $response['message'] = 'Invalid message_id.';
                http_response_code(400);
                break;
            }

            $sql = "UPDATE messages SET status = 'approved' WHERE id = ? AND status = 'pending_approval'";
            $stmt = $conn->prepare($sql);

            if (!$stmt) {
                $response['status'] = 'error';
                $response['message'] = 'Error preparing statement: ' . $conn->error;
                http_response_code(500);
                break;
            }

            $stmt->bind_param("i", $message_id);
            if ($stmt->execute()) {
                if ($stmt->affected_rows > 0) {
                    $response['status'] = 'success';
                    $response['message'] = 'Message approved successfully.';
                    http_response_code(200);
                } else {
                    $response['status'] = 'error';
                    $response['message'] = 'Message not found, not pending approval, or already approved.';
                    http_response_code(404); // Or 422 if you prefer for unprocessable entity
                }
            } else {
                $response['status'] = 'error';
                $response['message'] = 'Error approving message: ' . $stmt->error;
                http_response_code(500);
            }
            $stmt->close();
        } else {
            $response['status'] = 'error';
            $response['message'] = "Invalid request method for action: approveMessage. Expected POST.";
            http_response_code(405);
        }
        break;

    case 'rejectMessage': // Admin only
        if ($method == 'POST') {
            $currentUser = getDecodedJwt();
            if ($currentUser['role'] !== 'admin') {
                $response['status'] = 'error';
                $response['message'] = 'Forbidden: Only admins can reject messages.';
                http_response_code(403);
                break;
            }

            if (!isset($input['message_id'])) {
                $response['status'] = 'error';
                $response['message'] = 'message_id is required.';
                http_response_code(400);
                break;
            }

            $message_id = filter_var($input['message_id'], FILTER_VALIDATE_INT);
            if ($message_id === false || $message_id <= 0) {
                $response['status'] = 'error';
                $response['message'] = 'Invalid message_id.';
                http_response_code(400);
                break;
            }

            // Optional: Add logic here to log a reason for rejection if provided in $input['reason']
            // For now, just updating status.

            $sql = "UPDATE messages SET status = 'rejected' WHERE id = ? AND status = 'pending_approval'";
            $stmt = $conn->prepare($sql);

            if (!$stmt) {
                $response['status'] = 'error';
                $response['message'] = 'Error preparing statement: ' . $conn->error;
                http_response_code(500);
                break;
            }

            $stmt->bind_param("i", $message_id);
            if ($stmt->execute()) {
                if ($stmt->affected_rows > 0) {
                    $response['status'] = 'success';
                    $response['message'] = 'Message rejected successfully.';
                    http_response_code(200);
                } else {
                    $response['status'] = 'error';
                    $response['message'] = 'Message not found or not pending approval.';
                    http_response_code(404);
                }
            } else {
                $response['status'] = 'error';
                $response['message'] = 'Error rejecting message: ' . $stmt->error;
                http_response_code(500);
            }
            $stmt->close();
        } else {
            $response['status'] = 'error';
            $response['message'] = "Invalid request method for action: rejectMessage. Expected POST.";
            http_response_code(405);
        }
        break;

    case 'uploadMessageAttachment':
        if ($method == 'POST') {
            $currentUser = getDecodedJwt();
            $uploader_user_id = $currentUser['userId'];

            // Get job_id from POST data, not $input as it's multipart/form-data
            if (!isset($_POST['job_id'])) {
                $response['status'] = 'error';
                $response['message'] = 'job_id is required for attachment upload.';
                http_response_code(400);
                break;
            }
            $job_id = filter_var($_POST['job_id'], FILTER_VALIDATE_INT);
            if ($job_id === false || $job_id <= 0) {
                $response['status'] = 'error';
                $response['message'] = 'Invalid job_id for attachment upload.';
                http_response_code(400);
                break;
            }

            if (!isUserAuthorizedForJobMessaging($uploader_user_id, $currentUser['role'], $job_id, $conn)) {
                $response['status'] = 'error';
                $response['message'] = 'Forbidden: You are not authorized to upload attachments for this job.';
                http_response_code(403);
                break;
            }

            if (!isset($_FILES['attachmentFile']) || $_FILES['attachmentFile']['error'] !== UPLOAD_ERR_OK) {
                $upload_errors = [
                    UPLOAD_ERR_INI_SIZE   => "The uploaded file exceeds the upload_max_filesize directive in php.ini.",
                    UPLOAD_ERR_FORM_SIZE  => "The uploaded file exceeds the MAX_FILE_SIZE directive that was specified in the HTML form.",
                    UPLOAD_ERR_PARTIAL    => "The uploaded file was only partially uploaded.",
                    UPLOAD_ERR_NO_FILE    => "No file was uploaded.",
                    UPLOAD_ERR_NO_TMP_DIR => "Missing a temporary folder.",
                    UPLOAD_ERR_CANT_WRITE => "Failed to write file to disk.",
                    UPLOAD_ERR_EXTENSION  => "A PHP extension stopped the file upload.",
                ];
                $error_message = isset($_FILES['attachmentFile']['error']) ? ($upload_errors[$_FILES['attachmentFile']['error']] ?? "Unknown upload error.") : "No file uploaded or upload error.";
                $response['status'] = 'error';
                $response['message'] = $error_message;
                http_response_code(400);
                break;
            }

            $file = $_FILES['attachmentFile'];
            $original_filename = basename($file['name']);
            $file_tmp_path = $file['tmp_name'];
            $file_size = $file['size'];
            
            // Validate file type (MIME type)
            $finfo = finfo_open(FILEINFO_MIME_TYPE);
            $mime_type = finfo_file($finfo, $file_tmp_path);
            finfo_close($finfo);

            // Define allowed MIME types and max file size (should be in config.php ideally)
            // Reduced max size for practicality on shared hosting. 500MB is too large.
            $allowed_mime_types = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
            $max_file_size = 5 * 1024 * 1024; // 5MB

            if (!in_array($mime_type, $allowed_mime_types)) {
                $response['status'] = 'error';
                $response['message'] = 'Invalid file type. Allowed types: ' . implode(', ', $allowed_mime_types);
                http_response_code(415); // Unsupported Media Type
                break;
            }

            if ($file_size > $max_file_size) {
                $response['status'] = 'error';
                $response['message'] = 'File is too large. Maximum size is ' . ($max_file_size / 1024 / 1024) . 'MB.';
                http_response_code(413); // Payload Too Large
                break;
            }

            // Define base upload directory (relative to this script's directory)
            // IMPORTANT: Ensure this directory is writable by the web server user.
            // And secure it with .htaccess if it's within public_html (as per Option A strategy)
            $base_upload_dir = __DIR__ . '/uploads/messaging_attachments/';
            $job_specific_dir = $base_upload_dir . $job_id . '/';
            
            if (!is_dir($job_specific_dir)) {
                if (!mkdir($job_specific_dir, 0755, true)) { // Create recursive, set permissions
                    $response['status'] = 'error';
                    $response['message'] = 'Failed to create upload directory.';
                    http_response_code(500);
                    break;
                }
            }
            
            $file_extension = strtolower(pathinfo($original_filename, PATHINFO_EXTENSION));
            $stored_filename = uniqid('attachment_', true) . '.' . $file_extension;
            $target_path_on_server = $job_specific_dir . $stored_filename;
            
            // Path to store in DB (relative to a known point, e.g., 'uploads/messaging_attachments/...')
            $db_file_path = 'uploads/messaging_attachments/' . $job_id . '/' . $stored_filename;


            if (move_uploaded_file($file_tmp_path, $target_path_on_server)) {
                // Insert into message_attachments table (message_id will be NULL for now)
                $sql_insert_attachment = "INSERT INTO message_attachments (uploader_user_id, original_filename, stored_filename, file_path, mime_type, file_size, message_id) VALUES (?, ?, ?, ?, ?, ?, NULL)";
                $stmt_insert_attachment = $conn->prepare($sql_insert_attachment);

                if (!$stmt_insert_attachment) {
                    $response['status'] = 'error';
                    $response['message'] = 'Error preparing attachment statement: ' . $conn->error;
                    // Potentially delete the uploaded file if DB insert fails
                    unlink($target_path_on_server);
                    http_response_code(500);
                    break;
                }

                $stmt_insert_attachment->bind_param("issssi", $uploader_user_id, $original_filename, $stored_filename, $db_file_path, $mime_type, $file_size);
                
                if ($stmt_insert_attachment->execute()) {
                    $new_attachment_id = $stmt_insert_attachment->insert_id;
                    $response['status'] = 'success';
                    $response['message'] = 'File uploaded successfully.';
                    $response['data'] = [
                        'attachment_id' => $new_attachment_id,
                        'original_filename' => $original_filename,
                        'stored_filename' => $stored_filename,
                        'file_path' => $db_file_path,
                        'mime_type' => $mime_type,
                        'file_size' => $file_size
                    ];
                    http_response_code(201);
                } else {
                    $response['status'] = 'error';
                    $response['message'] = 'Error saving attachment record: ' . $stmt_insert_attachment->error;
                    unlink($target_path_on_server); // Delete orphaned file
                    http_response_code(500);
                }
                $stmt_insert_attachment->close();
            } else {
                $response['status'] = 'error';
                $response['message'] = 'Failed to move uploaded file.';
                http_response_code(500);
            }
        } else {
            $response['status'] = 'error';
            $response['message'] = "Invalid request method for action: uploadMessageAttachment. Expected POST.";
            http_response_code(405);
        }
        break;

    // --- Add more cases for other actions below ---
    default:
        if ($action === null && $method == 'GET') {
             $response['status'] = 'success';
             $response['message'] = 'API is running. Specify an action.';
             http_response_code(200);
        } else {
            $response['status'] = 'error';
            $response['message'] = "Unknown or unsupported action: " . htmlspecialchars($action);
            http_response_code(404); // Not Found
        }
        break;
}

echo json_encode($response);

// Close the database connection
if (isset($conn)) {
    $conn->close();
}
?>
