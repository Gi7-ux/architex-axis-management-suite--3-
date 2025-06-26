# PHP Debugging Setup Guide

## Prerequisites

1. **Install Xdebug for PHP**:
   - Download from https://xdebug.org/download
   - Or use: `pecl install xdebug` (if you have PECL)

2. **Configure php.ini** (add these lines):
```ini
[xdebug]
zend_extension=xdebug
xdebug.mode=debug
xdebug.start_with_request=yes
xdebug.client_port=9003
xdebug.client_host=127.0.0.1
xdebug.log=/tmp/xdebug.log
```

3. **Install VS Code PHP Debug Extension**:
   - Open VS Code Extensions (Ctrl+Shift+X)
   - Search for "PHP Debug" by Xdebug
   - Install it

## Setting PHP Breakpoints

1. **Open any PHP file** (like `backend/api.php`)
2. **Click in the gutter** next to line numbers
3. **Red dot appears** for breakpoint
4. **Start PHP debugging** (F5 or Debug panel)

## Testing PHP Setup

1. **Create a test PHP file**:
```php
<?php
$test = "Hello Debug";
echo $test; // Set breakpoint here
?>
```

2. **Run with debugging** to verify setup works

## Common Breakpoint Locations in backend/api.php

- **JWT validation functions** - to debug authentication
- **Database query execution** - to inspect SQL and data
- **API endpoint handlers** - to trace request processing
- **Error handling blocks** - to catch and analyze errors

## Troubleshooting

- **Check Xdebug is loaded**: `php -m | grep xdebug`
- **Verify port 9003 is free**: `netstat -an | findstr 9003`
- **Check Xdebug log**: Look at the log file specified in php.ini
