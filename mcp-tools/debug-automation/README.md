# Architex Debug Automation MCP Tool

This MCP (Model Context Protocol) tool automates the entire debugging setup process for the Architex Axis Management Suite, including PHP backend and React frontend debugging configuration.

## Features

- **Automated VS Code Configuration**: Creates launch.json, tasks.json, and settings.json
- **Full-Stack Debugging**: Configures PHP Xdebug and React Chrome debugging
- **Test Debugging**: Sets up Jest test debugging configurations
- **Validation**: Checks if debugging setup is properly configured
- **Documentation**: Generates comprehensive debugging guides

## Installation

1. **Navigate to the MCP tool directory**:
   ```bash
   cd mcp-tools/debug-automation
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Build the tool**:
   ```bash
   npm run build
   ```

## Usage

### With Claude Desktop

Add this to your Claude Desktop configuration:

```json
{
  "mcpServers": {
    "architex-debug-automation": {
      "command": "node",
      "args": ["C:/path/to/your/project/mcp-tools/debug-automation/dist/index.js"]
    }
  }
}
```

### Available Tools

#### 1. setup_debug_environment

Automatically configures the entire debugging environment.

**Parameters**:
- `workspacePath` (required): Path to your workspace root
- `enablePhpDebug` (optional): Enable PHP/Xdebug configuration (default: true)
- `enableFrontendDebug` (optional): Enable React/Chrome debugging (default: true)
- `enableTestDebug` (optional): Enable Jest test debugging (default: true)
- `phpXdebugPort` (optional): Xdebug port number (default: 9003)
- `viteDevPort` (optional): Vite development server port (default: 5173)
- `phpServerPort` (optional): PHP built-in server port (default: 8000)

**Example**:
```
Please set up the debug environment for my workspace at "C:\Users\Raidmax i5\Documents\git\architex-axis-management-suite--3-"
```

#### 2. create_debug_guide

Generates a comprehensive debugging documentation file.

**Parameters**:
- `workspacePath` (required): Path to your workspace root
- `includeXdebugSetup` (optional): Include Xdebug installation instructions (default: true)

**Example**:
```
Please create a debug guide for my project at "C:\Users\Raidmax i5\Documents\git\architex-axis-management-suite--3-"
```

#### 3. validate_debug_setup

Validates that all debugging components are properly configured.

**Parameters**:
- `workspacePath` (required): Path to your workspace root

**Example**:
```
Please validate my debug setup at "C:\Users\Raidmax i5\Documents\git\architex-axis-management-suite--3-"
```

## What Gets Created

### .vscode/launch.json
- Listen for PHP Xdebug
- Debug PHP API
- Debug React Frontend
- Debug Jest Tests
- Debug Single Jest Test
- Debug Full Stack (compound)

### .vscode/tasks.json
- Start Development Server
- Start PHP Server
- Install Dependencies
- Run Tests

### .vscode/settings.json
- PHP debug settings
- TypeScript settings
- Jest settings
- Debug UI preferences

### DEBUG_GUIDE.md
- Complete debugging instructions
- Breakpoint strategies
- Troubleshooting tips
- Xdebug setup guide

## Quick Start After Installation

1. **Run the setup tool**:
   ```
   Please set up debug environment for my workspace
   ```

2. **Install required VS Code extensions**:
   - PHP Debug (xdebug.php-debug)

3. **Configure Xdebug** (if using PHP debugging):
   - Follow the generated DEBUG_GUIDE.md instructions

4. **Start debugging**:
   - Press F5 in VS Code
   - Select your desired debug configuration
   - Set breakpoints and debug!

## Debugging Workflow

1. **Frontend Issues**:
   - Use "Debug React Frontend" configuration
   - Set breakpoints in .tsx/.ts files
   - Debug in Chrome DevTools integration

2. **Backend Issues**:
   - Use "Listen for PHP Xdebug" configuration
   - Set breakpoints in .php files
   - Make API requests to trigger breakpoints

3. **Test Issues**:
   - Use "Debug Jest Tests" configuration
   - Set breakpoints in test files
   - Debug test failures step by step

4. **Full-Stack Issues**:
   - Use "Debug Full Stack" configuration
   - Debug both frontend and backend simultaneously

## Advanced Features

- **Conditional Breakpoints**: Right-click on breakpoint to add conditions
- **Log Points**: Add logging without code changes
- **Call Stack Navigation**: Trace execution flow
- **Variable Inspection**: Hover or use Variables panel
- **Debug Console**: Execute code in current context

## Troubleshooting

If you encounter issues:

1. **Run validation**:
   ```
   Please validate my debug setup
   ```

2. **Check the generated DEBUG_GUIDE.md** for detailed troubleshooting

3. **Re-run setup**:
   ```
   Please set up debug environment again
   ```

## Development

To modify or extend this tool:

```bash
# Watch mode for development
npm run dev

# Build for production
npm run build

# Test the tool
npm start
```

## Requirements

- Node.js 18+
- VS Code with PHP Debug extension
- PHP with Xdebug (for PHP debugging)
- Chrome browser (for frontend debugging)

This tool eliminates the manual setup process and ensures consistent debugging configuration across your development team!
