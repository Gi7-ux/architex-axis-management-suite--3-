<?php
// Pest tests for backend API endpoints (structure, not full DB integration)

test('register_user endpoint returns error for missing fields', function () {
    $response = $this->postJson('/backend/api.php?action=register_user', []);
    expect($response->status())->toBe(400);
    expect($response->json('error'))->toContain('required');
});

test('login_user endpoint returns error for missing fields', function () {
    $response = $this->postJson('/backend/api.php?action=login_user', []);
    expect($response->status())->toBe(400);
    expect($response->json('error'))->toContain('required');
});

test('get_user_profile endpoint requires authentication', function () {
    $response = $this->get('/backend/api.php?action=get_user_profile');
    expect($response->status())->toBe(401)->or($response->status())->toBe(403);
});

test('get_all_users endpoint requires admin', function () {
    $response = $this->get('/backend/api.php?action=get_all_users');
    expect($response->status())->toBe(401)->or($response->status())->toBe(403);
});

test('get_client_projects endpoint requires client', function () {
    $response = $this->get('/backend/api.php?action=get_client_projects');
    expect($response->status())->toBe(401)->or($response->status())->toBe(403);
});

test('get_project_applications endpoint requires project_id', function () {
    $response = $this->get('/backend/api.php?action=get_project_applications');
    expect($response->status())->toBe(400);
    expect($response->json('error'))->toContain('Project ID');
});

test('update_application_status endpoint requires application_id', function () {
    $response = $this->putJson('/backend/api.php?action=update_application_status', []);
    expect($response->status())->toBe(400);
    expect($response->json('error'))->toContain('Application ID');
});

test('submit_application endpoint requires freelancer', function () {
    $response = $this->postJson('/backend/api.php?action=submit_application', []);
    expect($response->status())->toBe(401)->or($response->status())->toBe(403);
});

test('get_freelancer_applications endpoint requires freelancer', function () {
    $response = $this->get('/backend/api.php?action=get_freelancer_applications');
    expect($response->status())->toBe(401)->or($response->status())->toBe(403);
});

test('get_freelancer_assigned_projects endpoint requires freelancer', function () {
    $response = $this->get('/backend/api.php?action=get_freelancer_assigned_projects');
    expect($response->status())->toBe(401)->or($response->status())->toBe(403);
});

test('withdraw_application endpoint requires application_id', function () {
    $response = $this->postJson('/backend/api.php?action=withdraw_application', []);
    expect($response->status())->toBe(400);
    expect($response->json('error'))->toContain('Application ID');
});

test('create_job_card endpoint requires project_id and title', function () {
    $response = $this->postJson('/backend/api.php?action=create_job_card', []);
    expect($response->status())->toBe(400);
    expect($response->json('error'))->toContain('Project ID');
});

test('get_project_job_cards endpoint requires project_id', function () {
    $response = $this->get('/backend/api.php?action=get_project_job_cards');
    expect($response->status())->toBe(400);
    expect($response->json('error'))->toContain('Project ID');
});

test('log_time endpoint requires job_card_id, start_time, end_time', function () {
    $response = $this->postJson('/backend/api.php?action=log_time', []);
    expect($response->status())->toBe(400);
    expect($response->json('error'))->toContain('Job Card ID');
});

test('get_project_time_logs endpoint requires project_id', function () {
    $response = $this->get('/backend/api.php?action=get_project_time_logs');
    expect($response->status())->toBe(400);
    expect($response->json('error'))->toContain('Project ID');
});

test('delete_project endpoint requires project_id', function () {
    $response = $this->delete('/backend/api.php?action=delete_project');
    expect($response->status())->toBe(400);
    expect($response->json('error'))->toContain('Project ID');
});
// Add more endpoint tests as needed for full coverage
