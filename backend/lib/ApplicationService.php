<?php
class ApplicationService {
    private $db;
    public function __construct($db) { $this->db = $db; }

    public function applyToProject($userId, $data) {
        $required = ['project_id', 'proposal_text', 'bid_amount'];
        foreach ($required as $f) if (empty($data[$f])) throw new Exception("Missing $f");
        $sql = "INSERT INTO applications (project_id, freelancer_id, proposal_text, bid_amount) VALUES (?, ?, ?, ?)";
        $this->db->query($sql, [$data['project_id'], $userId, $data['proposal_text'], $data['bid_amount']]);
        return ['status'=>'success','application_id'=>$this->db->lastInsertId()];
    }

    public function listApplications($userId, $projectId) {
        $sql = "SELECT * FROM applications WHERE project_id = ? AND (freelancer_id = ? OR ? IN (SELECT id FROM users WHERE role = 'admin')) ORDER BY applied_at DESC";
        $result = $this->db->query($sql, [$projectId, $userId, $userId]);
        $apps = [];
        while ($row = $result->fetch_assoc()) $apps[] = $row;
        return ['status'=>'success','applications'=>$apps];
    }

    public function updateApplication($userId, $applicationId, $data) {
        $sql = "SELECT * FROM applications WHERE id = ? AND freelancer_id = ?";
        $result = $this->db->query($sql, [$applicationId, $userId]);
        if ($result->num_rows === 0) throw new Exception('Application not found or access denied');
        $fields = [];
        $params = [];
        foreach (['proposal_text','bid_amount','status'] as $field) {
            if (isset($data[$field])) {
                $fields[] = "$field = ?";
                $params[] = $data[$field];
            }
        }
        if (!$fields) throw new Exception('No fields to update');
        $params[] = $applicationId;
        $sql = "UPDATE applications SET ".implode(",",$fields).", updated_at=NOW() WHERE id = ?";
        $this->db->query($sql, $params);
        return ['status'=>'success','message'=>'Application updated'];
    }

    public function deleteApplication($userId, $applicationId) {
        $sql = "DELETE FROM applications WHERE id = ? AND freelancer_id = ?";
        $this->db->query($sql, [$applicationId, $userId]);
        return ['status'=>'success','message'=>'Application deleted'];
    }
}
?>
