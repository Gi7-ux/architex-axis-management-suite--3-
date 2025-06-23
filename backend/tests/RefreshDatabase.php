<?php

namespace Tests;

trait RefreshDatabase
{
    protected function setUp(): void
    {
        parent::setUp();
        $this->refreshDatabase();
    }

    protected function refreshDatabase()
    {
        $db = new \mysqli(DB_SERVER, DB_USERNAME, DB_PASSWORD, DB_NAME);
        $this->truncateTables($db);
        $seeder = new DatabaseSeeder($db);
        $seeder->run();
    }

    protected function truncateTables(\mysqli $db)
    {
        $db->query('SET FOREIGN_KEY_CHECKS=0');
        $tables = $db->query('SHOW TABLES');
        while ($row = $tables->fetch_array()) {
            $db->query('TRUNCATE TABLE ' . $row[0]);
        }
        $db->query('SET FOREIGN_KEY_CHECKS=1');
    }
}