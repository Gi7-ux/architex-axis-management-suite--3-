<?php
class TimeLogService {
    private $db;
    public function __construct($db) { $this->db = $db; }

    public function createTimeLog($userId, $data) {
        $required = ['job_card_id', 'start_time', 'end_time', 'duration_minutes'];
        foreach ($required as $f) if (empty($data[$f])) throw new Exception("Missing $f");
        $sql = "INSERT INTO time_logs (job_card_id, user_id, start_time, end_time, duration_minutes, notes) VALUES (?, ?, ?, ?, ?, ?)";
        $this->db->query($sql, [
            $data['job_card_id'], $userId, $data['start_time'], $data['end_time'], $data['duration_minutes'], $data['notes'] ?? null
        ]);
        return ['status'=>'success','time_log_id'=>$this->db->lastInsertId()];
    }

    public function listTimeLogs($userId, $jobCardId) {
        $sql = "SELECT * FROM time_logs WHERE job_card_id = ? AND user_id = ? ORDER BY start_time DESC";
        $result = $this->db->query($sql, [$jobCardId, $userId]);
        $logs = [];
        while ($row = $result->fetch_assoc()) $logs[] = $row;
        return ['status'=>'success','time_logs'=>$logs];
    }

    public function updateTimeLog($userId, $timeLogId, $data) {
        $sql = "SELECT * FROM time_logs WHERE id = ? AND user_id = ?";
        $result = $this->db->query($sql, [$timeLogId, $userId]);
        if ($result->num_rows === 0) throw new Exception('Time log not found or access denied');
        $fields = [];
        $params = [];
        foreach (['start_time','end_time','duration_minutes','notes'] as $field) {
            if (isset($data[$field])) {
                $fields[] = "$field = ?";
                $params[] = $data[$field];
            }
        }
        if (!$fields) throw new Exception('No fields to update');
        $params[] = $timeLogId;
        $sql = "UPDATE time_logs SET ".implode(",",$fields).", updated_at=NOW() WHERE id = ?";
        $this->db->query($sql, $params);
        return ['status'=>'success','message'=>'Time log updated'];
    }

    public function deleteTimeLog($userId, $timeLogId) {
        $sql = "DELETE FROM time_logs WHERE id = ? AND user_id = ?";
        $this->db->query($sql, [$timeLogId, $userId]);
        return ['status'=>'success','message'=>'Time log deleted'];
    }
}
?>
