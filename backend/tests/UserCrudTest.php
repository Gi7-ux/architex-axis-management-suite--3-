<?php

use GuzzleHttp\Exception\ClientException;

test('can register a new user successfully', function () {
    $unique_email = 'testuser_' . time() . '@example.com';
    $username = 'testuser_' . time();

    $response = $this->http->post('/api.php?action=register_user', [
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
    // First, create a user to ensure the email exists
    $unique_email = 'duplicate_' . time() . '@example.com';
    $username = 'originaluser_' . time();
    $this->http->post('/api.php?action=register_user', [
        'json' => [
            'username' => $username,
            'email' => $unique_email,
            'password' => 'password123',
            'role' => 'freelancer'
        ]
    ]);

    // Now, attempt to register again with the same email
    try {
        $this->http->post('/api.php?action=register_user', [
            'json' => [
                'username' => 'anotheruser',
                'email' => $unique_email,
                'password' => 'password123',
                'role' => 'client'
            ]
        ]);
    } catch (ClientException $e) {
        expect($e->getResponse()->getStatusCode())->toBe(409);
        $body = json_decode($e->getResponse()->getBody()->getContents(), true);
        expect($body['error'])->toContain('Username or email already exists');
    }
});