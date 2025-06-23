<?php
require_once __DIR__ . '/../vendor/autoload.php';

use PHPUnit\Framework\TestCase;

class SchemaIntegrityTest extends TestCase
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
    }

    public function testSchemaMatchesDefinition()
    {
        // 1. Read table names from schema.sql
        $schemaSql = file_get_contents(__DIR__ . '/../schema.sql');
        $this->assertNotFalse($schemaSql, "Could not read schema.sql file.");

        preg_match_all('/CREATE TABLE `?(\w+)`?/', $schemaSql, $matches);
        $definedTables = $matches[1];
        $this->assertNotEmpty($definedTables, "No table definitions found in schema.sql.");
        sort($definedTables);

        // 2. Get table names from the live database
        $result = $this->conn->query("SHOW TABLES");
        $this->assertNotFalse($result, "Failed to query for tables in the database.");
        
        $liveTables = [];
        while ($row = $result->fetch_array()) {
            $liveTables[] = $row[0];
        }
        sort($liveTables);

        // 3. Compare the two lists
        $this->assertEquals($definedTables, $liveTables, "The tables in the database do not match the schema.sql definition.");
    }

    protected function tearDown(): void
    {
        if ($this->conn) {
            $this->conn->close();
        }
    }
}