<?php
// Configuration settings

// --- JWT Configuration ---
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

?>