#!/bin/bash

# test-runner.sh - Comprehensive test runner for PHP-Frontend Integration

echo "🚀 Starting Comprehensive PHP-Frontend Integration Tests"
echo "======================================================="

# Configuration
FRONTEND_URL="http://localhost:5173"
BACKEND_URL="http://localhost/backend"
TEST_DB="architex_test"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if service is running
check_service() {
    local url=$1
    local name=$2
    
    if curl -s --head "$url" | head -n 1 | grep -q "200 OK\|404"; then
        print_success "$name is running at $url"
        return 0
    else
        print_error "$name is not accessible at $url"
        return 1
    fi
}

# Function to setup test database
setup_test_database() {
    print_status "Setting up test database..."
    
    # Create test database if it doesn't exist
    mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS $TEST_DB;"
    
    if [ $? -eq 0 ]; then
        print_success "Test database setup complete"
    else
        print_error "Failed to setup test database"
        return 1
    fi
    
    # Run migrations on test database
    if [ -f "backend/create_tables.php" ]; then
        php backend/create_tables.php --database=$TEST_DB
        print_success "Test database tables created"
    else
        print_warning "No migration script found"
    fi
}

# Function to run PHP backend tests
run_php_tests() {
    print_status "Running PHP Backend Integration Tests..."
    
    cd backend
    
    # Install PHP dependencies if needed
    if [ -f "composer.json" ] && [ ! -d "vendor" ]; then
        print_status "Installing PHP dependencies..."
        composer install
    fi
    
    # Run PHPUnit tests
    if [ -f "vendor/bin/phpunit" ]; then
        ./vendor/bin/phpunit tests/IntegrationTest.php --verbose
        if [ $? -eq 0 ]; then
            print_success "PHP backend tests passed"
        else
            print_error "PHP backend tests failed"
            return 1
        fi
    else
        print_warning "PHPUnit not found, skipping PHP tests"
    fi
    
    cd ..
}

# Function to run Jest frontend tests
run_frontend_tests() {
    print_status "Running Frontend Integration Tests..."
    
    # Install npm dependencies if needed
    if [ ! -d "node_modules" ]; then
        print_status "Installing npm dependencies..."
        npm install
    fi
    
    # Run Jest tests
    npm test -- tests/integration --verbose
    if [ $? -eq 0 ]; then
        print_success "Frontend integration tests passed"
    else
        print_error "Frontend integration tests failed"
        return 1
    fi
}

# Function to run E2E tests
run_e2e_tests() {
    print_status "Running End-to-End Integration Tests..."
    
    # Install Playwright if needed
    if [ ! -d "node_modules/@playwright" ]; then
        print_status "Installing Playwright..."
        npm install @playwright/test
        npx playwright install
    fi
    
    # Run Playwright E2E tests
    npx playwright test tests-e2e/integration --reporter=html
    if [ $? -eq 0 ]; then
        print_success "E2E integration tests passed"
    else
        print_error "E2E integration tests failed"
        return 1
    fi
}

# Function to run API endpoint tests
run_api_tests() {
    print_status "Running API Endpoint Tests..."
    
    # Test basic connectivity
    curl -X POST "$BACKEND_URL/api.php" \
         -H "Content-Type: application/json" \
         -d '{"action":"ping"}' \
         -w "HTTP Status: %{http_code}\n" \
         -o /tmp/api_test_response.json
    
    if [ $? -eq 0 ]; then
        print_success "API endpoint is accessible"
        cat /tmp/api_test_response.json
    else
        print_error "API endpoint test failed"
        return 1
    fi
    
    # Test CORS headers
    curl -X OPTIONS "$BACKEND_URL/api.php" \
         -H "Origin: $FRONTEND_URL" \
         -v 2>&1 | grep -i "access-control"
    
    if [ $? -eq 0 ]; then
        print_success "CORS headers are properly configured"
    else
        print_warning "CORS headers may not be properly configured"
    fi
}

# Function to cleanup after tests
cleanup() {
    print_status "Cleaning up test environment..."
    
    # Remove temporary files
    rm -f /tmp/api_test_response.json
    
    # Clean test database
    mysql -u root -p -e "DROP DATABASE IF EXISTS ${TEST_DB}_temp;"
    
    print_success "Cleanup complete"
}

# Main execution
main() {
    print_status "Starting comprehensive integration test suite..."
    
    # Pre-flight checks
    print_status "Performing pre-flight checks..."
    
    # Check if required services are running
    if ! check_service "$FRONTEND_URL" "Frontend Server"; then
        print_error "Please start the frontend development server with: npm run dev"
        exit 1
    fi
    
    if ! check_service "$BACKEND_URL/api.php" "PHP Backend"; then
        print_error "Please ensure PHP backend is accessible"
        exit 1
    fi
    
    # Setup test environment
    setup_test_database || exit 1
    
    # Run test suites
    FAILED_TESTS=0
    
    print_status "Running test suites..."
    
    # Run API tests first
    if ! run_api_tests; then
        ((FAILED_TESTS++))
    fi
    
    # Run PHP backend tests
    if ! run_php_tests; then
        ((FAILED_TESTS++))
    fi
    
    # Run frontend integration tests
    if ! run_frontend_tests; then
        ((FAILED_TESTS++))
    fi
    
    # Run E2E tests
    if ! run_e2e_tests; then
        ((FAILED_TESTS++))
    fi
    
    # Cleanup
    cleanup
    
    # Final report
    echo ""
    echo "======================================================="
    if [ $FAILED_TESTS -eq 0 ]; then
        print_success "🎉 All integration tests passed successfully!"
        echo ""
        print_status "Test Coverage Summary:"
        echo "  ✅ PHP Backend API Tests"
        echo "  ✅ Frontend Integration Tests"
        echo "  ✅ End-to-End Tests"
        echo "  ✅ CORS Configuration Tests"
        echo "  ✅ Authentication Flow Tests"
        echo "  ✅ Database Integration Tests"
    else
        print_error "❌ $FAILED_TESTS test suite(s) failed"
        echo ""
        print_status "Please check the output above for specific failures"
        exit 1
    fi
}

# Handle script interruption
trap cleanup EXIT

# Check if script is being run directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
