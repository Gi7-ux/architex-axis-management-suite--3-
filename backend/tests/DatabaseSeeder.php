<?php

namespace Tests;

class DatabaseSeeder
{
    protected \mysqli $db;

    public function __construct(\mysqli $db)
    {
        $this->db = $db;
    }

    public function run()
    {
        $this->createUser('admin', 'admin@example.com', 'password', 'admin');
        $this->createUser('freelancer', 'freelancer@example.com', 'password', 'freelancer');
        $this->createUser('client', 'client@example.com', 'password', 'client');
    }

    protected function createUser(string $username, string $email, string $password, string $role)
    {
        $hashedPassword = password_hash($password, PASSWORD_BCRYPT);
        $stmt = $this->db->prepare("INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)");
        $stmt->bind_param('ssss', $username, $email, $hashedPassword, $role);
        $stmt->execute();
    }
}