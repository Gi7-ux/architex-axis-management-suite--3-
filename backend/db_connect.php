
<?php
require_once 'config.php'; // Include the configuration file

// Create connection using defined constants
$conn = new mysqli(DB_SERVERNAME, DB_USERNAME, DB_PASSWORD, DB_NAME, DB_PORT);

// Check connection
if ($conn->connect_error) {
  // Log error to a file or use error_log() for better security in production
  // For now, we'll die and show the error, but this should be handled more gracefully.
  die("Connection failed: " . $conn->connect_error);
}

// Optional: Set character set to utf8mb4 for full Unicode support
if (!$conn->set_charset("utf8mb4")) {
    // Log error or handle as appropriate
    // printf("Error loading character set utf8mb4: %s\n", $conn->error);
}

// The $conn variable can now be used by other PHP scripts to interact with the database.
// Example: include 'db_connect.php';
// $result = $conn->query("SELECT * FROM users");

// No need to close the connection here if it's included at the beginning of other scripts.
// It's typically closed at the end of the script that uses it.
?>
