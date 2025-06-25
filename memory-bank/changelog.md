# Changelog

## [0.1.0] - 2025-06-22

### Added

- Initial setup of the Memory Bank with core documentation files.
- Created projectBrief.md, productContext.md, activeContext.md, systemPatterns.md, techContext.md, and progress.md to maintain project context.

### Changed

- N/A

### Fixed

- N/A

## [0.2.0] - 2025-06-23

### Added

- `data-testid` to the `Modal` component to make it easier to find in tests.

### Changed

- Updated `types.ts` to include an `ARCHIVED` status in the `ProjectStatus` enum and to fix the `Application` interface.
- Updated `components/admin/ProjectManagement.tsx` to fix a bug where the create project modal was being opened incorrectly.
- Updated `components/shared/Modal.tsx` to include a `data-testid` to make it easier to find in tests.
- Updated `components/admin/ProjectManagement.test.tsx` to use the `data-testid` to find the modal.
- Updated `components/freelancer/FreelancerTimeTrackingPage.tsx` to fix a bug where the `fetchMyTimeLogsAPI` was not being called correctly.
- Updated `components/freelancer/FreelancerTimeTrackingPage.test.tsx` to correctly mock the `fetchMyTimeLogsAPI`.
- Updated `components/admin/AdminTimeLogReportPage.test.tsx` to correctly wait for the modal to close before asserting that it is not in the document.

### Fixed (0.2.0)

- All failing tests.
- Out-of-memory errors when running tests by adding the `--runInBand` flag to the `test` script in `package.json`.
- Workspace problems, including unused imports and functions, and markdownlint warnings.

## [0.3.0] - 2025-06-23

### Added

- Explicit LoginResponse type to AuthContext for better type safety.
- Environment variable loading in db_connect.php for more secure configuration management.

### Changed

- Moved AuthContext from components/ to contexts/ directory for better organization.
- Enhanced MyJobCards component with user information display and better styling.
- Updated backend/composer.json to properly handle test dependencies and autoloading.
- Improved db_connect.php to use environment variables with fallbacks.

### Fixed (0.3.0)

- Merge conflicts in multiple files:
  - AuthContext.tsx (moved to contexts/ with enhanced functionality)
  - MyJobCards.tsx (resolved in favor of enhanced version)
  - composer.json (fixed duplicate sections and improved structure)

## [0.4.0] - 2025-06-24

### Added

- N/A

### Changed

- **Memory Bank Synchronization:**
  - Performed a full codebase analysis to synchronize the memory bank with the current state of the project.
  - `systemPatterns.md` was completely rewritten to reflect the detailed findings of the analysis.
  - `productContext.md`, `activeContext.md`, `progress.md`, and `decisionLog.md` were updated with new information from the analysis.

### Fixed

- N/A

## [0.5.0] - 2025-06-24

### Fixed (0.5.0)

- **Merge Conflicts:** Resolved all outstanding merge conflicts in the codebase.
- **TypeScript Errors:** Fixed all TypeScript errors that arose from the merge conflicts.
- **Memory Bank Update:** Updated all memory bank files to reflect the current state of the project.
