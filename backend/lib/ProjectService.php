<?php
class ProjectService {
    private $db;

    public function __construct($db) {
        $this->db = $db;
    }

    public function handleGetProjectFiles($userId, $projectId) {
        // Verify project access
        $sql = "SELECT p.* FROM projects p 
                LEFT JOIN users u ON p.client_id = u.id OR p.freelancer_id = u.id 
                WHERE p.id = ? AND (u.id = ? OR u.role = 'admin')";
        
        $result = $this->db->query($sql, [$projectId, $userId]);
        
        if ($result->num_rows === 0) {
            throw new Exception('Project not found or access denied');
        }

        // Get project files
        $sql = "SELECT 
                    pf.id,
                    pf.file_name,
                    pf.file_type,
                    pf.file_size,
                    pf.uploaded_at,
                    u.username as uploaded_by
                FROM project_files pf
                JOIN users u ON pf.uploader_id = u.id
                WHERE pf.project_id = ?
                ORDER BY pf.uploaded_at DESC";

        $result = $this->db->query($sql, [$projectId]);
        
        $files = [];
        while ($row = $result->fetch_assoc()) {
            $files[] = [
                'id' => $row['id'],
                'fileName' => $row['file_name'],
                'fileType' => $row['file_type'],
                'fileSize' => $row['file_size'],
                'uploadedAt' => $row['uploaded_at'],
                'uploadedBy' => $row['uploaded_by']
            ];
        }

        return [
            'status' => 'success',
            'files' => $files
        ];
    }

    public function handleUploadProjectFile($userId, $projectId, $fileData) {
        // Verify project access
        $sql = "SELECT p.* FROM projects p 
                LEFT JOIN users u ON p.client_id = u.id OR p.freelancer_id = u.id 
                WHERE p.id = ? AND (u.id = ? OR u.role = 'admin')";
        
        $result = $this->db->query($sql, [$projectId, $userId]);
        
        if ($result->num_rows === 0) {
            throw new Exception('Project not found or access denied');
        }

        // Process file upload
        if (!isset($_FILES['file'])) {
            throw new Exception('No file uploaded');
        }

        $file = $_FILES['file'];
        $fileName = $file['name'];
        $fileType = $file['type'];
        $fileSize = $file['size'];
        $fileTmpPath = $file['tmp_name'];

        // Generate unique file path
        $uploadDir = __DIR__ . '/../uploads/project_' . $projectId . '/';
        if (!file_exists($uploadDir)) {
            mkdir($uploadDir, 0755, true);
        }

        $fileExtension = pathinfo($fileName, PATHINFO_EXTENSION);
        $uniqueFileName = uniqid() . '.' . $fileExtension;
        $filePath = $uploadDir . $uniqueFileName;

        // Move uploaded file
        if (!move_uploaded_file($fileTmpPath, $filePath)) {
            throw new Exception('Failed to save file');
        }

        // Save file info to database
        $sql = "INSERT INTO project_files (project_id, uploader_id, file_name, file_path, file_type, file_size) 
                VALUES (?, ?, ?, ?, ?, ?)";
        
        $this->db->query($sql, [
            $projectId,
            $userId,
            $fileName,
            $uniqueFileName,
            $fileType,
            $fileSize
        ]);

        return [
            'status' => 'success',
            'message' => 'File uploaded successfully',
            'fileId' => $this->db->lastInsertId()
        ];
    }
}
?>
