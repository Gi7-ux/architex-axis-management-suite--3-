<?php
require_once 'db_connect.php';

echo "Creating tables...\n";

$sql = file_get_contents(__DIR__ . '/schema.sql');

if ($conn->multi_query($sql)) {
    do {
        if ($result = $conn->store_result()) {
            $result->free();
        }
    } while ($conn->next_result());
    echo "Tables created successfully.\n";
} else {
    echo "Error creating tables: " . $conn->error . "\n";
}

$conn->close();
?>