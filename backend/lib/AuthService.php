<?php
class AuthService {
    private $db;

    public function __construct($db) {
        $this->db = $db;
    }

    public function handleRegistration($data) {
        $requiredFields = ['username', 'email', 'password', 'role'];
        $this->validateFields($data, $requiredFields);

        // Sanitize inputs
        $username = htmlspecialchars(trim($data['username']));
        $email = filter_var(trim($data['email']), FILTER_SANITIZE_EMAIL);
        $password = $data['password'];
        $role = htmlspecialchars(trim($data['role']));

        // Validate email
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            throw new Exception('Invalid email format');
        }

        // Validate role
        $validRoles = ['freelancer', 'client', 'admin'];
        if (!in_array($role, $validRoles)) {
            throw new Exception('Invalid role');
        }

        // Check if username or email already exists
        $sql = "SELECT id FROM users WHERE username = ? OR email = ?";
        $result = $this->db->query($sql, [$username, $email]);

        if ($result->num_rows > 0) {
            throw new Exception('Username or email already exists');
        }

        // Hash password
        $hashedPassword = password_hash($password, PASSWORD_DEFAULT);

        // Insert new user
        $sql = "INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)";
        $this->db->query($sql, [$username, $email, $hashedPassword, $role]);

        return [
            'status' => 'success',
            'message' => 'User registered successfully'
        ];
    }

    public function handleLogin($data) {
        $requiredFields = ['email', 'password'];
        $this->validateFields($data, $requiredFields);

        $email = filter_var(trim($data['email']), FILTER_SANITIZE_EMAIL);
        $password = $data['password'];

        // Get user by email
        $sql = "SELECT id, username, email, password, role FROM users WHERE email = ? AND is_active = 1";
        $result = $this->db->query($sql, [$email]);

        if ($result->num_rows === 0) {
            throw new Exception('Invalid email or password');
        }

        $user = $result->fetch_assoc();

        if (!password_verify($password, $user['password'])) {
            throw new Exception('Invalid email or password');
        }

        // Generate JWT token
        $tokenPayload = [
            'user_id' => $user['id'],
            'username' => $user['username'],
            'email' => $user['email'],
            'role' => $user['role'],
            'exp' => time() + (60 * 60 * 24) // 24 hours expiration
        ];

        $token = JWTHandler::generateToken($tokenPayload);

        // Update session token in database
        $sql = "UPDATE users SET session_token = ?, session_token_expires_at = DATE_ADD(NOW(), INTERVAL 24 HOUR) WHERE id = ?";
        $this->db->query($sql, [$token, $user['id']]);

        return [
            'status' => 'success',
            'message' => 'Login successful',
            'user' => [
                'id' => $user['id'],
                'username' => $user['username'],
                'email' => $user['email'],
                'role' => $user['role']
            ],
            'token' => $token
        ];
    }

    private function validateFields($data, $requiredFields) {
        foreach ($requiredFields as $field) {
            if (!isset($data[$field]) || empty($data[$field])) {
                throw new Exception("Missing required field: {$field}");
            }
        }
    }
}
?>
