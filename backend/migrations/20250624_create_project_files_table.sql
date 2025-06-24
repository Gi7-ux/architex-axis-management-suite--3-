CREATE TABLE IF NOT EXISTS project_files (
    id INT PRIMARY KEY AUTO_INCREMENT,
    project_id INT NOT NULL,
    uploader_id INT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(512) UNIQUE NOT NULL,
    file_type VARCHAR(100),
    file_size INT,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE,
    FOREIGN KEY (uploader_id) REFERENCES users (id) ON DELETE CASCADE,
    INDEX idx_project_id (project_id),
    INDEX idx_uploader_id (uploader_id)
);