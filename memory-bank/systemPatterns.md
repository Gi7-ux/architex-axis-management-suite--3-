# System Patterns

**System Architecture**:  
- The Architex Axis Management Suite is built as a React-based web application using TypeScript for type safety and Vite as the build tool.
- The frontend is structured with role-specific components (Admin, Client, Freelancer) under a shared layout with reusable UI elements.
- Backend interactions are facilitated through API calls to a PHP-based backend for data management and authentication.

**Key Technical Decisions**:  
- [2025-06-22 19:58:41] - Using React with TypeScript for a scalable and maintainable frontend.
- [2025-06-22 19:58:41] - Implementing role-based access control to tailor user experiences based on user type.
- [2025-06-22 19:58:41] - Utilizing Vite for fast development and build times.

**Design Patterns in Use**:  
- Component-based architecture for UI development, with shared components for consistency across different views.
- Context API for state management, particularly for authentication and toast notifications.
- Modular file structure separating concerns by user role and shared utilities.

**Component Relationships**:  
- Core components like Navbar and Sidebar provide a consistent layout across different user roles.
- Role-specific dashboards (e.g., AdminDashboard, ClientDashboard) render relevant data and actions based on user permissions.
- Shared utilities like Toast and Modal components are used across all roles for user feedback and interactions.

**Critical Implementation Paths**:  
- Authentication flow: Users are authenticated via the backend API, with context managed through AuthContext to control access to protected views.
- Data fetching: API service handles communication with the backend for project data, user information, and time logs.

**Date Created**: 2025-06-22
