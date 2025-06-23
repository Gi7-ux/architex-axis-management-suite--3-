<?php
// Pest tests for backend API endpoints (structure, not full DB integration)

use GuzzleHttp\Exception\ClientException;

test('register_user endpoint returns error for missing fields', function () {
    try {
        $this->http->post('/api.php?action=register_user', ['json' => []]);
    } catch (ClientException $e) {
        expect($e->getResponse()->getStatusCode())->toBe(400);
        $body = json_decode($e->getResponse()->getBody()->getContents(), true);
        expect($body['error'])->toContain('required');
    }
});

test('login_user endpoint returns error for missing fields', function () {
    try {
        $this->http->post('/api.php?action=login_user', ['json' => []]);
    } catch (ClientException $e) {
        expect($e->getResponse()->getStatusCode())->toBe(400);
        $body = json_decode($e->getResponse()->getBody()->getContents(), true);
        expect($body['error'])->toContain('required');
    }
});

test('get_user_profile endpoint requires authentication', function () {
    try {
        $this->http->get('/api.php?action=get_user_profile');
    } catch (ClientException $e) {
        expect($e->getResponse()->getStatusCode())->toBeOneOf([401, 403]);
    }
});

test('get_all_users endpoint requires admin', function () {
    try {
        $this->http->get('/api.php?action=get_all_users');
    } catch (ClientException $e) {
        expect($e->getResponse()->getStatusCode())->toBeOneOf([401, 403]);
    }
});

test('get_client_projects endpoint requires client', function () {
    try {
        $this->http->get('/api.php?action=get_client_projects');
    } catch (ClientException $e) {
        expect($e->getResponse()->getStatusCode())->toBeOneOf([401, 403]);
    }
});

test('get_project_applications endpoint requires project_id', function () {
    $token = getAuthToken('admin', 'admin');
    try {
        $this->http->get('/api.php?action=get_project_applications', [
            'headers' => ['Authorization' => 'Bearer ' . $token]
        ]);
    } catch (ClientException $e) {
        expect($e->getResponse()->getStatusCode())->toBe(400);
        $body = json_decode($e->getResponse()->getBody()->getContents(), true);
        expect($body['error'])->toContain('Project ID');
    }
});

test('update_application_status endpoint requires application_id', function () {
    $token = getAuthToken('admin', 'admin');
    try {
        $this->http->put('/api.php?action=update_application_status', [
            'headers' => ['Authorization' => 'Bearer ' . $token],
            'json' => []
        ]);
    } catch (ClientException $e) {
        expect($e->getResponse()->getStatusCode())->toBe(400);
        $body = json_decode($e->getResponse()->getBody()->getContents(), true);
        expect($body['error'])->toContain('Application ID');
    }
});

test('submit_application endpoint requires freelancer', function () {
    try {
        $this->http->post('/api.php?action=submit_application', ['json' => []]);
    } catch (ClientException $e) {
        expect($e->getResponse()->getStatusCode())->toBeOneOf([401, 403]);
    }
});

test('get_freelancer_applications endpoint requires freelancer', function () {
    try {
        $this->http->get('/api.php?action=get_freelancer_applications');
    } catch (ClientException $e) {
        expect($e->getResponse()->getStatusCode())->toBeOneOf([401, 403]);
    }
});

test('get_freelancer_assigned_projects endpoint requires freelancer', function () {
    try {
        $this->http->get('/api.php?action=get_freelancer_assigned_projects');
    } catch (ClientException $e) {
        expect($e->getResponse()->getStatusCode())->toBeOneOf([401, 403]);
    }
});

test('withdraw_application endpoint requires application_id', function () {
    $token = getAuthToken('freelancer', 'freelancer');
    try {
        $this->http->post('/api.php?action=withdraw_application', [
            'headers' => ['Authorization' => 'Bearer ' . $token],
            'json' => []
        ]);
    } catch (ClientException $e) {
        expect($e->getResponse()->getStatusCode())->toBe(400);
        $body = json_decode($e->getResponse()->getBody()->getContents(), true);
        expect($body['error'])->toContain('Application ID');
    }
});

test('create_job_card endpoint requires project_id and title', function () {
    $token = getAuthToken('admin', 'admin');
    try {
        $this->http->post('/api.php?action=create_job_card', [
            'headers' => ['Authorization' => 'Bearer ' . $token],
            'json' => []
        ]);
    } catch (ClientException $e) {
        expect($e->getResponse()->getStatusCode())->toBe(400);
        $body = json_decode($e->getResponse()->getBody()->getContents(), true);
        expect($body['error'])->toContain('Project ID and title are required');
    }
});

test('get_project_job_cards endpoint requires project_id', function () {
    $token = getAuthToken('admin', 'admin');
    try {
        $this->http->get('/api.php?action=get_project_job_cards', [
            'headers' => ['Authorization' => 'Bearer ' . $token]
        ]);
    } catch (ClientException $e) {
        expect($e->getResponse()->getStatusCode())->toBe(400);
        $body = json_decode($e->getResponse()->getBody()->getContents(), true);
        expect($body['error'])->toContain('Project ID is required');
    }
});

test('log_time endpoint requires job_card_id, start_time, end_time', function () {
    $token = getAuthToken('freelancer', 'freelancer');
    try {
        $this->http->post('/api.php?action=log_time', [
            'headers' => ['Authorization' => 'Bearer ' . $token],
            'json' => []
        ]);
    } catch (ClientException $e) {
        expect($e->getResponse()->getStatusCode())->toBe(400);
        $body = json_decode($e->getResponse()->getBody()->getContents(), true);
        expect($body['error'])->toContain('Job Card ID, start time, and end time are required');
    }
});

test('get_project_time_logs endpoint requires project_id', function () {
    $token = getAuthToken('admin', 'admin');
    try {
        $this->http->get('/api.php?action=get_project_time_logs', [
            'headers' => ['Authorization' => 'Bearer ' . $token]
        ]);
    } catch (ClientException $e) {
        expect($e->getResponse()->getStatusCode())->toBe(400);
        $body = json_decode($e->getResponse()->getBody()->getContents(), true);
        expect($body['error'])->toContain('Project ID is required');
    }
});

test('delete_project endpoint requires project_id', function () {
    $token = getAuthToken('admin', 'admin');
    try {
        $this->http->delete('/api.php?action=delete_project', [
            'headers' => ['Authorization' => 'Bearer ' . $token]
        ]);
    } catch (ClientException $e) {
        expect($e->getResponse()->getStatusCode())->toBe(400);
        $body = json_decode($e->getResponse()->getBody()->getContents(), true);
        expect($body['error'])->toContain('Project ID is required');
    }
});
