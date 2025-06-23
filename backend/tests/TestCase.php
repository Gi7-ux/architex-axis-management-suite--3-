<?php

namespace Tests;

use PHPUnit\Framework\TestCase as BaseTestCase;
use GuzzleHttp\Client;

abstract class TestCase extends BaseTestCase
{
    use RefreshDatabase;

    protected Client $http;

    protected function setUp(): void
    {
        parent::setUp();
        $this->http = new Client(['base_uri' => 'http://localhost:8000']);
    }
}