<?php
class JobCardService {
    private $db;
    public function __construct($db) { $this->db = $db; }

    public function createJobCard($userId, $data) {
        $required = ['project_id', 'title', 'description'];
        foreach ($required as $f) if (empty($data[$f])) throw new Exception("Missing $f");
        $sql = "INSERT INTO job_cards (project_id, title, description, status) VALUES (?, ?, ?, 'todo')";
        $this->db->query($sql, [$data['project_id'], $data['title'], $data['description']]);
        return ['status'=>'success','job_card_id'=>$this->db->lastInsertId()];
    }

    public function listJobCards($userId, $projectId) {
        $sql = "SELECT * FROM job_cards WHERE project_id = ? ORDER BY created_at DESC";
        $result = $this->db->query($sql, [$projectId]);
        $cards = [];
        while ($row = $result->fetch_assoc()) $cards[] = $row;
        return ['status'=>'success','job_cards'=>$cards];
    }

    public function updateJobCard($userId, $jobCardId, $data) {
        $sql = "SELECT * FROM job_cards WHERE id = ?";
        $result = $this->db->query($sql, [$jobCardId]);
        if ($result->num_rows === 0) throw new Exception('Job card not found');
        $fields = [];
        $params = [];
        foreach (['title','description','status','assigned_freelancer_id','estimated_hours'] as $field) {
            if (isset($data[$field])) {
                $fields[] = "$field = ?";
                $params[] = $data[$field];
            }
        }
        if (!$fields) throw new Exception('No fields to update');
        $params[] = $jobCardId;
        $sql = "UPDATE job_cards SET ".implode(",",$fields).", updated_at=NOW() WHERE id = ?";
        $this->db->query($sql, $params);
        return ['status'=>'success','message'=>'Job card updated'];
    }

    public function deleteJobCard($userId, $jobCardId) {
        $sql = "DELETE FROM job_cards WHERE id = ?";
        $this->db->query($sql, [$jobCardId]);
        return ['status'=>'success','message'=>'Job card deleted'];
    }
}
?>
