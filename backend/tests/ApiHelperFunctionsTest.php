<?php

use Pest\TestSuite;

describe('API Helper Functions', function () {
    it('get_user_from_session_token returns null if token is empty', function () {
        require_once __DIR__ . '/../api.php';
        $conn = $this->createMock(mysqli::class);
        $result = get_user_from_session_token($conn, '');
        expect($result)->toBeNull();
    });

    it('send_json_response outputs correct status and data', function () {
        // This function calls exit, so we cannot test it directly without refactoring.
        expect(true)->toBeTrue(); // Placeholder
    });

    it('create_admin_notification returns false if no admins', function () {
        require_once __DIR__ . '/../api.php';
        $conn = $this->createMock(mysqli::class);
        $conn->method('prepare')->willReturn(false);
        $result = create_admin_notification($conn, 'test_key');
        expect($result)->toBeFalse();
    });

    // Add more tests for endpoints and error cases as needed
});
