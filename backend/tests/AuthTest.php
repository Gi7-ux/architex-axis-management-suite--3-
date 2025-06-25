<?php

use GuzzleHttp\Exception\ClientException;

// Test Suite for Authentication and Authorization
describe('Authentication and Authorization', function () {

    // Test: Successful login
    test('user can log in with valid credentials', function () {
        $response = $this->http->post('/api.php?action=login_user', [
            'json' => [
                'email' => 'admin@example.com',
                'password' => 'password'
            ]
        ]);
        expect($response->getStatusCode())->toBe(200);
        $body = json_decode($response->getBody()->getContents(), true);
        expect($body)->toHaveKey('token');
    });

    // Test: Failed login with invalid credentials
    test('user cannot log in with invalid credentials', function () {
        try {
            $this->http->post('/api.php?action=login_user', [
                'json' => [
                    'email' => 'wrong@example.com',
                    'password' => 'wrongpassword'
                ]
            ]);
        } catch (ClientException $e) {
            expect($e->getResponse()->getStatusCode())->toBe(401);
        }
    });

    // Test: Access protected route with valid token
    test('can access protected route with a valid token', function () {
        $token = getAuthToken('admin', 'admin');
        $response = $this->http->get('/api.php?action=get_user_profile', [
            'headers' => ['Authorization' => 'Bearer ' . $token]
        ]);
        expect($response->getStatusCode())->toBe(200);
    });

    // Test: Fail to access protected route with invalid token
    test('cannot access protected route with an invalid token', function () {
        try {
            $this->http->get('/api.php?action=get_user_profile', [
                'headers' => ['Authorization' => 'Bearer invalidtoken']
            ]);
        } catch (ClientException $e) {
            expect($e->getResponse()->getStatusCode())->toBe(403);
        }
    });

    // Test: Fail to access protected route without token
    test('cannot access protected route without a token', function () {
        try {
            $this->http->get('/api.php?action=get_user_profile');
        } catch (ClientException $e) {
            expect($e->getResponse()->getStatusCode())->toBe(401);
        }
    });

    // Test: Admin can access admin-only route
    test('admin can access admin-only route', function () {
        $token = getAuthToken('admin', 'admin');
        $response = $this->http->get('/api.php?action=get_all_users', [
            'headers' => ['Authorization' => 'Bearer ' . $token]
        ]);
        expect($response->getStatusCode())->toBe(200);
    });

    // Test: Non-admin cannot access admin-only route
    test('non-admin cannot access admin-only route', function () {
        $token = getAuthToken('freelancer', 'freelancer');
        try {
            $this->http->get('/api.php?action=get_all_users', [
                'headers' => ['Authorization' => 'Bearer ' . $token]
            ]);
        } catch (ClientException $e) {
            expect($e->getResponse()->getStatusCode())->toBe(403);
        }
    });
});