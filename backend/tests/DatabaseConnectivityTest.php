<?php
require_once __DIR__ . '/../vendor/autoload.php';

use PHPUnit\Framework\TestCase;

class DatabaseConnectivityTest extends TestCase
{
    private $conn;

    protected function setUp(): void
    {
        // Define constants if not already defined
        if (!defined('DB_SERVER')) {
            define('DB_SERVER', 'cp60.domains.co.za');
        }
        if (!defined('DB_USERNAME')) {
            define('DB_USERNAME', 'architex_greg1');
        }
        if (!defined('DB_PASSWORD')) {
            define('DB_PASSWORD', '5cdv8l7vwzlu');
        }
        if (!defined('DB_NAME')) {
            define('DB_NAME', 'architex_backend1');
        }

        // Establish connection
        $this->conn = new mysqli(DB_SERVER, DB_USERNAME, DB_PASSWORD, DB_NAME);
    }

    public function testDatabaseConnection()
    {
        // Log the attempt
        error_log("Attempting to connect to database: " . DB_NAME);

        $this->assertNull($this->conn->connect_error, "Database connection failed: " . $this->conn->connect_error);
        $this->assertInstanceOf(mysqli::class, $this->conn, "Connection object is not a mysqli instance.");
        
        // Log success
        error_log("Database connection successful.");
    }

    protected function tearDown(): void
    {
        if ($this->conn) {
            $this->conn->close();
        }
    }
}