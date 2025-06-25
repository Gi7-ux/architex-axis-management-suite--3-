<?php
require_once __DIR__ . '/Database.php';

class RequestHandler {
    private $db;
    private $requestMethod;
    private $action;
    private $data;

    public function __construct() {
        $this->db = Database::getInstance();
        $this->requestMethod = $_SERVER['REQUEST_METHOD'];
        $this->action = $_GET['action'] ?? '';
        $this->data = $this->getRequestData();
    }

    private function getRequestData() {
        $data = [];
        
        switch ($this->requestMethod) {
            case 'GET':
                $data = $_GET;
                break;
            case 'POST':
            case 'PUT':
            case 'DELETE':
                $jsonData = file_get_contents('php://input');
                if (!empty($jsonData)) {
                    $data = json_decode($jsonData, true) ?? [];
                }
                if ($this->requestMethod === 'POST' && empty($data)) {
                    $data = $_POST;
                }
                break;
        }

        return $data;
    }

    public function handleRequest() {
        try {
            if (empty($this->action)) {
                throw new Exception('No action specified');
            }

            $response = $this->processAction();
            $this->sendResponse($response, 200);
        } catch (Exception $e) {
            $this->sendResponse(['status' => 'error', 'message' => $e->getMessage()], 400);
        }
    }

    private function processAction() {
        switch ($this->action) {
            case 'register_user':
                require_once __DIR__ . '/AuthService.php';
                $authService = new AuthService($this->db);
                return $authService->handleRegistration($this->data);
            case 'login_user':
                require_once __DIR__ . '/AuthService.php';
                $authService = new AuthService($this->db);
                return $authService->handleLogin($this->data);
            case 'get_project_files':
                require_once __DIR__ . '/ProjectService.php';
                $userId = $this->getAuthenticatedUserId();
                $projectId = $this->data['project_id'] ?? $_GET['project_id'] ?? null;
                if (!$projectId) {
                    throw new Exception('Missing project_id');
                }
                $projectService = new ProjectService($this->db);
                return $projectService->handleGetProjectFiles($userId, $projectId);
            case 'create_project':
                require_once __DIR__ . '/ProjectCrudService.php';
                $userId = $this->getAuthenticatedUserId();
                $service = new ProjectCrudService($this->db);
                return $service->createProject($userId, $this->data);
            case 'get_project':
                require_once __DIR__ . '/ProjectCrudService.php';
                $userId = $this->getAuthenticatedUserId();
                $projectId = $this->data['project_id'] ?? $_GET['project_id'] ?? null;
                if (!$projectId) throw new Exception('Missing project_id');
                $service = new ProjectCrudService($this->db);
                return $service->getProject($userId, $projectId);
            case 'update_project':
                require_once __DIR__ . '/ProjectCrudService.php';
                $userId = $this->getAuthenticatedUserId();
                $projectId = $this->data['project_id'] ?? $_GET['project_id'] ?? null;
                if (!$projectId) throw new Exception('Missing project_id');
                $service = new ProjectCrudService($this->db);
                return $service->updateProject($userId, $projectId, $this->data);
            case 'delete_project':
                require_once __DIR__ . '/ProjectCrudService.php';
                $userId = $this->getAuthenticatedUserId();
                $projectId = $this->data['project_id'] ?? $_GET['project_id'] ?? null;
                if (!$projectId) throw new Exception('Missing project_id');
                $service = new ProjectCrudService($this->db);
                return $service->deleteProject($userId, $projectId);
            case 'list_projects':
                require_once __DIR__ . '/ProjectCrudService.php';
                $userId = $this->getAuthenticatedUserId();
                $service = new ProjectCrudService($this->db);
                return $service->listProjects($userId);
            case 'apply_to_project':
                require_once __DIR__ . '/ApplicationService.php';
                $userId = $this->getAuthenticatedUserId();
                $service = new ApplicationService($this->db);
                return $service->applyToProject($userId, $this->data);
            case 'list_applications':
                require_once __DIR__ . '/ApplicationService.php';
                $userId = $this->getAuthenticatedUserId();
                $projectId = $this->data['project_id'] ?? $_GET['project_id'] ?? null;
                if (!$projectId) throw new Exception('Missing project_id');
                $service = new ApplicationService($this->db);
                return $service->listApplications($userId, $projectId);
            case 'update_application':
                require_once __DIR__ . '/ApplicationService.php';
                $userId = $this->getAuthenticatedUserId();
                $applicationId = $this->data['application_id'] ?? $_GET['application_id'] ?? null;
                if (!$applicationId) throw new Exception('Missing application_id');
                $service = new ApplicationService($this->db);
                return $service->updateApplication($userId, $applicationId, $this->data);
            case 'delete_application':
                require_once __DIR__ . '/ApplicationService.php';
                $userId = $this->getAuthenticatedUserId();
                $applicationId = $this->data['application_id'] ?? $_GET['application_id'] ?? null;
                if (!$applicationId) throw new Exception('Missing application_id');
                $service = new ApplicationService($this->db);
                return $service->deleteApplication($userId, $applicationId);
            case 'create_job_card':
                require_once __DIR__ . '/JobCardService.php';
                $userId = $this->getAuthenticatedUserId();
                $service = new JobCardService($this->db);
                return $service->createJobCard($userId, $this->data);
            case 'list_job_cards':
                require_once __DIR__ . '/JobCardService.php';
                $userId = $this->getAuthenticatedUserId();
                $projectId = $this->data['project_id'] ?? $_GET['project_id'] ?? null;
                if (!$projectId) throw new Exception('Missing project_id');
                $service = new JobCardService($this->db);
                return $service->listJobCards($userId, $projectId);
            case 'update_job_card':
                require_once __DIR__ . '/JobCardService.php';
                $userId = $this->getAuthenticatedUserId();
                $jobCardId = $this->data['job_card_id'] ?? $_GET['job_card_id'] ?? null;
                if (!$jobCardId) throw new Exception('Missing job_card_id');
                $service = new JobCardService($this->db);
                return $service->updateJobCard($userId, $jobCardId, $this->data);
            case 'delete_job_card':
                require_once __DIR__ . '/JobCardService.php';
                $userId = $this->getAuthenticatedUserId();
                $jobCardId = $this->data['job_card_id'] ?? $_GET['job_card_id'] ?? null;
                if (!$jobCardId) throw new Exception('Missing job_card_id');
                $service = new JobCardService($this->db);
                return $service->deleteJobCard($userId, $jobCardId);
            case 'create_time_log':
                require_once __DIR__ . '/TimeLogService.php';
                $userId = $this->getAuthenticatedUserId();
                $service = new TimeLogService($this->db);
                return $service->createTimeLog($userId, $this->data);
            case 'list_time_logs':
                require_once __DIR__ . '/TimeLogService.php';
                $userId = $this->getAuthenticatedUserId();
                $jobCardId = $this->data['job_card_id'] ?? $_GET['job_card_id'] ?? null;
                if (!$jobCardId) throw new Exception('Missing job_card_id');
                $service = new TimeLogService($this->db);
                return $service->listTimeLogs($userId, $jobCardId);
            case 'update_time_log':
                require_once __DIR__ . '/TimeLogService.php';
                $userId = $this->getAuthenticatedUserId();
                $timeLogId = $this->data['time_log_id'] ?? $_GET['time_log_id'] ?? null;
                if (!$timeLogId) throw new Exception('Missing time_log_id');
                $service = new TimeLogService($this->db);
                return $service->updateTimeLog($userId, $timeLogId, $this->data);
            case 'delete_time_log':
                require_once __DIR__ . '/TimeLogService.php';
                $userId = $this->getAuthenticatedUserId();
                $timeLogId = $this->data['time_log_id'] ?? $_GET['time_log_id'] ?? null;
                if (!$timeLogId) throw new Exception('Missing time_log_id');
                $service = new TimeLogService($this->db);
                return $service->deleteTimeLog($userId, $timeLogId);
            case 'create_conversation':
                require_once __DIR__ . '/MessagingService.php';
                $userId = $this->getAuthenticatedUserId();
                $service = new MessagingService($this->db);
                return $service->createConversation($userId, $this->data);
            case 'send_message':
                require_once __DIR__ . '/MessagingService.php';
                $userId = $this->getAuthenticatedUserId();
                $service = new MessagingService($this->db);
                return $service->sendMessage($userId, $this->data);
            case 'list_conversations':
                require_once __DIR__ . '/MessagingService.php';
                $userId = $this->getAuthenticatedUserId();
                $service = new MessagingService($this->db);
                return $service->listConversations($userId);
            case 'list_messages':
                require_once __DIR__ . '/MessagingService.php';
                $userId = $this->getAuthenticatedUserId();
                $conversationId = $this->data['conversation_id'] ?? $_GET['conversation_id'] ?? null;
                if (!$conversationId) throw new Exception('Missing conversation_id');
                $service = new MessagingService($this->db);
                return $service->listMessages($userId, $conversationId);
            // Add more action handlers here
            default:
                throw new Exception('Invalid action');
        }
    }

    private function getAuthenticatedUserId() {
        $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
        if (preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
            $token = $matches[1];
            $payload = JWTHandler::validateToken($token);
            if ($payload && isset($payload['user_id'])) {
                return $payload['user_id'];
            }
        }
        throw new Exception('Authentication required');
    }

    private function sendResponse($data, $statusCode = 200) {
        http_response_code($statusCode);
        header('Content-Type: application/json');
        echo json_encode($data);
        exit;
    }

    private function validateRequiredFields($data, $requiredFields) {
        foreach ($requiredFields as $field) {
            if (!isset($data[$field]) || empty($data[$field])) {
                throw new Exception("Missing required field: {$field}");
            }
        }
    }

    private function sanitizeInput($data) {
        if (is_array($data)) {
            return array_map([$this, 'sanitizeInput'], $data);
        }
        return htmlspecialchars(trim($data), ENT_QUOTES, 'UTF-8');
    }
}
?>
