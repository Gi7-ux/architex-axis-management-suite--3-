<?php

use Tests\TestCase;

uses(TestCase::class)->in(__DIR__);

function getAuthToken(string $role = 'admin', string $username = 'admin', string $password = 'password'): string
{
    $client = new \GuzzleHttp\Client(['base_uri' => 'http://localhost:8000']); // Ensure this matches your test server
    $response = $client->post('/api.php?action=login_user', [
        'json' => [
            'email' => $username . '@example.com',
            'password' => $password,
        ]
    ]);
    $body = json_decode($response->getBody()->getContents(), true);
    return $body['token'];
}
