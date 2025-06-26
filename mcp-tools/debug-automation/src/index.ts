#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import fs from 'fs-extra';
import path from 'path';

interface DebugConfig {
  workspacePath: string;
  enablePhpDebug: boolean;
  enableFrontendDebug: boolean;
  enableTestDebug: boolean;
  phpXdebugPort?: number;
  viteDevPort?: number;
  phpServerPort?: number;
}

class DebugAutomationServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: 'architex-debug-automation',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
    
    // Error handling
    this.server.onerror = (error) => console.error('[MCP Error]', error);
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'setup_debug_environment',
          description: 'Automatically configure VS Code debugging for PHP backend and React frontend',
          inputSchema: {
            type: 'object',
            properties: {
              workspacePath: {
                type: 'string',
                description: 'Path to the workspace root directory',
              },
              enablePhpDebug: {
                type: 'boolean',
                description: 'Enable PHP/Xdebug configuration',
                default: true,
              },
              enableFrontendDebug: {
                type: 'boolean',
                description: 'Enable React/Chrome debugging',
                default: true,
              },
              enableTestDebug: {
                type: 'boolean',
                description: 'Enable Jest test debugging',
                default: true,
              },
              phpXdebugPort: {
                type: 'number',
                description: 'Xdebug port number',
                default: 9003,
              },
              viteDevPort: {
                type: 'number',
                description: 'Vite development server port',
                default: 5173,
              },
              phpServerPort: {
                type: 'number',
                description: 'PHP built-in server port',
                default: 8000,
              },
            },
            required: ['workspacePath'],
          },
        },
        {
          name: 'create_debug_guide',
          description: 'Generate comprehensive debugging documentation',
          inputSchema: {
            type: 'object',
            properties: {
              workspacePath: {
                type: 'string',
                description: 'Path to the workspace root directory',
              },
              includeXdebugSetup: {
                type: 'boolean',
                description: 'Include Xdebug installation and configuration instructions',
                default: true,
              },
            },
            required: ['workspacePath'],
          },
        },
        {
          name: 'validate_debug_setup',
          description: 'Validate that all debugging components are properly configured',
          inputSchema: {
            type: 'object',
            properties: {
              workspacePath: {
                type: 'string',
                description: 'Path to the workspace root directory',
              },
            },
            required: ['workspacePath'],
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'setup_debug_environment':
            return await this.setupDebugEnvironment(args as DebugConfig);
          case 'create_debug_guide':
            return await this.createDebugGuide(args as any);
          case 'validate_debug_setup':
            return await this.validateDebugSetup(args as any);
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  private async setupDebugEnvironment(config: DebugConfig): Promise<any> {
    const {
      workspacePath,
      enablePhpDebug = true,
      enableFrontendDebug = true,
      enableTestDebug = true,
      phpXdebugPort = 9003,
      viteDevPort = 5173,
      phpServerPort = 8000,
    } = config;

    const vscodeDir = path.join(workspacePath, '.vscode');
    await fs.ensureDir(vscodeDir);

    const results: string[] = [];

    // Create launch.json
    const launchConfig = {
      version: '0.2.0',
      configurations: [],
      compounds: [],
    };

    if (enablePhpDebug) {
      launchConfig.configurations.push(
        {
          name: 'Listen for PHP Xdebug',
          type: 'php',
          request: 'launch',
          port: phpXdebugPort,
          pathMappings: {
            '/var/www/html': '${workspaceFolder}/backend',
          },
        },
        {
          name: 'Debug PHP API',
          type: 'php',
          request: 'launch',
          program: '${workspaceFolder}/backend/api.php',
          cwd: '${workspaceFolder}/backend',
          port: phpXdebugPort,
        }
      );
      results.push('✓ PHP debugging configurations added');
    }

    if (enableFrontendDebug) {
      launchConfig.configurations.push({
        name: 'Debug React Frontend',
        type: 'chrome',
        request: 'launch',
        url: `http://localhost:${viteDevPort}`,
        webRoot: '${workspaceFolder}',
        preLaunchTask: 'Start Development Server',
        sourceMaps: true,
        smartStep: true,
      });
      results.push('✓ React frontend debugging configuration added');
    }

    if (enableTestDebug) {
      launchConfig.configurations.push(
        {
          name: 'Debug Jest Tests',
          type: 'node',
          request: 'launch',
          program: '${workspaceFolder}/node_modules/.bin/jest',
          args: ['--runInBand', '--no-cache'],
          console: 'integratedTerminal',
          internalConsoleOptions: 'neverOpen',
          skipFiles: ['<node_internals>/**'],
        },
        {
          name: 'Debug Single Jest Test',
          type: 'node',
          request: 'launch',
          program: '${workspaceFolder}/node_modules/.bin/jest',
          args: ['--runInBand', '--no-cache', '${relativeFile}'],
          console: 'integratedTerminal',
          internalConsoleOptions: 'neverOpen',
          skipFiles: ['<node_internals>/**'],
        }
      );
      results.push('✓ Jest test debugging configurations added');
    }

    // Add compound configuration for full-stack debugging
    if (enablePhpDebug && enableFrontendDebug) {
      launchConfig.compounds.push({
        name: 'Debug Full Stack',
        configurations: ['Listen for PHP Xdebug', 'Debug React Frontend'],
      });
      results.push('✓ Full-stack debugging compound added');
    }

    await fs.writeJson(path.join(vscodeDir, 'launch.json'), launchConfig, { spaces: 2 });
    results.push('✓ launch.json created/updated');

    // Create tasks.json
    const tasksConfig = {
      version: '2.0.0',
      tasks: [
        {
          label: 'Start Development Server',
          type: 'shell',
          command: 'npm run dev',
          group: 'build',
          isBackground: true,
          options: {
            cwd: '${workspaceFolder}',
          },
          problemMatcher: {
            owner: 'vite',
            pattern: {
              regexp: '.*',
            },
            background: {
              activeOnStart: true,
              beginsPattern: '.*',
              endsPattern: 'ready in \\\\d+.*',
            },
          },
        },
        {
          label: 'Start PHP Server',
          type: 'shell',
          command: `php -S localhost:${phpServerPort} -t \${workspaceFolder}/backend`,
          group: 'build',
          isBackground: true,
          options: {
            cwd: '${workspaceFolder}/backend',
          },
        },
        {
          label: 'Install Dependencies',
          type: 'shell',
          command: 'npm install',
          group: 'build',
          options: {
            cwd: '${workspaceFolder}',
          },
        },
        {
          label: 'Run Tests',
          type: 'shell',
          command: 'npm test',
          group: 'test',
          options: {
            cwd: '${workspaceFolder}',
          },
        },
      ],
    };

    await fs.writeJson(path.join(vscodeDir, 'tasks.json'), tasksConfig, { spaces: 2 });
    results.push('✓ tasks.json created/updated');

    // Create settings.json with debugging-related settings
    const settingsConfig = {
      'php.debug.port': [phpXdebugPort],
      'php.executablePath': null,
      'debug.allowBreakpointsEverywhere': true,
      'debug.inlineValues': 'on',
      'debug.showBreakpointsInOverviewRuler': true,
      'typescript.preferences.includePackageJsonAutoImports': 'auto',
      'jest.autoRun': 'off',
      'jest.showCoverageOnLoad': false,
    };

    await fs.writeJson(path.join(vscodeDir, 'settings.json'), settingsConfig, { spaces: 2 });
    results.push('✓ settings.json created/updated with debug settings');

    return {
      content: [
        {
          type: 'text',
          text: `Debug environment setup completed successfully!\n\n${results.join('\n')}\n\nNext steps:\n1. Install PHP Debug extension in VS Code\n2. Configure Xdebug in your PHP installation\n3. Set breakpoints in your code\n4. Start debugging with F5 or the Debug panel`,
        },
      ],
    };
  }

  private async createDebugGuide(args: { workspacePath: string; includeXdebugSetup?: boolean }): Promise<any> {
    const { workspacePath, includeXdebugSetup = true } = args;

    const guideContent = `# Complete Debugging Guide for Architex Axis Management Suite

## Quick Start

1. **Install Required Extensions**:
   - PHP Debug (xdebug.php-debug)
   - Chrome Debugger (built into VS Code)

2. **Start Debugging**:
   - Press \`F5\` or go to Run and Debug panel
   - Select the appropriate configuration
   - Set breakpoints by clicking in the gutter

## Available Debug Configurations

### 1. Listen for PHP Xdebug
- **Purpose**: Debug PHP backend API calls
- **How to use**: 
  1. Start this configuration
  2. Make requests to your PHP API
  3. Execution will pause at breakpoints

### 2. Debug PHP API
- **Purpose**: Debug PHP scripts directly
- **How to use**: Set breakpoints in PHP files and run

### 3. Debug React Frontend
- **Purpose**: Debug React components and frontend logic
- **How to use**: 
  1. Start this configuration
  2. Chrome will open with your app
  3. Set breakpoints in TypeScript/JavaScript files

### 4. Debug Jest Tests
- **Purpose**: Debug unit tests
- **How to use**: 
  1. Open a test file
  2. Set breakpoints
  3. Start this configuration

### 5. Debug Single Jest Test
- **Purpose**: Debug currently open test file
- **How to use**: 
  1. Open the test file you want to debug
  2. Set breakpoints
  3. Start this configuration

### 6. Debug Full Stack
- **Purpose**: Debug both frontend and backend simultaneously
- **How to use**: Starts both PHP and React debugging

## Setting Breakpoints

### Frontend (React/TypeScript)
\`\`\`typescript
// LoginPage.tsx
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  debugger; // ← Browser will pause here
  
  try {
    const result = await login(credentials); // ← Set breakpoint here
    // Execution pauses, inspect variables
  } catch (error) {
    console.error(error); // ← Set breakpoint here for errors
  }
};
\`\`\`

### Backend (PHP)
\`\`\`php
// api.php
function handleLogin($data) {
    error_log("Login attempt for: " . $data['email']); // ← Set breakpoint here
    
    $user = authenticateUser($data); // ← Set breakpoint here
    
    if ($user) {
        return generateJWT($user); // ← Set breakpoint here
    }
    
    throw new Exception("Invalid credentials"); // ← Set breakpoint here
}
\`\`\`

### Tests (Jest)
\`\`\`typescript
// LoginPage.test.tsx
test('should handle login successfully', async () => {
  const mockUser = { id: 1, name: 'Test User' }; // ← Set breakpoint here
  
  (loginAPI as jest.Mock).mockResolvedValue(mockUser); // ← Set breakpoint here
  
  render(<LoginPage />);
  
  const result = await waitFor(() => {
    // Test logic here - set breakpoints to inspect state
  }); // ← Set breakpoint here
});
\`\`\`

## Debugging Common Issues

### 1. API Communication Problems
**Breakpoint Strategy**:
- Frontend: Before API call in \`apiService.ts\`
- Backend: First line of API endpoint handler
- Check: Request data, headers, authentication

### 2. Authentication Issues
**Breakpoint Strategy**:
- Frontend: \`AuthContext.tsx\` login function
- Backend: JWT generation/validation in \`api.php\`
- Check: Token format, expiration, user data

### 3. Database Problems
**Breakpoint Strategy**:
- Backend: Database query execution in \`db_connect.php\`
- Check: SQL queries, connection status, returned data

### 4. Component Rendering Issues
**Breakpoint Strategy**:
- Frontend: Component render methods
- Frontend: useEffect hooks
- Check: Props, state, context values

${includeXdebugSetup ? `
## Xdebug Installation and Configuration

### Windows (XAMPP/WAMP)
1. Download Xdebug from https://xdebug.org/download
2. Add to php.ini:
\`\`\`ini
[Xdebug]
zend_extension=xdebug
xdebug.mode=debug
xdebug.start_with_request=yes
xdebug.client_port=9003
xdebug.client_host=127.0.0.1
xdebug.idekey=VSCODE
\`\`\`

### macOS (Homebrew)
\`\`\`bash
brew install php
pecl install xdebug
\`\`\`

### Linux (Ubuntu/Debian)
\`\`\`bash
sudo apt-get install php-xdebug
\`\`\`

### Verify Installation
\`\`\`bash
php -m | grep xdebug
\`\`\`
` : ''}

## Troubleshooting

### Xdebug Not Connecting
1. Check php.ini configuration
2. Verify port 9003 is not blocked
3. Restart web server after config changes
4. Check VS Code PHP Debug extension is installed

### Frontend Breakpoints Not Hit
1. Ensure source maps are enabled
2. Check file paths match
3. Verify Chrome debugging is working
4. Try \`debugger;\` statements

### Test Debugging Issues
1. Make sure Jest is not running in watch mode
2. Check Node.js version compatibility
3. Verify test file paths are correct

## Pro Tips

1. **Use Conditional Breakpoints**: Right-click breakpoint → Add condition
2. **Log Points**: Right-click breakpoint → Add logpoint (no code changes needed)
3. **Call Stack Navigation**: Use call stack panel to trace execution
4. **Variable Inspection**: Hover over variables or use Variables panel
5. **Debug Console**: Execute code in current context
6. **Step Controls**: Step over (F10), Step into (F11), Step out (Shift+F11)

## Performance Debugging

### Frontend Performance
- Use Chrome DevTools Performance tab
- React DevTools Profiler
- Network tab for API call timing

### Backend Performance
- Use Xdebug profiler mode
- Database query logging
- Error log monitoring

## Security Debugging

### Common Security Issues to Debug
- SQL injection prevention
- XSS protection
- CSRF token validation
- JWT token security
- Input sanitization

Remember: Never commit debug configurations with hardcoded secrets or production URLs!
`;

    await fs.writeFile(path.join(workspacePath, 'DEBUG_GUIDE.md'), guideContent);

    return {
      content: [
        {
          type: 'text',
          text: '✓ Complete debugging guide created at DEBUG_GUIDE.md\n\nThe guide includes:\n- Quick start instructions\n- Detailed breakpoint strategies\n- Troubleshooting tips\n- Xdebug setup instructions\n- Pro debugging tips',
        },
      ],
    };
  }

  private async validateDebugSetup(args: { workspacePath: string }): Promise<any> {
    const { workspacePath } = args;
    const issues: string[] = [];
    const successes: string[] = [];

    // Check .vscode directory
    const vscodeDir = path.join(workspacePath, '.vscode');
    if (await fs.pathExists(vscodeDir)) {
      successes.push('✓ .vscode directory exists');
    } else {
      issues.push('✗ .vscode directory missing');
    }

    // Check launch.json
    const launchPath = path.join(vscodeDir, 'launch.json');
    if (await fs.pathExists(launchPath)) {
      try {
        const launchConfig = await fs.readJson(launchPath);
        if (launchConfig.configurations && launchConfig.configurations.length > 0) {
          successes.push('✓ launch.json exists with configurations');
        } else {
          issues.push('✗ launch.json exists but has no configurations');
        }
      } catch {
        issues.push('✗ launch.json exists but is invalid JSON');
      }
    } else {
      issues.push('✗ launch.json missing');
    }

    // Check tasks.json
    const tasksPath = path.join(vscodeDir, 'tasks.json');
    if (await fs.pathExists(tasksPath)) {
      successes.push('✓ tasks.json exists');
    } else {
      issues.push('✗ tasks.json missing');
    }

    // Check package.json
    const packagePath = path.join(workspacePath, 'package.json');
    if (await fs.pathExists(packagePath)) {
      try {
        const packageConfig = await fs.readJson(packagePath);
        if (packageConfig.devDependencies && packageConfig.devDependencies.jest) {
          successes.push('✓ Jest is configured');
        } else {
          issues.push('✗ Jest not found in devDependencies');
        }
      } catch {
        issues.push('✗ package.json is invalid');
      }
    } else {
      issues.push('✗ package.json missing');
    }

    // Check PHP backend
    const backendPath = path.join(workspacePath, 'backend');
    if (await fs.pathExists(backendPath)) {
      successes.push('✓ Backend directory exists');
      
      const apiPath = path.join(backendPath, 'api.php');
      if (await fs.pathExists(apiPath)) {
        successes.push('✓ PHP API file exists');
      } else {
        issues.push('✗ api.php missing');
      }
    } else {
      issues.push('✗ Backend directory missing');
    }

    const summary = issues.length === 0 
      ? '🎉 All debugging components are properly configured!'
      : `⚠️ Found ${issues.length} issue(s) that need attention.`;

    return {
      content: [
        {
          type: 'text',
          text: `Debug Setup Validation Results\n\n${summary}\n\nSuccesses:\n${successes.join('\n')}\n\n${issues.length > 0 ? `Issues to fix:\n${issues.join('\n')}\n\nRun 'setup_debug_environment' to fix these issues.` : ''}`,
        },
      ],
    };
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Architex Debug Automation MCP server running on stdio');
  }
}

const server = new DebugAutomationServer();
server.run().catch(console.error);
