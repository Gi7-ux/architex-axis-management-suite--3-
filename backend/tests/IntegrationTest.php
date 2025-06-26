<?php
// backend/tests/IntegrationTest.php

require_once __DIR__ . '/../vendor/autoload.php';

use PHPUnit\Framework\TestCase;

// Include database connection function
function getTestDbConnection() {
    $host = $_ENV['DB_HOST'] ?? 'localhost';
    $dbname = $_ENV['DB_NAME'] ?? 'architex_test';
    $username = $_ENV['DB_USER'] ?? 'root';
    $password = $_ENV['DB_PASS'] ?? '';
    
    try {
        $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $username, $password);
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        return $pdo;
    } catch (PDOException $e) {
        throw new Exception("Database connection failed: " . $e->getMessage());
    }
}

class IntegrationTest extends TestCase
{
    private $pdo;
    private $apiUrl;
    
    protected function setUp(): void
    {
        parent::setUp();
        
        // Use test database
        $this->pdo = getTestDbConnection();
        $this->apiUrl = 'http://localhost/backend/api.php';
        
        // Clear test data
        $this->cleanupTestData();
        
        // Insert test data
        $this->seedTestData();
    }
    
    protected function tearDown(): void
    {
        $this->cleanupTestData();
        parent::tearDown();
    }
    
    private function cleanupTestData(): void
    {
        $tables = ['time_logs', 'job_cards', 'applications', 'projects', 'users'];
        
        foreach ($tables as $table) {
            $stmt = $this->pdo->prepare("DELETE FROM {$table} WHERE email LIKE '%test%' OR username LIKE '%test%'");
            $stmt->execute();
        }
    }
    
    private function seedTestData(): void
    {
        // Create test users
        $hashedPassword = password_hash('password123', PASSWORD_DEFAULT);
        
        $stmt = $this->pdo->prepare("
            INSERT INTO users (username, name, email, password_hash, role, created_at) 
            VALUES (?, ?, ?, ?, ?, NOW())
        ");
        
        $testUsers = [
            ['testclient', 'Test Client', 'testclient@example.com', $hashedPassword, 'client'],
            ['testfreelancer', 'Test Freelancer', 'testfreelancer@example.com', $hashedPassword, 'freelancer'],
            ['testadmin', 'Test Admin', 'testadmin@example.com', $hashedPassword, 'admin']
        ];
        
        foreach ($testUsers as $user) {
            $stmt->execute($user);
        }
    }
    
    private function makeApiRequest(string $action, array $data = [], string $token = null): array
    {
        $postData = array_merge(['action' => $action], $data);
        
        $headers = [
            'Content-Type: application/json',
        ];
        
        if ($token) {
            $headers[] = 'Authorization: Bearer ' . $token;
        }
        
        $context = stream_context_create([
            'http' => [
                'method' => 'POST',
                'header' => implode("\r\n", $headers),
                'content' => json_encode($postData)
            ]
        ]);
        
        $response = file_get_contents($this->apiUrl, false, $context);
        
        if ($response === false) {
            throw new Exception('Failed to make API request');
        }
        
        $decodedResponse = json_decode($response, true);
        
        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new Exception('Invalid JSON response: ' . $response);
        }
        
        return $decodedResponse;
    }
    
    private function loginUser(string $email, string $password): string
    {
        $response = $this->makeApiRequest('login', [
            'email' => $email,
            'password' => $password
        ]);
        
        $this->assertTrue($response['success'], 'Login should succeed');
        $this->assertNotEmpty($response['token'], 'Token should be provided');
        
        return $response['token'];
    }
    
    public function testUserRegistrationAndLogin(): void
    {
        // Test user registration
        $registrationData = [
            'username' => 'newtestuser',
            'email' => 'newtestuser@example.com',
            'password' => 'securepassword123',
            'role' => 'freelancer'
        ];
        
        $response = $this->makeApiRequest('register', $registrationData);
        
        $this->assertTrue($response['success'], 'Registration should succeed');
        $this->assertEquals('User registered successfully', $response['message']);
        
        // Test login with new user
        $token = $this->loginUser('newtestuser@example.com', 'securepassword123');
        $this->assertNotEmpty($token, 'Token should be returned after login');
        
        // Verify token format (should be JWT)
        $tokenParts = explode('.', $token);
        $this->assertCount(3, $tokenParts, 'JWT should have 3 parts');
    }
    
    public function testInvalidLoginCredentials(): void
    {
        $response = $this->makeApiRequest('login', [
            'email' => 'nonexistent@example.com',
            'password' => 'wrongpassword'
        ]);
        
        $this->assertFalse($response['success'], 'Login should fail with invalid credentials');
        $this->assertArrayHasKey('message', $response);
        $this->assertArrayHasKey('error', $response);
    }
    
    public function testProjectCreationWorkflow(): void
    {
        // Login as client
        $clientToken = $this->loginUser('testclient@example.com', 'password123');
        
        // Create a project
        $projectData = [
            'title' => 'Test Project Integration',
            'description' => 'A comprehensive test project for integration testing',
            'budget' => 2000,
            'deadline' => '2025-12-31',
            'skills_required' => json_encode(['PHP', 'JavaScript', 'MySQL'])
        ];
        
        $response = $this->makeApiRequest('create_project', $projectData, $clientToken);
        
        $this->assertTrue($response['success'], 'Project creation should succeed');
        $this->assertArrayHasKey('project_id', $response);
        $projectId = $response['project_id'];
        
        // Fetch the created project
        $fetchResponse = $this->makeApiRequest('get_project_details', [
            'project_id' => $projectId
        ], $clientToken);
        
        $this->assertTrue($fetchResponse['success'], 'Project fetch should succeed');
        $this->assertEquals($projectData['title'], $fetchResponse['project']['title']);
        $this->assertEquals($projectData['budget'], $fetchResponse['project']['budget']);
        
        // Login as freelancer and apply to project
        $freelancerToken = $this->loginUser('testfreelancer@example.com', 'password123');
        
        $applicationData = [
            'project_id' => $projectId,
            'proposal' => 'I am interested in this project and have the required skills.',
            'proposed_budget' => 1800
        ];
        
        $applyResponse = $this->makeApiRequest('apply_to_project', $applicationData, $freelancerToken);
        
        $this->assertTrue($applyResponse['success'], 'Application should succeed');
        $this->assertArrayHasKey('application_id', $applyResponse);
    }
    
    public function testAuthenticationRequiredEndpoints(): void
    {
        $protectedEndpoints = [
            'get_projects',
            'create_project',
            'get_user_profile',
            'update_project',
            'apply_to_project'
        ];
        
        foreach ($protectedEndpoints as $endpoint) {
            $response = $this->makeApiRequest($endpoint);
            
            $this->assertFalse($response['success'], "Endpoint {$endpoint} should require authentication");
            $this->assertArrayHasKey('error', $response);
            $this->assertEquals('NO_TOKEN', $response['error']);
        }
    }
    
    public function testInvalidTokenHandling(): void
    {
        $invalidToken = 'invalid.jwt.token';
        
        $response = $this->makeApiRequest('get_user_profile', [], $invalidToken);
        
        $this->assertFalse($response['success'], 'Invalid token should be rejected');
        $this->assertArrayHasKey('error', $response);
        $this->assertEquals('INVALID_TOKEN', $response['error']);
    }
    
    public function testDatabaseConnectionHandling(): void
    {
        // Test if API handles database connection gracefully
        $response = $this->makeApiRequest('login', [
            'email' => 'testclient@example.com',
            'password' => 'password123'
        ]);
        
        $this->assertTrue($response['success'], 'API should handle database operations correctly');
        $this->assertArrayHasKey('token', $response);
        $this->assertArrayHasKey('user', $response);
    }
    
    public function testCORSHeaders(): void
    {
        // Test CORS headers in response
        $context = stream_context_create([
            'http' => [
                'method' => 'OPTIONS',
                'header' => 'Origin: http://localhost:5173'
            ]
        ]);
        
        $response = file_get_contents($this->apiUrl, false, $context);
        
        // Check if response headers include CORS
        $headers = $http_response_header ?? [];
        $corsHeaderFound = false;
        
        foreach ($headers as $header) {
            if (strpos($header, 'Access-Control-Allow-Origin') !== false) {
                $corsHeaderFound = true;
                break;
            }
        }
        
        $this->assertTrue($corsHeaderFound, 'CORS headers should be present');
    }
    
    public function testInputValidationAndSanitization(): void
    {
        // Test SQL injection prevention
        $maliciousData = [
            'email' => "'; DROP TABLE users; --",
            'password' => 'password123'
        ];
        
        $response = $this->makeApiRequest('login', $maliciousData);
        
        $this->assertFalse($response['success'], 'Malicious input should be handled safely');
        
        // Test XSS prevention
        $xssData = [
            'username' => '<script>alert("xss")</script>',
            'email' => 'xsstest@example.com',
            'password' => 'password123',
            'role' => 'freelancer'
        ];
        
        $response = $this->makeApiRequest('register', $xssData);
        
        if ($response['success']) {
            // If registration succeeds, check that the data is sanitized
            $token = $this->loginUser('xsstest@example.com', 'password123');
            $profileResponse = $this->makeApiRequest('get_user_profile', [], $token);
            
            $this->assertTrue($profileResponse['success']);
            $this->assertNotContains('<script>', $profileResponse['user']['username']);
        }
    }
    
    public function testPasswordHashing(): void
    {
        // Verify that passwords are properly hashed in database
        $stmt = $this->pdo->prepare("SELECT password_hash FROM users WHERE email = ?");
        $stmt->execute(['testclient@example.com']);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        
        $this->assertNotEmpty($result['password_hash']);
        $this->assertNotEquals('password123', $result['password_hash']);
        $this->assertTrue(password_verify('password123', $result['password_hash']));
    }
    
    public function testDataIntegrityConstraints(): void
    {
        // Test unique email constraint
        $duplicateUserData = [
            'username' => 'anothertestuser',
            'email' => 'testclient@example.com', // Existing email
            'password' => 'password123',
            'role' => 'freelancer'
        ];
        
        $response = $this->makeApiRequest('register', $duplicateUserData);
        
        $this->assertFalse($response['success'], 'Duplicate email should be rejected');
        $this->assertArrayHasKey('error', $response);
    }
    
    public function testPaginationAndLimits(): void
    {
        // Create multiple test projects
        $clientToken = $this->loginUser('testclient@example.com', 'password123');
        
        for ($i = 1; $i <= 15; $i++) {
            $projectData = [
                'title' => "Test Project {$i}",
                'description' => "Description for project {$i}",
                'budget' => 1000 + ($i * 100),
                'deadline' => '2025-12-31',
                'skills_required' => json_encode(['PHP'])
            ];
            
            $this->makeApiRequest('create_project', $projectData, $clientToken);
        }
        
        // Test pagination
        $response = $this->makeApiRequest('get_projects', [
            'page' => 1,
            'limit' => 10
        ], $clientToken);
        
        $this->assertTrue($response['success'], 'Paginated request should succeed');
        $this->assertArrayHasKey('projects', $response);
        $this->assertLessThanOrEqual(10, count($response['projects']));
        
        if (isset($response['pagination'])) {
            $this->assertArrayHasKey('total', $response['pagination']);
            $this->assertArrayHasKey('page', $response['pagination']);
            $this->assertArrayHasKey('limit', $response['pagination']);
        }
    }
    
    public function testErrorHandlingAndLogging(): void
    {
        // Test handling of invalid action
        $response = $this->makeApiRequest('invalid_action');
        
        $this->assertFalse($response['success'], 'Invalid action should return error');
        $this->assertArrayHasKey('error', $response);
        $this->assertEquals('INVALID_ACTION', $response['error']);
    }
}
