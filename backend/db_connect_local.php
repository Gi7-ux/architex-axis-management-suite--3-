<?php
// Local testing database configuration using SQLite
$db_path = __DIR__ . '/test_database.sqlite';

try {
    $conn = new PDO("sqlite:$db_path");
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    // Create basic tables for testing if they don't exist
    $conn->exec("
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username VARCHAR(255) UNIQUE NOT NULL,
            email VARCHAR(255) UNIQUE NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            role VARCHAR(50) NOT NULL,
            name VARCHAR(255),
            phone_number VARCHAR(20),
            company VARCHAR(255),
            experience TEXT,
            hourly_rate DECIMAL(10,2),
            avatar_url VARCHAR(500),
            is_active BOOLEAN DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ");
    
    $conn->exec("
        CREATE TABLE IF NOT EXISTS projects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title VARCHAR(255) NOT NULL,
            description TEXT,
            client_id INTEGER NOT NULL,
            freelancer_id INTEGER,
            status VARCHAR(50) DEFAULT 'pending',
            budget DECIMAL(10,2),
            deadline DATE,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (client_id) REFERENCES users(id),
            FOREIGN KEY (freelancer_id) REFERENCES users(id)
        )
    ");
    
    // Insert test users if they don't exist
    $stmt = $conn->prepare("SELECT COUNT(*) FROM users");
    $stmt->execute();
    $userCount = $stmt->fetchColumn();
    
    if ($userCount == 0) {
        // Insert test users
        $testUsers = [
            ['admin', 'admin@test.com', password_hash('password', PASSWORD_DEFAULT), 'admin', 'Admin User'],
            ['client', 'client@test.com', password_hash('password', PASSWORD_DEFAULT), 'client', 'Client User'],
            ['freelancer', 'freelancer@test.com', password_hash('password', PASSWORD_DEFAULT), 'freelancer', 'Freelancer User'],
            ['testuser', 'test@example.com', password_hash('password123', PASSWORD_DEFAULT), 'freelancer', 'Test User']
        ];
        
        $stmt = $conn->prepare("INSERT INTO users (username, email, password_hash, role, name) VALUES (?, ?, ?, ?, ?)");
        foreach ($testUsers as $user) {
            $stmt->execute($user);
        }
        
        // Insert test projects
        $stmt = $conn->prepare("INSERT INTO projects (title, description, client_id, status) VALUES (?, ?, ?, ?)");
        $stmt->execute(['Test Project 1', 'This is a test project for demonstration', 2, 'open']);
        $stmt->execute(['Test Project 2', 'Another test project', 2, 'in_progress']);
    }
    
} catch(PDOException $e) {
    header('Content-Type: application/json');
    http_response_code(500);
    echo json_encode(['error' => 'Database connection failed: ' . $e->getMessage()]);
    exit;
}
?>
