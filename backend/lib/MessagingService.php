<?php
class MessagingService {
    private $db;
    public function __construct($db) { $this->db = $db; }

    public function createConversation($userId, $data) {
        $required = ['participant_ids'];
        if (empty($data['participant_ids']) || !is_array($data['participant_ids'])) throw new Exception('Missing participant_ids');
        $sql = "INSERT INTO conversations () VALUES ()";
        $this->db->query($sql, []);
        $conversationId = $this->db->lastInsertId();
        foreach ($data['participant_ids'] as $pid) {
            $this->db->query("INSERT INTO conversation_participants (conversation_id, user_id) VALUES (?, ?)", [$conversationId, $pid]);
        }
        $this->db->query("INSERT INTO conversation_participants (conversation_id, user_id) VALUES (?, ?)", [$conversationId, $userId]);
        return ['status'=>'success','conversation_id'=>$conversationId];
    }

    public function sendMessage($userId, $data) {
        $required = ['conversation_id', 'content'];
        foreach ($required as $f) if (empty($data[$f])) throw new Exception("Missing $f");
        $sql = "INSERT INTO messages (conversation_id, sender_id, content) VALUES (?, ?, ?)";
        $this->db->query($sql, [$data['conversation_id'], $userId, $data['content']]);
        return ['status'=>'success','message_id'=>$this->db->lastInsertId()];
    }

    public function listConversations($userId) {
        $sql = "SELECT c.* FROM conversations c JOIN conversation_participants cp ON c.id = cp.conversation_id WHERE cp.user_id = ? ORDER BY c.updated_at DESC";
        $result = $this->db->query($sql, [$userId]);
        $convos = [];
        while ($row = $result->fetch_assoc()) $convos[] = $row;
        return ['status'=>'success','conversations'=>$convos];
    }

    public function listMessages($userId, $conversationId) {
        $sql = "SELECT m.* FROM messages m WHERE m.conversation_id = ? ORDER BY m.created_at ASC";
        $result = $this->db->query($sql, [$conversationId]);
        $msgs = [];
        while ($row = $result->fetch_assoc()) $msgs[] = $row;
        return ['status'=>'success','messages'=>$msgs];
    }
}
?>
