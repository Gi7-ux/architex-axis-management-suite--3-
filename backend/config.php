<?php
// Configuration settings

// --- JWT Configuration ---
<<<<<<< Updated upstream
// IMPORTANT: Change JWT_SECRET_KEY to a strong, unique secret key.
// This key should be at least 32 characters long and be cryptographically random.
// Store this file securely and DO NOT commit it to version control if it contains real secrets.
// Consider using environment variables for production.
define('JWT_SECRET_KEY', 'YOUR_VERY_SECRET_KEY_GOES_HERE_CHANGE_ME');
define('JWT_ALGORITHM', 'HS256');

// --- Database Configuration ---
// IMPORTANT: Replace with your actual database credentials.
// Store this file securely and DO NOT commit it to version control if it contains real secrets.
// Consider using environment variables for production.
define('DB_SERVERNAME', '169.239.218.60');
define('DB_USERNAME', 'architex_main');
define('DB_PASSWORD', 'Gregory999');
define('DB_NAME', 'architex_db');
define('DB_PORT', 3306);

=======
// Load environment variables if available
$envPath = __DIR__ . '/../.env';
if (file_exists($envPath)) {
    $envVars = parse_ini_file($envPath);
    $jwtSecret = $envVars['VITE_JWT_SECRET'] ?? 'YOUR_VERY_SECRET_KEY_GOES_HERE_CHANGE_ME';
} else {
    $jwtSecret = 'YOUR_VERY_SECRET_KEY_GOES_HERE_CHANGE_ME';
}

define('JWT_SECRET_KEY', $jwtSecret);
define('JWT_ALGORITHM', 'HS256');

// --- Database Configuration ---
// In production, these should be set via environment variables
define('DB_SERVERNAME', 'localhost');  // Changed to localhost for development
define('DB_USERNAME', 'root');         // Default MySQL username
define('DB_PASSWORD', '');             // Empty password for local development
define('DB_NAME', 'architex_db');
define('DB_PORT', 3306);

// --- CORS Configuration ---
header('Access-Control-Allow-Origin: http://localhost:5173'); // Allow frontend dev server
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Credentials: true');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header('HTTP/1.1 200 OK');
    exit();
}
>>>>>>> Stashed changes
?>