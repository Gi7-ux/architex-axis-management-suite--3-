<?php
use PHPUnit\Framework\TestCase;

class ApiSmokeTest extends TestCase {
    private $baseUrl = 'http://localhost:8080/backend/api.php';

    public function testRegisterUser() {
        $data = [
            'username' => 'apitestuser2',
            'email' => 'apitestuser2@example.com',
            'password' => 'TestPassword123!',
            'role' => 'freelancer'
        ];
        $response = $this->post('register_user', $data);
        $this->assertArrayHasKey('status', $response);
    }

    private function post($action, $data, $token = null) {
        $ch = curl_init("{$this->baseUrl}?action=$action");
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Content-Type: application/json' . ($token ? "\r\nAuthorization: Bearer $token" : '')
        ]);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
        $result = curl_exec($ch);
        curl_close($ch);
        return json_decode($result, true);
    }
}
