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

### Fixed
- All failing tests.
- Out-of-memory errors when running tests by adding the `--runInBand` flag to the `test` script in `package.json`.
- Workspace problems, including unused imports and functions, and markdownlint warnings.
