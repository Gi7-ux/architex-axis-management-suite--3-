<?php

use GuzzleHttp\Client;

// Note: This assumes a test database is set up and seeded.
// The tests will perform real database operations.

test('can register a new user successfully', function () {
    $client = new Client(['base_uri' => 'http://localhost']); // Adjust base_uri if your test server is different

    $unique_email = 'testuser_' . time() . '@example.com';
    $username = 'testuser_' . time();

    $response = $client->post('/backend/api.php?action=register_user', [
        'json' => [
            'username' => $username,
            'email' => $unique_email,
            'password' => 'password123',
            'role' => 'freelancer'
        ]
    ]);

    expect($response->getStatusCode())->toBe(201);
    $body = json_decode($response->getBody(), true);
    expect($body['message'])->toContain('User registered successfully');
});

test('cannot register a user with a duplicate email', function () {
    $client = new Client(['base_uri' => 'http://localhost']);

    // First, create a user to ensure the email exists
    $unique_email = 'duplicate_' . time() . '@example.com';
    $username = 'originaluser_' . time();
    $client->post('/backend/api.php?action=register_user', [
        'json' => [
            'username' => $username,
            'email' => $unique_email,
            'password' => 'password123',
            'role' => 'freelancer'
        ]
    ]);

    // Now, attempt to register again with the same email
    try {
        $client->post('/backend/api.php?action=register_user', [
            'json' => [
                'username' => 'anotheruser',
                'email' => $unique_email,
                'password' => 'password123',
                'role' => 'client'
            ]
        ]);
    } catch (GuzzleHttp\Exception\ClientException $e) {
        expect($e->getResponse()->getStatusCode())->toBe(409);
        $body = json_decode($e->getResponse()->getBody()->getContents(), true);
        expect($body['error'])->toContain('Username or email already exists');
    }
});