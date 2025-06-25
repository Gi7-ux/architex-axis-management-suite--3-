<?php

use GuzzleHttp\Exception\ClientException;

// Test Suite for Project CRUD Operations
describe('Project CRUD Operations', function () {

    // Test: Create a project successfully
    test('can create a project successfully as an admin', function () {
        $token = getAuthToken('admin', 'admin');
        $response = $this->http->post('/api.php?action=create_project', [
            'headers' => ['Authorization' => 'Bearer ' . $token],
            'json' => [
                'title' => 'New Test Project ' . time(),
                'description' => 'A description for the new test project.',
                'status' => 'open',
            ]
        ]);

        expect($response->getStatusCode())->toBe(201);
        $body = json_decode($response->getBody()->getContents(), true);
        expect($body)->toHaveKey('project_id');
    });

    // Test: Fail to create a project without authentication
    test('cannot create a project without authentication', function () {
        try {
            $this->http->post('/api.php?action=create_project', [
                'json' => [
                    'title' => 'Unauthorized Project',
                    'description' => 'This should not be created.',
                ]
            ]);
        } catch (ClientException $e) {
            expect($e->getResponse()->getStatusCode())->toBe(401);
        }
    });

    // Test: Fail to create a project with invalid data
    test('cannot create a project with invalid data', function () {
        $token = getAuthToken('admin', 'admin');
        try {
            $this->http->post('/api.php?action=create_project', [
                'headers' => ['Authorization' => 'Bearer ' . $token],
                'json' => [
                    'description' => 'Missing title.',
                ]
            ]);
        } catch (ClientException $e) {
            expect($e->getResponse()->getStatusCode())->toBe(400);
        }
    });

    // Test: Read all projects
    test('can read all projects', function () {
        $response = $this->http->get('/api.php?action=get_projects');
        expect($response->getStatusCode())->toBe(200);
        $body = json_decode($response->getBody()->getContents(), true);
        expect(is_array($body))->toBeTrue();
    });

    // Test: Read a single project
    test('can read a single project', function () {
        // First, create a project to ensure one exists
        $token = getAuthToken('admin', 'admin');
        $createResponse = $this->http->post('/api.php?action=create_project', [
            'headers' => ['Authorization' => 'Bearer ' . $token],
            'json' => [
                'title' => 'Readable Project ' . time(),
                'description' => 'This project is for reading.',
                'status' => 'open',
            ]
        ]);
        $projectId = json_decode($createResponse->getBody()->getContents(), true)['project_id'];

        // Now, read the created project
        $readResponse = $this->http->get('/api.php?action=get_projects&id=' . $projectId);
        expect($readResponse->getStatusCode())->toBe(200);
        $body = json_decode($readResponse->getBody()->getContents(), true);
        expect($body['id'])->toBe($projectId);
    });

    // Test: Update a project
    test('can update a project successfully', function () {
        // First, create a project
        $token = getAuthToken('admin', 'admin');
        $createResponse = $this->http->post('/api.php?action=create_project', [
            'headers' => ['Authorization' => 'Bearer ' . $token],
            'json' => [
                'title' => 'Project to Update ' . time(),
                'description' => 'Initial description.',
                'status' => 'open',
            ]
        ]);
        $projectId = json_decode($createResponse->getBody()->getContents(), true)['project_id'];

        // Now, update the project
        $updateResponse = $this->http->put('/api.php?action=update_project&id=' . $projectId, [
            'headers' => ['Authorization' => 'Bearer ' . $token],
            'json' => [
                'title' => 'Updated Project Title',
                'status' => 'in_progress',
            ]
        ]);
        expect($updateResponse->getStatusCode())->toBe(200);
    });

    // Test: Delete a project
    test('can delete a project successfully', function () {
        // First, create a project
        $token = getAuthToken('admin', 'admin');
        $createResponse = $this->http->post('/api.php?action=create_project', [
            'headers' => ['Authorization' => 'Bearer ' . $token],
            'json' => [
                'title' => 'Project to Delete ' . time(),
                'description' => 'This project will be deleted.',
                'status' => 'open',
            ]
        ]);
        $projectId = json_decode($createResponse->getBody()->getContents(), true)['project_id'];

        // Now, delete the project
        $deleteResponse = $this->http->delete('/api.php?action=delete_project&id=' . $projectId, [
            'headers' => ['Authorization' => 'Bearer ' . $token],
        ]);
        expect($deleteResponse->getStatusCode())->toBe(200); // Or 204 if you prefer
    });
});