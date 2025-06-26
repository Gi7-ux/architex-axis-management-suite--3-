# System Patterns: Architex Axis Management Suite (as of 2025-06-24)

The detailed architecture for the Architex Axis Management Suite has been documented and sharded for clarity and maintainability.

For a comprehensive understanding of the system's architecture, please refer to the new architecture documentation directory:

[**View Detailed Architecture Documentation**](../docs/architecture/README.md)

This new documentation provides an in-depth look at:

* System Overview
* Key Components and Their Interactions
* Architectural Drivers and Constraints
* Architectural Significant Decisions (ASDs)
* Future Considerations / Roadmap
* Development & Deployment Workflow
* Data Model Overview (Conceptual)

**[2025-06-25 18:30:00] - Error Resolution Patterns and Code Quality Standards**

### Component Error Resolution Pattern
A systematic approach to TypeScript compilation error resolution has been established:

1. **Error Classification**: Categorize errors by type (syntax, imports, props, types, cleanup)
2. **Priority Resolution**: Address in order of impact (syntax → imports → props → types → cleanup)  
3. **Interface Validation**: All component props must match defined interfaces exactly
4. **Icon Standardization**: Use only available icons from IconComponents, replace missing with alternatives
5. **Import Path Consistency**: Follow established directory structure for all imports
6. **Code Cleanup**: Remove unused functions, imports, and variables during error resolution

### Icon Component Usage Standards
- **Available Icons**: Always verify icon existence in `IconComponents.tsx` before use
- **Replacement Strategy**: Map non-existent icons to functionally similar available icons
- **Examples Established**:
  - `HandThumbUpIcon` → `CheckCircleIcon` (approval actions)
  - `HandThumbDownIcon` → `TrashIcon` (rejection/delete actions)
  - `BuildingStorefrontIcon` → `UsersIcon` (client/admin contexts)

### Button Component Prop Standards  
- **Supported Sizes**: `'sm' | 'md' | 'lg'` (not `'xs'`)
- **Supported Variants**: `'primary' | 'secondary' | 'danger' | 'ghost' | 'outline'` (not `'success'`)
- **Migration Pattern**: Map unsupported values to nearest supported equivalent

### Thread Type Validation Pattern
- **API-Defined Types**: Only use thread types defined in `apiService.ts` MessageThread interface
- **Valid Types**: `'direct' | 'project_admin_freelancer' | 'project_admin_client' | 'project_freelancer_client'`
- **Invalid Types**: Remove references to `'project_client_admin_freelancer'` and similar non-existent types

### Import Path Standardization
- **AuthContext**: Always import from `../../contexts/AuthContext`  
- **ApiService**: Always import from `../../apiService`
- **Shared Components**: Use relative paths from `../shared/`
- **Consistency Rule**: Maintain consistent relative path depth across similar component levels

This pattern ensures maintainable, error-free code and establishes standards for future development.
