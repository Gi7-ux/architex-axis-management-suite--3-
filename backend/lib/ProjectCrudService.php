<?php
class ProjectCrudService {
    private $db;
    public function __construct($db) {
        $this->db = $db;
    }

    public function createProject($userId, $data) {
        $required = ['title', 'description'];
        foreach ($required as $field) {
            if (empty($data[$field])) throw new Exception("Missing $field");
        }
        $title = htmlspecialchars(trim($data['title']));
        $description = htmlspecialchars(trim($data['description']));
        $clientId = $userId;
        $sql = "INSERT INTO projects (title, description, client_id, status) VALUES (?, ?, ?, 'open')";
        $this->db->query($sql, [$title, $description, $clientId]);
        return ['status'=>'success','project_id'=>$this->db->lastInsertId()];
    }

    public function getProject($userId, $projectId) {
        $sql = "SELECT * FROM projects WHERE id = ? AND (client_id = ? OR freelancer_id = ? OR ? IN (SELECT id FROM users WHERE role = 'admin'))";
        $result = $this->db->query($sql, [$projectId, $userId, $userId, $userId]);
        if ($result->num_rows === 0) throw new Exception('Project not found or access denied');
        return ['status'=>'success','project'=>$result->fetch_assoc()];
    }

    public function updateProject($userId, $projectId, $data) {
        $sql = "SELECT * FROM projects WHERE id = ? AND client_id = ?";
        $result = $this->db->query($sql, [$projectId, $userId]);
        if ($result->num_rows === 0) throw new Exception('Project not found or access denied');
        $fields = [];
        $params = [];
        foreach (['title','description','status','freelancer_id'] as $field) {
            if (isset($data[$field])) {
                $fields[] = "$field = ?";
                $params[] = $data[$field];
            }
        }
        if (!$fields) throw new Exception('No fields to update');
        $params[] = $projectId;
        $sql = "UPDATE projects SET ".implode(",",$fields).", updated_at=NOW() WHERE id = ?";
        $this->db->query($sql, $params);
        return ['status'=>'success','message'=>'Project updated'];
    }

    public function deleteProject($userId, $projectId) {
        $sql = "DELETE FROM projects WHERE id = ? AND client_id = ?";
        $this->db->query($sql, [$projectId, $userId]);
        return ['status'=>'success','message'=>'Project deleted'];
    }

    public function listProjects($userId) {
        $sql = "SELECT * FROM projects WHERE client_id = ? OR freelancer_id = ? OR ? IN (SELECT id FROM users WHERE role = 'admin') ORDER BY created_at DESC";
        $result = $this->db->query($sql, [$userId, $userId, $userId]);
        $projects = [];
        while ($row = $result->fetch_assoc()) $projects[] = $row;
        return ['status'=>'success','projects'=>$projects];
    }
}
?>
