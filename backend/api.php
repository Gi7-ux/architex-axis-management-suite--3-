<?php
header("Access-Control-Allow-Origin: *"); // Allow requests from any origin (for development)
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS"); // Allow common methods
header("Access-Control-Max-Age: 3600"); // Cache preflight request for 1 hour
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

// Include database connection
require_once 'db_connect.php'; // $conn will be available from this file

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

// --- Projects API ---
if ($action === 'get_projects' && $method === 'GET') {
    // Fetch all projects
    $sql = "SELECT id, title, description, client_id, freelancer_id, status, created_at, updated_at FROM projects ORDER BY created_at DESC";
    $result = $conn->query($sql);

    if ($result) {
        $projects = [];
        while ($row = $result->fetch_assoc()) {
            $projects[] = $row;
        }
        send_json_response(200, $projects);
    } else {
        send_json_response(500, ['error' => 'Failed to fetch projects: ' . $conn->error]);
    }
} elseif ($action === 'create_project' && $method === 'POST') {
    // Create a new project
    $data = json_decode(file_get_contents('php://input'), true);

    // Basic validation (can be expanded)
    if (empty($data['title']) || empty($data['description']) || empty($data['client_id'])) {
        send_json_response(400, ['error' => 'Missing required fields: title, description, client_id.']);
    }

    $title = $data['title'];
    $description = $data['description'];
    $client_id = (int)$data['client_id']; // Ensure client_id is an integer
    // freelancer_id is optional, status can have a default

    $freelancer_id = isset($data['freelancer_id']) ? (int)$data['freelancer_id'] : null;
    $status = isset($data['status']) ? $data['status'] : 'open'; // Default status

    $stmt = $conn->prepare("INSERT INTO projects (title, description, client_id, freelancer_id, status) VALUES (?, ?, ?, ?, ?)");
    if ($stmt === false) {
        send_json_response(500, ['error' => 'Failed to prepare statement: ' . $conn->error]);
    }

    $stmt->bind_param("ssiis", $title, $description, $client_id, $freelancer_id, $status);

    if ($stmt->execute()) {
        $new_project_id = $stmt->insert_id;
        send_json_response(201, ['message' => 'Project created successfully.', 'project_id' => $new_project_id]);
    } else {
        send_json_response(500, ['error' => 'Failed to create project: ' . $stmt->error]);
    }
    $stmt->close();
} elseif ($action === 'update_project' && $method === 'PUT') {
    // Update an existing project
    $project_id = isset($_GET['id']) ? (int)$_GET['id'] : null;
    if (!$project_id) {
        send_json_response(400, ['error' => 'Project ID is required.']);
    }

    $data = json_decode(file_get_contents('php://input'), true);

    // Basic validation
    if (empty($data['title']) && empty($data['description']) && empty($data['freelancer_id']) && empty($data['status'])) {
        send_json_response(400, ['error' => 'No fields to update. Provide at least one field: title, description, freelancer_id, status.']);
    }

    // Build the SQL query dynamically based on provided fields
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
    if (isset($data['freelancer_id'])) {
        $fields_to_update[] = "freelancer_id = ?";
        $params[] = (int)$data['freelancer_id']; // Ensure integer
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

    $sql = "UPDATE projects SET " . implode(", ", $fields_to_update) . " WHERE id = ?";
    $params[] = $project_id;
    $types .= "i";

    $stmt = $conn->prepare($sql);
    if ($stmt === false) {
        send_json_response(500, ['error' => 'Failed to prepare statement: ' . $conn->error]);
    }

    $stmt->bind_param($types, ...$params);

    if ($stmt->execute()) {
        if ($stmt->affected_rows > 0) {
            send_json_response(200, ['message' => 'Project updated successfully.']);
        } else {
            send_json_response(404, ['message' => 'Project not found or no changes made.']);
        }
    } else {
        send_json_response(500, ['error' => 'Failed to update project: ' . $stmt->error]);
    }
    $stmt->close();
} elseif ($action === 'delete_project' && $method === 'DELETE') {
    // Delete a project
    $project_id = isset($_GET['id']) ? (int)$_GET['id'] : null;
    if (!$project_id) {
        send_json_response(400, ['error' => 'Project ID is required.']);
    }

    $stmt = $conn->prepare("DELETE FROM projects WHERE id = ?");
    if ($stmt === false) {
        send_json_response(500, ['error' => 'Failed to prepare statement: ' . $conn->error]);
    }

    $stmt->bind_param("i", $project_id);

    if ($stmt->execute()) {
        if ($stmt->affected_rows > 0) {
            send_json_response(200, ['message' => 'Project deleted successfully.']);
        } else {
            send_json_response(404, ['message' => 'Project not found.']);
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
