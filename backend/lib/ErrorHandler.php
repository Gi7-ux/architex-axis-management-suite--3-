<?php
class ErrorHandler {
    private $logFile;

    public function __construct($logFile = null) {
        $this->logFile = $logFile ?? __DIR__ . '/../logs/error.log';
        $this->ensureLogDirectoryExists();
    }

    private function ensureLogDirectoryExists() {
        $logDir = dirname($this->logFile);
        if (!file_exists($logDir)) {
            mkdir($logDir, 0755, true);
        }
    }

    public function handleException($exception) {
        $timestamp = date('Y-m-d H:i:s');
        $message = sprintf(
            "[%s] %s: %s in %s on line %d\n",
            $timestamp,
            get_class($exception),
            $exception->getMessage(),
            $exception->getFile(),
            $exception->getLine()
        );

        error_log($message, 3, $this->logFile);

        // Return sanitized error response for client
        return [
            'status' => 'error',
            'message' => $this->getSanitizedErrorMessage($exception)
        ];
    }

    public function handleError($errno, $errstr, $errfile, $errline) {
        $timestamp = date('Y-m-d H:i:s');
        $message = sprintf(
            "[%s] PHP Error (%d): %s in %s on line %d\n",
            $timestamp,
            $errno,
            $errstr,
            $errfile,
            $errline
        );

        error_log($message, 3, $this->logFile);

        return [
            'status' => 'error',
            'message' => 'An internal server error occurred'
        ];
    }

    private function getSanitizedErrorMessage($exception) {
        // In production, don't expose internal error details
        if (getenv('APP_ENV') === 'production') {
            return 'An unexpected error occurred';
        }

        // In development, return more detailed error messages
        return $exception->getMessage();
    }
}
?>
