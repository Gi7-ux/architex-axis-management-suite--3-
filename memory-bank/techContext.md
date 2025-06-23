# Tech Context

**Technologies Used**:  
- **Frontend**: React.js with TypeScript for building user interfaces with type safety.
- **Build Tool**: Vite for fast development server and optimized builds.
- **Testing**: Jest for unit testing components and functions.
- **Backend**: PHP for server-side logic and API endpoints.
- **Database**: MySQL (assumed based on typical PHP setups) for data storage.

**Development Setup**:  
- **Node.js**: Required for running Vite and managing frontend dependencies.
- **npm**: Package manager for installing project dependencies.
- **Environment**: Configuration likely managed through environment variables or env.tsx for API endpoints and other settings.

**Technical Constraints**:  
- Must support modern browsers for the React frontend.
- Backend compatibility with PHP environments for API services.
- Responsive design to ensure usability across devices.

**Dependencies**:  
- React and React DOM for UI rendering.
- TypeScript for static typing.
- Various component libraries or custom components for UI elements (to be confirmed from package.json).
- Backend dependencies on PHP libraries for database interaction and API handling.

**Tool Usage Patterns**:  
- Vite is used for both development and production builds, with configuration in vite.config.ts.
- Jest is configured for testing with setup in jest.config.cjs and jest.setup.js.
- Babel may be used for transpiling (babel.config.cjs present in project root).

**Date Created**: 2025-06-22
