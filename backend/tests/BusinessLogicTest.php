<?php

use GuzzleHttp\Exception\ClientException;

// Test Suite for Business Logic
describe('Business Logic', function () {

    // Test: Full user registration flow
    test('user registration flow', function () {
        $email = 'test.user.' . time() . '@example.com';
        $username = 'test.user.' . time();

        // 1. Register user
        $response = $this->http->post('/api.php?action=register_user', [
            'json' => [
                'email' => $email,
                'username' => $username,
                'password' => 'password123'
            ]
        ]);
        expect($response->getStatusCode())->toBe(201);

        // 2. Login with new credentials
        $response = $this->http->post('/api.php?action=login_user', [
            'json' => [
                'email' => $email,
                'password' => 'password123'
            ]
        ]);
        expect($response->getStatusCode())->toBe(200);
        $body = json_decode($response->getBody()->getContents(), true);
        expect($body)->toHaveKey('token');
    });

    // Test: Project assignment flow
    test('project assignment flow', function () {
        // 1. Get tokens for admin and freelancer
        $adminToken = getAuthToken('admin', 'admin');
        $freelancerToken = getAuthToken('freelancer', 'freelancer');

        // 2. Admin creates a project
        $createResponse = $this->http->post('/api.php?action=create_project', [
            'headers' => ['Authorization' => 'Bearer ' . $adminToken],
            'json' => [
                'title' => 'Project for Assignment ' . time(),
                'description' => 'This project will be assigned to a freelancer.',
                'status' => 'open',
            ]
        ]);
        $projectId = json_decode($createResponse->getBody()->getContents(), true)['project_id'];

        // 3. Freelancer applies for the project
        $applyResponse = $this->http->post('/api.php?action=submit_application', [
            'headers' => ['Authorization' => 'Bearer ' . $freelancerToken],
            'json' => [
                'project_id' => $projectId,
                'proposal_text' => 'I am the best freelancer for this job.',
                'bid_amount' => 500,
            ]
        ]);
        expect($applyResponse->getStatusCode())->toBe(201);
        $applicationId = json_decode($applyResponse->getBody()->getContents(), true)['application_id'];

        // 4. Admin accepts the application
        $acceptResponse = $this->http->put('/api.php?action=update_application_status&application_id=' . $applicationId, [
            'headers' => ['Authorization' => 'Bearer ' . $adminToken],
            'json' => [
                'status' => 'accepted',
            ]
        ]);
        expect($acceptResponse->getStatusCode())->toBe(200);

        // 5. Verify project is assigned to the freelancer
        $projectResponse = $this->http->get('/api.php?action=get_projects&id=' . $projectId);
        $projectBody = json_decode($projectResponse->getBody()->getContents(), true);
        expect($projectBody['freelancer_id'])->toBe(2); // Assuming freelanceruser has id 2
    });
});