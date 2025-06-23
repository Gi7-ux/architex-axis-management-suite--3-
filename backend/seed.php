<?php
require_once 'db_connect.php';

echo "Seeding database...\n";

// --- Users ---
$users = [
    [
        'username' => 'admin',
        'name' => 'Admin User',
        'email' => 'admin@architex.co.za',
        'password' => 'password',
        'role' => 'admin'
    ],
    [
        'username' => 'freelancer',
        'name' => 'Freelancer User',
        'email' => 'freelancer@architex.co.za',
        'password' => 'password',
        'role' => 'freelancer'
    ],
    [
        'username' => 'client',
        'name' => 'Client User',
        'email' => 'client@architex.co.za',
        'password' => 'password',
        'role' => 'client'
    ]
];

foreach ($users as $user) {
    $hashed_password = password_hash($user['password'], PASSWORD_BCRYPT);
    $stmt = $conn->prepare("INSERT INTO users (username, name, email, password, role) VALUES (?, ?, ?, ?, ?)");
    $stmt->bind_param("sssss", $user['username'], $user['name'], $user['email'], $hashed_password, $user['role']);
    if ($stmt->execute()) {
        echo "User '{$user['username']}' created successfully.\n";
    } else {
        echo "Error creating user '{$user['username']}': " . $stmt->error . "\n";
    }
    $stmt->close();
}

echo "Database seeding complete.\n";

$conn->close();
?>