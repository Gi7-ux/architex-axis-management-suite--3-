<?php
class Database {
    private static $instance = null;
    private $conn;

    private function __construct() {
        require_once __DIR__ . '/../config.php';
        
        try {
            $this->conn = new mysqli(
                DB_SERVERNAME,
                DB_USERNAME,
                DB_PASSWORD,
                DB_NAME,
                DB_PORT
            );

            if ($this->conn->connect_error) {
                throw new Exception("Connection failed: " . $this->conn->connect_error);
            }

            $this->conn->set_charset("utf8mb4");
        } catch (Exception $e) {
            error_log("Database connection error: " . $e->getMessage());
            throw new Exception("Database connection failed");
        }
    }

    public static function getInstance() {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    public function getConnection() {
        return $this->conn;
    }

    public function query($sql, $params = []) {
        try {
            $stmt = $this->conn->prepare($sql);
            
            if ($stmt === false) {
                throw new Exception("Query preparation failed: " . $this->conn->error);
            }

            if (!empty($params)) {
                $types = '';
                $bindParams = array();
                
                foreach ($params as $param) {
                    if (is_int($param)) {
                        $types .= 'i';
                    } elseif (is_float($param)) {
                        $types .= 'd';
                    } elseif (is_string($param)) {
                        $types .= 's';
                    } else {
                        $types .= 'b';
                    }
                    $bindParams[] = $param;
                }
                
                array_unshift($bindParams, $types);
                call_user_func_array(array($stmt, 'bind_param'), $this->refValues($bindParams));
            }

            if (!$stmt->execute()) {
                throw new Exception("Query execution failed: " . $stmt->error);
            }

            $result = $stmt->get_result();
            $stmt->close();
            
            return $result;
        } catch (Exception $e) {
            error_log("Query error: " . $e->getMessage());
            throw new Exception("Database query failed");
        }
    }

    private function refValues($arr) {
        $refs = array();
        foreach ($arr as $key => $value) {
            $refs[$key] = &$arr[$key];
        }
        return $refs;
    }

    public function beginTransaction() {
        $this->conn->begin_transaction();
    }

    public function commit() {
        $this->conn->commit();
    }

    public function rollback() {
        $this->conn->rollback();
    }

    public function lastInsertId() {
        return $this->conn->insert_id;
    }
}
?>
