# Troubleshooting Guide for Architex Axis Management Suite

This document provides solutions to common issues encountered when setting up and running the Architex Axis Management Suite.

## Getting Started

Before running the application, ensure you have the following prerequisites:

1. Node.js (version 18 or higher recommended)
2. npm (version 9 or higher recommended)
3. PHP (version 8.0 or higher) with composer installed for backend development

## Common Issues and Solutions

### 1. Jest Tests Failing to Run or Not Producing Output

**Problem**: Running `npm test` doesn't produce any output or exits silently.

**Solution**:

1. **Install missing dependencies**:
   ```bash
   npm install --save-dev identity-obj-proxy
   ```

2. **Check Jest configuration**:
   Ensure `jest.config.cjs` has the correct configuration for moduleNameMapper:
   ```javascript
   moduleNameMapper: {
     '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
     '\\.(gif|ttf|eot|svg|png)$': '<rootDir>/__mocks__/fileMock.js',
     '^contexts/(.*)$': '<rootDir>/contexts/$1',
   },
   ```

3. **Verify Jest setup file**:
   Make sure `jest.setup.js` has the necessary global mocks:
   ```javascript
   import '@testing-library/jest-dom';
   import fetchMock from 'jest-fetch-mock';

   // Check if these globals already exist before setting them
   if (typeof global.TextEncoder === 'undefined') {
     const { TextEncoder, TextDecoder } = require('util');
     global.TextEncoder = TextEncoder;
     global.TextDecoder = TextDecoder;
   }

   // Enable fetch mocks
   fetchMock.enableMocks();

   // Mock window.matchMedia
   Object.defineProperty(window, 'matchMedia', {
     writable: true,
     value: jest.fn().mockImplementation(query => ({
       matches: false,
       media: query,
       onchange: null,
       addListener: jest.fn(),
       removeListener: jest.fn(),
       addEventListener: jest.fn(),
       removeEventListener: jest.fn(),
       dispatchEvent: jest.fn(),
     })),
   });
   ```

4. **Run a single test file**:
   Try running a specific test file to narrow down issues:
   ```bash
   npx jest components/LoginPage.test.tsx
   ```

### 2. Vite Development Server Issues

**Problem**: The Vite development server fails to start or encounters errors.

**Solution**:

1. **Check Vite configuration**:
   Ensure `vite.config.ts` has the proper aliases and environment variables:
   ```typescript
   resolve: {
     alias: {
       '@': path.resolve(__dirname, '.'),
       'components': path.resolve(__dirname, './components'),
       'contexts': path.resolve(__dirname, './contexts'),
       'types': path.resolve(__dirname, './types'),
     }
   }
   ```

2. **Environment Variables**:
   Make sure any required environment variables are set. Create a `.env` file in the project root:
   ```
   GEMINI_API_KEY=your_api_key_here
   ```

3. **Clean installation**:
   Try removing node_modules and reinstalling:
   ```bash
   rm -rf node_modules
   npm cache clean --force
   npm install
   ```

### 3. Backend PHP Setup

**Problem**: Issues with PHP backend configuration.

**Solution**:

1. **Database Connection**:
   Ensure `backend/db_connect.php` has the correct database credentials.

2. **PHP Dependencies**:
   Install required PHP dependencies:
   ```bash
   cd backend
   composer install
   ```

3. **JWT Configuration**:
   Make sure JWT secret key is properly set (but not committed to version control).

4. **API Endpoint Testing**:
   Test individual endpoints using tools like Postman or cURL.

### 4. Deployment Issues

**Problem**: Issues deploying to cPanel or other hosting environments.

**Solution**:

1. **Build Process**:
   Ensure the build outputs to the correct directory:
   ```bash
   npm run build
   ```
   This should generate files in `public_html/dist/`.

2. **Backend Files Placement**:
   Place PHP files in the appropriate location based on your hosting configuration.

3. **Environment Configuration**:
   Set up environment variables in cPanel or through `.htaccess` files.

## Project-Specific Commands

### Development

```bash
# Start development server
npm run dev

# Run tests
npm test

# Run specific tests
npx jest path/to/test.tsx

# Build for production
npm run build

# Preview production build
npm run preview
```

### PHP Backend

```bash
# Navigate to backend directory
cd backend

# Install PHP dependencies
composer install

# Create database tables
php create_tables.php

# Seed database with sample data
php seed.php
```

## Need More Help?

If you continue to experience issues, consider:

1. Checking the Memory Bank for project-specific information
2. Reviewing recent Git commits for changes that might affect functionality
3. Examining browser console logs for frontend errors
4. Looking at PHP error logs for backend issues
