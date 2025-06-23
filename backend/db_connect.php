<?php
// Load environment variables from .env file if needed
if (file_exists(__DIR__ . '/.env')) {
    $envVars = parse_ini_file(__DIR__ . '/.env');
    foreach ($envVars as $key => $value) {
        putenv("$key=$value");
    }
}

// Use environment variables or fallback to constants
define('DB_SERVER', getenv('DB_SERVER') ?: 'cp60.domains.co.za');
define('DB_USERNAME', getenv('DB_USERNAME') ?: 'architex_greg1');
define('DB_PASSWORD', getenv('DB_PASSWORD') ?: '5cdv8l7vwzlu');
define('DB_NAME', getenv('DB_NAME') ?: 'architex_backend1');

$conn = new mysqli(DB_SERVER, DB_USERNAME, DB_PASSWORD, DB_NAME);

if ($conn->connect_error) {
    header('Content-Type: application/json');
    http_response_code(500);
    echo json_encode(['error' => 'Database connection failed. Please try again later.']);
    exit;
}

if (!$conn->set_charset("utf8mb4")) {
    error_log("Error setting charset to utf8mb4: " . $conn->error);
}
?>
