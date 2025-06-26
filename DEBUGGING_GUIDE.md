# PHP-Frontend Integration Debugging Guide

This guide provides comprehensive debugging tools and tests for the Architex Axis Management Suite's PHP backend and React frontend integration.

## 🚀 Quick Start

### Windows Users
```bash
# Run all integration tests
test-runner.bat

# Or manually run individual test suites
npm test -- tests/integration
npx playwright test tests-e2e/integration
```

### Linux/Mac Users
```bash
# Make script executable
chmod +x test-runner.sh

# Run all integration tests
./test-runner.sh

# Or manually run individual test suites
npm test -- tests/integration  
npx playwright test tests-e2e/integration
```

## 📋 Test Coverage

Our comprehensive test suite covers:

### 1. PHP Backend Integration Tests (`tests/integration/PHPBackendIntegration.test.ts`)
- ✅ Authentication flow (login/register)
- ✅ JWT token handling and validation
- ✅ API endpoint responses and error handling
- ✅ Database integration and data persistence
- ✅ CORS configuration
- ✅ Input validation and security

### 2. Frontend-PHP Integration Tests (`tests/integration/FrontendPHPIntegration.test.tsx`)
- ✅ Component integration with PHP API
- ✅ Authentication state management
- ✅ Error handling and user feedback
- ✅ Data synchronization between frontend and backend
- ✅ Real-time updates and polling
- ✅ File upload functionality

### 3. End-to-End Integration Tests (`tests-e2e/integration/full-stack-integration.spec.ts`)
- ✅ Complete user workflows (login, registration, project creation)
- ✅ Cross-browser compatibility testing
- ✅ Network error handling
- ✅ Authentication persistence across page refreshes
- ✅ API error display in UI
- ✅ File upload through browser interface

### 4. PHP Backend Unit Tests (`backend/tests/IntegrationTest.php`)
- ✅ Database connection and queries
- ✅ JWT authentication and authorization
- ✅ Input validation and sanitization
- ✅ Error handling and logging
- ✅ Security measures (SQL injection, XSS prevention)
- ✅ Password hashing and verification

## 🛠️ Debugging Tools

### VS Code Debug Configurations

We've provided comprehensive VS Code debugging configurations in `.vscode/launch.json`:

#### 1. Debug PHP Backend
- **Configuration**: "Debug PHP Backend"
- **Purpose**: Step-through debugging of PHP API endpoints
- **Setup**: Requires Xdebug extension for PHP
- **Port**: 9003

#### 2. Debug Frontend (Chrome/Edge)
- **Configuration**: "Debug Frontend (Chrome)" or "Debug Frontend (Edge)"
- **Purpose**: Debug React components and API calls
- **Auto-starts**: Vite development server

#### 3. Debug Jest Tests
- **Configuration**: "Run Jest Tests (Debug)"
- **Purpose**: Debug unit and integration tests
- **Features**: Breakpoints, variable inspection

#### 4. Debug E2E Tests
- **Configuration**: "Run Playwright E2E Tests (Debug)"
- **Purpose**: Debug end-to-end test scenarios
- **Features**: Browser automation debugging

#### 5. Full Stack Debugging
- **Configuration**: "Debug Full Stack (PHP + Frontend)"
- **Purpose**: Simultaneous debugging of both backend and frontend
- **Usage**: Set breakpoints in both PHP and TypeScript code

### Manual Debugging Commands

#### Test Individual Components
```bash
# Test specific API endpoints
npm test -- apiService.test.ts

# Test specific components
npm test -- components/LoginPage.test.tsx

# Test integration scenarios
npm test -- tests/integration/PHPBackendIntegration.test.ts

# Run E2E tests with browser visible
npx playwright test --headed tests-e2e/integration/
```

#### Debug API Calls Manually
```bash
# Test PHP backend directly
curl -X POST http://localhost/backend/api.php \
     -H "Content-Type: application/json" \
     -d '{"action":"login","email":"test@example.com","password":"password123"}'

# Test CORS headers
curl -X OPTIONS http://localhost/backend/api.php \
     -H "Origin: http://localhost:5173" \
     -v
```

## 🔧 Common Issues and Solutions

### 1. PHP Backend Not Responding
**Problem**: API calls fail with connection errors

**Solutions**:
- Ensure PHP server is running: `php -S localhost:8000 -t backend/`
- Check PHP error logs for syntax errors
- Verify database connection in `backend/db_connect.php`
- Ensure correct CORS headers are set

### 2. Jest Tests Failing
**Problem**: Frontend tests fail to run or encounter errors

**Solutions**:
- Clear Jest cache: `npm test -- --clearCache`
- Check for missing dependencies: `npm install`
- Verify mock configurations in test files
- Ensure `jest.setup.js` is properly configured

### 3. E2E Tests Timing Out
**Problem**: Playwright tests fail due to timeouts

**Solutions**:
- Increase timeout in `playwright.config.ts`
- Ensure frontend and backend are running before tests
- Add explicit waits for API responses
- Check network connectivity between services

### 4. Authentication Issues
**Problem**: JWT tokens not working properly

**Solutions**:
- Verify JWT secret key configuration
- Check token expiration settings
- Ensure proper token storage in localStorage
- Validate token format and claims

### 5. CORS Errors
**Problem**: Browser blocks API requests due to CORS

**Solutions**:
- Verify CORS headers in PHP backend
- Ensure proper origin configuration
- Check preflight request handling
- Test with browser dev tools network tab

## 📊 Test Reports and Monitoring

### Generating Test Reports
```bash
# Generate Jest coverage report
npm test -- --coverage

# Generate Playwright HTML report
npx playwright test --reporter=html

# View reports
npm run test:coverage  # Opens Jest coverage
npx playwright show-report  # Opens Playwright report
```

### Continuous Integration
The test suite is designed to work with CI/CD pipelines:

```yaml
# Example GitHub Actions workflow
- name: Run Integration Tests
  run: |
    npm install
    npm run build
    ./test-runner.sh
```

## 🐛 Advanced Debugging Techniques

### 1. Network Traffic Analysis
```javascript
// Add to test files for request/response logging
page.on('request', request => {
  console.log('REQUEST:', request.method(), request.url());
});

page.on('response', response => {
  console.log('RESPONSE:', response.status(), response.url());
});
```

### 2. Database Query Debugging
```php
// Add to PHP backend for query logging
error_log("SQL Query: " . $query);
error_log("Parameters: " . json_encode($params));
```

### 3. Frontend State Debugging
```javascript
// Add to React components for state logging
console.log('Component State:', JSON.stringify(state, null, 2));
console.log('API Response:', JSON.stringify(response, null, 2));
```

### 4. Real-time Error Monitoring
Set up error boundaries and logging to catch and report integration issues:

```javascript
// Error boundary for API integration errors
class APIErrorBoundary extends React.Component {
  componentDidCatch(error, errorInfo) {
    console.error('API Integration Error:', error, errorInfo);
    // Send to monitoring service
  }
}
```

## 📈 Performance Testing

### Load Testing API Endpoints
```bash
# Using curl for basic load testing
for i in {1..100}; do
  curl -X POST http://localhost/backend/api.php \
       -H "Content-Type: application/json" \
       -d '{"action":"get_projects"}' &
done
wait
```

### Frontend Performance Monitoring
```javascript
// Add to components for performance tracking
const start = performance.now();
await apiCall();
const end = performance.now();
console.log(`API call took ${end - start} milliseconds`);
```

## 🔐 Security Testing

### Authentication Security
- Test password strength requirements
- Verify JWT token expiration handling
- Test SQL injection prevention
- Validate input sanitization

### CORS Security
- Test proper origin restrictions
- Verify credential handling
- Check preflight request security

## 📝 Contributing to Tests

When adding new features, ensure you:

1. **Add unit tests** for new API endpoints
2. **Update integration tests** for new workflows
3. **Add E2E tests** for new user-facing features
4. **Update this guide** with new debugging procedures

### Test File Naming Convention
- Unit tests: `*.test.ts` or `*.test.tsx`
- Integration tests: `tests/integration/*.test.ts`
- E2E tests: `tests-e2e/**/*.spec.ts`
- PHP tests: `backend/tests/*Test.php`

---

**Need help?** Check the troubleshooting guide in `TROUBLESHOOTING.md` or refer to the Memory Bank for project-specific context.
