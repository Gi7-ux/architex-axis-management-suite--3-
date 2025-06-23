
<?php
define('DB_SERVER', 'cp60.domains.co.za');
define('DB_USERNAME', 'architex_greg1');
define('DB_PASSWORD', '5cdv8l7vwzlu');
define('DB_NAME', 'architex_backend1');

$conn = new mysqli(DB_SERVER, DB_USERNAME, DB_PASSWORD, DB_NAME);

if ($conn->connect_error) {
    header('Content-Type: application/json');
    http_response_code(500);
    echo json_encode(['error' => 'Database connection failed. Please try again later.']);
    exit;
}

if (!$conn->set_charset("utf8mb4")) {
    // Error setting charset
}
?>
