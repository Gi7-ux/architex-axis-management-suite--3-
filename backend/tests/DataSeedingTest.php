<?php
require_once __DIR__ . '/../vendor/autoload.php';

use PHPUnit\Framework\TestCase;

class DataSeedingTest extends TestCase
{
    private $conn;
    private static $dbName;

    public static function setUpBeforeClass(): void
    {
        if (!defined('DB_NAME')) {
            define('DB_NAME', 'architex_backend1');
        }
        self::$dbName = DB_NAME;
    }

    protected function setUp(): void
    {
        if (!defined('DB_SERVER')) {
            define('DB_SERVER', 'cp60.domains.co.za');
        }
        if (!defined('DB_USERNAME')) {
            define('DB_USERNAME', 'architex_greg1');
        }
        if (!defined('DB_PASSWORD')) {
            define('DB_PASSWORD', '5cdv8l7vwzlu');
        }
        
        $this->conn = new mysqli(DB_SERVER, DB_USERNAME, DB_PASSWORD, self::$dbName);

        if ($this->conn->connect_error) {
            $this->fail("Database connection failed: " . $this->conn->connect_error);
        }

        // Clear users table before seeding, disabling foreign key checks
        $this->conn->query("SET FOREIGN_KEY_CHECKS=0");
        $this->conn->query("TRUNCATE TABLE users");
        $this->conn->query("SET FOREIGN_KEY_CHECKS=1");
    }

    public function testDataSeeding()
    {
        // 1. Execute the seed script
        $scriptPath = __DIR__ . '/../seed.php';
        $output = shell_exec('php ' . escapeshellarg($scriptPath));
        $this->assertStringContainsString("Database seeding complete", $output, "Seeding script did not complete successfully.");

        // 2. Verify the data was seeded correctly
        $result = $this->conn->query("SELECT COUNT(*) as user_count FROM users");
        $this->assertNotFalse($result, "Failed to query for users.");
        
        $row = $result->fetch_assoc();
        $this->assertEquals(3, $row['user_count'], "Expected 3 users to be seeded, but found " . $row['user_count']);

        // 3. Verify a specific user
        $result = $this->conn->query("SELECT * FROM users WHERE username = 'admin'");
        $this->assertNotFalse($result, "Failed to query for admin user.");
        $this->assertEquals(1, $result->num_rows, "Admin user not found after seeding.");
        
        $adminUser = $result->fetch_assoc();
        $this->assertEquals('admin@architex.co.za', $adminUser['email']);
        $this->assertEquals('admin', $adminUser['role']);
    }

    protected function tearDown(): void
    {
        if ($this->conn) {
            $this->conn->close();
        }
    }
}